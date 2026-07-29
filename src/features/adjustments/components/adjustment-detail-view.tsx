"use client";

import { Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { adjustmentStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";

import type { FinancialAdjustmentDto } from "../server/client";
import { AdjustmentActions, type AdjustmentActionsProps } from "./adjustment-actions";

export interface AdjustmentDetailViewProps {
  adjustment: FinancialAdjustmentDto;
  locale: Locale;
  canManage: boolean;
  actionLabels: AdjustmentActionsProps["labels"];
  labels: {
    summaryTitle: string;
    statusLabel: string;
    typeLabel: string;
    typeLabels: Record<string, string>;
    counterparty: string;
    source: string;
    currency: string;
    amount: string;
    reasonCode: string;
    reason: string;
    attachmentReference: string;
    author: string;
    submitter: string;
    approver: string;
    appliedObligation: string;
    notAvailable: string;
  };
}

/**
 * Every field here is read-only, straight from the server -- actor ids are shown
 * truncated with a title/tooltip (no name-resolution endpoint exists, none is invented).
 * The amount is never shown with a sign/direction, matching the DTO (which has neither).
 */
export function AdjustmentDetailView({ adjustment, locale, canManage, actionLabels, labels }: AdjustmentDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.statusLabel} value={<FinanceStatusBadge label={adjustment.status} tone={adjustmentStatusTone(adjustment.status)} />} />
            <DetailItem label={labels.typeLabel} value={labels.typeLabels[adjustment.type] ?? adjustment.type} />
            <DetailItem label={labels.counterparty} value={`${adjustment.counterpartyType} · ${adjustment.counterpartyId}`} />
            <DetailItem label={labels.source} value={`${adjustment.sourceDomain} · ${adjustment.sourceReferenceType} · ${adjustment.sourceReferenceId}`} />
            <DetailItem label={labels.currency} value={adjustment.currency} />
            <DetailItem label={labels.amount} value={<MoneyValue amount={adjustment.amount} currencyCode={adjustment.currency} locale={locale} />} />
            <DetailItem label={labels.reasonCode} value={adjustment.reasonCode} />
            <DetailItem label={labels.reason} value={adjustment.reason} />
            <DetailItem label={labels.attachmentReference} value={adjustment.attachmentReference ?? labels.notAvailable} />
            <DetailItem label={labels.author} value={<span title={adjustment.createdByActorId ?? undefined}>{adjustment.createdByActorId ? adjustment.createdByActorId.slice(0, 8) : labels.notAvailable}</span>} />
            <DetailItem
              label={labels.submitter}
              value={<span title={adjustment.submittedByActorId ?? undefined}>{adjustment.submittedByActorId ? adjustment.submittedByActorId.slice(0, 8) : labels.notAvailable}</span>}
            />
            <DetailItem
              label={labels.approver}
              value={<span title={adjustment.approvedByActorId ?? undefined}>{adjustment.approvedByActorId ? adjustment.approvedByActorId.slice(0, 8) : labels.notAvailable}</span>}
            />
            <DetailItem
              label={labels.appliedObligation}
              value={adjustment.appliedObligationId ? <Link href={`/obligations/${adjustment.appliedObligationId}`}>{adjustment.appliedObligationId.slice(0, 8)}</Link> : labels.notAvailable}
            />
          </DetailList>
        </CardContent>
      </Card>

      {canManage && (adjustment.status === "SUBMITTED" || adjustment.status === "APPROVED") ? (
        <Card>
          <CardContent>
            <AdjustmentActions adjustmentId={adjustment.id} status={adjustment.status} canManage={canManage} labels={actionLabels} />
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
