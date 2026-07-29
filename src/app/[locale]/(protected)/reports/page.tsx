import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCurrencies } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { ReportCatalogue } from "@/features/reports/components/report-catalogue";
import { ReportExportPanel } from "@/features/reports/components/report-export-panel";
import { ReportFiltersBar } from "@/features/reports/components/report-filters-bar";
import { ReportPreviewTable } from "@/features/reports/components/report-preview-table";
import { getReport, type ExportReportQuery, type FinanceReportListResponse } from "@/features/reports/server/client";
import { parseReportListFilters, REPORT_TYPE_DESCRIPTIONS, REPORT_TYPE_LABEL_KEYS, REPORT_TYPES, type ReportListFilters, type ReportType } from "@/features/reports/server/list-query";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type ReportResult = { status: "ok"; report: FinanceReportListResponse } | { status: "error"; correlationId?: string };

function buildReportQuery(organizationId: string, filters: ReportListFilters): ExportReportQuery {
  return {
    organizationId,
    countryCode: filters.countryCode || undefined,
    currencyId: filters.currencyId || undefined,
    status: filters.status || undefined,
    counterpartyType: filters.counterpartyType || undefined,
    counterpartyId: filters.counterpartyId || undefined,
    sourceDomain: filters.sourceDomain || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    search: filters.search || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

async function fetchReportData(reportType: ReportType, query: ExportReportQuery, context: { accessToken?: string; locale: string }): Promise<ReportResult> {
  try {
    const report = await getReport(reportType, query, context);
    return { status: "ok", report };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function ReportsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.report.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseReportListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scopeOptions = resolveCashScopeOptions(session.actor);
  const scope = scopeOptions[0];
  const canExport = hasCapability(session.actor, "finance.report.export");

  const typeLabels = Object.fromEntries(REPORT_TYPES.map((type) => [type, t(`reports.catalogue.${REPORT_TYPE_LABEL_KEYS[type]}`)])) as Record<ReportType, string>;

  const filterLabels = {
    country: t("reports.filters.country"),
    currency: t("reports.filters.currency"),
    status: t("reports.filters.status"),
    counterpartyType: t("reports.filters.counterpartyType"),
    sourceDomain: t("reports.filters.sourceDomain"),
    dateFrom: t("reports.filters.dateFrom"),
    dateTo: t("reports.filters.dateTo"),
    search: t("reports.filters.search"),
    all: t("common.filters.all"),
    clearAll: t("common.filters.clearAll"),
    toggle: t("common.filters.toggle"),
  };

  let body: React.ReactNode;

  if (!scope) {
    body = <FinanceEmptyState title={t("reports.empty.title")} description={t("reports.empty.noScopeDescription")} />;
  } else {
    const countryCodes = [...new Set(scopeOptions.filter((option) => option.organizationId === scope.organizationId).map((option) => option.countryCode))];

    let reportSection: React.ReactNode = null;
    if (filters.reportType) {
      const [result, currencies] = await Promise.all([fetchReportData(filters.reportType, buildReportQuery(scope.organizationId, filters), context), listCurrencies(context)]);

      reportSection = (
        <>
          <ReportFiltersBar countryCodes={countryCodes} currencies={currencies.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))} labels={filterLabels} />

          {result.status === "error" ? (
            <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
          ) : result.report.items.length === 0 ? (
            <FinanceEmptyState title={t("reports.preview.empty")} description={t("reports.empty.description")} />
          ) : (
            <ReportPreviewTable
              items={result.report.items}
              total={result.report.total}
              ariaLabel={t("reports.preview.ariaLabel")}
              emptyTitle={t("reports.preview.empty")}
              emptyDescription={t("reports.empty.description")}
              pageSizeLabel={t("common.pagination.rowsPerPage")}
              previousLabel={t("common.pagination.previous")}
              nextLabel={t("common.pagination.next")}
              paginationAriaLabel={t("common.pagination.ariaLabel")}
            />
          )}

          {canExport ? (
            <ReportExportPanel
              reportType={filters.reportType}
              query={buildReportQuery(scope.organizationId, filters)}
              labels={{
                button: t("reports.export.button"),
                title: t("reports.export.title"),
                rowCount: t("reports.export.rowCount"),
                checksum: t("reports.export.checksum"),
                generatedAt: t("reports.export.generatedAt"),
                maxRows: t("reports.export.maxRows"),
                filename: t("reports.export.filename"),
                downloadCsv: t("reports.export.downloadCsv"),
                generatingLabel: t("reports.export.generatingLabel"),
                genericError: t("mutations.errors.unexpected"),
                correlationLabel: t("mutations.correlationId"),
              }}
            />
          ) : null}
        </>
      );
    }

    body = (
      <>
        <ReportCatalogue ariaLabel={t("reports.preview.ariaLabel")} typeLabel={t("reports.catalogue.typeLabel")} typeLabels={typeLabels} descriptions={REPORT_TYPE_DESCRIPTIONS} />
        {reportSection}
      </>
    );
  }

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.reports")}
        eyebrow={t("reports.list.eyebrow")}
        title={t("reports.list.title")}
        description={t("reports.list.description")}
      />
      {body}
    </PageStack>
  );
}
