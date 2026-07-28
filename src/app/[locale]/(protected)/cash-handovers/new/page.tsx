import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { HandoverCreateForm } from "@/features/cash-handovers/components/handover-create-form";
import { listCodCollections, type AdminFinanceCodCollectionDto } from "@/features/cod/server/client";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

type CreatePageResult =
  | { status: "no-scope" }
  | { status: "error"; correlationId?: string }
  | { status: "ok"; organizationId: string; countryId: string; countryCode: string; currencyId: string; currencyCode: string; eligible: AdminFinanceCodCollectionDto[] };

async function fetchCreatePageData(
  scope: { organizationId: string; countryCode: string } | undefined,
  context: { accessToken?: string; locale: string },
): Promise<CreatePageResult> {
  if (!scope) {
    return { status: "no-scope" };
  }

  try {
    const [countries, currencies] = await Promise.all([listCountries(context), listCurrencies(context)]);
    const country = countries.find((c) => c.code === scope.countryCode);
    const currency = currencies[0];
    if (!country || !currency) {
      return { status: "no-scope" };
    }

    const { items: eligible } = await listCodCollections(
      { page: 1, pageSize: 100, organizationId: scope.organizationId, countryId: country.id, status: "DECLARED" },
      context,
    );

    return { status: "ok", organizationId: scope.organizationId, countryId: country.id, countryCode: scope.countryCode, currencyId: currency.id, currencyCode: currency.code, eligible };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashHandoverCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.cash.handover.create")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = await fetchCreatePageData(scope, context);

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashHandovers")}
        eyebrow={t("cashHandovers.create.eyebrow")}
        title={t("cashHandovers.create.title")}
        description={t("cashHandovers.create.description")}
      />
      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("cashHandovers.empty.title")} description={t("cashHandovers.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <HandoverCreateForm
          organizationId={result.organizationId}
          countryId={result.countryId}
          countryCode={result.countryCode}
          currencyId={result.currencyId}
          currencyCode={result.currencyCode}
          locale={locale as Locale}
          eligibleCollections={result.eligible.map((collection) => ({
            id: collection.id,
            orderNumber: collection.orderNumber,
            expectedAmount: collection.expectedAmount,
            collectedAmount: collection.collectedAmount,
          }))}
          labels={{
            ariaLabel: t("cashHandovers.create.tableAriaLabel"),
            colSelect: t("cashHandovers.create.colSelect"),
            colOrder: t("cod.columns.orderNumber"),
            colExpected: t("cod.columns.expected"),
            colDeclared: t("cod.columns.declared"),
            colHandedOver: t("cashHandovers.detail.colHandedOver"),
            noEligible: t("cashHandovers.create.noEligible"),
            submit: t("cashHandovers.create.submit"),
            genericError: t("mutations.errors.unexpected"),
            validationError: t("cashHandovers.create.validationError"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      )}
    </PageStack>
  );
}
