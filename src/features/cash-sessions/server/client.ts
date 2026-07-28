import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

export type CashSessionResponseDto = components["schemas"]["CashSessionResponseDto"];
export type CashSessionListResponseDto = components["schemas"]["CashSessionListResponseDto"];
export type OpenCashSessionDto = components["schemas"]["OpenCashSessionDto"];
export type CloseCashSessionDto = components["schemas"]["CloseCashSessionDto"];

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

export interface ListCashSessionsQuery {
  organizationId: string;
  countryCode: string;
  currencyId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** GET /v1/finance/cash/sessions -- requires finance.cash.read. */
export async function listSessions(query: ListCashSessionsQuery, context: NokiRequestContext): Promise<CashSessionListResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cash/sessions", { params: { query } });
  return unwrap(result);
}

/** GET /v1/finance/cash/sessions/{id} -- requires finance.cash.read. */
export async function getSession(id: string, context: NokiRequestContext): Promise<CashSessionResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cash/sessions/{id}", { params: { path: { id } } });
  return unwrap(result);
}

/** POST /v1/finance/cash/sessions -- requires finance.cash_session.open. Idempotency-Key required by the backend. */
export async function openSession(body: OpenCashSessionDto, idempotencyKey: string, context: NokiRequestContext): Promise<CashSessionResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/sessions", { params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } }, body });
  return unwrap(result);
}

/**
 * POST /v1/finance/cash/sessions/{id}/close -- requires finance.cash_session.close.
 * The backend receives ONLY `countedClosingAmount` (+ optional reason) -- the
 * expected amount is never sent by the client, it is computed and returned by
 * the server as `systemExpectedClosingAmount`/`varianceAmount` on the updated record.
 */
export async function closeSession(id: string, body: CloseCashSessionDto, idempotencyKey: string, context: NokiRequestContext): Promise<CashSessionResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/sessions/{id}/close", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body,
  });
  return unwrap(result);
}
