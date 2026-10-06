import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { AdjustmentCreateForm } from "@/features/adjustments/components/adjustment-create-form";
import { AdjustmentLookup } from "@/features/adjustments/components/adjustment-lookup";
import { ADJUSTMENT_STATUSES, listAdjustments, type AdjustmentType } from "@/features/adjustments/server/client";
import { FinanceListSection } from "@/features/finance-shared/components/finance-list-section";
import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { fetchResourceList, parseResourceListFilters } from "@/features/finance-shared/server/resource-list";
import { adjustmentStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies, type AdminCurrencyDto } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type PageResult = { status: "no-scope" } | { status: "error"; correlationId?: string } | { status: "ok"; organizationId: string; countryId: string; countryCode: string; currencies: AdminCurrencyDto[] };

async function fetchPageData(scope: { organizationId: string; countryCode: string } | undefined, context: { accessToken?: string; locale: string }): Promise<PageResult> {
  if (!scope) {
    return { status: "no-scope" };
  }

  try {
    const [countries, currencies] = await Promise.all([listCountries(context), listCurrencies(context)]);
    const country = countries.find((c) => c.code === scope.countryCode);
    if (!country || currencies.length === 0) {
      return { status: "no-scope" };
    }

    return { status: "ok", organizationId: scope.organizationId, countryId: country.id, countryCode: scope.countryCode, currencies };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function AdjustmentsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.adjustment.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = await fetchPageData(scope, context);
  const filters = parseResourceListFilters(new URLSearchParams(rawSearchParams as Record<string, string>), ADJUSTMENT_STATUSES);
  const listResult = await fetchResourceList(session.actor, filters, context, (query) => listAdjustments(query, context));
  const canCreate = hasCapability(session.actor, "finance.adjustment.create");
  const typeOptions = {
    EXPENSE: t("adjustments.type.EXPENSE"),
    BONUS: t("adjustments.type.BONUS"),
    REFUND: t("adjustments.type.REFUND"),
    WITHHOLDING: t("adjustments.type.WITHHOLDING"),
    PENALTY: t("adjustments.type.PENALTY"),
    DISPUTE_ADJUSTMENT: t("adjustments.type.DISPUTE_ADJUSTMENT"),
    MANUAL_ADJUSTMENT: t("adjustments.type.MANUAL_ADJUSTMENT"),
  } satisfies Record<AdjustmentType, string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.adjustments")}
        eyebrow={t("adjustments.list.eyebrow")}
        title={t("adjustments.list.title")}
        description={t("adjustments.list.description")}
      />

      <FinanceListSection
        result={listResult}
        namespace="adjustments"
        columnKeys={["id", "type", "counterparty", "amount", "status", "createdAt"]}
        statuses={ADJUSTMENT_STATUSES.map((value) => ({ value, label: t(`adjustments.status.${value}`) }))}
        toRow={(adjustment) => ({
          id: adjustment.id,
          cells: {
            id: <Link href={`/adjustments/${adjustment.id}`}>{adjustment.id.slice(0, 8)}</Link>,
            type: t(`adjustments.type.${adjustment.type}`),
            counterparty: `${adjustment.counterpartyType} · ${adjustment.counterpartyId.slice(0, 8)}`,
            amount: <MoneyValue amount={adjustment.amount} currencyCode={adjustment.currency} locale={locale as Locale} />,
            status: <FinanceStatusBadge label={t(`adjustments.status.${adjustment.status}`)} tone={adjustmentStatusTone(adjustment.status)} />,
            createdAt: adjustment.createdAt,
          },
        })}
      />

      <AdjustmentLookup label={t("adjustments.lookup.label")} buttonLabel={t("adjustments.lookup.button")} />

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("adjustments.empty.title")} description={t("adjustments.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : canCreate ? (
        <AdjustmentCreateForm
          organizationId={result.organizationId}
          countryId={result.countryId}
          countryCode={result.countryCode}
          currencies={result.currencies.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
          labels={{
            counterpartyType: t("adjustments.create.counterpartyType"),
            counterpartyId: t("adjustments.create.counterpartyId"),
            sourceDomain: t("adjustments.create.sourceDomain"),
            sourceReferenceType: t("adjustments.create.sourceReferenceType"),
            sourceReferenceId: t("adjustments.create.sourceReferenceId"),
            type: t("adjustments.create.type"),
            typeOptions,
            amount: t("adjustments.create.amount"),
            reasonCode: t("adjustments.create.reasonCode"),
            reason: t("adjustments.create.reason"),
            attachmentReference: t("adjustments.create.attachmentReference"),
            currency: t("cod.columns.currency"),
            submit: t("adjustments.create.submit"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      ) : (
        <FinanceEmptyState title={t("adjustments.empty.title")} description={t("adjustments.empty.createForbiddenDescription")} />
      )}
    </PageStack>
  );
}
