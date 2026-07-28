import { buildCashListSearchParams, parseCashListFilters, toLimitOffset, type CashListFilters } from "@/features/finance-shared/cash-list-query";

/** CashSessionResponseDto.status enum, confirmed against the OpenAPI schema. */
export const SESSION_STATUSES = ["OPEN", "CLOSED", "RECONCILED"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type SessionListFilters = CashListFilters<SessionStatus>;

export function parseSessionListFilters(searchParams: URLSearchParams): SessionListFilters {
  return parseCashListFilters(searchParams, SESSION_STATUSES);
}

export const buildSessionListSearchParams = buildCashListSearchParams<SessionStatus>;
export const sessionLimitOffset = toLimitOffset;
