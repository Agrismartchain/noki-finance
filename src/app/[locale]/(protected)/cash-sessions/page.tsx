import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { SessionFiltersBar } from "@/features/cash-sessions/components/session-filters-bar";
import { SessionTable } from "@/features/cash-sessions/components/session-table";
import { listSessions, type CashSessionListResponseDto } from "@/features/cash-sessions/server/client";
import { parseSessionListFilters, SESSION_STATUSES, sessionLimitOffset } from "@/features/cash-sessions/server/list-query";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCurrencies, toCurrencyCodeMap, type AdminCurrencyDto } from "@/features/finance-shared/server/master-data";
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

type ListResult = { status: "ok"; sessions: CashSessionListResponseDto; currencies: AdminCurrencyDto[] } | { status: "no-scope" } | { status: "error"; correlationId?: string };

async function fetchListData(
  organizationId: string,
  countryCode: string,
  filters: ReturnType<typeof parseSessionListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<ListResult> {
  try {
    const { limit, offset } = sessionLimitOffset(filters);
    const [sessions, currencies] = await Promise.all([
      listSessions({ organizationId, countryCode, currencyId: filters.currencyId || undefined, status: filters.status || undefined, from: filters.dateFrom || undefined, to: filters.dateTo || undefined, limit, offset }, context),
      listCurrencies(context),
    ]);
    return { status: "ok", sessions, currencies };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashSessionsListPage({ params, searchParams }: PageProps) {
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
  const filters = parseSessionListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = scope ? await fetchListData(scope.organizationId, scope.countryCode, filters, context) : { status: "no-scope" as const };
  const statusLabels = Object.fromEntries(SESSION_STATUSES.map((status) => [status, t(`cashSessions.status.${status}`)])) as Record<(typeof SESSION_STATUSES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashSessions")}
        eyebrow={t("cashSessions.list.eyebrow")}
        title={t("cashSessions.list.title")}
        description={t("cashSessions.list.description")}
      />
      {hasCapability(session.actor, "finance.cash_session.open") ? <Link href="/cash-sessions/new">{t("cashSessions.list.openAction")}</Link> : null}

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("cashSessions.empty.title")} description={t("cashSessions.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <SessionFiltersBar
            currencies={result.currencies.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
            statusLabels={statusLabels}
            currencyLabel={t("cod.columns.currency")}
            statusLabel={t("cod.columns.status")}
            dateFromLabel={t("cashHandovers.list.dateFrom")}
            dateToLabel={t("cashHandovers.list.dateTo")}
            allLabel={t("common.filters.all")}
            clearAllLabel={t("common.filters.clearAll")}
            toggleLabel={t("common.filters.toggle")}
          />
          <SessionTable
            items={result.sessions.items}
            total={result.sessions.total}
            locale={locale as Locale}
            currencyCodeById={toCurrencyCodeMap(result.currencies)}
            statusLabels={statusLabels}
            columnLabels={{
              reference: t("cashSessions.columns.reference"),
              cashier: t("cashSessions.columns.cashier"),
              currency: t("cod.columns.currency"),
              openingAmount: t("cashSessions.columns.openingAmount"),
              variance: t("cashSessions.columns.variance"),
              status: t("cod.columns.status"),
              openedAt: t("cashSessions.columns.openedAt"),
            }}
            tableAriaLabel={t("cashSessions.table.ariaLabel")}
            emptyTitle={t("cashSessions.empty.title")}
            emptyDescription={t("cashSessions.empty.description")}
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
