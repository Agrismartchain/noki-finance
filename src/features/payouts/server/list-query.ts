import { parseEnumFilter, parsePage, parsePageSize } from "@/features/finance-shared/url-query";

import { PAYOUT_COUNTERPARTY_TYPES, type PayoutCounterpartyType } from "./client";

/** PayoutBatchStatus (prisma/schema.prisma), verified against finance-phase2.service.ts. */
export const PAYOUT_STATUSES = [
  "DRAFT",
  "PROPOSED",
  "ON_HOLD",
  "PENDING_FIRST_APPROVAL",
  "PENDING_FINAL_APPROVAL",
  "APPROVED",
  "EXPORT_READY",
  "SENT",
  "PAID",
  "FAILED",
  "MARKED_PAID",
  "CANCELLED",
  "RECONCILED",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/**
 * FinanceConsumerQueryDto (the real query DTO bound to GET /v1/finance/reports/{reportType})
 * accepts many more optional fields than exposed here (currencyId, sourceDomain,
 * counterpartyId, search, sortBy, sortOrder) -- this list page intentionally only exposes
 * status, counterpartyType and a date range as filters, matching the ones the brief calls
 * out as the meaningful ones for a payouts queue; there is no dedicated "approval stage"
 * server filter, so the status value itself is the approval-stage indicator (see the table
 * column), never a derived/invented filter.
 */
export interface PayoutListFilters {
  status: PayoutStatus | "";
  counterpartyType: PayoutCounterpartyType | "";
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export function parsePayoutListFilters(searchParams: URLSearchParams): PayoutListFilters {
  return {
    status: parseEnumFilter(searchParams.get("status"), PAYOUT_STATUSES),
    counterpartyType: parseEnumFilter(searchParams.get("counterpartyType"), PAYOUT_COUNTERPARTY_TYPES),
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildPayoutListSearchParams(filters: PayoutListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.counterpartyType) params.set("counterpartyType", filters.counterpartyType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}
