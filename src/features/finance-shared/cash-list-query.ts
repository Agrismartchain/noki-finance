import { parseEnumFilter, parsePage, parsePageSize } from "./url-query";

/** Shared URL filter shape for every CashListQueryDto-backed list page (handovers, sessions, variances, reconciliations). */
export interface CashListFilters<TStatus extends string> {
  currencyId: string;
  status: TStatus | "";
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export function parseCashListFilters<TStatus extends string>(searchParams: URLSearchParams, allowedStatuses: readonly TStatus[]): CashListFilters<TStatus> {
  return {
    currencyId: searchParams.get("currency") ?? "",
    status: parseEnumFilter(searchParams.get("status"), allowedStatuses),
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildCashListSearchParams<TStatus extends string>(filters: CashListFilters<TStatus>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.currencyId) params.set("currency", filters.currencyId);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}

/** CashListQueryDto paginates via limit/offset, not page/pageSize -- converted only at the server-call boundary, the URL itself stays page-based for a consistent user-facing contract across all Finance list pages. */
export function toLimitOffset(filters: Pick<CashListFilters<string>, "page" | "pageSize">): { limit: number; offset: number } {
  return { limit: filters.pageSize, offset: (filters.page - 1) * filters.pageSize };
}
