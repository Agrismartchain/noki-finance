"use client";

import { Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { feeAssessmentStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { FeeAssessmentDto } from "../server/client";
import type { FeeAssessmentStatus } from "../server/list-query";

export interface FeeAssessmentDetailViewProps {
  feeAssessment: FeeAssessmentDto;
  locale: Locale;
  statusLabels: Record<FeeAssessmentStatus, string>;
  labels: {
    summaryTitle: string;
    obligationId: string;
    type: string;
    amount: string;
    status: string;
    currency: string;
    createdAt: string;
    calculationExplanation: string;
    calculationType: string;
    fixedAmount: string;
    percentageRate: string;
    percentageBase: string;
    minimumAmount: string;
    maximumAmount: string;
    sourceFeeRuleId: string;
    ruleVersion: string;
    notAvailable: string;
  };
}

/**
 * Explains the final `amount` purely from the server-provided calculation
 * fields (fixedAmount/percentageRate/percentageBase/min/max) -- this view
 * never recomputes it client-side. `amount` remains the sole source of truth.
 */
export function FeeAssessmentDetailView({ feeAssessment, locale, statusLabels, labels }: FeeAssessmentDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.status} value={<FinanceStatusBadge label={statusLabels[feeAssessment.status as FeeAssessmentStatus] ?? feeAssessment.status} tone={feeAssessmentStatusTone(feeAssessment.status)} />} />
            <DetailItem label={labels.obligationId} value={feeAssessment.financialObligationId} />
            <DetailItem label={labels.type} value={feeAssessment.type} />
            <DetailItem label={labels.currency} value={feeAssessment.currency} />
            <DetailItem label={labels.amount} value={<MoneyValue amount={feeAssessment.amount} currencyCode={feeAssessment.currency} locale={locale} />} />
            <DetailItem label={labels.createdAt} value={feeAssessment.createdAt} />
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.calculationExplanation}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.calculationType} value={feeAssessment.calculationType ?? labels.notAvailable} />
            <DetailItem label={labels.fixedAmount} value={<MoneyValue amount={feeAssessment.fixedAmount} currencyCode={feeAssessment.currency} locale={locale} />} />
            <DetailItem label={labels.percentageRate} value={feeAssessment.percentageRate ?? labels.notAvailable} />
            <DetailItem label={labels.percentageBase} value={feeAssessment.percentageBase ?? labels.notAvailable} />
            <DetailItem label={labels.minimumAmount} value={<MoneyValue amount={feeAssessment.minimumAmount} currencyCode={feeAssessment.currency} locale={locale} />} />
            <DetailItem label={labels.maximumAmount} value={<MoneyValue amount={feeAssessment.maximumAmount} currencyCode={feeAssessment.currency} locale={locale} />} />
            <DetailItem label={labels.sourceFeeRuleId} value={feeAssessment.sourceFeeRuleId ?? labels.notAvailable} />
            <DetailItem label={labels.ruleVersion} value={feeAssessment.ruleVersion ?? labels.notAvailable} />
          </DetailList>
        </CardContent>
      </Card>
    </Stack>
  );
}
