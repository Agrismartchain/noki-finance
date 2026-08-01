import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions, resolveScopeCountryId } from "@/features/finance-shared/scope";
import { ObligationFiltersBar } from "@/features/obligations/components/obligation-filters-bar";
import { ObligationTable } from "@/features/obligations/components/obligation-table";
import { listObligations, type FinancialObligationListResponse } from "@/features/obligations/server/client";
import { OBLIGATION_STATUSES, parseObligationListFilters } from "@/features/obligations/server/list-query";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type ObligationListResult = { status: "ok"; obligations: FinancialObligationListResponse } | { status: "no-scope" } | { status: "error"; correlationId?: string };

/**
 * FinancePhase2PageQueryDto requires both organizationId AND countryId.
 * countryId must be the real Country.id, resolved via resolveScopeCountryId
 * against listCountries(context) -- Membership.countryScopes only exposes
 * countryCode, never a usable Country.id, and organizationCountryId is a
 * different association entirely (never a valid substitute).
 */
export async function fetchObligationListData(
  scope: { organizationId: string; countryCode: string } | undefined,
  filters: ReturnType<typeof parseObligationListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<ObligationListResult> {
  if (!scope) {
    return { status: "no-scope" };
  }
  try {
    const countries = await listCountries(context);
    const resolved = resolveScopeCountryId(scope, countries);
    if (!resolved) {
      return { status: "no-scope" };
    }
    const obligations = await listObligations(
      { organizationId: resolved.organizationId, countryId: resolved.countryId, status: filters.status || undefined, page: filters.page, pageSize: filters.pageSize },
      context,
    );
    return { status: "ok", obligations };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function ObligationsListPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.obligation.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseObligationListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scopeOptions = resolveCashScopeOptions(session.actor);
  const scope = scopeOptions[0];

  const result = await fetchObligationListData(scope, filters, context);
  const statusLabels = Object.fromEntries(OBLIGATION_STATUSES.map((status) => [status, t(`obligations.status.${status}`)])) as Record<(typeof OBLIGATION_STATUSES)[number], string>;
  const natureLabels = {
    COD_PROCEEDS: t("obligations.nature.COD_PROCEEDS"),
    SERVICE_FEE: t("obligations.nature.SERVICE_FEE"),
    COMMISSION: t("obligations.nature.COMMISSION"),
    EXPENSE: t("obligations.nature.EXPENSE"),
    BONUS: t("obligations.nature.BONUS"),
    REFUND: t("obligations.nature.REFUND"),
    WITHHOLDING: t("obligations.nature.WITHHOLDING"),
    PENALTY: t("obligations.nature.PENALTY"),
    PAYOUT: t("obligations.nature.PAYOUT"),
    ADJUSTMENT: t("obligations.nature.ADJUSTMENT"),
  };
  const directionLabels = { PAYABLE: t("obligations.direction.PAYABLE"), RECEIVABLE: t("obligations.direction.RECEIVABLE") };

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.obligations")}
        eyebrow={t("obligations.list.eyebrow")}
        title={t("obligations.list.title")}
        description={t("obligations.list.description")}
      />

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("obligations.empty.title")} description={t("obligations.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <ObligationFiltersBar statusLabels={statusLabels} statusLabel={t("obligations.columns.status")} allLabel={t("common.filters.all")} clearAllLabel={t("common.filters.clearAll")} toggleLabel={t("common.filters.toggle")} />
          <ObligationTable
            items={result.obligations.items}
            total={result.obligations.total}
            locale={locale as Locale}
            statusLabels={statusLabels}
            columnLabels={{
              reference: t("obligations.columns.reference"),
              nature: t("obligations.columns.nature"),
              direction: t("obligations.columns.direction"),
              counterparty: t("obligations.columns.counterparty"),
              source: t("obligations.columns.source"),
              original: t("obligations.columns.original"),
              allocated: t("obligations.columns.allocated"),
              settled: t("obligations.columns.settled"),
              remaining: t("obligations.columns.remaining"),
              status: t("obligations.columns.status"),
              effectiveAt: t("obligations.columns.effectiveAt"),
              dueAt: t("obligations.columns.dueAt"),
              hold: t("obligations.columns.hold"),
            }}
            natureLabels={natureLabels}
            directionLabels={directionLabels}
            holdLabel={t("obligations.columns.holdYes")}
            noHoldLabel={t("obligations.columns.holdNo")}
            tableAriaLabel={t("obligations.table.ariaLabel")}
            emptyTitle={t("obligations.empty.title")}
            emptyDescription={t("obligations.empty.description")}
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
