import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { SessionDetailView } from "@/features/cash-sessions/components/session-detail-view";
import { getSession, type CashSessionResponseDto } from "@/features/cash-sessions/server/client";
import { SESSION_STATUSES } from "@/features/cash-sessions/server/list-query";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCurrencies, toCurrencyCodeMap } from "@/features/finance-shared/server/master-data";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; session: CashSessionResponseDto; currencyCode: string | undefined } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const [session, currencies] = await Promise.all([getSession(id, context), listCurrencies(context)]);
    return { status: "ok", session, currencyCode: toCurrencyCodeMap(currencies)[session.currencyId] };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashSessionDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.cash.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const result = await fetchDetailData(id, context);
  const statusLabels = Object.fromEntries(SESSION_STATUSES.map((status) => [status, t(`cashSessions.status.${status}`)])) as Record<(typeof SESSION_STATUSES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashSessions")}
        eyebrow={t("cashSessions.detail.eyebrow")}
        title={t("cashSessions.detail.title")}
        description={t("cashSessions.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <SessionDetailView
          session={result.session}
          currencyCode={result.currencyCode}
          locale={locale as Locale}
          statusLabels={statusLabels}
          canClose={hasCapability(session.actor, "finance.cash_session.close")}
          labels={{
            summaryTitle: t("cashSessions.detail.summaryTitle"),
            cashier: t("cashSessions.columns.cashier"),
            currency: t("cod.columns.currency"),
            status: t("cod.columns.status"),
            openingAmount: t("cashSessions.columns.openingAmount"),
            expectedAmount: t("cashSessions.detail.expectedAmount"),
            countedAmount: t("cashSessions.detail.countedAmount"),
            varianceAmount: t("cashSessions.columns.variance"),
            openedAt: t("cashSessions.columns.openedAt"),
            closedAt: t("cashSessions.detail.closedAt"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
            closeTitle: t("cashSessions.close.title"),
            closeExpectedLabel: t("cashSessions.detail.expectedAmount"),
            closeCountedLabel: t("cashSessions.close.countedLabel"),
            closePreviewLabel: t("cashSessions.close.previewLabel"),
            closePreviewWarning: t("cashSessions.close.previewWarning"),
            closeSubmit: t("cashSessions.close.submit"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
            handoversNote: t("cashSessions.detail.handoversNote"),
          }}
        />
      )}
    </PageStack>
  );
}
