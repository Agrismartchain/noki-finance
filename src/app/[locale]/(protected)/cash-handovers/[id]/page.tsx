import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { HandoverDetailView } from "@/features/cash-handovers/components/handover-detail-view";
import { getHandover, type CashHandoverResponseDto } from "@/features/cash-handovers/server/client";
import { HANDOVER_STATUSES } from "@/features/cash-handovers/server/list-query";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { listCountries, listCurrencies, toCurrencyCodeMap } from "@/features/finance-shared/server/master-data";
import { listOpenCashSessions } from "@/features/finance-shared/server/open-sessions";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult =
  | { status: "ok"; handover: CashHandoverResponseDto; currencyCode: string | undefined; openSessions: { id: string; label: string }[] }
  | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const [handover, currencies, countries] = await Promise.all([getHandover(id, context), listCurrencies(context), listCountries(context)]);
    const currencyCode = toCurrencyCodeMap(currencies)[handover.currencyId];
    const countryCode = countries.find((country) => country.id === handover.countryId)?.code;

    let openSessions: { id: string; label: string }[] = [];
    if (handover.status === "SUBMITTED" && countryCode) {
      const sessions = await listOpenCashSessions(handover.organizationId, countryCode, handover.currencyId, context).catch(() => []);
      openSessions = sessions.map((session) => ({ id: session.id, label: `${session.id.slice(0, 8)} — ${session.openedAt}` }));
    }

    return { status: "ok", handover, currencyCode, openSessions };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashHandoverDetailPage({ params }: PageProps) {
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
  const statusLabels = Object.fromEntries(HANDOVER_STATUSES.map((status) => [status, t(`cashHandovers.status.${status}`)])) as Record<(typeof HANDOVER_STATUSES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashHandovers")}
        eyebrow={t("cashHandovers.detail.eyebrow")}
        title={t("cashHandovers.detail.title")}
        description={t("cashHandovers.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <HandoverDetailView
          handover={result.handover}
          currencyCode={result.currencyCode}
          locale={locale as Locale}
          statusLabels={statusLabels}
          openSessions={result.openSessions}
          canSubmit={hasCapability(session.actor, "finance.cash.handover.submit")}
          canCancel={hasCapability(session.actor, "finance.cash.handover.submit")}
          canReject={hasCapability(session.actor, "finance.cash.receive")}
          canReceive={hasCapability(session.actor, "finance.cash.receive")}
          labels={{
            summaryTitle: t("cashHandovers.detail.summaryTitle"),
            organization: t("cashHandovers.columns.organization"),
            country: t("cod.columns.country"),
            currency: t("cod.columns.currency"),
            status: t("cod.columns.status"),
            createdAt: t("cashHandovers.columns.createdAt"),
            submittedAt: t("cashHandovers.detail.submittedAt"),
            receivedAt: t("cashHandovers.detail.receivedAt"),
            itemsTitle: t("cashHandovers.detail.itemsTitle"),
            itemsAriaLabel: t("cashHandovers.detail.itemsTitle"),
            colCollection: t("cashHandovers.detail.colCollection"),
            colDeclared: t("cashHandovers.detail.colDeclared"),
            colHandedOver: t("cashHandovers.detail.colHandedOver"),
            colReceived: t("cashHandovers.detail.colReceived"),
            colReconciled: t("cashHandovers.detail.colReconciled"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
            actionsTitle: t("cashHandovers.detail.actionsTitle"),
            submit: t("cashHandovers.actions.submit"),
            cancel: t("cashHandovers.actions.cancel"),
            reject: t("cashHandovers.actions.reject"),
            reasonLabel: t("cashHandovers.actions.reasonLabel"),
            reasonRequired: t("cashHandovers.actions.reasonRequired"),
            confirm: t("cashHandovers.actions.confirm"),
            dismiss: t("cashHandovers.actions.dismiss"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
            receiveTitle: t("cashHandovers.receive.title"),
            receiveTrigger: t("cashHandovers.receive.trigger"),
            receiveSession: t("cashHandovers.receive.session"),
            receiveLineDeclared: t("cashHandovers.detail.colDeclared"),
            receiveLineHandedOver: t("cashHandovers.detail.colHandedOver"),
            receiveLineReceived: t("cashHandovers.receive.lineReceived"),
            receiveNoOpenSession: t("cashHandovers.receive.noOpenSession"),
          }}
        />
      )}
    </PageStack>
  );
}
