import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { NokiRequestContext } from "@/lib/api/request-context";

export type AdminCountryDto = components["schemas"]["AdminCountryDto"];
export type AdminCurrencyDto = components["schemas"]["AdminCurrencyDto"];

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

/** GET /v1/admin/master-data/countries -- requires countries.read (granted to the FINANCE role). Bounded to the max page size, no unbounded scan. */
export async function listCountries(context: NokiRequestContext): Promise<AdminCountryDto[]> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/admin/master-data/countries", { params: { query: { page: 1, pageSize: 100 } } });
  return unwrap(result).items;
}

/** GET /v1/admin/master-data/currencies -- requires currencies.read (granted to the FINANCE role). Bounded to the max page size. */
export async function listCurrencies(context: NokiRequestContext): Promise<AdminCurrencyDto[]> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/admin/master-data/currencies", { params: { query: { page: 1, pageSize: 100 } } });
  return unwrap(result).items;
}

export function toCurrencyCodeMap(currencies: AdminCurrencyDto[]): Record<string, string> {
  return Object.fromEntries(currencies.map((currency) => [currency.id, currency.code]));
}
