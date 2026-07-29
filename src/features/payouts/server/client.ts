import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

/** FINANCE_COUNTERPARTY_TYPES, verified against finance-phase2.service.ts / the ProposePayoutDto validator. */
export const PAYOUT_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
export type PayoutCounterpartyType = (typeof PAYOUT_COUNTERPARTY_TYPES)[number];
type FinanceSourceDomain = "COMMERCE" | "FOOD" | "MOBILITY_TAXI" | "MOBILITY_TAXI_MOTO" | "COURIER" | "PLATFORM" | "MANUAL_ADJUSTMENT";

/** PayoutHoldType (prisma/schema.prisma). */
export const PAYOUT_HOLD_TYPES = ["DISPUTE", "COMPLIANCE", "PAYMENT_METHOD", "MANUAL_REVIEW", "VARIANCE", "OTHER"] as const;
export type PayoutHoldType = (typeof PAYOUT_HOLD_TYPES)[number];

/** PayoutHoldStatus (prisma/schema.prisma). */
export type PayoutHoldStatus = "ACTIVE" | "RELEASED";
/** PayoutApprovalStage (prisma/schema.prisma). */
export type PayoutApprovalStage = "FIRST" | "FINAL";
/** PayoutApprovalDecision (prisma/schema.prisma). */
export type PayoutApprovalDecision = "APPROVED" | "REJECTED";
/** PayoutAttemptStatus (prisma/schema.prisma). */
export type PayoutAttemptStatus = "EXPORT_READY" | "SENT" | "PAID" | "FAILED";
/** PayoutLineStatus (prisma/schema.prisma). */
export type PayoutLineStatus = "PENDING" | "PROPOSED" | "ON_HOLD" | "APPROVED" | "SENT" | "PAID" | "FAILED" | "MARKED_PAID" | "CANCELLED" | "RECONCILED";

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
 * A single row of GET /v1/finance/reports/{reportType} (reportType="payouts"), verified
 * against finance-consumer.service.ts's payout report mapping. The phase-2 payout
 * controller itself has no list endpoint (confirmed) -- this report is the only real,
 * paginated list-shaped source for the /payouts list page.
 */
