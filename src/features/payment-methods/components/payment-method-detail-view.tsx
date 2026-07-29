"use client";

import { Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { paymentMethodStatusTone } from "@/features/finance-shared/status-maps";

import type { PaymentMethodDto } from "../server/client";
import { PaymentMethodActions, type PaymentMethodActionsProps } from "./payment-method-actions";
import { PaymentMethodSensitiveReveal, type PaymentMethodSensitiveRevealProps } from "./payment-method-sensitive-reveal";

export interface PaymentMethodDetailViewProps {
  paymentMethod: PaymentMethodDto;
  currencyCode: string | undefined;
  countryCode: string | undefined;
  statusLabels: Record<PaymentMethodDto["status"], string>;
  typeLabels: Record<PaymentMethodDto["type"], string>;
  actionsLabels: PaymentMethodActionsProps["labels"];
  sensitiveLabels: PaymentMethodSensitiveRevealProps["labels"];
  canApprove: boolean;
  canSuspend: boolean;
  canRevoke: boolean;
  canRevealSensitive: boolean;
  labels: {
    summaryTitle: string;
    type: string;
    provider: string;
    destination: string;
    status: string;
    version: string;
    counterparty: string;
    currency: string;
    country: string;
    createdAt: string;
    approvedAt: string;
    suspendedAt: string;
    revokedAt: string;
    notAvailable: string;
  };
}

/**
 * `destinationFingerprint` exists on `PaymentMethodDto` (verified in the
 * real payload) but is intentionally never read here -- it's a one-way hash
 * for duplicate detection, not raw data, but per spec it must still never be
 * shown. The raw `sensitiveReference` is never fetched at all as part of
 * this view; it only ever appears through the explicit reveal action below.
 */
export function PaymentMethodDetailView({
  paymentMethod,
  currencyCode,
  countryCode,
  statusLabels,
  typeLabels,
  actionsLabels,
  sensitiveLabels,
  canApprove,
  canSuspend,
  canRevoke,
  canRevealSensitive,
  labels,
}: PaymentMethodDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.status} value={<FinanceStatusBadge label={statusLabels[paymentMethod.status]} tone={paymentMethodStatusTone(paymentMethod.status)} />} />
            <DetailItem label={labels.type} value={typeLabels[paymentMethod.type] ?? paymentMethod.type} />
            <DetailItem label={labels.provider} value={paymentMethod.providerCode} />
            <DetailItem label={labels.counterparty} value={`${paymentMethod.counterpartyType} · ${paymentMethod.counterpartyId}`} />
            <DetailItem label={labels.destination} value={<MaskedDestination maskedValue={paymentMethod.destinationMasked} />} />
            <DetailItem label={labels.currency} value={currencyCode ?? paymentMethod.currencyId} />
            <DetailItem label={labels.country} value={countryCode ?? paymentMethod.countryId} />
            <DetailItem label={labels.version} value={paymentMethod.version} />
            <DetailItem label={labels.createdAt} value={paymentMethod.createdAt} />
            <DetailItem label={labels.approvedAt} value={paymentMethod.approvedAt ?? labels.notAvailable} />
            <DetailItem label={labels.suspendedAt} value={paymentMethod.suspendedAt ?? labels.notAvailable} />
            <DetailItem label={labels.revokedAt} value={paymentMethod.revokedAt ?? labels.notAvailable} />
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack gap="md">
            <PaymentMethodActions paymentMethodId={paymentMethod.id} status={paymentMethod.status} canApprove={canApprove} canSuspend={canSuspend} canRevoke={canRevoke} labels={actionsLabels} />
            <PaymentMethodSensitiveReveal paymentMethodId={paymentMethod.id} canReveal={canRevealSensitive} labels={sensitiveLabels} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
