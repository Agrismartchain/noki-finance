import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { NokiRequestContext } from "@/lib/api/request-context";
import type { components } from "@agrismartchain/noki-shared-contracts";

export type FinanceProviderBalancesDto = components["schemas"]["FinanceProviderBalancesDto"];
export type FinanceProviderBalanceDto = components["schemas"]["FinanceProviderBalanceDto"];

/**
 * GET /v1/finance/provider-balances -- requires finance.dashboard.read. Returns the EXTERNAL float held at MTN/Airtel as
 * last read from the provider. It is never the NOKI ledger balance and must never be summed with it.
 */
export async function getProviderBalances(context: NokiRequestContext): Promise<FinanceProviderBalancesDto> {
  const { client } = createServerNokiClient(context);
  const result: { data?: FinanceProviderBalancesDto; error?: unknown; response: Response } = await client.GET("/v1/finance/provider-balances");
  if (!result.response.ok || result.error !== undefined) throw toNokiApiError(result.response.status, result.error);
  if (result.data === undefined) throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", { status: result.response.status });
  return result.data;
}