export interface PayoutReportRow {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  currencyCode: string;
  counterpartyType: string;
  counterpartyId: string;
  paymentMethodId: string;
  paymentMethodVersion: number;
  destinationMasked: string | null;
  code: string | null;
  status: string;
  totalAmount: string;
  approvedAt: string | null;
  firstApprovedAt: string | null;
  finalApprovedAt: string | null;
  exportReadyAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  reconciledAt: string | null;
  exportChecksum: string | null;
  exportLineCount: number | null;
  externalReference: string | null;
  failureCode: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutReportResponse {
  reportType: string;
  items: PayoutReportRow[];
  total: number;
  page: number;
  pageSize: number;
  appliedFilters: Record<string, unknown>;
  generatedAt: string;
}

export interface ListPayoutsQuery {
  organizationId?: string;
  countryId?: string;
  countryCode?: string;
  currencyId?: string;
  status?: string;
  counterpartyType?: PayoutCounterpartyType;
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
 * GET /v1/finance/reports/{reportType} with reportType="payouts" -- requires
 * finance.report.read. `items`' element type is declared as `Record<string, never>[]` in
 * the generated schema (the same FinanceReportListDto typing gap already documented in
 * documents/server/client.ts), so the result is cast to the verified real row shape after
 * unwrapping.
 */
export async function listPayouts(query: ListPayoutsQuery, context: NokiRequestContext): Promise<PayoutReportResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/reports/{reportType}", { params: { path: { reportType: "payouts" }, query } });
  return unwrap(result) as unknown as PayoutReportResponse;
}

export interface PayoutPaymentMethodSnapshot {
  id: string;
  status: string;
  version: number;
  destinationMasked: string | null;
}

export interface PayoutLineDto {
  id: string;
  recipientId: string;
  orderId: string | null;
  financialObligationId: string;
  paymentMethodId: string;
  paymentMethodVersion: number;
  destinationMasked: string | null;
  amount: string;
  status: string;
  settledAt: string | null;
  createdAt: string;
}

export interface PayoutHoldDto {
  id: string;
  financialObligationId: string | null;
  type: string;
  status: string;
  reason: string;
  createdByActorId: string;
  releasedByActorId: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
}

export interface PayoutApprovalDto {
  id: string;
  stage: string;
  decision: string;
  actorId: string;
  reason: string | null;
  createdAt: string;
}

export interface PayoutAttemptDto {
  id: string;
  attemptNumber: number;
  status: string;
  exportChecksum: string | null;
  externalReference: string | null;
  errorCode: string | null;
  reason: string | null;
  nextAttemptAt: string | null;
  createdByActorId: string;
  createdAt: string;
}

export interface PayoutProofDto {
  id: string;
  proofReference: string;
  checksum: string | null;
  mimeType: string | null;
  size: number | null;
  active: boolean;
  createdByActorId: string;
  createdAt: string;
}

/**
 * GET /v1/finance/payouts/{id}'s full flat response shape, verified directly against
 * finance-phase2.service.ts's payout detail mapping. Deliberately excludes
 * `sensitiveReference`/`destinationFingerprint`/any provider secret or raw provider
 * response -- the real DTO does not return those fields for a payout at all, only
 * `destinationMasked` and `paymentMethod.destinationMasked`, both already masked
 * server-side. Never add a field to this interface beyond what is listed here.
 */
export interface PayoutDetailDto {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  counterpartyType: string;
  counterpartyId: string;
  paymentMethodId: string;
  paymentMethodVersion: number;
  destinationMasked: string | null;
  code: string | null;
  status: string;
  totalAmount: string;
  createdByActorId: string;
  approvedByActorId: string | null;
  firstApprovedByActorId: string | null;
  finalApprovedByActorId: string | null;
  exportedByActorId: string | null;
  sentByActorId: string | null;
  paidByActorId: string | null;
  failedByActorId: string | null;
  cancelledByActorId: string | null;
  reconciledByActorId: string | null;
  approvedAt: string | null;
  firstApprovedAt: string | null;
  finalApprovedAt: string | null;
  exportReadyAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  reconciledAt: string | null;
  exportChecksum: string | null;
  exportLineCount: number | null;
  exportReference: string | null;
  externalReference: string | null;
  proofReference: string | null;
  failureCode: string | null;
  failureReason: string | null;
  retryCount: number;
  cancelReason: string | null;
  reconciliationReference: string | null;
  paymentMethod: PayoutPaymentMethodSnapshot | null;
  lines: PayoutLineDto[];
  holds: PayoutHoldDto[];
  approvals: PayoutApprovalDto[];
  attempts: PayoutAttemptDto[];
  paymentProofs: PayoutProofDto[];
  createdAt: string;
  updatedAt: string;
}

/** GET /v1/finance/payouts/{id} -- requires finance.payout.read. */
export async function getPayout(id: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/payouts/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface ProposePayoutInput {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  counterpartyType: PayoutCounterpartyType;
  counterpartyId: string;
  paymentMethodId: string;
  code?: string;
  obligationIds: string[];
}

/** POST /v1/finance/payouts -- requires finance.payout.prepare (scope-bound on body.countryCode). */
export async function proposePayout(body: ProposePayoutInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface CreatePayoutHoldInput {
  type: PayoutHoldType;
  reason: string;
  obligationId?: string;
}

/** POST /v1/finance/payouts/{id}/holds -- requires finance.payout.hold. */
export async function createPayoutHold(id: string, body: CreatePayoutHoldInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/holds", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface ReleasePayoutHoldInput {
  reason: string;
}

/** POST /v1/finance/payouts/{id}/holds/{holdId}/release -- requires finance.payout.hold. */
export async function releasePayoutHold(id: string, holdId: string, body: ReleasePayoutHoldInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/holds/{holdId}/release", {
    params: { path: { id, holdId }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface PayoutDecisionInput {
  reason?: string;
}

/** POST /v1/finance/payouts/{id}/first-approve -- requires finance.payout.first_approve. Only meaningful when status === "PENDING_FIRST_APPROVAL". */
export async function firstApprovePayout(id: string, body: PayoutDecisionInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/first-approve", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

/** POST /v1/finance/payouts/{id}/final-approve -- requires finance.payout.final_approve. Only meaningful when status === "PENDING_FINAL_APPROVAL". */
export async function finalApprovePayout(id: string, body: PayoutDecisionInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/final-approve", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface ExportPayoutInput {
  exportReference?: string;
}

/** POST /v1/finance/payouts/{id}/export -- requires finance.payout.export. Only meaningful when status === "APPROVED". */
export async function exportPayout(id: string, body: ExportPayoutInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/export", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface MarkPayoutSentInput {
  externalReference?: string;
}

/** POST /v1/finance/payouts/{id}/sent -- requires finance.payout.mark_sent. Only meaningful when status === "EXPORT_READY". */
export async function markPayoutSent(id: string, body: MarkPayoutSentInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/sent", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface MarkPayoutPaidInput {
  proofReference: string;
  checksum?: string;
  mimeType?: string;
  size?: number;
}

/**
 * POST /v1/finance/payouts/{id}/paid -- requires finance.payout.mark_paid. Only meaningful
 * when status === "SENT". There is deliberately no amount field on this DTO -- the server
 * is the sole authority on the paid amount, and no UI here must ever add one.
 */
export async function markPayoutPaid(id: string, body: MarkPayoutPaidInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/paid", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface MarkPayoutFailedInput {
  errorCode: string;
  reason: string;
  externalReference?: string;
  nextAttemptAt?: string;
}

/** POST /v1/finance/payouts/{id}/failed -- requires finance.payout.mark_failed. Only meaningful when status === "SENT". */
export async function markPayoutFailed(id: string, body: MarkPayoutFailedInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/failed", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface RetryPayoutInput {
  paymentMethodId?: string;
  reason: string;
}

/** POST /v1/finance/payouts/{id}/retry -- requires finance.payout.retry. Only meaningful when status === "FAILED". */
export async function retryPayout(id: string, body: RetryPayoutInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/retry", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface CancelPayoutInput {
  reason: string;
}

/**
 * POST /v1/finance/payouts/{id}/cancel -- requires finance.payout.cancel. Which statuses
 * actually permit cancellation is enforced server-side only; the client only decides
 * whether to show the button (status not in PAID/MARKED_PAID/CANCELLED/RECONCILED/FAILED),
 * a convenience gate, never a business rule.
 */
export async function cancelPayout(id: string, body: CancelPayoutInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/cancel", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}

export interface ReconcilePayoutInput {
  reconciliationReference: string;
  reason?: string;
}

/** POST /v1/finance/payouts/{id}/reconcile -- requires finance.payout.reconcile. Only meaningful when status === "PAID" or "MARKED_PAID". */
export async function reconcilePayout(id: string, body: ReconcilePayoutInput, idempotencyKey: string, context: NokiRequestContext): Promise<PayoutDetailDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payouts/{id}/reconcile", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PayoutDetailDto;
}
