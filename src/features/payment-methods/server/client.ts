import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

/**
 * Same verified quirk as obligations/disputes: noki-shared-contracts types
 * the finance-phase2 payment-methods list/detail bodies loosely because the
 * backend service layer returns plain objects without a strict response DTO
 * annotation. List items and the single-record detail response share the
 * identical `toPaymentMethodDto` mapping (verified), so both use this same
 * flat interface. The client casts the unwrapped envelope to it, following
 * the documented-cast pattern already established for obligations/disputes.
 *
 * `destinationFingerprint` IS present in the real payload (a one-way hash
 * used for duplicate detection) -- it is kept on this type only so callers
 * know it exists; component code must never read or render it.
 */
export interface PaymentMethodDto {
  id: string;
  organizationId: string;
  countryId: string;
  currencyId: string;
  counterpartyType: string;
  counterpartyId: string;
  type: "BANK_ACCOUNT" | "MOBILE_MONEY";
  providerCode: string;
  displayLabel: string;
  destinationMasked: string;
  /** Never render this -- one-way hash for duplicate detection, not raw data, but still off-limits per spec. */
  destinationFingerprint: string;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  version: number;
  createdByActorId: string;
  approvedByActorId: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodListResponse {
  items: PaymentMethodDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SensitiveReferenceDto {
  id: string;
  sensitiveReference: string;
  status: PaymentMethodDto["status"];
  version: number;
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

export interface ListPaymentMethodsQuery {
  organizationId?: string;
  countryId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/** GET /v1/finance/payment-methods -- requires finance.payment_method.read. */
export async function listPaymentMethods(query: ListPaymentMethodsQuery, context: NokiRequestContext): Promise<PaymentMethodListResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/payment-methods", { params: { query } });
  return unwrap(result) as unknown as PaymentMethodListResponse;
}

/** GET /v1/finance/payment-methods/{id} -- requires finance.payment_method.read. */
export async function getPaymentMethod(id: string, context: NokiRequestContext): Promise<PaymentMethodDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/payment-methods/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as PaymentMethodDto;
}

/**
 * GET /v1/finance/payment-methods/{id}/sensitive-reference -- requires the
 * separate, more restricted finance.payment_method.read_sensitive
 * permission. Highly sensitive, audit-logged on the real backend -- callers
 * must only invoke this from an explicit user action (never prefetched as
 * part of a normal detail-page load).
 */
export async function getSensitiveReference(id: string, context: NokiRequestContext): Promise<SensitiveReferenceDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/payment-methods/{id}/sensitive-reference", { params: { path: { id } } });
  return unwrap(result) as unknown as SensitiveReferenceDto;
}

export interface CreatePaymentMethodInput {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  counterpartyType: string;
  counterpartyId: string;
  type: "BANK_ACCOUNT" | "MOBILE_MONEY";
  providerCode: string;
  displayLabel: string;
  /** Must already be a masked display string (e.g. "**** 4242") -- the backend rejects a raw IBAN or an unmasked long digit run. */
  destinationMasked: string;
  destinationFingerprint: string;
  /** Must match ^(vault|token|pmref):[A-Za-z0-9._:-]{6,}$ -- an opaque vault/token/pmref reference, never a raw account/phone number. */
  sensitiveReference: string;
}

/** POST /v1/finance/payment-methods -- requires finance.payment_method.create (scope-bound on body.countryCode). */
export async function createPaymentMethod(body: CreatePaymentMethodInput, idempotencyKey: string, context: NokiRequestContext): Promise<PaymentMethodDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payment-methods", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PaymentMethodDto;
}

/** POST /v1/finance/payment-methods/{id}/approve -- requires finance.payment_method.approve. Only valid from PENDING_VERIFICATION. */
export async function approvePaymentMethod(id: string, body: { reason?: string }, idempotencyKey: string, context: NokiRequestContext): Promise<PaymentMethodDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payment-methods/{id}/approve", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PaymentMethodDto;
}

/** POST /v1/finance/payment-methods/{id}/suspend -- requires finance.payment_method.suspend. Only valid from ACTIVE. */
export async function suspendPaymentMethod(id: string, body: { reason: string }, idempotencyKey: string, context: NokiRequestContext): Promise<PaymentMethodDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payment-methods/{id}/suspend", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PaymentMethodDto;
}

/**
 * POST /v1/finance/payment-methods/{id}/revoke -- requires
 * finance.payment_method.revoke. Available from ACTIVE or SUSPENDED
 * (server-enforced -- this client does not gate which prior status is
 * accepted).
 */
export async function revokePaymentMethod(id: string, body: { reason: string }, idempotencyKey: string, context: NokiRequestContext): Promise<PaymentMethodDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/payment-methods/{id}/revoke", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as PaymentMethodDto;
}
