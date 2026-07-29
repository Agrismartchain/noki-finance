import { parseEnumFilter, parsePage, parsePageSize } from "@/features/finance-shared/url-query";

/** FinancialDocumentStatus, verified against finance-phase2.service.ts. */
export const DOCUMENT_STATUSES = ["DRAFT", "GENERATED", "SUBMITTED", "APPROVED", "VOIDED"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** GenerateFinancialDocumentDto.documentType enum. */
export const DOCUMENT_TYPES = ["INVOICE", "STATEMENT", "CREDIT_NOTE"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** FINANCE_COUNTERPARTY_TYPES, shared across every finance-phase2 DTO that references a counterparty. */
export const DOCUMENT_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
export type DocumentCounterpartyType = (typeof DOCUMENT_COUNTERPARTY_TYPES)[number];

/**
 * FinanceConsumerQueryDto (the real query DTO bound to GET /v1/finance/reports/{reportType},
 * verified against finance-consumer.controller.ts) accepts more filters than this page
 * exposes (organizationId, countryId, countryCode, currencyId, counterpartyId,
 * sourceDomain, search, sortBy, sortOrder). This module intentionally only exposes
 * status, counterpartyType, and the dateFrom/dateTo range -- all real, server-supported
 * fields -- matching the phase brief's scope; the rest remain server-supported but not
 * yet surfaced as a client filter here.
 */
export interface DocumentListFilters {
  status: DocumentStatus | "";
  counterpartyType: DocumentCounterpartyType | "";
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export function parseDocumentListFilters(searchParams: URLSearchParams): DocumentListFilters {
  return {
    status: parseEnumFilter(searchParams.get("status"), DOCUMENT_STATUSES),
    counterpartyType: parseEnumFilter(searchParams.get("counterpartyType"), DOCUMENT_COUNTERPARTY_TYPES),
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildDocumentListSearchParams(filters: DocumentListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.counterpartyType) params.set("counterpartyType", filters.counterpartyType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}
