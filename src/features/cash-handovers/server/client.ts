import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

export type CashHandoverResponseDto = components["schemas"]["CashHandoverResponseDto"];
export type CashHandoverItemResponseDto = components["schemas"]["CashHandoverItemResponseDto"];
export type CashHandoverListResponseDto = components["schemas"]["CashHandoverListResponseDto"];
export type CreateCashHandoverDto = components["schemas"]["CreateCashHandoverDto"];
export type ReceiveCashHandoverDto = components["schemas"]["ReceiveCashHandoverDto"];
export type CancelCashHandoverDto = components["schemas"]["CancelCashHandoverDto"];
export type RejectCashHandoverDto = components["schemas"]["RejectCashHandoverDto"];

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

export interface ListCashHandoversQuery {
  organizationId: string;
  countryCode: string;
  currencyId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** GET /v1/finance/cash/handovers -- requires finance.cash.read. */
export async function listHandovers(query: ListCashHandoversQuery, context: NokiRequestContext): Promise<CashHandoverListResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cash/handovers", { params: { query } });
  return unwrap(result);
}

/** GET /v1/finance/cash/handovers/{id} -- requires finance.cash.read. */
export async function getHandover(id: string, context: NokiRequestContext): Promise<CashHandoverResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cash/handovers/{id}", { params: { path: { id } } });
  return unwrap(result);
}

/**
 * POST /v1/finance/cash/handovers -- requires finance.cash.handover.create.
 * Idempotency-Key is declared as a typed OpenAPI header parameter
 * (@ApiHeader on the backend), so openapi-fetch requires it under
 * `params.header`, not as a free-form fetch header -- confirmed by the
 * generated client's own type errors when passed as `headers`.
 */
export async function createHandover(body: CreateCashHandoverDto, idempotencyKey: string, context: NokiRequestContext): Promise<CashHandoverResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/handovers", { params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } }, body });
  return unwrap(result);
}

/** POST /v1/finance/cash/handovers/{id}/submit -- requires finance.cash.handover.submit. */
export async function submitHandover(id: string, idempotencyKey: string, context: NokiRequestContext): Promise<CashHandoverResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/handovers/{id}/submit", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
  });
  return unwrap(result);
}

/** POST /v1/finance/cash/handovers/{id}/cancel -- requires finance.cash.handover.submit. */
export async function cancelHandover(id: string, body: CancelCashHandoverDto, idempotencyKey: string, context: NokiRequestContext): Promise<CashHandoverResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/handovers/{id}/cancel", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body,
  });
  return unwrap(result);
}

/** POST /v1/finance/cash/handovers/{id}/reject -- requires finance.cash.receive. */
export async function rejectHandover(id: string, body: RejectCashHandoverDto, idempotencyKey: string, context: NokiRequestContext): Promise<CashHandoverResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/handovers/{id}/reject", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body,
  });
  return unwrap(result);
}

/** POST /v1/finance/cash/handovers/{id}/receive -- requires finance.cash.receive. */
export async function receiveHandover(id: string, body: ReceiveCashHandoverDto, idempotencyKey: string, context: NokiRequestContext): Promise<CashHandoverResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/handovers/{id}/receive", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body,
  });
  return unwrap(result);
}
