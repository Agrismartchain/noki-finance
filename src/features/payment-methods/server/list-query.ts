import { parseEnumFilter, parsePage, parsePageSize } from "@/features/finance-shared/url-query";

/** PaymentMethodStatus, verified against finance-phase2.service.ts. */
export const PAYMENT_METHOD_STATUSES = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "REVOKED"] as const;
export type PaymentMethodStatus = (typeof PAYMENT_METHOD_STATUSES)[number];

export const PAYMENT_METHOD_TYPES = ["BANK_ACCOUNT", "MOBILE_MONEY"] as const;
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

/** FINANCE_COUNTERPARTY_TYPES, verified against CreateFinancePaymentMethodDto -- same enum as obligations' counterparty type. */
export const PAYMENT_METHOD_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
export type PaymentMethodCounterpartyType = (typeof PAYMENT_METHOD_COUNTERPARTY_TYPES)[number];

/**
 * FinancePhase2PageQueryDto (the real query DTO bound to GET
 * /v1/finance/payment-methods) accepts organizationId/countryId/status/page/
 * pageSize server-side. countryId is resolved server-side (see
 * resolveScopeCountryId in finance-shared/scope.ts) from the session's
 * countryCode against master-data countries, so this module only needs to
 * expose `status` as a client-driven filter.
 */
export interface PaymentMethodListFilters {
  status: PaymentMethodStatus | "";
  page: number;
  pageSize: number;
}

export function parsePaymentMethodListFilters(searchParams: URLSearchParams): PaymentMethodListFilters {
  return {
    status: parseEnumFilter(searchParams.get("status"), PAYMENT_METHOD_STATUSES),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildPaymentMethodListSearchParams(filters: PaymentMethodListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}
