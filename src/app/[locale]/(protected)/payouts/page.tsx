import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { PayoutFiltersBar } from "@/features/payouts/components/payout-filters-bar";
import { PayoutTable } from "@/features/payouts/components/payout-table";
import { listPayouts, PAYOUT_COUNTERPARTY_TYPES, type PayoutReportResponse } from "@/features/payouts/server/client";
import { PAYOUT_STATUSES, parsePayoutListFilters } from "@/features/payouts/server/list-query";
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

type PayoutListResult = { status: "ok"; payouts: PayoutReportResponse } | { status: "no-scope" } | { status: "error"; correlationId?: string };

/**
 * The phase-2 payout controller has no list endpoint at all (verified) -- GET
 * /v1/finance/reports/{reportType} with reportType="payouts" is the only real, paginated
 * list-shaped source. Scoped by organizationId + the actor's countryCode, matching the
 * FinanceConsumerQueryDto's real optional query fields.
 */
async function fetchPayoutListData(
  scope: { organizationId: string; countryCode: string },
  filters: ReturnType<typeof parsePayoutListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<PayoutListResult> {
  try {
    const payouts = await listPayouts(
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
    return { status: "ok", payouts };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function PayoutsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.payout.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parsePayoutListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scopeOptions = resolveCashScopeOptions(session.actor);
  const scope = scopeOptions[0];

  const result = scope ? await fetchPayoutListData(scope, filters, context) : { status: "no-scope" as const };

  const statusLabels = Object.fromEntries(PAYOUT_STATUSES.map((status) => [status, t(`payouts.status.${status}`)])) as Record<(typeof PAYOUT_STATUSES)[number], string>;
  const counterpartyTypeLabels = Object.fromEntries(PAYOUT_COUNTERPARTY_TYPES.map((type) => [type, t(`payouts.counterpartyType.${type}`)])) as Record<
    (typeof PAYOUT_COUNTERPARTY_TYPES)[number],
    string
  >;

  const canCreate = hasCapability(session.actor, "finance.payout.prepare");

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.payouts")}
        eyebrow={t("payouts.list.eyebrow")}
        title={t("payouts.list.title")}
        description={t("payouts.list.description")}
      />

      {canCreate ? <Link href="/payouts/new">{t("payouts.list.createAction")}</Link> : null}

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("payouts.empty.title")} description={t("payouts.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <PayoutFiltersBar
            statusLabels={statusLabels}
            counterpartyTypeLabels={counterpartyTypeLabels}
            statusLabel={t("payouts.columns.status")}
            counterpartyTypeLabel={t("payouts.columns.counterparty")}
            dateFromLabel={t("payouts.list.dateFrom")}
            dateToLabel={t("payouts.list.dateTo")}
            allLabel={t("common.filters.all")}
            clearAllLabel={t("common.filters.clearAll")}
            toggleLabel={t("common.filters.toggle")}
          />
          <PayoutTable
            items={result.payouts.items}
            total={result.payouts.total}
            locale={locale as Locale}
            statusLabels={statusLabels}
            columnLabels={{
              reference: t("payouts.columns.reference"),
              counterparty: t("payouts.columns.counterparty"),
              amount: t("payouts.columns.amount"),
              paymentMethod: t("payouts.columns.paymentMethod"),
              status: t("payouts.columns.status"),
              createdAt: t("payouts.columns.createdAt"),
              updatedAt: t("payouts.columns.updatedAt"),
            }}
            tableAriaLabel={t("payouts.table.ariaLabel")}
            emptyTitle={t("payouts.empty.title")}
            emptyDescription={t("payouts.empty.description")}
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
