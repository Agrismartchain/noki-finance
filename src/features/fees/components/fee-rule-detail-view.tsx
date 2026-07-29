"use client";

import { Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { feeRuleWorkflowStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { FeeRuleDto, FeeRuleWorkflowStatus } from "../server/client";
import { FeesNotice } from "./fees-notice";

export interface FeeRuleDetailViewProps {
  feeRule: FeeRuleDto;
  locale: Locale;
  workflowStatusLabels: Record<FeeRuleWorkflowStatus, string>;
  labels: {
    summaryTitle: string;
    type: string;
    scopeType: string;
    calculationType: string;
    sourceDomain: string;
    counterpartyType: string;
    serviceCode: string;
    sellerId: string;
    cityId: string;
    zoneId: string;
    subZoneId: string;
    fixedAmount: string;
    percentageRate: string;
    percentageBase: string;
    minimumAmount: string;
    maximumAmount: string;
    priority: string;
    validFrom: string;
    validTo: string;
    workflowStatus: string;
    version: string;
    notAvailable: string;
    gapNotice: string;
  };
}

/**
 * There is no submit/activate/deactivate endpoint on this controller
 * (verified) -- the create-then-read cycle is all that exists today, hence
 * the gap notice instead of any workflow action.
 */
export function FeeRuleDetailView({ feeRule, locale, workflowStatusLabels, labels }: FeeRuleDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem
              label={labels.workflowStatus}
              value={<FinanceStatusBadge label={workflowStatusLabels[feeRule.workflowStatus as FeeRuleWorkflowStatus] ?? feeRule.workflowStatus} tone={feeRuleWorkflowStatusTone(feeRule.workflowStatus)} />}
            />
            <DetailItem label={labels.type} value={feeRule.type} />
            <DetailItem label={labels.scopeType} value={feeRule.scopeType} />
            <DetailItem label={labels.calculationType} value={feeRule.calculationType} />
            <DetailItem label={labels.sourceDomain} value={feeRule.sourceDomain ?? labels.notAvailable} />
            <DetailItem label={labels.counterpartyType} value={feeRule.counterpartyType ?? labels.notAvailable} />
            <DetailItem label={labels.serviceCode} value={feeRule.serviceCode ?? labels.notAvailable} />
            <DetailItem label={labels.sellerId} value={feeRule.sellerId ?? labels.notAvailable} />
            <DetailItem label={labels.cityId} value={feeRule.cityId ?? labels.notAvailable} />
            <DetailItem label={labels.zoneId} value={feeRule.zoneId ?? labels.notAvailable} />
            <DetailItem label={labels.subZoneId} value={feeRule.subZoneId ?? labels.notAvailable} />
            <DetailItem label={labels.fixedAmount} value={<MoneyValue amount={feeRule.fixedAmount} currencyCode={feeRule.currencyCode} locale={locale} />} />
            <DetailItem label={labels.percentageRate} value={feeRule.percentageRate ?? labels.notAvailable} />
            <DetailItem label={labels.percentageBase} value={feeRule.percentageBase ?? labels.notAvailable} />
            <DetailItem label={labels.minimumAmount} value={<MoneyValue amount={feeRule.minimumAmount} currencyCode={feeRule.currencyCode} locale={locale} />} />
            <DetailItem label={labels.maximumAmount} value={<MoneyValue amount={feeRule.maximumAmount} currencyCode={feeRule.currencyCode} locale={locale} />} />
            <DetailItem label={labels.priority} value={feeRule.priority} />
            <DetailItem label={labels.validFrom} value={feeRule.validFrom ?? labels.notAvailable} />
            <DetailItem label={labels.validTo} value={feeRule.validTo ?? labels.notAvailable} />
            <DetailItem label={labels.version} value={feeRule.version} />
          </DetailList>
        </CardContent>
      </Card>

      <FeesNotice tone="info" message={labels.gapNotice} />
    </Stack>
  );
}
