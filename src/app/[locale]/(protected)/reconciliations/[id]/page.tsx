import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { ReconciliationDetailView } from "@/features/reconciliations/components/reconciliation-detail-view";
import { getReconciliation, type FinancialReconciliationResponseDto } from "@/features/reconciliations/server/client";
import { RECONCILIATION_STATUSES } from "@/features/reconciliations/server/list-query";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; reconciliation: FinancialReconciliationResponseDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const reconciliation = await getReconciliation(id, context);
    return { status: "ok", reconciliation };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function ReconciliationDetailPage({ params }: PageProps) {
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
  const statusLabels = Object.fromEntries(RECONCILIATION_STATUSES.map((status) => [status, t(`reconciliations.status.${status}`)])) as Record<(typeof RECONCILIATION_STATUSES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.reconciliations")}
        eyebrow={t("reconciliations.detail.eyebrow")}
        title={t("reconciliations.detail.title")}
        description={t("reconciliations.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <ReconciliationDetailView
          reconciliation={result.reconciliation}
          locale={locale as Locale}
          statusLabels={statusLabels}
          canSubmit={hasCapability(session.actor, "finance.reconciliation.submit")}
          canApprove={hasCapability(session.actor, "finance.reconciliation.approve")}
          labels={{
            summaryTitle: t("reconciliations.detail.summaryTitle"),
            session: t("cashHandovers.columns.session"),
            status: t("cod.columns.status"),
            expected: t("cod.columns.expected"),
            received: t("reconciliations.columns.received"),
            variance: t("cashVariances.columns.variance"),
            createdAt: t("cashHandovers.columns.createdAt"),
            submittedAt: t("cashHandovers.detail.submittedAt"),
            approvedAt: t("reconciliations.detail.approvedAt"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
            preparerNotExposed: t("reconciliations.detail.preparerNotExposed"),
            approverNotExposed: t("reconciliations.detail.approverNotExposed"),
            linkedVariancesNote: t("reconciliations.detail.linkedVariancesNote"),
            actionsTitle: t("cashHandovers.detail.actionsTitle"),
            makerCheckerNote: t("reconciliations.detail.makerCheckerNote"),
            submit: t("cashHandovers.actions.submit"),
            approve: t("reconciliations.actions.approve"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
            noActionAvailable: t("reconciliations.detail.noActionAvailable"),
          }}
        />
      )}
    </PageStack>
  );
}
