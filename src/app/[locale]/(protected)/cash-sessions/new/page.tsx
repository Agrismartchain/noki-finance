import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { OpenSessionForm } from "@/features/cash-sessions/components/open-session-form";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies, type AdminCurrencyDto } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

type PageResult = { status: "no-scope" } | { status: "error"; correlationId?: string } | { status: "ok"; organizationId: string; countryId: string; countryCode: string; currencies: AdminCurrencyDto[] };

async function fetchPageData(scope: { organizationId: string; countryCode: string } | undefined, context: { accessToken?: string; locale: string }): Promise<PageResult> {
  if (!scope) {
    return { status: "no-scope" };
  }
  try {
    const [countries, currencies] = await Promise.all([listCountries(context), listCurrencies(context)]);
    const country = countries.find((c) => c.code === scope.countryCode);
    if (!country) {
      return { status: "no-scope" };
    }
    return { status: "ok", organizationId: scope.organizationId, countryId: country.id, countryCode: scope.countryCode, currencies };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashSessionOpenPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.cash_session.open")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = await fetchPageData(scope, context);

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashSessions")}
        eyebrow={t("cashSessions.create.eyebrow")}
        title={t("cashSessions.create.title")}
        description={t("cashSessions.create.description")}
      />
      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("cashSessions.empty.title")} description={t("cashSessions.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <OpenSessionForm
          organizationId={result.organizationId}
          countryId={result.countryId}
          countryCode={result.countryCode}
          currencies={result.currencies.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
          labels={{
            currencyLabel: t("cod.columns.currency"),
            openingAmountLabel: t("cashSessions.create.openingAmountLabel"),
            submit: t("cashSessions.create.submit"),
            genericError: t("mutations.errors.unexpected"),
            validationError: t("cashSessions.create.validationError"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      )}
    </PageStack>
  );
}
