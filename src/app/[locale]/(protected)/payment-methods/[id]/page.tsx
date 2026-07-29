import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies, toCurrencyCodeMap } from "@/features/finance-shared/server/master-data";
import { PaymentMethodDetailView } from "@/features/payment-methods/components/payment-method-detail-view";
import { getPaymentMethod, type PaymentMethodDto } from "@/features/payment-methods/server/client";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; paymentMethod: PaymentMethodDto; currencyCode: string | undefined; countryCode: string | undefined } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const [paymentMethod, currencies, countries] = await Promise.all([getPaymentMethod(id, context), listCurrencies(context), listCountries(context)]);
    const currencyCode = toCurrencyCodeMap(currencies)[paymentMethod.currencyId];
    const countryCode = countries.find((country) => country.id === paymentMethod.countryId)?.code;
    return { status: "ok", paymentMethod, currencyCode, countryCode };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function PaymentMethodDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.payment_method.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const result = await fetchDetailData(id, context);

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.paymentMethods")}
        eyebrow={t("paymentMethods.detail.eyebrow")}
        title={t("paymentMethods.detail.title")}
        description={t("paymentMethods.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <PaymentMethodDetailView
          paymentMethod={result.paymentMethod}
          currencyCode={result.currencyCode}
          countryCode={result.countryCode}
          statusLabels={{
            PENDING_VERIFICATION: t("paymentMethods.status.PENDING_VERIFICATION"),
            ACTIVE: t("paymentMethods.status.ACTIVE"),
            SUSPENDED: t("paymentMethods.status.SUSPENDED"),
            REVOKED: t("paymentMethods.status.REVOKED"),
          }}
          typeLabels={{ BANK_ACCOUNT: t("paymentMethods.type.BANK_ACCOUNT"), MOBILE_MONEY: t("paymentMethods.type.MOBILE_MONEY") }}
          canApprove={hasCapability(session.actor, "finance.payment_method.approve")}
          canSuspend={hasCapability(session.actor, "finance.payment_method.suspend")}
          canRevoke={hasCapability(session.actor, "finance.payment_method.revoke")}
          canRevealSensitive={hasCapability(session.actor, "finance.payment_method.read_sensitive")}
          actionsLabels={{
            approve: t("paymentMethods.actions.approve"),
            suspend: t("paymentMethods.actions.suspend"),
            revoke: t("paymentMethods.actions.revoke"),
            reasonLabel: t("paymentMethods.actions.reasonLabel"),
            reasonRequired: t("paymentMethods.actions.reasonRequired"),
            confirm: t("paymentMethods.actions.confirm"),
            dismiss: t("paymentMethods.actions.dismiss"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
          sensitiveLabels={{
            reveal: t("paymentMethods.sensitive.reveal"),
            revealedLabel: t("paymentMethods.sensitive.revealedLabel"),
            hide: t("paymentMethods.sensitive.hide"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
          labels={{
            summaryTitle: t("paymentMethods.detail.summaryTitle"),
            type: t("paymentMethods.columns.type"),
            provider: t("paymentMethods.columns.provider"),
            destination: t("paymentMethods.columns.destination"),
            status: t("paymentMethods.columns.status"),
            version: t("paymentMethods.columns.version"),
            counterparty: t("paymentMethods.columns.counterparty"),
            currency: t("cod.columns.currency"),
            country: t("cod.columns.country"),
            createdAt: t("paymentMethods.columns.createdAt"),
            approvedAt: t("paymentMethods.detail.approvedAt"),
            suspendedAt: t("paymentMethods.detail.suspendedAt"),
            revokedAt: t("paymentMethods.detail.revokedAt"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
          }}
        />
      )}
    </PageStack>
  );
}
