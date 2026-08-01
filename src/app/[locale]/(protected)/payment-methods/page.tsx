import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions, resolveScopeCountryId } from "@/features/finance-shared/scope";
import { PaymentMethodFiltersBar } from "@/features/payment-methods/components/payment-method-filters-bar";
import { PaymentMethodTable } from "@/features/payment-methods/components/payment-method-table";
import { listPaymentMethods, type PaymentMethodDto, type PaymentMethodListResponse } from "@/features/payment-methods/server/client";
import { PAYMENT_METHOD_STATUSES, parsePaymentMethodListFilters } from "@/features/payment-methods/server/list-query";
import { Link } from "@/i18n/navigation";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type PaymentMethodListResult = { status: "ok"; paymentMethods: PaymentMethodListResponse } | { status: "no-scope" } | { status: "error"; correlationId?: string };

/**
 * FinancePhase2PageQueryDto requires both organizationId AND countryId.
 * countryId must be the real Country.id, resolved via resolveScopeCountryId
 * against listCountries(context) -- Membership.countryScopes only exposes
 * countryCode, never a usable Country.id, and organizationCountryId is a
 * different association entirely (never a valid substitute).
 */
export async function fetchPaymentMethodListData(
  scope: { organizationId: string; countryCode: string } | undefined,
  filters: ReturnType<typeof parsePaymentMethodListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<PaymentMethodListResult> {
  if (!scope) {
    return { status: "no-scope" };
  }
  try {
    const countries = await listCountries(context);
    const resolved = resolveScopeCountryId(scope, countries);
    if (!resolved) {
      return { status: "no-scope" };
    }
    const paymentMethods = await listPaymentMethods(
      { organizationId: resolved.organizationId, countryId: resolved.countryId, status: filters.status || undefined, page: filters.page, pageSize: filters.pageSize },
      context,
    );
    return { status: "ok", paymentMethods };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function PaymentMethodsListPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.payment_method.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parsePaymentMethodListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scopeOptions = resolveCashScopeOptions(session.actor);
  const scope = scopeOptions[0];

  const result = await fetchPaymentMethodListData(scope, filters, context);
  const statusLabels = Object.fromEntries(PAYMENT_METHOD_STATUSES.map((status) => [status, t(`paymentMethods.status.${status}`)])) as Record<(typeof PAYMENT_METHOD_STATUSES)[number], string>;
  const typeLabels: Record<PaymentMethodDto["type"], string> = { BANK_ACCOUNT: t("paymentMethods.type.BANK_ACCOUNT"), MOBILE_MONEY: t("paymentMethods.type.MOBILE_MONEY") };

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.paymentMethods")}
        eyebrow={t("paymentMethods.list.eyebrow")}
        title={t("paymentMethods.list.title")}
        description={t("paymentMethods.list.description")}
      />

      {hasCapability(session.actor, "finance.payment_method.create") ? <Link href="/payment-methods/new">{t("paymentMethods.list.createAction")}</Link> : null}

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("paymentMethods.empty.title")} description={t("paymentMethods.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <PaymentMethodFiltersBar statusLabels={statusLabels} statusLabel={t("cod.columns.status")} allLabel={t("common.filters.all")} clearAllLabel={t("common.filters.clearAll")} toggleLabel={t("common.filters.toggle")} />
          <PaymentMethodTable
            items={result.paymentMethods.items}
            total={result.paymentMethods.total}
            statusLabels={statusLabels}
            typeLabels={typeLabels}
            columnLabels={{
              type: t("paymentMethods.columns.type"),
              provider: t("paymentMethods.columns.provider"),
              label: t("paymentMethods.columns.label"),
              destination: t("paymentMethods.columns.destination"),
              status: t("paymentMethods.columns.status"),
              version: t("paymentMethods.columns.version"),
              counterparty: t("paymentMethods.columns.counterparty"),
              createdAt: t("paymentMethods.columns.createdAt"),
            }}
            tableAriaLabel={t("paymentMethods.table.ariaLabel")}
            emptyTitle={t("paymentMethods.empty.title")}
            emptyDescription={t("paymentMethods.empty.description")}
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
