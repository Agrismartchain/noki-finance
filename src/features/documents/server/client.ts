import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

import type { DocumentCounterpartyType } from "./list-query";

type FinanceSourceDomain = "COMMERCE" | "FOOD" | "MOBILITY_TAXI" | "MOBILITY_TAXI_MOTO" | "COURIER" | "PLATFORM" | "MANUAL_ADJUSTMENT";

/**
 * noki-shared-contracts@0.31.0 types every finance-phase2 create/read/approve/void
 * response body as `FinancePhase2ObjectResponseDto` (`{ data: Record<string, never> }`),
 * because that is what the controller's `@ApiOkResponse`/`@ApiCreatedResponse` Swagger
 * decorator declares -- but the controller methods themselves (`getDocument`,
 * `generateDocument`, `approveDocument`, `voidDocument` in finance-phase2.controller.ts)
 * actually return `Promise<Record<string, unknown>>` and the service layer returns the
 * flat document object directly, NOT wrapped in `{data: ...}`. This is the same verified
 * contract-typing quirk already documented in obligations/server/client.ts; the client
 * below casts the unwrapped envelope to the real flat shape rather than the declared one.
 */
export interface FinancialDocumentLineDto {
  id: string;
  type: string;
  descriptionCode: string;
  sourceDomain: string;
  sourceReferenceType: string;
  sourceReferenceId: string;
  obligationId: string | null;
  feeAssessmentId: string | null;
  adjustmentId: string | null;
  amount: string;
  currency: string;
}

export interface FinancialDocumentDto {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  currency: string;
  documentNumber: string;
  documentType: "INVOICE" | "STATEMENT" | "CREDIT_NOTE";
  counterpartyType: string;
  counterpartyId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossAmount: string;
  feeAmount: string;
  expenseAmount: string;
  bonusAmount: string;
  refundAmount: string;
  withholdingAmount: string;
  netAmount: string;
  paidAmount: string;
  remainingAmount: string;
  approvedByActorId: string | null;
  approvedAt: string | null;
  voidedByActorId: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  version: number;
  lines: FinancialDocumentLineDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A single row of GET /v1/finance/reports/{reportType} (reportType="invoices"), verified
 * against finance-consumer.service.ts's document report mapping. This report ONLY ever
 * contains documentType=INVOICE rows -- there is no report type for STATEMENT or
 * CREDIT_NOTE documents, so this is deliberately not called "DocumentDto" or presented
 * as an all-documents list anywhere in this feature.
 */
export interface DocumentReportRow {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  currency: string;
  documentNumber: string;
  documentType: string;
  counterpartyType: string;
  counterpartyId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  grossAmount: string;
  feeAmount: string;
  expenseAmount: string;
  bonusAmount: string;
  refundAmount: string;
  withholdingAmount: string;
  netAmount: string;
  paidAmount: string;
  remainingAmount: string;
  approvedAt: string | null;
  voidedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentReportResponse {
  reportType: string;
  items: DocumentReportRow[];
  total: number;
  page: number;
  pageSize: number;
  appliedFilters: Record<string, unknown>;
  generatedAt: string;
}

interface OpenApiFetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function unwrap<T>(result: OpenApiFetchResult<T>): T {
  if (!result.response.ok || result.error !== undefined) {
    throw toNokiApiError(result.response.status, result.error);
  }
  if (result.data === undefined) {
    throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", { status: result.response.status });
  }
  return result.data;
}

export interface ListInvoiceDocumentsQuery {
  organizationId?: string;
  countryId?: string;
  countryCode?: string;
  currencyId?: string;
  status?: string;
  counterpartyType?: DocumentCounterpartyType;
  counterpartyId?: string;
  sourceDomain?: FinanceSourceDomain;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * GET /v1/finance/reports/{reportType} with reportType="invoices" -- requires
 * finance.report.read. This is the only real, paginated list-shaped endpoint available
 * for documents, and it only ever returns documentType=INVOICE rows (confirmed against
 * finance-consumer.service.ts) -- there is no report type for STATEMENT or CREDIT_NOTE.
 * `items`' element type is declared as `Record<string, never>[]` in the generated schema
 * (a known FinanceReportListDto typing gap, same pattern as the finance-phase2 object
 * responses), so the result is cast to the verified real row shape after unwrapping.
 */
export async function listInvoiceDocuments(query: ListInvoiceDocumentsQuery, context: NokiRequestContext): Promise<DocumentReportResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/reports/{reportType}", { params: { path: { reportType: "invoices" }, query } });
  return unwrap(result) as unknown as DocumentReportResponse;
}

/** GET /v1/finance/documents/{id} -- requires finance.document.read. */
export async function getDocument(id: string, context: NokiRequestContext): Promise<FinancialDocumentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/documents/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as FinancialDocumentDto;
}

export interface CreateDocumentInput {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  documentType: "INVOICE" | "STATEMENT" | "CREDIT_NOTE";
  counterpartyType: string;
  counterpartyId: string;
  periodStart: string;
  periodEnd: string;
  obligationIds?: string[];
}

/**
 * POST /v1/finance/documents -- requires finance.document.generate (scope-bound on
 * body.countryCode). Accepts exactly GenerateFinancialDocumentDto's fields -- the server
 * computes every money total from the referenced obligations; there is no gross/net/fee
 * field on this DTO and none must ever be added here.
 */
export async function createDocument(body: CreateDocumentInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialDocumentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/documents", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialDocumentDto;
}

export interface ApproveDocumentInput {
  reason?: string;
}

/**
 * POST /v1/finance/documents/{id}/approve -- requires finance.document.approve. Which
 * statuses actually permit approval is enforced server-side only; the client only
 * decides whether to show the button (status !== "APPROVED" && status !== "VOIDED").
 */
export async function approveDocument(id: string, body: ApproveDocumentInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialDocumentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/documents/{id}/approve", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialDocumentDto;
}

export interface VoidDocumentInput {
  reason: string;
}

/**
 * POST /v1/finance/documents/{id}/void -- requires finance.document.void. There is no
 * edit/update endpoint for a financial document at all (confirmed) -- void is the only
 * state-changing action available once a document is APPROVED, and once VOIDED no
 * further action is possible.
 */
export async function voidDocument(id: string, body: VoidDocumentInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialDocumentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/documents/{id}/void", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialDocumentDto;
}
