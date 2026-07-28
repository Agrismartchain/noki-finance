import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { VarianceDetailView } from "@/features/cash-variances/components/variance-detail-view";
import { getVariance, type CashVarianceResponseDto } from "@/features/cash-variances/server/client";
import { VARIANCE_TYPES } from "@/features/cash-variances/server/list-query";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; variance: CashVarianceResponseDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const variance = await getVariance(id, context);
    return { status: "ok", variance };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CashVarianceDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.cash_variance.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const result = await fetchDetailData(id, context);
  const typeLabels = Object.fromEntries(VARIANCE_TYPES.map((type) => [type, t(`cashVariances.type.${type}`)])) as Record<(typeof VARIANCE_TYPES)[number], string>;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cashVariances")}
        eyebrow={t("cashVariances.detail.eyebrow")}
        title={t("cashVariances.detail.title")}
        description={t("cashVariances.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <VarianceDetailView
          variance={result.variance}
          locale={locale as Locale}
          typeLabels={typeLabels}
          varianceBadgeLabels={{
            shortfall: t("cashVariances.badge.shortfall"),
            excess: t("cashVariances.badge.excess"),
            resolved: t("cashVariances.badge.resolved"),
            waived: t("cashVariances.badge.waived"),
            balanced: t("cashVariances.badge.balanced"),
          }}
          canResolve={hasCapability(session.actor, "finance.cash_variance.resolve")}
          labels={{
            summaryTitle: t("cashVariances.detail.summaryTitle"),
            type: t("cashVariances.columns.type"),
            status: t("cod.columns.status"),
            source: t("cashVariances.columns.source"),
            expected: t("cod.columns.expected"),
            actual: t("cashVariances.columns.actual"),
            variance: t("cashVariances.columns.variance"),
            createdAt: t("cashHandovers.columns.createdAt"),
            resolvedAt: t("cashVariances.detail.resolvedAt"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
            resolutionTitle: t("cashVariances.resolution.title"),
            resolutionUnavailableNote: t("cashVariances.resolution.unavailableNote"),
            decisionLabel: t("cashVariances.resolution.decisionLabel"),
            resolvedOption: t("cashVariances.resolution.resolvedOption"),
            waivedOption: t("cashVariances.resolution.waivedOption"),
            reasonLabel: t("cashHandovers.actions.reasonLabel"),
            reasonRequired: t("cashHandovers.actions.reasonRequired"),
            decisionRequired: t("cashVariances.resolution.decisionRequired"),
            confirmTitle: t("cashVariances.resolution.confirmTitle"),
            confirmDescription: t("cashVariances.resolution.confirmDescription"),
            submit: t("cashVariances.resolution.submit"),
            confirm: t("cashHandovers.actions.confirm"),
            dismiss: t("cashHandovers.actions.dismiss"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      )}
    </PageStack>
  );
}
