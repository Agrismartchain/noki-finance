import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

export type CashVarianceResponseDto = components["schemas"]["CashVarianceResponseDto"];
export type CashVarianceListResponseDto = components["schemas"]["CashVarianceListResponseDto"];
export type ResolveCashVarianceDto = components["schemas"]["ResolveCashVarianceDto"];

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

export interface ListCashVariancesQuery {
  organizationId: string;
  countryCode: string;
  currencyId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** GET /v1/finance/cash/variances -- requires finance.cash_variance.read. */
export async function listVariances(query: ListCashVariancesQuery, context: NokiRequestContext): Promise<CashVarianceListResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cash/variances", { params: { query } });
  return unwrap(result);
}

/** GET /v1/finance/cash/variances/{id} -- requires finance.cash_variance.read. */
export async function getVariance(id: string, context: NokiRequestContext): Promise<CashVarianceResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cash/variances/{id}", { params: { path: { id } } });
  return unwrap(result);
}

/**
 * POST /v1/finance/cash/variances/{id}/resolve -- requires finance.cash_variance.resolve.
 * The client only ever submits a decision (RESOLVED/WAIVED) and a reason --
 * never touches expectedAmount/actualAmount/varianceAmount, which stay
 * exactly as the backend originally computed them.
 */
export async function resolveVariance(id: string, body: ResolveCashVarianceDto, idempotencyKey: string, context: NokiRequestContext): Promise<CashVarianceResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/cash/variances/{id}/resolve", {
    params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } },
    body,
  });
  return unwrap(result);
}
