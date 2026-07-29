import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FeeRuleDetailView } from "@/features/fees/components/fee-rule-detail-view";
import { FEE_RULE_WORKFLOW_STATUSES, getFeeRule, type FeeRuleDto, type FeeRuleWorkflowStatus } from "@/features/fees/server/client";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; feeRule: FeeRuleDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const feeRule = await getFeeRule(id, context);
    return { status: "ok", feeRule };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function FeeRuleDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.fee_rule.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const result = await fetchDetailData(id, context);
  const workflowStatusLabels = Object.fromEntries(FEE_RULE_WORKFLOW_STATUSES.map((status) => [status, t(`fees.rules.workflowStatus.${status}`)])) as Record<FeeRuleWorkflowStatus, string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.fees")}
        eyebrow={t("fees.rules.detail.eyebrow")}
        title={t("fees.rules.detail.title")}
        description={t("fees.rules.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <FeeRuleDetailView
          feeRule={result.feeRule}
          locale={locale as Locale}
          workflowStatusLabels={workflowStatusLabels}
          labels={{
            summaryTitle: t("fees.rules.detail.summaryTitle"),
            type: t("fees.rules.columns.type"),
            scopeType: t("fees.rules.columns.scopeType"),
            calculationType: t("fees.rules.columns.calculationType"),
            sourceDomain: t("fees.rules.columns.sourceDomain"),
            counterpartyType: t("fees.rules.columns.counterpartyType"),
            serviceCode: t("fees.rules.columns.serviceCode"),
            sellerId: t("fees.rules.columns.sellerId"),
            cityId: t("fees.rules.columns.cityId"),
            zoneId: t("fees.rules.columns.zoneId"),
            subZoneId: t("fees.rules.columns.subZoneId"),
            fixedAmount: t("fees.rules.columns.fixedAmount"),
            percentageRate: t("fees.rules.columns.percentageRate"),
            percentageBase: t("fees.rules.columns.percentageBase"),
            minimumAmount: t("fees.rules.columns.minimumAmount"),
            maximumAmount: t("fees.rules.columns.maximumAmount"),
            priority: t("fees.rules.columns.priority"),
            validFrom: t("fees.rules.columns.validFrom"),
            validTo: t("fees.rules.columns.validTo"),
            workflowStatus: t("fees.rules.columns.workflowStatus"),
            version: t("obligations.detail.version"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
            gapNotice: t("fees.gapNotice"),
          }}
        />
      )}
    </PageStack>
  );
}
