import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { NokiRequestContext } from "@/lib/api/request-context";

export { listCountries, listCurrencies } from "@/features/finance-shared/server/master-data";
export type { AdminCountryDto, AdminCurrencyDto } from "@/features/finance-shared/server/master-data";

export type AdminFinanceCodCollectionDto = components["schemas"]["AdminFinanceCodCollectionDto"];
export type AdminFinanceCodCollectionListDto = components["schemas"]["AdminFinanceCodCollectionListDto"];
export type CodCollectionResponseDto = components["schemas"]["CodCollectionResponseDto"];

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

export interface ListCodCollectionsQuery {
  page: number;
  pageSize: number;
  organizationId?: string;
  countryId?: string;
  currencyId?: string;
  search?: string;
  status?: "DECLARED" | "VOIDED" | "REMITTED" | "RECONCILED";
}

/**
 * GET /v1/admin/finance/cod/collections -- requires finance.executive.read.
 * The bare /v1/finance/cod/collections path has no list method (confirmed
 * against the generated OpenAPI schema); this admin-scoped endpoint is the
 * real COD list source.
 */
export async function listCodCollections(query: ListCodCollectionsQuery, context: NokiRequestContext): Promise<AdminFinanceCodCollectionListDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/admin/finance/cod/collections", { params: { query } });
  return unwrap(result);
}

/** GET /v1/finance/cod/collections/{id} -- requires finance.cod.read. */
export async function getCodCollection(id: string, context: NokiRequestContext): Promise<CodCollectionResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cod/collections/{id}", { params: { path: { id } } });
  return unwrap(result);
}
