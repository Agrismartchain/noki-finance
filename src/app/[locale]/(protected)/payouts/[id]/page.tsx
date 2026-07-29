import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { PayoutDetailView } from "@/features/payouts/components/payout-detail-view";
import { getPayout, PAYOUT_HOLD_TYPES, type PayoutDetailDto, type PayoutHoldType } from "@/features/payouts/server/client";
import { PAYOUT_STATUSES } from "@/features/payouts/server/list-query";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; payout: PayoutDetailDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const payout = await getPayout(id, context);
    return { status: "ok", payout };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function PayoutDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.payout.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const result = await fetchDetailData(id, context);

  const statusLabels = Object.fromEntries(PAYOUT_STATUSES.map((status) => [status, t(`payouts.status.${status}`)])) as Record<string, string>;
  const holdTypeLabels = Object.fromEntries(PAYOUT_HOLD_TYPES.map((type) => [type, t(`payouts.holdType.${type}`)])) as Record<PayoutHoldType, string>;

  const genericErrorLabels = { genericError: t("mutations.errors.unexpected"), correlationLabel: t("mutations.correlationId") };
  const dialogCommonLabels = {
    amountLabel: t("payouts.dialogs.amount"),
    currencyLabel: t("payouts.dialogs.currency"),
    destinationLabel: t("payouts.dialogs.destination"),
    confirm: t("payouts.dialogs.confirm"),
    cancel: t("payouts.dialogs.cancel"),
    ...genericErrorLabels,
  };

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.payouts")}
        eyebrow={t("payouts.detail.eyebrow")}
        title={t("payouts.detail.title")}
        description={t("payouts.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <PayoutDetailView
          payout={result.payout}
          locale={locale as Locale}
          statusLabels={statusLabels}
          capabilities={{
            canHold: hasCapability(session.actor, "finance.payout.hold"),
            canFirstApprove: hasCapability(session.actor, "finance.payout.first_approve"),
            canFinalApprove: hasCapability(session.actor, "finance.payout.final_approve"),
            canExport: hasCapability(session.actor, "finance.payout.export"),
            canMarkSent: hasCapability(session.actor, "finance.payout.mark_sent"),
            canMarkPaid: hasCapability(session.actor, "finance.payout.mark_paid"),
            canMarkFailed: hasCapability(session.actor, "finance.payout.mark_failed"),
            canRetry: hasCapability(session.actor, "finance.payout.retry"),
            canCancel: hasCapability(session.actor, "finance.payout.cancel"),
            canReconcile: hasCapability(session.actor, "finance.payout.reconcile"),
          }}
          holdDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.hold"),
            title: t("payouts.actions.hold"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
            reasonRequired: t("payouts.dialogs.reasonRequired"),
            typeLabel: t("payouts.dialogs.typeLabel"),
            typeOptions: holdTypeLabels,
            obligationIdLabel: t("payouts.dialogs.obligationId"),
            paymentMethodIdLabel: t("payouts.create.paymentMethodId"),
          }}
          releaseHoldDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.releaseHold"),
            title: t("payouts.actions.releaseHold"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
            reasonRequired: t("payouts.dialogs.reasonRequired"),
            typeLabel: t("payouts.dialogs.typeLabel"),
            typeOptions: holdTypeLabels,
            obligationIdLabel: t("payouts.dialogs.obligationId"),
            paymentMethodIdLabel: t("payouts.create.paymentMethodId"),
          }}
          cancelDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.cancel"),
            title: t("payouts.actions.cancel"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
            reasonRequired: t("payouts.dialogs.reasonRequired"),
            typeLabel: t("payouts.dialogs.typeLabel"),
            typeOptions: holdTypeLabels,
            obligationIdLabel: t("payouts.dialogs.obligationId"),
            paymentMethodIdLabel: t("payouts.create.paymentMethodId"),
          }}
          retryDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.retry"),
            title: t("payouts.actions.retry"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
            reasonRequired: t("payouts.dialogs.reasonRequired"),
            typeLabel: t("payouts.dialogs.typeLabel"),
            typeOptions: holdTypeLabels,
            obligationIdLabel: t("payouts.dialogs.obligationId"),
            paymentMethodIdLabel: t("payouts.create.paymentMethodId"),
          }}
          firstApproveDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.firstApprove"),
            title: t("payouts.actions.firstApprove"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
            makerCheckerNote: t("payouts.makerCheckerNote"),
          }}
          finalApproveDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.finalApprove"),
            title: t("payouts.actions.finalApprove"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
            makerCheckerNote: t("payouts.makerCheckerNote"),
          }}
          exportDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.export"),
            title: t("payouts.actions.export"),
            exportReferenceLabel: t("payouts.dialogs.exportReference"),
          }}
          markSentDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.markSent"),
            title: t("payouts.actions.markSent"),
            externalReferenceLabel: t("payouts.dialogs.externalReference"),
          }}
          markPaidDialogLabels={{
            ...genericErrorLabels,
            trigger: t("payouts.actions.markPaid"),
            title: t("payouts.actions.markPaid"),
            referenceLabel: t("payouts.dialogs.reference"),
            amountLabel: t("payouts.dialogs.amount"),
            counterpartyLabel: t("payouts.columns.counterparty"),
            destinationLabel: t("payouts.dialogs.destination"),
            proofReferenceLabel: t("payouts.dialogs.proofReference"),
            proofReferenceRequired: t("payouts.dialogs.reasonRequired"),
            checksumLabel: t("payouts.dialogs.checksum"),
            mimeTypeLabel: t("payouts.dialogs.mimeType"),
            sizeLabel: t("payouts.dialogs.size"),
            confirm: t("payouts.dialogs.confirm"),
            cancel: t("payouts.dialogs.cancel"),
          }}
          markFailedDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.markFailed"),
            title: t("payouts.actions.markFailed"),
            errorCodeLabel: t("payouts.dialogs.errorCode"),
            errorCodeRequired: t("payouts.dialogs.reasonRequired"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
            reasonRequired: t("payouts.dialogs.reasonRequired"),
            externalReferenceLabel: t("payouts.dialogs.externalReference"),
            nextAttemptAtLabel: t("payouts.detail.nextAttempt"),
          }}
          reconcileDialogLabels={{
            ...dialogCommonLabels,
            trigger: t("payouts.actions.reconcile"),
            title: t("payouts.actions.reconcile"),
            reconciliationReferenceLabel: t("payouts.dialogs.reconciliationReference"),
            reconciliationReferenceRequired: t("payouts.dialogs.reasonRequired"),
            reasonLabel: t("payouts.dialogs.reasonLabel"),
          }}
          labels={{
            summaryTitle: t("payouts.detail.summaryTitle"),
            linesTitle: t("payouts.detail.linesTitle"),
            holdsTitle: t("payouts.detail.holdsTitle"),
            approvalsTitle: t("payouts.detail.approvalsTitle"),
            attemptsTitle: t("payouts.detail.attemptsTitle"),
            proofsTitle: t("payouts.detail.proofsTitle"),
            failureTitle: t("payouts.detail.failureTitle"),
            failureCode: t("payouts.detail.failureCode"),
            failureReason: t("payouts.detail.failureReason"),
            retryCount: t("payouts.detail.retryCount"),
            nextAttempt: t("payouts.detail.nextAttempt"),
            notAvailable: t("payouts.detail.notAvailable"),
            status: t("payouts.columns.status"),
            code: t("payouts.detail.code"),
            currencyId: t("payouts.detail.currencyId"),
            counterparty: t("payouts.columns.counterparty"),
            amount: t("payouts.columns.amount"),
            destination: t("payouts.dialogs.destination"),
            paymentMethodId: t("payouts.columns.paymentMethod"),
            paymentMethodStatus: t("payouts.detail.paymentMethodStatus"),
            paymentMethodVersion: t("payouts.detail.paymentMethodVersion"),
            createdAt: t("payouts.columns.createdAt"),
            updatedAt: t("payouts.columns.updatedAt"),
            noLines: t("payouts.detail.noLines"),
            noHolds: t("payouts.detail.noHolds"),
            noApprovals: t("payouts.detail.noApprovals"),
            noAttempts: t("payouts.detail.noAttempts"),
            noProofs: t("payouts.detail.noProofs"),
            lineColumns: {
              recipient: t("payouts.detail.lineColumns.recipient"),
              order: t("payouts.detail.lineColumns.order"),
              obligation: t("payouts.detail.lineColumns.obligation"),
              paymentMethod: t("payouts.columns.paymentMethod"),
              amount: t("payouts.columns.amount"),
              status: t("payouts.columns.status"),
              settledAt: t("payouts.detail.lineColumns.settledAt"),
            },
            holdColumns: {
              type: t("payouts.dialogs.typeLabel"),
              status: t("payouts.columns.status"),
              reason: t("payouts.dialogs.reasonLabel"),
              createdAt: t("payouts.columns.createdAt"),
              releasedAt: t("payouts.detail.holdColumns.releasedAt"),
              releaseReason: t("payouts.detail.holdColumns.releaseReason"),
            },
            approvalColumns: {
              stage: t("payouts.detail.approvalColumns.stage"),
              decision: t("payouts.detail.approvalColumns.decision"),
              actor: t("payouts.detail.approvalColumns.actor"),
              reason: t("payouts.dialogs.reasonLabel"),
              createdAt: t("payouts.columns.createdAt"),
            },
            attemptColumns: {
              attempt: t("payouts.detail.attemptColumns.attempt"),
              status: t("payouts.columns.status"),
              externalReference: t("payouts.dialogs.externalReference"),
              errorCode: t("payouts.dialogs.errorCode"),
              nextAttemptAt: t("payouts.detail.nextAttempt"),
              createdAt: t("payouts.columns.createdAt"),
            },
            proofColumns: {
              reference: t("payouts.dialogs.proofReference"),
              checksum: t("payouts.dialogs.checksum"),
              mimeType: t("payouts.dialogs.mimeType"),
              size: t("payouts.dialogs.size"),
              active: t("payouts.detail.proofColumns.active"),
              createdAt: t("payouts.columns.createdAt"),
            },
            makerCheckerNote: t("payouts.makerCheckerNote"),
            releaseHoldTrigger: t("payouts.actions.releaseHold"),
          }}
        />
      )}
    </PageStack>
  );
}
