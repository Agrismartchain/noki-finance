import { buildCashListSearchParams, parseCashListFilters, toLimitOffset, type CashListFilters } from "@/features/finance-shared/cash-list-query";

/** CashHandoverResponseDto.status enum, confirmed against the OpenAPI schema. */
export const HANDOVER_STATUSES = ["DRAFT", "SUBMITTED", "RECEIVED", "REJECTED", "CANCELLED"] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];

export type HandoverListFilters = CashListFilters<HandoverStatus>;

export function parseHandoverListFilters(searchParams: URLSearchParams): HandoverListFilters {
  return parseCashListFilters(searchParams, HANDOVER_STATUSES);
}

export const buildHandoverListSearchParams = buildCashListSearchParams<HandoverStatus>;
export const handoverLimitOffset = toLimitOffset;
