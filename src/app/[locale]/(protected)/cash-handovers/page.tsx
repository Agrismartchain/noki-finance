import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { HandoverFiltersBar } from "@/features/cash-handovers/components/handover-filters-bar";
import { HandoverTable } from "@/features/cash-handovers/components/handover-table";
import { listHandovers, type CashHandoverListResponseDto } from "@/features/cash-handovers/server/client";
import { handoverLimitOffset, HANDOVER_STATUSES, parseHandoverListFilters } from "@/features/cash-handovers/server/list-query";
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

type HandoverListResult =
  | { status: "ok"; handovers: CashHandoverListResponseDto; currencies: AdminCurrencyDto[] }
  | { status: "no-scope" }
  | { status: "error"; correlationId?: string };

async function fetchHandoverListData(
  organizationId: string,
  countryCode: string,
  filters: ReturnType<typeof parseHandoverListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<HandoverListResult> {
  try {
    const { limit, offset } = handoverLimitOffset(filters);
    const [handovers, currencies] = await Promise.all([
      listHandovers({ organizationId, countryCode, currencyId: filters.currencyId || undefined, status: filters.status || undefined, from: filters.dateFrom || undefined, to: filters.dateTo || undefined, limit, offset }, context),
      listCurrencies(context),
    ]);
    return { status: "ok", handovers, currencies };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashHandoversListPage({ params, searchParams }: PageProps) {
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
  const filters = parseHandoverListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scopeOptions = resolveCashScopeOptions(session.actor);
  const scope = scopeOptions[0];

  const result = scope ? await fetchHandoverListData(scope.organizationId, scope.countryCode, filters, context) : { status: "no-scope" as const };
  const statusLabels = Object.fromEntries(HANDOVER_STATUSES.map((status) => [status, t(`cashHandovers.status.${status}`)])) as Record<(typeof HANDOVER_STATUSES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashHandovers")}
        eyebrow={t("cashHandovers.list.eyebrow")}
        title={t("cashHandovers.list.title")}
        description={t("cashHandovers.list.description")}
      />
      {hasCapability(session.actor, "finance.cash.handover.create") ? <Link href="/cash-handovers/new">{t("cashHandovers.list.createAction")}</Link> : null}

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("cashHandovers.empty.title")} description={t("cashHandovers.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <HandoverFiltersBar
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
          <HandoverTable
            items={result.handovers.items}
            total={result.handovers.total}
            locale={locale as Locale}
            currencyCodeById={toCurrencyCodeMap(result.currencies)}
            statusLabels={statusLabels}
            columnLabels={{
              reference: t("cashHandovers.columns.reference"),
              organization: t("cashHandovers.columns.organization"),
              session: t("cashHandovers.columns.session"),
              currency: t("cod.columns.currency"),
              lineCount: t("cashHandovers.columns.lineCount"),
              totalHandedOver: t("cashHandovers.columns.totalHandedOver"),
              totalReceived: t("cashHandovers.columns.totalReceived"),
              status: t("cod.columns.status"),
              createdAt: t("cashHandovers.columns.createdAt"),
            }}
            tableAriaLabel={t("cashHandovers.table.ariaLabel")}
            emptyTitle={t("cashHandovers.empty.title")}
            emptyDescription={t("cashHandovers.empty.description")}
            pageSizeLabel={t("common.pagination.rowsPerPage")}
            previousLabel={t("common.pagination.previous")}
            nextLabel={t("common.pagination.next")}
            paginationAriaLabel={t("common.pagination.ariaLabel")}
            noSessionLabel={t("cashHandovers.detail.notAvailable")}
          />
        </>
      )}
    </PageStack>
  );
}
