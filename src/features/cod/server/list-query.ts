import { parseEnumFilter, parsePage, parsePageSize, parseSearch } from "@/features/finance-shared/url-query";

/** AdminFinanceCodCollectionsQueryDto.status enum, confirmed against the OpenAPI schema. */
export const COD_STATUSES = ["DECLARED", "VOIDED", "REMITTED", "RECONCILED"] as const;
export type CodStatus = (typeof COD_STATUSES)[number];

export interface CodListFilters {
  search: string;
  status: CodStatus | "";
  countryId: string;
  currencyId: string;
  page: number;
  pageSize: number;
}

/**
 * Parses and normalizes the COD list page's URL search params. Invalid
 * values (an unknown status, a non-numeric page) are normalized rather than
 * rejected, so a shared/bookmarked malformed URL degrades to sane defaults
 * instead of an error page. There is deliberately no dateFrom/dateTo here --
 * AdminFinanceCodCollectionsQueryDto has no date-range parameter, confirmed
 * against the OpenAPI schema; faking a client-side date filter over an
 * already server-paginated, server-truncated result set would silently
 * misfilter it.
 */
export function parseCodListFilters(searchParams: URLSearchParams): CodListFilters {
  return {
    search: parseSearch(searchParams.get("search")),
    status: parseEnumFilter(searchParams.get("status"), COD_STATUSES),
    countryId: searchParams.get("country") ?? "",
    currencyId: searchParams.get("currency") ?? "",
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildCodListSearchParams(filters: CodListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.countryId) params.set("country", filters.countryId);
  if (filters.currencyId) params.set("currency", filters.currencyId);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}
