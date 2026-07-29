import { parseEnumFilter, parsePage, parsePageSize } from "@/features/finance-shared/url-query";

/** FinanceFeeAssessmentStatus, verified against the "fees" report row shape in finance-consumer.service.ts. */
export const FEE_ASSESSMENT_STATUSES = ["ASSESSED", "VOIDED"] as const;
export type FeeAssessmentStatus = (typeof FEE_ASSESSMENT_STATUSES)[number];

/** FINANCE_COUNTERPARTY_TYPES, the same shared enum used by FinanceConsumerQueryDto.counterpartyType. */
export const FEE_ASSESSMENT_COUNTERPARTY_TYPES = ["SELLER", "AFFILIATE", "RESTAURANT", "DRIVER", "COURIER", "LOGISTICS_PARTNER", "CUSTOMER", "NOKI_PLATFORM", "OTHER"] as const;
export type FeeAssessmentCounterpartyType = (typeof FEE_ASSESSMENT_COUNTERPARTY_TYPES)[number];

/**
 * URL filter shape for the fee-assessments report list (GET
 * /v1/finance/reports/fees). Unlike the obligations list, FinanceConsumerQueryDto
 * (the real query DTO bound to this endpoint) does support status,
 * counterpartyType, and a dateFrom/dateTo range server-side -- confirmed
 * against FinanceConsumerController_report's generated operation -- so all
 * four are real, server-supported filters here, not a client-side fake.
 */
export interface FeeAssessmentListFilters {
  status: FeeAssessmentStatus | "";
  counterpartyType: FeeAssessmentCounterpartyType | "";
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export function parseFeeAssessmentListFilters(searchParams: URLSearchParams): FeeAssessmentListFilters {
  return {
    status: parseEnumFilter(searchParams.get("status"), FEE_ASSESSMENT_STATUSES),
    counterpartyType: parseEnumFilter(searchParams.get("counterpartyType"), FEE_ASSESSMENT_COUNTERPARTY_TYPES),
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildFeeAssessmentListSearchParams(filters: FeeAssessmentListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.counterpartyType) params.set("counterpartyType", filters.counterpartyType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}
