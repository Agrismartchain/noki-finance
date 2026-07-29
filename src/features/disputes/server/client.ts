import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

/**
 * As with obligations (finance-phase2.service.ts), the finance-phase2
 * disputes endpoints return plain objects, not the `{data: ...}` shape their
 * `@ApiOkResponse` Swagger decorators declare, and noki-shared-contracts
 * types the body loosely as a result. The interfaces below mirror the real,
 * verified `toDisputeDto`-equivalent flat shape; the client casts the
 * unwrapped envelope to it, following the same documented-cast pattern
 * already established for obligations.
 */
export interface FinancialDisputeDto {
  id: string;
  organizationId: string;
  countryId: string;
  obligationId: string;
  status: "OPEN" | "RESOLVED";
  reasonCode: string;
  reason: string;
  openedByActorId: string;
  resolvedByActorId: string | null;
  resolution: "RELEASE" | "ADJUSTMENT" | null;
  resolutionReason: string | null;
  adjustmentId: string | null;
  openedAt: string;
  resolvedAt: string | null;
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

/** GET /v1/finance/disputes/{id} -- requires finance.dispute.read. No list endpoint exists -- a dispute is only reachable by a known id. */
export async function getDispute(id: string, context: NokiRequestContext): Promise<FinancialDisputeDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/disputes/{id}", { params: { path: { id } } });
  return unwrap(result) as unknown as FinancialDisputeDto;
}

export interface CreateDisputeInput {
  obligationId: string;
  reasonCode: string;
  reason: string;
}

/**
 * POST /v1/finance/disputes -- requires finance.dispute.manage. No scope
 * fields on the body -- scope (organizationId/countryId) is inferred
 * server-side from the referenced obligation. Opening a dispute holds the
 * underlying obligation (per the controller's own summary text).
 */
export async function createDispute(body: CreateDisputeInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialDisputeDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/disputes", {
    params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialDisputeDto;
}

export interface ResolveDisputeInput {
  resolution: "RELEASE" | "ADJUSTMENT";
  reason: string;
  adjustmentId?: string;
}

/**
 * POST /v1/finance/disputes/{id}/resolve -- requires finance.dispute.manage.
 * `adjustmentId` is only optional on the real DTO -- it is effectively
 * required when resolution is ADJUSTMENT, but that is enforced server-side,
 * not by this client.
 */
export async function resolveDispute(id: string, body: ResolveDisputeInput, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialDisputeDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/disputes/{id}/resolve", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body: body as never,
  });
  return unwrap(result) as unknown as FinancialDisputeDto;
}
