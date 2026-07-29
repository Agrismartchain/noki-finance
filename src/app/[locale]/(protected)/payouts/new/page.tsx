import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { PayoutCreateForm } from "@/features/payouts/components/payout-create-form";
import { PAYOUT_COUNTERPARTY_TYPES, type PayoutCounterpartyType } from "@/features/payouts/server/client";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

type CreatePageResult = { status: "no-scope" } | { status: "error"; correlationId?: string } | { status: "ok"; organizationId: string; countryId: string; countryCode: string; currencyId: string };

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

export default async function PayoutCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.payout.prepare")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = await fetchCreatePageData(scope, context);

  const counterpartyTypeOptions = Object.fromEntries(PAYOUT_COUNTERPARTY_TYPES.map((type) => [type, t(`payouts.counterpartyType.${type}`)])) as Record<PayoutCounterpartyType, string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.payouts")}
        eyebrow={t("payouts.create.eyebrow")}
        title={t("payouts.create.title")}
        description={t("payouts.create.description")}
      />
      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("payouts.empty.title")} description={t("payouts.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <PayoutCreateForm
          organizationId={result.organizationId}
          countryId={result.countryId}
          countryCode={result.countryCode}
          currencyId={result.currencyId}
          labels={{
            counterpartyType: t("payouts.create.counterpartyType"),
            counterpartyTypeOptions,
            counterpartyId: t("payouts.create.counterpartyId"),
            counterpartyIdRequired: t("payouts.create.counterpartyIdRequired"),
            paymentMethodId: t("payouts.create.paymentMethodId"),
            paymentMethodIdRequired: t("payouts.create.paymentMethodIdRequired"),
            code: t("payouts.create.code"),
            obligationIds: t("payouts.create.obligationIds"),
            obligationIdsHint: t("payouts.create.obligationIdsHint"),
            obligationIdsRequired: t("payouts.create.obligationIdsRequired"),
            submit: t("payouts.create.submit"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      )}
    </PageStack>
  );
}
