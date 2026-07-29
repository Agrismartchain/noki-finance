import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

/** CreateFinancialAdjustmentDto.type enum. */
export const ADJUSTMENT_TYPES = ["EXPENSE", "BONUS", "REFUND", "WITHHOLDING", "PENALTY", "DISPUTE_ADJUSTMENT", "MANUAL_ADJUSTMENT"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/** FINANCE_COUNTERPARTY_TYPES, shared across every finance-phase2 DTO that references a counterparty. */
export const ADJUSTMENT_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
export type AdjustmentCounterpartyType = (typeof ADJUSTMENT_COUNTERPARTY_TYPES)[number];

/** FINANCE_SOURCE_DOMAINS, shared across every finance-phase2 DTO that references a source domain. */
export const ADJUSTMENT_SOURCE_DOMAINS = ["COMMERCE", "FOOD", "MOBILITY_TAXI", "MOBILITY_TAXI_MOTO", "COURIER", "PLATFORM", "MANUAL_ADJUSTMENT"] as const;
export type AdjustmentSourceDomain = (typeof ADJUSTMENT_SOURCE_DOMAINS)[number];

/** FinancialAdjustmentStatus, verified against finance-phase2.service.ts. */
export const ADJUSTMENT_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "APPLIED", "REVERSED"] as const;
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number];

/**
 * Same verified contract-typing quirk as documents/server/client.ts and
 * obligations/server/client.ts: noki-shared-contracts@0.31.0 types every finance-phase2
 * create/read/approve/reject/apply response as `FinancePhase2ObjectResponseDto`
 * (`{ data: Record<string, never> }`), but the controller methods
 * (`getAdjustment`, `createAdjustment`, `approveAdjustment`, `rejectAdjustment`,
 * `applyAdjustment` in finance-phase2.controller.ts) actually return the flat
 * adjustment object directly, NOT wrapped in `{data: ...}`. The client below casts the
 * unwrapped envelope to the real flat shape rather than the declared one.
 */
export interface FinancialAdjustmentDto {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  currency: string;
  counterpartyType: string;
  counterpartyId: string;
  sourceDomain: string;
  sourceReferenceType: string;
  sourceReferenceId: string;
  type: "EXPENSE" | "BONUS" | "REFUND" | "WITHHOLDING" | "PENALTY" | "DISPUTE_ADJUSTMENT" | "MANUAL_ADJUSTMENT";
  status: string;
  amount: string;
  reasonCode: string;
  reason: string;
  attachmentReference: string | null;
  createdByActorId: string | null;
  submittedByActorId: string | null;
  approvedByActorId: string | null;
  appliedObligationId: string | null;
  createdAt: string;
  updatedAt: string;
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

/** GET /v1/finance/adjustments/{id} -- requires finance.adjustment.read. */
export async function getAdjustment(id: string, context: NokiRequestContext): Promise<FinancialAdjustmentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/adjustments/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as FinancialAdjustmentDto;
}

export interface CreateAdjustmentInput {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  counterpartyType: string;
  counterpartyId: string;
  sourceDomain: string;
  sourceReferenceType: string;
  sourceReferenceId: string;
  type: "EXPENSE" | "BONUS" | "REFUND" | "WITHHOLDING" | "PENALTY" | "DISPUTE_ADJUSTMENT" | "MANUAL_ADJUSTMENT";
  /** Positive decimal string -- the server rejects a negative amount; there is no direction/sign field on this DTO. */
  amount: string;
  reasonCode: string;
  reason: string;
  attachmentReference?: string;
}

/**
 * POST /v1/finance/adjustments -- requires finance.adjustment.create (scope-bound on
 * body.countryCode). Accepts exactly CreateFinancialAdjustmentDto's fields -- never a
 * direction, a negative amount, a status, an approver, or a resulting obligation id.
 */
export async function createAdjustment(body: CreateAdjustmentInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialAdjustmentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/adjustments", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialAdjustmentDto;
}

export interface ApproveAdjustmentInput {
  reason?: string;
}

/** POST /v1/finance/adjustments/{id}/approve -- requires finance.adjustment.approve. */
export async function approveAdjustment(id: string, body: ApproveAdjustmentInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialAdjustmentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/adjustments/{id}/approve", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialAdjustmentDto;
}

export interface RejectAdjustmentInput {
  reason: string;
}

/**
 * POST /v1/finance/adjustments/{id}/reject -- requires finance.adjustment.approve. The
 * only mutation in this whole phase with NO Idempotency-Key header (verified against
 * finance-phase2.controller.ts's `rejectAdjustment` -- it declares no `@ApiHeader` for
 * it and the generated operation type has no header parameter); deliberately not added.
 */
export async function rejectAdjustment(id: string, body: RejectAdjustmentInput, context: NokiRequestContext): Promise<FinancialAdjustmentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/adjustments/{id}/reject", {
    params: { path: { id } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialAdjustmentDto;
}

/**
 * POST /v1/finance/adjustments/{id}/apply -- requires finance.adjustment.approve. The
 * controller declares no `@Body()` for this endpoint, so no request body is sent, the
 * same "no-body POST" pattern `submitHandover` in cash-handovers/server/client.ts uses.
 */
export async function applyAdjustment(id: string, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialAdjustmentDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/adjustments/{id}/apply", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
  });
  return unwrap(result) as unknown as FinancialAdjustmentDto;
}
