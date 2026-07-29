import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FeeRuleCreateForm } from "@/features/fees/components/fee-rule-create-form";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

type CreatePageResult =
  | { status: "no-scope" }
  | { status: "error"; correlationId?: string }
  | { status: "ok"; organizationId: string; countryId: string; countryCode: string; currencyId: string };

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
    return { status: "ok", organizationId: scope.organizationId, countryId: country.id, countryCode: scope.countryCode, currencyId: currency.id };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function FeeRuleCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.fee_rule.manage")) {
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
        sectionLabel={t("navigation.fees")}
        eyebrow={t("fees.rules.create.eyebrow")}
        title={t("fees.rules.create.title")}
        description={t("fees.rules.create.description")}
      />
      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("fees.empty.title")} description={t("fees.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <FeeRuleCreateForm
          organizationId={result.organizationId}
          countryId={result.countryId}
          countryCode={result.countryCode}
          currencyId={result.currencyId}
          labels={{
            type: t("fees.rules.columns.type"),
            scopeType: t("fees.rules.columns.scopeType"),
            calculationType: t("fees.rules.columns.calculationType"),
            sourceDomain: t("fees.rules.columns.sourceDomain"),
            counterpartyType: t("fees.rules.columns.counterpartyType"),
            serviceCode: t("fees.rules.columns.serviceCode"),
            sellerId: t("fees.rules.columns.sellerId"),
            cityId: t("fees.rules.columns.cityId"),
            zoneId: t("fees.rules.columns.zoneId"),
            subZoneId: t("fees.rules.columns.subZoneId"),
            fixedAmount: t("fees.rules.columns.fixedAmount"),
            percentageRate: t("fees.rules.columns.percentageRate"),
            percentageBase: t("fees.rules.columns.percentageBase"),
            minimumAmount: t("fees.rules.columns.minimumAmount"),
            maximumAmount: t("fees.rules.columns.maximumAmount"),
            priority: t("fees.rules.columns.priority"),
            validFrom: t("fees.rules.columns.validFrom"),
            validTo: t("fees.rules.columns.validTo"),
            submit: t("fees.rules.create.submit"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      )}
    </PageStack>
  );
}
