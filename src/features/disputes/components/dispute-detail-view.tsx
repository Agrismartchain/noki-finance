"use client";

import { Alert, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { disputeStatusTone } from "@/features/finance-shared/status-maps";
import { Link } from "@/i18n/navigation";

import type { FinancialDisputeDto } from "../server/client";
import { DisputeResolutionForm, type DisputeResolutionFormProps } from "./dispute-resolution-form";

export interface DisputeDetailViewProps {
  dispute: FinancialDisputeDto;
  canResolve: boolean;
  statusLabels: Record<"OPEN" | "RESOLVED", string>;
  resolutionLabels: Record<"RELEASE" | "ADJUSTMENT", string>;
  resolveLabels: DisputeResolutionFormProps["labels"];
  labels: {
    summaryTitle: string;
    status: string;
    obligationLink: string;
    adjustmentLink: string;
    reasonCode: string;
    reason: string;
    resolution: string;
    resolutionReason: string;
    openedAt: string;
    resolvedAt: string;
    heldNotice: string;
    releasedNotice: string;
    notAvailable: string;
  };
}

/**
 * Effects per the spec's absolute rule (hold / payout blocked / release /
 * possible adjustment): OPEN always means the linked obligation is held --
 * RESOLVED + RELEASE means the hold was released -- RESOLVED + ADJUSTMENT
 * means a compensating adjustment was applied, linked below.
 */
export function DisputeDetailView({ dispute, canResolve, statusLabels, resolutionLabels, resolveLabels, labels }: DisputeDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.status} value={<FinanceStatusBadge label={statusLabels[dispute.status]} tone={disputeStatusTone(dispute.status)} />} />
            <DetailItem label={labels.obligationLink} value={<Link href={`/obligations/${dispute.obligationId}`}>{dispute.obligationId.slice(0, 8)}</Link>} />
            <DetailItem label={labels.reasonCode} value={dispute.reasonCode} />
            <DetailItem label={labels.reason} value={dispute.reason} />
            <DetailItem label={labels.openedAt} value={dispute.openedAt} />
            {dispute.resolution ? <DetailItem label={labels.resolution} value={resolutionLabels[dispute.resolution]} /> : null}
            {dispute.resolutionReason ? <DetailItem label={labels.resolutionReason} value={dispute.resolutionReason} /> : null}
            {dispute.resolvedAt ? <DetailItem label={labels.resolvedAt} value={dispute.resolvedAt} /> : null}
            {dispute.resolution === "ADJUSTMENT" && dispute.adjustmentId ? (
              <DetailItem label={labels.adjustmentLink} value={<Link href={`/adjustments/${dispute.adjustmentId}`}>{dispute.adjustmentId.slice(0, 8)}</Link>} />
            ) : null}
          </DetailList>
        </CardContent>
      </Card>

      {dispute.status === "OPEN" ? <Alert tone="warning">{labels.heldNotice}</Alert> : null}
      {dispute.status === "RESOLVED" && dispute.resolution === "RELEASE" ? <Alert tone="success">{labels.releasedNotice}</Alert> : null}

      {canResolve && dispute.status === "OPEN" ? (
        <Card>
          <CardContent>
            <DisputeResolutionForm disputeId={dispute.id} labels={resolveLabels} />
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
