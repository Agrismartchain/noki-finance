import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { ApprovalQueueView } from "@/features/approvals/components/approval-queue-view";
import { fetchApprovalsQueue } from "@/features/approvals/server/client";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import type { Locale } from "@/i18n/locales";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasAnyCapability, hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

export default async function ApprovalsPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (
    session.status !== "authenticated" ||
    !hasAnyCapability(session.actor, ["finance.document.approve", "finance.adjustment.approve", "finance.payment_method.approve", "finance.payout.first_approve", "finance.payout.final_approve"])
  ) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const scope = resolveCashScopeOptions(session.actor)[0];
  const canReport = hasCapability(session.actor, "finance.report.read");
  const canListPayoutFirstApprove = hasCapability(session.actor, "finance.payout.first_approve") && hasCapability(session.actor, "finance.payout.read") && canReport;
  const canListPayoutFinalApprove = hasCapability(session.actor, "finance.payout.final_approve") && hasCapability(session.actor, "finance.payout.read") && canReport;
  const canListPaymentMethods = hasCapability(session.actor, "finance.payment_method.approve") && hasCapability(session.actor, "finance.payment_method.read");
  const canListInvoices = hasCapability(session.actor, "finance.document.approve") && hasCapability(session.actor, "finance.document.read") && canReport;
  const showAdjustmentsGapNotice = hasCapability(session.actor, "finance.adjustment.approve") && hasCapability(session.actor, "finance.adjustment.read");

  const queue = scope
    ? await fetchApprovalsQueue(
        {
          scope,
          canListPayoutFirstApprove,
          canListPayoutFinalApprove,
          canListPaymentMethods,
          canListInvoices,
        },
        { accessToken, locale },
      )
    : null;

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.approvals")}
        eyebrow={t("approvals.list.eyebrow")}
        title={t("approvals.list.title")}
        description={t("approvals.list.description")}
      />
      {!scope || !queue ? (
        <FinanceEmptyState title={t("approvals.empty.title")} description={t("approvals.empty.noScopeDescription")} />
      ) : (
        <ApprovalQueueView
          locale={locale as Locale}
          showPayoutFirstApprove={canListPayoutFirstApprove}
          showPayoutFinalApprove={canListPayoutFinalApprove}
          showPaymentMethods={canListPaymentMethods}
          showInvoices={canListInvoices}
          showAdjustmentsGapNotice={showAdjustmentsGapNotice}
          payoutFirstApprove={queue.payoutFirstApprove}
          payoutFinalApprove={queue.payoutFinalApprove}
          paymentMethodsPending={queue.paymentMethodsPending}
          invoicesPending={queue.invoicesPending}
        />
      )}
    </PageStack>
  );
}
