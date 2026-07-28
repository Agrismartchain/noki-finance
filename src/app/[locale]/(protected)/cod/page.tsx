import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { CodFiltersBar } from "@/features/cod/components/cod-filters-bar";
import { CodTable } from "@/features/cod/components/cod-table";
import { listCodCollections, listCountries, listCurrencies, type AdminFinanceCodCollectionDto, type AdminCountryDto, type AdminCurrencyDto } from "@/features/cod/server/client";
import { COD_STATUSES, parseCodListFilters } from "@/features/cod/server/list-query";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

interface CodListData {
  items: AdminFinanceCodCollectionDto[];
  total: number;
  countries: AdminCountryDto[];
  currencies: AdminCurrencyDto[];
}

type CodListResult = { status: "ok"; data: CodListData } | { status: "error"; correlationId?: string };

export default async function CodListPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.executive.read")) {
    return <ForbiddenView />;
  }

  const context = { accessToken, locale };
  const t = await getTranslations();
  const filters = parseCodListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));

  const result = await fetchCodListData(filters, context);

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cod")}
        eyebrow={t("cod.list.eyebrow")}
        title={t("cod.list.title")}
        description={t("cod.list.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState
          title={t("dashboard.states.errorTitle")}
          description={t("dashboard.states.errorDescription")}
          correlationId={result.correlationId}
          correlationLabel={t("mutations.correlationId")}
        />
      ) : (
        <>
          <CodFiltersBar
            countries={result.data.countries.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
            currencies={result.data.currencies.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
            statusLabels={Object.fromEntries(COD_STATUSES.map((status) => [status, t(`cod.status.${status}`)])) as Record<(typeof COD_STATUSES)[number], string>}
            searchLabel={t("cod.list.searchLabel")}
            statusLabel={t("cod.columns.status")}
            countryLabel={t("cod.columns.country")}
            currencyLabel={t("cod.columns.currency")}
            allLabel={t("common.filters.all")}
            clearAllLabel={t("common.filters.clearAll")}
            toggleLabel={t("common.filters.toggle")}
          />
          <CodTable
            items={result.data.items}
            total={result.data.total}
            locale={locale as Locale}
            columnLabels={{
              orderNumber: t("cod.columns.orderNumber"),
              organization: t("cod.columns.organization"),
              country: t("cod.columns.country"),
              currency: t("cod.columns.currency"),
              expected: t("cod.columns.expected"),
              declared: t("cod.columns.declared"),
              status: t("cod.columns.status"),
              declaredAt: t("cod.columns.declaredAt"),
            }}
            statusLabels={Object.fromEntries(COD_STATUSES.map((status) => [status, t(`cod.status.${status}`)])) as Record<string, string>}
            tableAriaLabel={t("cod.table.ariaLabel")}
            emptyTitle={t("cod.empty.title")}
            emptyDescription={t("cod.empty.description")}
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

async function fetchCodListData(
  filters: ReturnType<typeof parseCodListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<CodListResult> {
  try {
    const [{ items, total }, countries, currencies] = await Promise.all([
      listCodCollections(
        {
          page: filters.page,
          pageSize: filters.pageSize,
          search: filters.search || undefined,
          status: filters.status || undefined,
          countryId: filters.countryId || undefined,
          currencyId: filters.currencyId || undefined,
        },
        context,
      ),
      listCountries(context),
      listCurrencies(context),
    ]);
    return { status: "ok", data: { items, total, countries, currencies } };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}
