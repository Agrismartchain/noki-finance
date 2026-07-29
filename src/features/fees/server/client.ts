import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

/**
 * Same verified contract-typing quirk documented in
 * obligations/server/client.ts: `FinancePhase2ObjectResponseDto` types every
 * phase-2 create/read response body as `{ data: Record<string, never> }` in
 * the generated OpenAPI schema, but `FinancePhase2Controller`'s
 * getFeeRule/createFeeRule/assessFee/getFeeAssessment handlers actually
 * return the flat DTO object directly, unwrapped -- confirmed against the
 * controller source. The interfaces below mirror that verified real shape;
 * the client casts the unwrapped envelope to it via a documented cast,
 * matching obligations' "known contract-typing quirk, narrow with a
 * documented cast" pattern. Only `CreateFinanceFeeRuleDto`,
 * `AssessFinancialObligationFeeDto`, and a partial/loosely-typed
 * `FinanceFeeAssessmentResponseDto` exist as named schemas for this
 * controller -- there is no strict response DTO for either detail shape, so
 * these interfaces are defined by hand instead of imported from
 * `components["schemas"]`.
 */
export interface FeeRuleDto {
  id: string;
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  currencyCode: string;
  type: string;
  scopeType: string;
  calculationType: string;
  sourceDomain: string | null;
  counterpartyType: string | null;
  serviceCode: string | null;
  sellerId: string | null;
  cityId: string | null;
  zoneId: string | null;
  subZoneId: string | null;
  fixedAmount: string | null;
  percentageRate: string | null;
  percentageBase: string | null;
  minimumAmount: string | null;
  maximumAmount: string | null;
  priority: number;
  version: number;
  workflowStatus: string;
  status: string;
  validFrom: string | null;
  validTo: string | null;
}

/** FeeRuleWorkflowStatus -- verified against the FinancePhase2ObjectResponseDto controller mapping. */
export const FEE_RULE_WORKFLOW_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"] as const;
export type FeeRuleWorkflowStatus = (typeof FEE_RULE_WORKFLOW_STATUSES)[number];

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

/**
 * GET /v1/finance/fee-rules/{id} -- requires finance.fee_rule.read. There is
 * no list endpoint on this controller (verified) -- only lookup-by-id and
 * creation exist, hence the bounded "look up a fee rule by id" UI instead of
 * a table.
 */
export async function getFeeRule(id: string, context: NokiRequestContext): Promise<FeeRuleDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/fee-rules/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as FeeRuleDto;
}

export interface CreateFeeRuleInput {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  type: "CONFIRMATION" | "FULFILLMENT" | "UPSELL" | "SHIPPING" | "RETURN" | "CANCELLATION" | "QC" | "QUALITY_CONTROL";
  scopeType: "COUNTRY" | "CITY" | "ZONE" | "SUB_ZONE";
  calculationType: "FIXED" | "PERCENTAGE";
  sourceDomain?: string;
  counterpartyType?: string;
  serviceCode?: string;
  sellerId?: string;
  cityId?: string;
  zoneId?: string;
  subZoneId?: string;
  fixedAmount?: string;
  percentageRate?: string;
  percentageBase?: string;
  minimumAmount?: string;
  maximumAmount?: string;
  priority?: number;
  validFrom?: string;
  validTo?: string;
}

/** POST /v1/finance/fee-rules -- requires finance.fee_rule.manage (Idempotency-Key required). */
export async function createFeeRule(body: CreateFeeRuleInput, idempotencyKey: string, context: NokiRequestContext): Promise<FeeRuleDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/fee-rules", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FeeRuleDto;
}

/**
 * "fees" report row shape (`FinanceReportListDto.items`, verified against
 * finance-consumer.service.ts's `feesReport` function). `FinanceReportListDto`
 * itself is a real named OpenAPI schema, but its `items` field is typed
 * loosely as `Record<string, never>[]` in the generated contract, so this
 * client still narrows with a documented cast, same as the phase-2 detail
 * types above.
 */
export interface FeeAssessmentReportRow {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  currencyCode: string;
  financialObligationId: string;
  type: string;
  amount: string;
  sourceDomain: string;
  sourceReferenceType: string;
  sourceReferenceId: string;
  counterpartyType: string;
  counterpartyId: string;
  status: string;
  effectiveAt: string;
  createdAt: string;
}

export interface FeeAssessmentReportListResponse {
  reportType: string;
  items: FeeAssessmentReportRow[];
  total: number;
  page: number;
  pageSize: number;
  appliedFilters: Record<string, unknown>;
  generatedAt: string;
}

export interface ListFeeAssessmentsQuery {
  organizationId?: string;
  countryId?: string;
  countryCode?: string;
  currencyId?: string;
  status?: string;
  counterpartyType?: "SELLER" | "AFFILIATE" | "RESTAURANT" | "DRIVER" | "COURIER" | "LOGISTICS_PARTNER" | "CUSTOMER" | "NOKI_PLATFORM" | "OTHER";
  counterpartyId?: string;
  sourceDomain?: "COMMERCE" | "FOOD" | "MOBILITY_TAXI" | "MOBILITY_TAXI_MOTO" | "COURIER" | "PLATFORM" | "MANUAL_ADJUSTMENT";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * GET /v1/finance/reports/fees -- requires finance.report.read (NOT
 * finance.fee.read; this is the reports permission). There is no list
 * endpoint on the phase-2 fee-assessments controller itself (verified), so
 * this real, paginated report is the only legitimate listing mechanism for
 * fee assessments -- a real endpoint reuse, not an invention.
 */
export async function listFeeAssessments(query: ListFeeAssessmentsQuery, context: NokiRequestContext): Promise<FeeAssessmentReportListResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/reports/{reportType}", { params: { path: { reportType: "fees" }, query } });
  return unwrap(result) as unknown as FeeAssessmentReportListResponse;
}

export interface FeeAssessmentDto {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  currency: string;
  financialObligationId: string;
  orderId: string | null;
  type: string;
  amount: string;
  sourceFeeRuleId: string | null;
  ruleVersion: number | null;
  calculationType: string | null;
  fixedAmount: string | null;
  percentageRate: string | null;
  percentageBase: string | null;
  minimumAmount: string | null;
  maximumAmount: string | null;
  status: string;
  createdAt: string;
}

/** GET /v1/finance/fee-assessments/{id} -- requires finance.fee.read. */
export async function getFeeAssessment(id: string, context: NokiRequestContext): Promise<FeeAssessmentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/fee-assessments/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as FeeAssessmentDto;
}

export interface CreateFeeAssessmentInput {
  obligationId: string;
  type: "CONFIRMATION" | "FULFILLMENT" | "DELIVERY" | "RETURN" | "CANCELLATION" | "ADJUSTMENT";
  serviceCode?: string;
  percentageBase?: string;
}

/**
 * POST /v1/finance/fee-assessments -- requires finance.fee.assess
 * (Idempotency-Key required). Links a fee assessment to an existing
 * financial obligation by id -- there is no scope (organizationId/countryId)
 * in this body, it is inferred server-side from the referenced obligation.
 */
export async function createFeeAssessment(body: CreateFeeAssessmentInput, idempotencyKey: string, context: NokiRequestContext): Promise<FeeAssessmentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/fee-assessments", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FeeAssessmentDto;
}
