import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { ReconciliationFiltersBar } from "@/features/reconciliations/components/reconciliation-filters-bar";
import { ReconciliationTable } from "@/features/reconciliations/components/reconciliation-table";
import { listReconciliations, type FinancialReconciliationListResponseDto } from "@/features/reconciliations/server/client";
import { parseReconciliationListFilters, reconciliationLimitOffset, RECONCILIATION_STATUSES } from "@/features/reconciliations/server/list-query";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCurrencies } from "@/features/finance-shared/server/master-data";
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

type ListResult = { status: "ok"; reconciliations: FinancialReconciliationListResponseDto; currencies: { id: string; label: string }[] } | { status: "no-scope" } | { status: "error"; correlationId?: string };

async function fetchListData(
  organizationId: string,
  countryCode: string,
  filters: ReturnType<typeof parseReconciliationListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<ListResult> {
  try {
    const { limit, offset } = reconciliationLimitOffset(filters);
    const [reconciliations, currencies] = await Promise.all([
      listReconciliations({ organizationId, countryCode, currencyId: filters.currencyId || undefined, status: filters.status || undefined, from: filters.dateFrom || undefined, to: filters.dateTo || undefined, limit, offset }, context),
      listCurrencies(context),
    ]);
    return { status: "ok", reconciliations, currencies: currencies.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })) };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function ReconciliationsListPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.cash.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseReconciliationListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = scope ? await fetchListData(scope.organizationId, scope.countryCode, filters, context) : { status: "no-scope" as const };
  const statusLabels = Object.fromEntries(RECONCILIATION_STATUSES.map((status) => [status, t(`reconciliations.status.${status}`)])) as Record<(typeof RECONCILIATION_STATUSES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.reconciliations")}
        eyebrow={t("reconciliations.list.eyebrow")}
        title={t("reconciliations.list.title")}
        description={t("reconciliations.list.description")}
      />
      {hasCapability(session.actor, "finance.reconciliation.create") ? <Link href="/reconciliations/new">{t("reconciliations.list.createAction")}</Link> : null}

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("reconciliations.empty.title")} description={t("reconciliations.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <ReconciliationFiltersBar
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
          <ReconciliationTable
            items={result.reconciliations.items}
            total={result.reconciliations.total}
            locale={locale as Locale}
            statusLabels={statusLabels}
            columnLabels={{
              reference: t("cashHandovers.columns.reference"),
              session: t("cashHandovers.columns.session"),
              expected: t("cod.columns.expected"),
              received: t("reconciliations.columns.received"),
              variance: t("cashVariances.columns.variance"),
              status: t("cod.columns.status"),
              createdAt: t("cashHandovers.columns.createdAt"),
            }}
            tableAriaLabel={t("reconciliations.table.ariaLabel")}
            emptyTitle={t("reconciliations.empty.title")}
            emptyDescription={t("reconciliations.empty.description")}
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
