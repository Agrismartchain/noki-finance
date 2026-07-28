import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { NokiRequestContext } from "@/lib/api/request-context";

export type FinanceDashboardDto = components["schemas"]["FinanceDashboardDto"];
export type FinanceAgingDto = components["schemas"]["FinanceAgingDto"];
export type FinanceCashflowDto = components["schemas"]["FinanceCashflowDto"];
export type FinanceMetricDto = components["schemas"]["FinanceMetricDto"];
export type FinanceCurrencyAmountDto = components["schemas"]["FinanceCurrencyAmountDto"];

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

export interface FinanceScopeQuery {
  organizationId?: string;
  countryId?: string;
  countryCode?: string;
  currencyId?: string;
}

/** GET /v1/finance/dashboard -- requires finance.dashboard.read. */
export async function getDashboard(query: FinanceScopeQuery, context: NokiRequestContext): Promise<FinanceDashboardDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/dashboard", { params: { query } });
  return unwrap(result);
}

/** GET /v1/finance/dashboard/aging -- requires finance.dashboard.read. */
export async function getDashboardAging(query: FinanceScopeQuery, context: NokiRequestContext): Promise<FinanceAgingDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/dashboard/aging", { params: { query } });
  return unwrap(result);
}

/** GET /v1/finance/dashboard/cashflow -- requires finance.dashboard.read. */
export async function getDashboardCashflow(query: FinanceScopeQuery, context: NokiRequestContext): Promise<FinanceCashflowDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/dashboard/cashflow", { params: { query } });
  return unwrap(result);
}
