import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { AdjustmentDetailView } from "@/features/adjustments/components/adjustment-detail-view";
import { getAdjustment } from "@/features/adjustments/server/client";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; adjustment: Awaited<ReturnType<typeof getAdjustment>> } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    return { status: "ok", adjustment: await getAdjustment(id, context) };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function AdjustmentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.adjustment.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const canManage = hasCapability(session.actor, "finance.adjustment.approve");
  const result = await fetchDetailData(id, { accessToken, locale });

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.adjustments")}
        eyebrow={t("adjustments.detail.eyebrow")}
        title={t("adjustments.detail.title")}
        description={t("adjustments.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <AdjustmentDetailView
          adjustment={result.adjustment}
          locale={locale as Locale}
          canManage={canManage}
          actionLabels={{
            approve: t("adjustments.actions.approve"),
            reject: t("adjustments.actions.reject"),
            apply: t("adjustments.actions.apply"),
            reasonLabel: t("adjustments.actions.reasonLabel"),
            reasonRequired: t("adjustments.actions.reasonRequired"),
            confirm: t("adjustments.actions.confirm"),
            dismiss: t("adjustments.actions.dismiss"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
          labels={{
            summaryTitle: t("adjustments.detail.summaryTitle"),
            statusLabel: t("documents.columns.status"),
            typeLabel: t("adjustments.create.type"),
            typeLabels: {
              EXPENSE: t("adjustments.type.EXPENSE"),
              BONUS: t("adjustments.type.BONUS"),
              REFUND: t("adjustments.type.REFUND"),
              WITHHOLDING: t("adjustments.type.WITHHOLDING"),
              PENALTY: t("adjustments.type.PENALTY"),
              DISPUTE_ADJUSTMENT: t("adjustments.type.DISPUTE_ADJUSTMENT"),
              MANUAL_ADJUSTMENT: t("adjustments.type.MANUAL_ADJUSTMENT"),
            },
            counterparty: t("documents.columns.counterparty"),
            source: t("obligations.columns.source"),
            currency: t("cod.columns.currency"),
            amount: t("adjustments.create.amount"),
            reasonCode: t("adjustments.create.reasonCode"),
            reason: t("adjustments.create.reason"),
            attachmentReference: t("adjustments.create.attachmentReference"),
            author: t("adjustments.detail.author"),
            submitter: t("adjustments.detail.submitter"),
            approver: t("adjustments.detail.approver"),
            appliedObligation: t("adjustments.detail.appliedObligation"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
          }}
        />
      )}
    </PageStack>
  );
}
