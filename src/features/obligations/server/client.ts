import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

/**
 * noki-shared-contracts@0.31.0 types every finance-phase2 list/detail
 * response body loosely (`items: Record<string, never>[]` / a flat
 * `Record<string, unknown>` for detail), because the backend service layer
 * (finance-phase2.service.ts) returns plain objects without a strict
 * response DTO annotation -- confirmed directly against the controller
 * (`getObligation` returns `Promise<Record<string, unknown>>`, not the
 * `{data: ...}` shape its `@ApiOkResponse` Swagger decorator declares) and
 * against `toObligationDto`'s exact field mapping. The interfaces below
 * mirror that verified real shape; the client casts the unwrapped envelope
 * to it, following the same "known contract-typing quirk, narrow with a
 * documented cast" pattern already established in Phase 4A.
 */
export interface FinancialObligationDto {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  currency: string;
  sourceDomain: string;
  sourceReferenceType: string;
  sourceReferenceId: string;
  counterpartyType: string;
  counterpartyId: string;
  nature: string;
  direction: "PAYABLE" | "RECEIVABLE";
  status: string;
  originalAmount: string;
  allocatedAmount: string;
  settledAmount: string;
  remainingAmount: string;
  effectiveAt: string;
  dueAt: string | null;
  holdReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialObligationListResponse {
  items: FinancialObligationDto[];
  total: number;
  page: number;
  pageSize: number;
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

export interface ListObligationsQuery {
  organizationId?: string;
  countryId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/** GET /v1/finance/obligations -- requires finance.obligation.read. */
export async function listObligations(query: ListObligationsQuery, context: NokiRequestContext): Promise<FinancialObligationListResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/obligations", { params: { query } });
  return unwrap(result) as unknown as FinancialObligationListResponse;
}

/** GET /v1/finance/obligations/{id} -- requires finance.obligation.read. */
export async function getObligation(id: string, context: NokiRequestContext): Promise<FinancialObligationDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/obligations/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as FinancialObligationDto;
}

export interface CreateObligationInput {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  sourceDomain: string;
  sourceReferenceType: string;
  sourceReferenceId: string;
  counterpartyType: string;
  counterpartyId: string;
  nature: string;
  direction: "PAYABLE" | "RECEIVABLE";
  originalAmount: string;
  effectiveAt?: string;
  dueAt?: string;
}

/** POST /v1/finance/obligations -- requires finance.obligation.manage (scope-bound on body.countryCode). */
export async function createObligation(body: CreateObligationInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialObligationDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/obligations", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialObligationDto;
}

export interface AllocateObligationInput {
  allocationType: "DOCUMENT_LINE" | "STATEMENT" | "PAYOUT" | "REFUND" | "WITHHOLDING" | "ADJUSTMENT";
  allocationReferenceId: string;
  amount: string;
}

/** POST /v1/finance/obligations/{id}/allocations -- requires finance.obligation.manage. Server is the sole authority on remainingAmount after this call. */
export async function allocateObligation(id: string, body: AllocateObligationInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialObligationDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/obligations/{id}/allocations", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialObligationDto;
}
