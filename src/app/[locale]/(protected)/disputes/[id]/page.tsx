import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { DisputeDetailView } from "@/features/disputes/components/dispute-detail-view";
import { getDispute, type FinancialDisputeDto } from "@/features/disputes/server/client";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; dispute: FinancialDisputeDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const dispute = await getDispute(id, context);
    return { status: "ok", dispute };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function DisputeDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.dispute.read")) {
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
        sectionLabel={t("navigation.disputes")}
        eyebrow={t("disputes.detail.eyebrow")}
        title={t("disputes.detail.title")}
        description={t("disputes.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <DisputeDetailView
          dispute={result.dispute}
          canResolve={hasCapability(session.actor, "finance.dispute.manage")}
          statusLabels={{ OPEN: t("disputes.status.OPEN"), RESOLVED: t("disputes.status.RESOLVED") }}
          resolutionLabels={{ RELEASE: t("disputes.resolution.RELEASE"), ADJUSTMENT: t("disputes.resolution.ADJUSTMENT") }}
          resolveLabels={{
            resolution: t("disputes.resolve.resolution"),
            releaseOption: t("disputes.resolution.RELEASE"),
            adjustmentOption: t("disputes.resolution.ADJUSTMENT"),
            reason: t("disputes.resolve.reason"),
            reasonRequired: t("cashHandovers.actions.reasonRequired"),
            resolutionRequired: t("cashVariances.resolution.decisionRequired"),
            adjustmentIdLabel: t("disputes.resolve.adjustmentIdLabel"),
            adjustmentIdRequired: t("disputes.resolve.adjustmentIdRequired"),
            confirmTitle: t("disputes.resolve.confirmTitle"),
            continue: t("disputes.resolve.continue"),
            confirm: t("disputes.resolve.confirm"),
            cancel: t("disputes.resolve.cancel"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
          labels={{
            summaryTitle: t("disputes.detail.summaryTitle"),
            status: t("cod.columns.status"),
            obligationLink: t("disputes.detail.obligationLink"),
            adjustmentLink: t("disputes.detail.adjustmentLink"),
            reasonCode: t("disputes.create.reasonCode"),
            reason: t("disputes.create.reason"),
            resolution: t("disputes.resolve.resolution"),
            resolutionReason: t("disputes.resolve.reason"),
            openedAt: t("cashSessions.columns.openedAt"),
            resolvedAt: t("cashVariances.detail.resolvedAt"),
            heldNotice: t("disputes.detail.heldNotice"),
            releasedNotice: t("disputes.detail.releasedNotice"),
            notAvailable: t("disputes.detail.notAvailable"),
          }}
        />
      )}
    </PageStack>
  );
}
