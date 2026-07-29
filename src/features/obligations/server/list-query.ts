import { parseEnumFilter, parsePage, parsePageSize } from "@/features/finance-shared/url-query";

/** FinancialObligationStatus (prisma/schema.prisma), verified against finance-phase2.service.ts. */
export const OBLIGATION_STATUSES = ["OPEN", "PARTIALLY_ALLOCATED", "ALLOCATED", "ON_HOLD", "PARTIALLY_SETTLED", "SETTLED", "CANCELLED", "REVERSED"] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

/** Shown as read-only columns (server-provided, never client-filtered/aggregated) -- see the gap note below. */
export const OBLIGATION_NATURES = ["COD_PROCEEDS", "SERVICE_FEE", "COMMISSION", "EXPENSE", "BONUS", "REFUND", "WITHHOLDING", "PENALTY", "PAYOUT", "ADJUSTMENT"] as const;
export type ObligationNature = (typeof OBLIGATION_NATURES)[number];

export const OBLIGATION_DIRECTIONS = ["PAYABLE", "RECEIVABLE"] as const;
export type ObligationDirection = (typeof OBLIGATION_DIRECTIONS)[number];

export const OBLIGATION_SOURCE_DOMAINS = ["COMMERCE", "FOOD", "MOBILITY_TAXI", "MOBILITY_TAXI_MOTO", "COURIER", "PLATFORM", "MANUAL_ADJUSTMENT"] as const;
export type ObligationSourceDomain = (typeof OBLIGATION_SOURCE_DOMAINS)[number];

export const OBLIGATION_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
export type ObligationCounterpartyType = (typeof OBLIGATION_COUNTERPARTY_TYPES)[number];

/**
 * FinancePhase2PageQueryDto (the real query DTO bound to GET /v1/finance/obligations,
 * verified against finance-phase2.controller.ts) only accepts
 * organizationId/countryId/status/page/pageSize server-side -- there is no
 * search, nature, direction, sourceDomain, counterparty, or date-range
 * parameter. Faking any of those as a client-side filter over an
 * already-paginated, server-truncated result set would silently misfilter
 * it (the same COD date-filter gap already documented in Phase 4A), so this
 * module intentionally only exposes `status` as a filter; nature/direction/
 * source/counterparty are still rendered as table columns, just not
 * filterable until the backend adds the query parameters.
 */
export interface ObligationListFilters {
  status: ObligationStatus | "";
  page: number;
  pageSize: number;
}

export function parseObligationListFilters(searchParams: URLSearchParams): ObligationListFilters {
  return {
    status: parseEnumFilter(searchParams.get("status"), OBLIGATION_STATUSES),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildObligationListSearchParams(filters: ObligationListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}
