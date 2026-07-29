import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { ObligationDetailView } from "@/features/obligations/components/obligation-detail-view";
import { getObligation, type FinancialObligationDto } from "@/features/obligations/server/client";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; obligation: FinancialObligationDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const obligation = await getObligation(id, context);
    return { status: "ok", obligation };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function ObligationDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.obligation.read")) {
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
        sectionLabel={t("navigation.obligations")}
        eyebrow={t("obligations.detail.eyebrow")}
        title={t("obligations.detail.title")}
        description={t("obligations.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <ObligationDetailView
          obligation={result.obligation}
          locale={locale as Locale}
          statusLabel={t("obligations.columns.status")}
          canAllocate={hasCapability(session.actor, "finance.obligation.manage")}
          canReadAudit={hasCapability(session.actor, "finance.audit.read")}
          allocateLabels={{
            title: t("obligations.allocate.title"),
            allocationType: t("obligations.allocate.allocationType"),
            allocationTypeOptions: {
              DOCUMENT_LINE: t("obligations.allocationType.DOCUMENT_LINE"),
              STATEMENT: t("obligations.allocationType.STATEMENT"),
              PAYOUT: t("obligations.allocationType.PAYOUT"),
              REFUND: t("obligations.allocationType.REFUND"),
              WITHHOLDING: t("obligations.allocationType.WITHHOLDING"),
              ADJUSTMENT: t("obligations.allocationType.ADJUSTMENT"),
            },
            referenceId: t("obligations.allocate.referenceId"),
            referenceIdRequired: t("obligations.allocate.referenceIdRequired"),
            amount: t("obligations.allocate.amount"),
            amountRequired: t("obligations.allocate.amountRequired"),
            submit: t("obligations.allocate.submit"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
          labels={{
            summaryTitle: t("obligations.detail.summaryTitle"),
            nature: t("obligations.columns.nature"),
            natureLabels: {
              COD_PROCEEDS: t("obligations.nature.COD_PROCEEDS"),
              SERVICE_FEE: t("obligations.nature.SERVICE_FEE"),
              COMMISSION: t("obligations.nature.COMMISSION"),
              EXPENSE: t("obligations.nature.EXPENSE"),
              BONUS: t("obligations.nature.BONUS"),
              REFUND: t("obligations.nature.REFUND"),
              WITHHOLDING: t("obligations.nature.WITHHOLDING"),
              PENALTY: t("obligations.nature.PENALTY"),
              PAYOUT: t("obligations.nature.PAYOUT"),
              ADJUSTMENT: t("obligations.nature.ADJUSTMENT"),
            },
            direction: t("obligations.columns.direction"),
            directionLabels: { PAYABLE: t("obligations.direction.PAYABLE"), RECEIVABLE: t("obligations.direction.RECEIVABLE") },
            counterparty: t("obligations.columns.counterparty"),
            source: t("obligations.columns.source"),
            currency: t("cod.columns.currency"),
            original: t("obligations.columns.original"),
            allocated: t("obligations.columns.allocated"),
            settled: t("obligations.columns.settled"),
            remaining: t("obligations.columns.remaining"),
            effectiveAt: t("obligations.columns.effectiveAt"),
            dueAt: t("obligations.columns.dueAt"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
            holdReason: t("obligations.detail.holdReason"),
            version: t("obligations.detail.version"),
            gapNotice: t("obligations.detail.gapNotice"),
            auditLink: t("obligations.detail.auditLink"),
          }}
        />
      )}
    </PageStack>
  );
}
