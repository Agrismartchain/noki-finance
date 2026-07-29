import { parseEnumFilter, parsePage, parsePageSize, parseSearch } from "@/features/finance-shared/url-query";

/**
 * FINANCE_REPORT_TYPES (finance-consumer.dto.ts), verified against the
 * backend's actual literal list. GET /v1/finance/reports/{reportType}
 * returns a 400 "Unsupported Finance report type" for any value outside
 * this exact set of 10 -- never add an 11th here without re-verifying.
 */
export const REPORT_TYPES = [
  "cod",
  "cash-sessions",
  "variances",
  "reconciliations",
  "fees",
  "invoices",
  "obligations",
  "payouts",
  "payment-method-status",
  "seller-settlements",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Maps a report type to its `reports.catalogue.*` translation key segment. */
export const REPORT_TYPE_LABEL_KEYS: Record<ReportType, string> = {
  cod: "cod",
  "cash-sessions": "cashSessions",
  variances: "variances",
  reconciliations: "reconciliations",
  fees: "fees",
  invoices: "invoices",
  obligations: "obligations",
  payouts: "payouts",
  "payment-method-status": "paymentMethodStatus",
  "seller-settlements": "sellerSettlements",
};

/**
 * Short static UI copy describing each report type on the catalogue page.
 * DEVIATION: the i18n key tree specified for this module
 * (`reports.catalogue.*`) only carries one label per report type, with no
 * separate description key, and messages/{fr,en,ar}.json are centrally
 * owned so a new key cannot be added here. Per the brief's own framing
 * ("purely UI copy, not data"), these are plain static English strings
 * rather than translated copy -- flagged as a known gap, not silently
 * dropped.
 */
export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  cod: "Cash-on-delivery collections declared, remitted, and reconciled per order.",
  "cash-sessions": "Cashier session openings, closings, and their reported variances.",
  variances: "Cash variances raised during session reconciliation, open or resolved.",
  reconciliations: "Financial reconciliations submitted and approved across countries.",
  fees: "Assessed platform fees per fee rule and counterparty.",
  invoices: "Financial documents (invoices, statements) generated for counterparties.",
  obligations: "Payable and receivable obligations and their settlement progress.",
  payouts: "Payout batches from proposal through payment or failure.",
  "payment-method-status": "Counterparty payment method verification and activation status.",
  "seller-settlements": "Seller settlement summaries across the obligation lifecycle.",
};

/**
 * FinanceConsumerQueryDto's counterpartyType enum, verified against
 * finance-consumer.dto.ts (same values as FinancialObligation's
 * counterpartyType). Options render the raw value as their label -- no
 * translation key exists for this enum in this module's key tree, matching
 * the reference obligations module's own precedent of rendering
 * counterpartyType/sourceDomain untranslated (see obligation-table.tsx).
 */
export const REPORT_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
export type ReportCounterpartyType = (typeof REPORT_COUNTERPARTY_TYPES)[number];

/** FinanceConsumerQueryDto's sourceDomain enum, verified against finance-consumer.dto.ts. */
export const REPORT_SOURCE_DOMAINS = ["COMMERCE", "FOOD", "MOBILITY_TAXI", "MOBILITY_TAXI_MOTO", "COURIER", "PLATFORM", "MANUAL_ADJUSTMENT"] as const;
export type ReportSourceDomain = (typeof REPORT_SOURCE_DOMAINS)[number];

const MAX_STATUS_LENGTH = 120;
const MAX_COUNTERPARTY_ID_LENGTH = 128;

export function parseReportType(value: string | null | undefined): ReportType | "" {
  return parseEnumFilter(value, REPORT_TYPES);
}

/** countryCode is 2-char and uppercased server-side (FinanceConsumerQueryDto) -- normalized the same way here so the URL and the request always agree. */
export function parseCountryCode(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : "";
}

export interface ReportListFilters {
  reportType: ReportType | "";
  countryCode: string;
  currencyId: string;
  status: string;
  counterpartyType: ReportCounterpartyType | "";
  counterpartyId: string;
  sourceDomain: ReportSourceDomain | "";
  dateFrom: string;
  dateTo: string;
  search: string;
  page: number;
  pageSize: number;
}

export function parseReportListFilters(searchParams: URLSearchParams): ReportListFilters {
  return {
    reportType: parseReportType(searchParams.get("report")),
    countryCode: parseCountryCode(searchParams.get("countryCode")),
    currencyId: (searchParams.get("currencyId") ?? "").trim(),
    status: (searchParams.get("status") ?? "").trim().slice(0, MAX_STATUS_LENGTH),
    counterpartyType: parseEnumFilter(searchParams.get("counterpartyType"), REPORT_COUNTERPARTY_TYPES),
    counterpartyId: (searchParams.get("counterpartyId") ?? "").trim().slice(0, MAX_COUNTERPARTY_ID_LENGTH),
    sourceDomain: parseEnumFilter(searchParams.get("sourceDomain"), REPORT_SOURCE_DOMAINS),
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    search: parseSearch(searchParams.get("search")),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildReportListSearchParams(filters: ReportListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.reportType) params.set("report", filters.reportType);
  if (filters.countryCode) params.set("countryCode", filters.countryCode);
  if (filters.currencyId) params.set("currencyId", filters.currencyId);
  if (filters.status) params.set("status", filters.status);
  if (filters.counterpartyType) params.set("counterpartyType", filters.counterpartyType);
  if (filters.counterpartyId) params.set("counterpartyId", filters.counterpartyId);
  if (filters.sourceDomain) params.set("sourceDomain", filters.sourceDomain);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search) params.set("search", filters.search);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}

/**
 * Defensive key check applied wherever a report row is rendered generically.
 * No report row is currently known to carry any of these keys (verified),
 * but preview columns are derived from whatever keys the backend returns,
 * so this stays defensive rather than relying on an enumerated allow-list.
 */
export function isSensitiveKey(key: string): boolean {
  return /secret|token|password|fingerprint|sensitivereference|iban/i.test(key);
}
