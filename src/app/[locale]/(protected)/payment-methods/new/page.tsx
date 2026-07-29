import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { PaymentMethodCreateForm } from "@/features/payment-methods/components/payment-method-create-form";
import type { CreatePaymentMethodInput } from "@/features/payment-methods/server/client";
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

export default async function PaymentMethodCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.payment_method.create")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = await fetchCreatePageData(scope, context);
  const typeLabels: Record<CreatePaymentMethodInput["type"], string> = { BANK_ACCOUNT: t("paymentMethods.type.BANK_ACCOUNT"), MOBILE_MONEY: t("paymentMethods.type.MOBILE_MONEY") };

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.paymentMethods")}
        eyebrow={t("paymentMethods.create.eyebrow")}
        title={t("paymentMethods.create.title")}
        description={t("paymentMethods.create.description")}
      />
      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("paymentMethods.empty.title")} description={t("paymentMethods.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <PaymentMethodCreateForm
          organizationId={result.organizationId}
          countryId={result.countryId}
          countryCode={result.countryCode}
          currencyId={result.currencyId}
          typeLabels={typeLabels}
          labels={{
            counterpartyType: t("paymentMethods.create.counterpartyType"),
            counterpartyId: t("paymentMethods.create.counterpartyId"),
            type: t("paymentMethods.create.type"),
            providerCode: t("paymentMethods.create.providerCode"),
            displayLabel: t("paymentMethods.create.displayLabel"),
            destinationMasked: t("paymentMethods.create.destinationMasked"),
            destinationMaskedHint: t("paymentMethods.create.destinationMaskedHint"),
            sensitiveReference: t("paymentMethods.create.sensitiveReference"),
            sensitiveReferenceHint: t("paymentMethods.create.sensitiveReferenceHint"),
            submit: t("paymentMethods.create.submit"),
            validationError: t("cashHandovers.create.validationError"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      )}
    </PageStack>
  );
}
