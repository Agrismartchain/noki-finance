import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FeeAssessmentDetailView } from "@/features/fees/components/fee-assessment-detail-view";
import { getFeeAssessment, type FeeAssessmentDto } from "@/features/fees/server/client";
import { FEE_ASSESSMENT_STATUSES, type FeeAssessmentStatus } from "@/features/fees/server/list-query";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; feeAssessment: FeeAssessmentDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const feeAssessment = await getFeeAssessment(id, context);
    return { status: "ok", feeAssessment };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function FeeAssessmentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.fee.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const result = await fetchDetailData(id, context);
  const statusLabels = Object.fromEntries(FEE_ASSESSMENT_STATUSES.map((status) => [status, t(`fees.assessments.status.${status}`)])) as Record<FeeAssessmentStatus, string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.fees")}
        eyebrow={t("fees.assessments.detail.eyebrow")}
        title={t("fees.assessments.detail.title")}
        description={t("fees.assessments.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <FeeAssessmentDetailView
          feeAssessment={result.feeAssessment}
          locale={locale as Locale}
          statusLabels={statusLabels}
          labels={{
            summaryTitle: t("fees.assessments.detail.summaryTitle"),
            obligationId: t("fees.assessments.columns.obligationId"),
            type: t("fees.assessments.columns.type"),
            amount: t("fees.assessments.columns.amount"),
            status: t("fees.assessments.columns.status"),
            currency: t("cod.columns.currency"),
            createdAt: t("cashHandovers.columns.createdAt"),
            calculationExplanation: t("fees.assessments.detail.calculationExplanation"),
            calculationType: t("fees.rules.columns.calculationType"),
            fixedAmount: t("fees.rules.columns.fixedAmount"),
            percentageRate: t("fees.rules.columns.percentageRate"),
            percentageBase: t("fees.rules.columns.percentageBase"),
            minimumAmount: t("fees.rules.columns.minimumAmount"),
            maximumAmount: t("fees.rules.columns.maximumAmount"),
            sourceFeeRuleId: t("fees.assessments.detail.sourceFeeRuleId"),
            ruleVersion: t("fees.assessments.detail.ruleVersion"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
          }}
        />
      )}
    </PageStack>
  );
}
