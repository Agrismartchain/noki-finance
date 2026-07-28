import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { VarianceFiltersBar } from "@/features/cash-variances/components/variance-filters-bar";
import { VarianceTable } from "@/features/cash-variances/components/variance-table";
import { listVariances, type CashVarianceListResponseDto } from "@/features/cash-variances/server/client";
import { parseVarianceListFilters, VARIANCE_STATUSES, VARIANCE_TYPES, varianceLimitOffset } from "@/features/cash-variances/server/list-query";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCurrencies } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type ListResult = { status: "ok"; variances: CashVarianceListResponseDto; currencies: { id: string; label: string }[] } | { status: "no-scope" } | { status: "error"; correlationId?: string };

async function fetchListData(
  organizationId: string,
  countryCode: string,
  filters: ReturnType<typeof parseVarianceListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<ListResult> {
  try {
    const { limit, offset } = varianceLimitOffset(filters);
    const [variances, currencies] = await Promise.all([
      listVariances({ organizationId, countryCode, currencyId: filters.currencyId || undefined, status: filters.status || undefined, from: filters.dateFrom || undefined, to: filters.dateTo || undefined, limit, offset }, context),
      listCurrencies(context),
    ]);
    return { status: "ok", variances, currencies: currencies.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })) };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashVariancesListPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.cash_variance.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseVarianceListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = scope ? await fetchListData(scope.organizationId, scope.countryCode, filters, context) : { status: "no-scope" as const };
  const statusLabels = Object.fromEntries(VARIANCE_STATUSES.map((status) => [status, t(`cashVariances.status.${status}`)])) as Record<(typeof VARIANCE_STATUSES)[number], string>;
  const typeLabels = Object.fromEntries(VARIANCE_TYPES.map((type) => [type, t(`cashVariances.type.${type}`)])) as Record<(typeof VARIANCE_TYPES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashVariances")}
        eyebrow={t("cashVariances.list.eyebrow")}
        title={t("cashVariances.list.title")}
        description={t("cashVariances.list.description")}
      />
      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("cashVariances.empty.title")} description={t("cashVariances.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <VarianceFiltersBar
            currencies={result.currencies}
            statusLabels={statusLabels}
            currencyLabel={t("cod.columns.currency")}
            statusLabel={t("cod.columns.status")}
            dateFromLabel={t("cashHandovers.list.dateFrom")}
            dateToLabel={t("cashHandovers.list.dateTo")}
            allLabel={t("common.filters.all")}
            clearAllLabel={t("common.filters.clearAll")}
            toggleLabel={t("common.filters.toggle")}
          />
          <VarianceTable
            items={result.variances.items}
            total={result.variances.total}
            locale={locale as Locale}
            typeLabels={typeLabels}
            varianceBadgeLabels={{
              shortfall: t("cashVariances.badge.shortfall"),
              excess: t("cashVariances.badge.excess"),
              resolved: t("cashVariances.badge.resolved"),
              waived: t("cashVariances.badge.waived"),
              balanced: t("cashVariances.badge.balanced"),
            }}
            columnLabels={{
              reference: t("cashHandovers.columns.reference"),
              type: t("cashVariances.columns.type"),
              source: t("cashVariances.columns.source"),
              expected: t("cod.columns.expected"),
              actual: t("cashVariances.columns.actual"),
              variance: t("cashVariances.columns.variance"),
              createdAt: t("cashHandovers.columns.createdAt"),
            }}
            tableAriaLabel={t("cashVariances.table.ariaLabel")}
            emptyTitle={t("cashVariances.empty.title")}
            emptyDescription={t("cashVariances.empty.description")}
            pageSizeLabel={t("common.pagination.rowsPerPage")}
            previousLabel={t("common.pagination.previous")}
            nextLabel={t("common.pagination.next")}
            paginationAriaLabel={t("common.pagination.ariaLabel")}
          />
        </>
      )}
    </PageStack>
  );
}
