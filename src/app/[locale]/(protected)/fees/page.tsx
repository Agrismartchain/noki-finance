import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FeeAssessmentFiltersBar } from "@/features/fees/components/fee-assessment-filters-bar";
import { FeeAssessmentTable } from "@/features/fees/components/fee-assessment-table";
import { FeesNotice } from "@/features/fees/components/fees-notice";
import { listFeeAssessments, type FeeAssessmentReportListResponse } from "@/features/fees/server/client";
import { FEE_ASSESSMENT_COUNTERPARTY_TYPES, FEE_ASSESSMENT_STATUSES, parseFeeAssessmentListFilters, type FeeAssessmentCounterpartyType, type FeeAssessmentStatus } from "@/features/fees/server/list-query";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type ListResult = { status: "ok"; report: FeeAssessmentReportListResponse } | { status: "no-scope" } | { status: "error"; correlationId?: string };

async function fetchListData(
  scope: { organizationId: string; countryCode: string } | undefined,
  filters: ReturnType<typeof parseFeeAssessmentListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<ListResult> {
  if (!scope) {
    return { status: "no-scope" };
  }
  try {
    const report = await listFeeAssessments(
      {
        organizationId: scope.organizationId,
        countryCode: scope.countryCode,
        status: filters.status || undefined,
        counterpartyType: filters.counterpartyType || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      },
      context,
    );
    return { status: "ok", report };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

/**
 * Gated on finance.report.read AND finance.fee.read together: the list
 * itself is powered by the "fees" report (finance.report.read), while each
 * row's detail link needs finance.fee.read. An actor missing exactly one of
 * the two still sees the page with a notice explaining which sub-view is
 * unavailable; only an actor with neither gets a hard ForbiddenView,
 * matching the app-level baseline-gate pattern.
 */
export default async function FeesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  const canReport = session.status === "authenticated" && hasCapability(session.actor, "finance.report.read");
  const canReadFee = session.status === "authenticated" && hasCapability(session.actor, "finance.fee.read");

  if (session.status !== "authenticated" || (!canReport && !canReadFee)) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseFeeAssessmentListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scope = resolveCashScopeOptions(session.actor)[0];

  const result = canReport ? await fetchListData(scope, filters, context) : ({ status: "no-scope" } as const);

  const statusLabels = Object.fromEntries(FEE_ASSESSMENT_STATUSES.map((status) => [status, t(`fees.assessments.status.${status}`)])) as Record<FeeAssessmentStatus, string>;
  const counterpartyTypeLabels = Object.fromEntries(FEE_ASSESSMENT_COUNTERPARTY_TYPES.map((type) => [type, type])) as Record<FeeAssessmentCounterpartyType, string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.fees")}
        eyebrow={t("fees.assessments.list.eyebrow")}
        title={t("fees.assessments.list.title")}
        description={t("fees.assessments.list.description")}
      />

      <Link href="/fees/rules">{t("fees.rules.list.title")}</Link>
      {canReadFee ? <Link href="/fees/assessments/new">{t("fees.assessments.create.title")}</Link> : null}

      {!canReport ? <FeesNotice tone="warning" message={t("fees.assessments.list.missingReportCapability")} /> : null}

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("fees.empty.title")} description={t("fees.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          {!canReadFee ? <FeesNotice tone="info" message={t("fees.assessments.list.missingFeeCapability")} /> : null}
          <FeeAssessmentFiltersBar
            statusLabels={statusLabels}
            counterpartyTypeLabels={counterpartyTypeLabels}
            statusLabel={t("fees.assessments.columns.status")}
            counterpartyTypeLabel={t("fees.assessments.columns.counterparty")}
            dateFromLabel={t("cashHandovers.list.dateFrom")}
            dateToLabel={t("cashHandovers.list.dateTo")}
            allLabel={t("common.filters.all")}
            clearAllLabel={t("common.filters.clearAll")}
            toggleLabel={t("common.filters.toggle")}
          />
          <FeeAssessmentTable
            items={result.report.items}
            total={result.report.total}
            locale={locale as Locale}
            canReadDetail={canReadFee}
            statusLabels={statusLabels}
            columnLabels={{
              reference: t("fees.assessments.columns.reference"),
              obligationId: t("fees.assessments.columns.obligationId"),
              type: t("fees.assessments.columns.type"),
              amount: t("fees.assessments.columns.amount"),
              sourceDomain: t("fees.assessments.columns.sourceDomain"),
              counterparty: t("fees.assessments.columns.counterparty"),
              status: t("fees.assessments.columns.status"),
              effectiveAt: t("fees.assessments.columns.effectiveAt"),
            }}
            tableAriaLabel={t("fees.assessments.table.ariaLabel")}
            emptyTitle={t("fees.empty.title")}
            emptyDescription={t("fees.empty.description")}
            pageSizeLabel={t("common.pagination.rowsPerPage")}
            previousLabel={t("common.pagination.previous")}
            nextLabel={t("common.pagination.next")}
            paginationAriaLabel={t("common.pagination.ariaLabel")}
            notAvailableLabel={t("common.notAvailable")}
          />
        </>
      )}
    </PageStack>
  );
}
