import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { NokiRequestContext } from "@/lib/api/request-context";

import type { ReportCounterpartyType, ReportSourceDomain, ReportType } from "./list-query";

/**
 * FinanceReportListDto types `items` as `Record<string, never>[]` in the
 * generated OpenAPI schema because report rows genuinely vary by
 * reportType and the backend's service layer does not annotate a strict
 * per-report response DTO -- the same "known contract-typing quirk"
 * pattern already established for finance-phase2 endpoints (see
 * obligations/server/client.ts). This module intentionally keeps rows as a
 * loose `Record<string, unknown>` rather than hand-enumerating 10 shapes;
 * callers must render defensively (see isSensitiveKey in ./list-query).
 */
export type FinanceReportRow = Record<string, unknown>;

export interface FinanceAppliedFilters {
  organizationId?: string;
  countryId?: string;
  currencyId?: string;
  status?: string;
  counterpartyType?: ReportCounterpartyType;
  counterpartyId?: string;
  sourceDomain?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface FinanceReportListResponse {
  reportType: string;
  items: FinanceReportRow[];
  total: number;
  page: number;
  pageSize: number;
  appliedFilters: FinanceAppliedFilters;
  generatedAt: string;
}

export interface FinanceExportResponse {
  reportType: string;
  format: "CSV";
  mimeType: string;
  filename: string;
  checksum: string;
  rowCount: number;
  maxRows: number;
  /**
   * The exact CSV bytes produced by noki-api. Never parsed, reformatted, or
   * converted client-side (e.g. to XLSX) -- only ever saved verbatim via a
   * Blob download using the server's own filename.
   */
  content: string;
  appliedFilters: FinanceAppliedFilters;
}

interface OpenApiFetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function unwrap<T>(result: OpenApiFetchResult<T>): T {
  if (!result.response.ok || result.error !== undefined) {
    throw toNokiApiError(result.response.status, result.error);
  }
  if (result.data === undefined) {
    throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", { status: result.response.status });
  }
  return result.data;
}

export interface ReportConsumerQuery {
  organizationId?: string;
  countryId?: string;
  countryCode?: string;
  currencyId?: string;
  status?: string;
  counterpartyType?: ReportCounterpartyType;
  counterpartyId?: string;
  sourceDomain?: ReportSourceDomain;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * GET /v1/finance/reports/{reportType} -- requires finance.report.read.
 * `reportType` must be one of the 10 REPORT_TYPES literals; the backend
 * rejects anything else with a 400.
 */
export async function getReport(reportType: ReportType, query: ReportConsumerQuery, context: NokiRequestContext): Promise<FinanceReportListResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/reports/{reportType}", { params: { path: { reportType }, query } });
  return unwrap(result) as unknown as FinanceReportListResponse;
}

export type ExportReportQuery = ReportConsumerQuery;

/**
 * POST /v1/finance/reports/{reportType}/exports -- requires
 * finance.report.export. No Idempotency-Key header: verified this endpoint
 * is a read from the client's perspective (it produces a fresh CSV
 * snapshot rather than creating or mutating a stored resource), so it
 * deliberately does not follow the Idempotency-Key convention used by
 * finance-phase2's mutation endpoints (see IDEMPOTENCY_KEY_HEADER). Format
 * is always the literal 'CSV' -- there is no client-side XLSX conversion.
 */
export async function exportReport(reportType: ReportType, query: ExportReportQuery, context: NokiRequestContext): Promise<FinanceExportResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/reports/{reportType}/exports", {
    params: { path: { reportType } },
    body: { ...query, format: "CSV" } as never,
  });
  return unwrap(result) as unknown as FinanceExportResponse;
}
