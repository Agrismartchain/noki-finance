import { buildCashListSearchParams, parseCashListFilters, toLimitOffset, type CashListFilters } from "@/features/finance-shared/cash-list-query";

/** CashVarianceResponseDto.status enum, confirmed against the OpenAPI schema. */
export const VARIANCE_STATUSES = ["OPEN", "RESOLVED", "WAIVED"] as const;
export type VarianceStatus = (typeof VARIANCE_STATUSES)[number];

/** CashVarianceResponseDto.type enum, confirmed against the OpenAPI schema. */
export const VARIANCE_TYPES = ["DECLARATION", "HANDOVER", "SESSION", "RECONCILIATION"] as const;
export type VarianceType = (typeof VARIANCE_TYPES)[number];

export type VarianceListFilters = CashListFilters<VarianceStatus>;

export function parseVarianceListFilters(searchParams: URLSearchParams): VarianceListFilters {
  return parseCashListFilters(searchParams, VARIANCE_STATUSES);
}

export const buildVarianceListSearchParams = buildCashListSearchParams<VarianceStatus>;
export const varianceLimitOffset = toLimitOffset;
