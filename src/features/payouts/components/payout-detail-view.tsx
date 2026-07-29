"use client";

import { Alert, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Inline, Stack, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { payoutStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { PayoutDetailDto } from "../server/client";
import { PayoutApproveDialog, type PayoutApproveDialogProps } from "./payout-approve-dialog";
import { PayoutExportDialog, type PayoutExportDialogProps } from "./payout-export-dialog";
import { PayoutMarkFailedDialog, type PayoutMarkFailedDialogProps } from "./payout-mark-failed-dialog";
import { PayoutMarkPaidDialog, type PayoutMarkPaidDialogProps } from "./payout-mark-paid-dialog";
import { PayoutMarkSentDialog, type PayoutMarkSentDialogProps } from "./payout-mark-sent-dialog";
import { PayoutReasonDialog, type PayoutReasonDialogProps } from "./payout-reason-dialog";
import { PayoutReconcileDialog, type PayoutReconcileDialogProps } from "./payout-reconcile-dialog";

/** Statuses that never permit cancellation -- client-side convenience gate only, the real rule is server-enforced. */
const NON_CANCELLABLE_STATUSES = new Set(["PAID", "MARKED_PAID", "CANCELLED", "RECONCILED", "FAILED"]);

export interface PayoutDetailViewProps {
  payout: PayoutDetailDto;
  locale: Locale;
  statusLabels: Record<string, string>;
  capabilities: {
    canHold: boolean;
    canFirstApprove: boolean;
    canFinalApprove: boolean;
    canExport: boolean;
    canMarkSent: boolean;
    canMarkPaid: boolean;
    canMarkFailed: boolean;
    canRetry: boolean;
    canCancel: boolean;
    canReconcile: boolean;
  };
  holdDialogLabels: PayoutReasonDialogProps["labels"];
  releaseHoldDialogLabels: PayoutReasonDialogProps["labels"];
  cancelDialogLabels: PayoutReasonDialogProps["labels"];
  retryDialogLabels: PayoutReasonDialogProps["labels"];
  firstApproveDialogLabels: PayoutApproveDialogProps["labels"];
  finalApproveDialogLabels: PayoutApproveDialogProps["labels"];
  exportDialogLabels: PayoutExportDialogProps["labels"];
  markSentDialogLabels: PayoutMarkSentDialogProps["labels"];
  markPaidDialogLabels: PayoutMarkPaidDialogProps["labels"];
  markFailedDialogLabels: PayoutMarkFailedDialogProps["labels"];
  reconcileDialogLabels: PayoutReconcileDialogProps["labels"];
  labels: {
    summaryTitle: string;
    linesTitle: string;
    holdsTitle: string;
    approvalsTitle: string;
    attemptsTitle: string;
    proofsTitle: string;
    failureTitle: string;
    failureCode: string;
    failureReason: string;
    retryCount: string;
    nextAttempt: string;
    notAvailable: string;
    status: string;
    code: string;
    currencyId: string;
    counterparty: string;
    amount: string;
    destination: string;
    paymentMethodId: string;
    paymentMethodStatus: string;
    paymentMethodVersion: string;
    createdAt: string;
    updatedAt: string;
    noLines: string;
    noHolds: string;
    noApprovals: string;
    noAttempts: string;
    noProofs: string;
    lineColumns: { recipient: string; order: string; obligation: string; paymentMethod: string; amount: string; status: string; settledAt: string };
    holdColumns: { type: string; status: string; reason: string; createdAt: string; releasedAt: string; releaseReason: string };
    approvalColumns: { stage: string; decision: string; actor: string; reason: string; createdAt: string };
    attemptColumns: { attempt: string; status: string; externalReference: string; errorCode: string; nextAttemptAt: string; createdAt: string };
    proofColumns: { reference: string; checksum: string; mimeType: string; size: string; active: string; createdAt: string };
    makerCheckerNote: string;
    releaseHoldTrigger: string;
  };
}

/**
 * The richest detail DTO in this phase: renders every server-provided field verbatim,
 * never recomputes a total/status, and never renders `sensitiveReference`,
 * `destinationFingerprint`, a provider secret, or a raw provider response -- the DTO this
 * view consumes does not even include those fields for a payout. `currencyId` (not a
 * resolved ISO code) is the only currency field the real detail response provides, unlike
 * obligations/documents which do return a resolved code -- MoneyValue degrades gracefully
 * to a bare amount when no currency code is available, which is the documented behavior
 * here rather than a fabricated currency.
 */
export function PayoutDetailView({
  payout,
  locale,
  statusLabels,
  capabilities,
  holdDialogLabels,
  releaseHoldDialogLabels,
  cancelDialogLabels,
  retryDialogLabels,
  firstApproveDialogLabels,
  finalApproveDialogLabels,
  exportDialogLabels,
  markSentDialogLabels,
  markPaidDialogLabels,
  markFailedDialogLabels,
  reconcileDialogLabels,
  labels,
}: PayoutDetailViewProps) {
  const showHold = capabilities.canHold;
  const showFirstApprove = capabilities.canFirstApprove && payout.status === "PENDING_FIRST_APPROVAL";
  const showFinalApprove = capabilities.canFinalApprove && payout.status === "PENDING_FINAL_APPROVAL";
  const showExport = capabilities.canExport && payout.status === "APPROVED";
  const showMarkSent = capabilities.canMarkSent && payout.status === "EXPORT_READY";
  const showMarkPaid = capabilities.canMarkPaid && payout.status === "SENT";
  const showMarkFailed = capabilities.canMarkFailed && payout.status === "SENT";
  const showRetry = capabilities.canRetry && payout.status === "FAILED";
  const showCancel = capabilities.canCancel && !NON_CANCELLABLE_STATUSES.has(payout.status);
  const showReconcile = capabilities.canReconcile && (payout.status === "PAID" || payout.status === "MARKED_PAID");

  const latestAttempt = payout.attempts.length > 0 ? payout.attempts[payout.attempts.length - 1] : undefined;

  const anyActionAvailable = showHold || showFirstApprove || showFinalApprove || showExport || showMarkSent || showMarkPaid || showMarkFailed || showRetry || showCancel || showReconcile;

  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.status} value={<FinanceStatusBadge label={statusLabels[payout.status] ?? payout.status} tone={payoutStatusTone(payout.status)} />} />
            <DetailItem label={labels.code} value={payout.code ?? labels.notAvailable} />
            <DetailItem label={labels.counterparty} value={`${payout.counterpartyType} · ${payout.counterpartyId}`} />
            <DetailItem label={labels.currencyId} value={payout.currencyId} />
            <DetailItem label={labels.amount} value={<MoneyValue amount={payout.totalAmount} currencyCode={undefined} locale={locale} />} />
            <DetailItem label={labels.destination} value={<MaskedDestination maskedValue={payout.destinationMasked} />} />
            <DetailItem label={labels.paymentMethodId} value={payout.paymentMethodId} />
            <DetailItem label={labels.paymentMethodVersion} value={payout.paymentMethodVersion} />
            {payout.paymentMethod ? (
              <DetailItem
                label={labels.paymentMethodStatus}
                value={`${payout.paymentMethod.status} · v${payout.paymentMethod.version}`}
              />
            ) : null}
            <DetailItem label={labels.createdAt} value={payout.createdAt} />
            <DetailItem label={labels.updatedAt} value={payout.updatedAt} />
          </DetailList>
        </CardContent>
      </Card>

      {payout.holds.some((hold) => hold.status === "ACTIVE") || payout.status === "FAILED" ? (
        <Card>
          <CardHeader>
            <CardTitle>{labels.failureTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <DetailItem label={labels.failureCode} value={payout.failureCode ?? labels.notAvailable} />
              <DetailItem label={labels.failureReason} value={payout.failureReason ?? labels.notAvailable} />
              <DetailItem label={labels.retryCount} value={payout.retryCount} />
              <DetailItem label={labels.nextAttempt} value={latestAttempt?.nextAttemptAt ?? labels.notAvailable} />
            </DetailList>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{labels.linesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {payout.lines.length === 0 ? (
            <Alert tone="neutral">{labels.noLines}</Alert>
          ) : (
            <Table aria-label={labels.linesTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.lineColumns.recipient}</TableHead>
                  <TableHead>{labels.lineColumns.order}</TableHead>
                  <TableHead>{labels.lineColumns.obligation}</TableHead>
                  <TableHead>{labels.lineColumns.paymentMethod}</TableHead>
                  <TableHead align="end">{labels.lineColumns.amount}</TableHead>
                  <TableHead>{labels.lineColumns.status}</TableHead>
                  <TableHead>{labels.lineColumns.settledAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payout.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.recipientId}</TableCell>
                    <TableCell>{line.orderId ?? labels.notAvailable}</TableCell>
                    <TableCell>{line.financialObligationId}</TableCell>
                    <TableCell>
                      <MaskedDestination maskedValue={line.destinationMasked} />
                    </TableCell>
                    <TableCell align="end">
                      <MoneyValue amount={line.amount} currencyCode={undefined} locale={locale} />
                    </TableCell>
                    <TableCell>
                      <FinanceStatusBadge label={line.status} tone={payoutStatusTone(line.status)} />
                    </TableCell>
                    <TableCell>{line.settledAt ?? labels.notAvailable}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.holdsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {payout.holds.length === 0 ? (
            <Alert tone="neutral">{labels.noHolds}</Alert>
          ) : (
            <Table aria-label={labels.holdsTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.holdColumns.type}</TableHead>
                  <TableHead>{labels.holdColumns.status}</TableHead>
                  <TableHead>{labels.holdColumns.reason}</TableHead>
                  <TableHead>{labels.holdColumns.createdAt}</TableHead>
                  <TableHead>{labels.holdColumns.releasedAt}</TableHead>
                  <TableHead>{labels.holdColumns.releaseReason}</TableHead>
                  <TableHead>{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payout.holds.map((hold) => (
                  <TableRow key={hold.id}>
                    <TableCell>{hold.type}</TableCell>
                    <TableCell>{hold.status}</TableCell>
                    <TableCell>{hold.reason}</TableCell>
                    <TableCell>{hold.createdAt}</TableCell>
                    <TableCell>{hold.releasedAt ?? labels.notAvailable}</TableCell>
                    <TableCell>{hold.releaseReason ?? labels.notAvailable}</TableCell>
                    <TableCell>
                      {hold.status === "ACTIVE" && capabilities.canHold ? (
                        <PayoutReasonDialog
                          action="releaseHold"
                          payoutId={payout.id}
                          holdId={hold.id}
                          amount={payout.totalAmount}
                          currencyCode={undefined}
                          destinationMasked={payout.destinationMasked}
                          locale={locale}
                          labels={releaseHoldDialogLabels}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.approvalsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {payout.approvals.length === 0 ? (
            <Alert tone="neutral">{labels.noApprovals}</Alert>
          ) : (
            <Table aria-label={labels.approvalsTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.approvalColumns.stage}</TableHead>
                  <TableHead>{labels.approvalColumns.decision}</TableHead>
                  <TableHead>{labels.approvalColumns.actor}</TableHead>
                  <TableHead>{labels.approvalColumns.reason}</TableHead>
                  <TableHead>{labels.approvalColumns.createdAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payout.approvals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>{approval.stage}</TableCell>
                    <TableCell>{approval.decision}</TableCell>
                    <TableCell>{approval.actorId}</TableCell>
                    <TableCell>{approval.reason ?? labels.notAvailable}</TableCell>
                    <TableCell>{approval.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.attemptsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {payout.attempts.length === 0 ? (
            <Alert tone="neutral">{labels.noAttempts}</Alert>
          ) : (
            <Table aria-label={labels.attemptsTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.attemptColumns.attempt}</TableHead>
                  <TableHead>{labels.attemptColumns.status}</TableHead>
                  <TableHead>{labels.attemptColumns.externalReference}</TableHead>
                  <TableHead>{labels.attemptColumns.errorCode}</TableHead>
                  <TableHead>{labels.attemptColumns.nextAttemptAt}</TableHead>
                  <TableHead>{labels.attemptColumns.createdAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payout.attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>{attempt.attemptNumber}</TableCell>
                    <TableCell>{attempt.status}</TableCell>
                    <TableCell>{attempt.externalReference ?? labels.notAvailable}</TableCell>
                    <TableCell>{attempt.errorCode ?? labels.notAvailable}</TableCell>
                    <TableCell>{attempt.nextAttemptAt ?? labels.notAvailable}</TableCell>
                    <TableCell>{attempt.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.proofsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {payout.paymentProofs.length === 0 ? (
            <Alert tone="neutral">{labels.noProofs}</Alert>
          ) : (
            <Table aria-label={labels.proofsTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.proofColumns.reference}</TableHead>
                  <TableHead>{labels.proofColumns.mimeType}</TableHead>
                  <TableHead>{labels.proofColumns.size}</TableHead>
                  <TableHead>{labels.proofColumns.active}</TableHead>
                  <TableHead>{labels.proofColumns.createdAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payout.paymentProofs.map((proof) => (
                  <TableRow key={proof.id}>
                    <TableCell>{proof.proofReference}</TableCell>
                    <TableCell>{proof.mimeType ?? labels.notAvailable}</TableCell>
                    <TableCell>{proof.size ?? labels.notAvailable}</TableCell>
                    <TableCell>{proof.active ? "✓" : "—"}</TableCell>
                    <TableCell>{proof.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showFirstApprove || showFinalApprove ? <Alert tone="info">{labels.makerCheckerNote}</Alert> : null}

      {anyActionAvailable ? (
        <Card>
          <CardContent>
            <Inline gap="sm" wrap>
              {showHold ? (
                <PayoutReasonDialog
                  action="hold"
                  payoutId={payout.id}
                  amount={payout.totalAmount}
                  currencyCode={undefined}
                  destinationMasked={payout.destinationMasked}
                  locale={locale}
                  labels={holdDialogLabels}
                />
              ) : null}
              {showFirstApprove ? (
                <PayoutApproveDialog stage="first" payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={firstApproveDialogLabels} />
              ) : null}
              {showFinalApprove ? (
                <PayoutApproveDialog stage="final" payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={finalApproveDialogLabels} />
              ) : null}
              {showExport ? (
                <PayoutExportDialog payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={exportDialogLabels} />
              ) : null}
              {showMarkSent ? (
                <PayoutMarkSentDialog payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={markSentDialogLabels} />
              ) : null}
              {showMarkPaid ? (
                <PayoutMarkPaidDialog
                  payoutId={payout.id}
                  reference={payout.code}
                  amount={payout.totalAmount}
                  currencyCode={undefined}
                  counterpartyType={payout.counterpartyType}
                  counterpartyId={payout.counterpartyId}
                  destinationMasked={payout.destinationMasked}
                  locale={locale}
                  labels={markPaidDialogLabels}
                />
              ) : null}
              {showMarkFailed ? (
                <PayoutMarkFailedDialog payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={markFailedDialogLabels} />
              ) : null}
              {showRetry ? (
                <PayoutReasonDialog action="retry" payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={retryDialogLabels} />
              ) : null}
              {showReconcile ? (
                <PayoutReconcileDialog payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={reconcileDialogLabels} />
              ) : null}
              {showCancel ? (
                <PayoutReasonDialog action="cancel" payoutId={payout.id} amount={payout.totalAmount} currencyCode={undefined} destinationMasked={payout.destinationMasked} locale={locale} labels={cancelDialogLabels} />
              ) : null}
            </Inline>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
