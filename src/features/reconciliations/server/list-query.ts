import { buildCashListSearchParams, parseCashListFilters, toLimitOffset, type CashListFilters } from "@/features/finance-shared/cash-list-query";

/** FinancialReconciliationResponseDto.status enum, confirmed against the OpenAPI schema. */
export const RECONCILIATION_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export type ReconciliationListFilters = CashListFilters<ReconciliationStatus>;

export function parseReconciliationListFilters(searchParams: URLSearchParams): ReconciliationListFilters {
  return parseCashListFilters(searchParams, RECONCILIATION_STATUSES);
}

export const buildReconciliationListSearchParams = buildCashListSearchParams<ReconciliationStatus>;
export const reconciliationLimitOffset = toLimitOffset;
