"use client";

import { Alert, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { obligationStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";

import type { FinancialObligationDto } from "../server/client";
import { ObligationAllocateForm, type ObligationAllocateFormProps } from "./obligation-allocate-form";

export interface ObligationDetailViewProps {
  obligation: FinancialObligationDto;
  locale: Locale;
  statusLabel: string;
  canAllocate: boolean;
  canReadAudit: boolean;
  allocateLabels: ObligationAllocateFormProps["labels"];
  labels: {
    summaryTitle: string;
    nature: string;
    natureLabels: Record<string, string>;
    direction: string;
    directionLabels: Record<string, string>;
    counterparty: string;
    source: string;
    currency: string;
    original: string;
    allocated: string;
    settled: string;
    remaining: string;
    effectiveAt: string;
    dueAt: string;
    notAvailable: string;
    holdReason: string;
    version: string;
    gapNotice: string;
    auditLink: string;
  };
}

export function ObligationDetailView({ obligation, locale, statusLabel, canAllocate, canReadAudit, allocateLabels, labels }: ObligationDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={statusLabel} value={<FinanceStatusBadge label={obligation.status} tone={obligationStatusTone(obligation.status)} />} />
            <DetailItem label={labels.nature} value={labels.natureLabels[obligation.nature] ?? obligation.nature} />
            <DetailItem label={labels.direction} value={labels.directionLabels[obligation.direction] ?? obligation.direction} />
            <DetailItem label={labels.counterparty} value={`${obligation.counterpartyType} · ${obligation.counterpartyId}`} />
            <DetailItem label={labels.source} value={`${obligation.sourceDomain} · ${obligation.sourceReferenceType} · ${obligation.sourceReferenceId}`} />
            <DetailItem label={labels.currency} value={obligation.currency} />
            <DetailItem label={labels.original} value={<MoneyValue amount={obligation.originalAmount} currencyCode={obligation.currency} locale={locale} />} />
            <DetailItem label={labels.allocated} value={<MoneyValue amount={obligation.allocatedAmount} currencyCode={obligation.currency} locale={locale} />} />
            <DetailItem label={labels.settled} value={<MoneyValue amount={obligation.settledAmount} currencyCode={obligation.currency} locale={locale} />} />
            <DetailItem label={labels.remaining} value={<MoneyValue amount={obligation.remainingAmount} currencyCode={obligation.currency} locale={locale} />} />
            <DetailItem label={labels.effectiveAt} value={obligation.effectiveAt} />
            <DetailItem label={labels.dueAt} value={obligation.dueAt ?? labels.notAvailable} />
            {obligation.holdReason ? <DetailItem label={labels.holdReason} value={obligation.holdReason} /> : null}
            <DetailItem label={labels.version} value={obligation.version} />
          </DetailList>
        </CardContent>
      </Card>

      <Alert tone="info">{labels.gapNotice}</Alert>

      {canReadAudit ? (
        <Link href={`/audit?resourceType=FinancialObligation&resourceId=${obligation.id}`}>{labels.auditLink}</Link>
      ) : null}

      {canAllocate && obligation.status !== "SETTLED" && obligation.status !== "CANCELLED" && obligation.status !== "REVERSED" ? (
        <Card>
          <CardContent>
            <ObligationAllocateForm obligationId={obligation.id} labels={allocateLabels} />
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
