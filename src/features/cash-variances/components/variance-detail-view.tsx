"use client";

import { Alert, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { VarianceBadge, type VarianceBadgeLabels } from "@/features/finance-shared/components/variance-badge";
import type { Locale } from "@/i18n/locales";

import type { CashVarianceResponseDto } from "../server/client";
import type { VarianceType } from "../server/list-query";
import { VarianceResolutionForm } from "./variance-resolution-form";

export interface VarianceDetailViewProps {
  variance: CashVarianceResponseDto;
  locale: Locale;
  typeLabels: Record<VarianceType, string>;
  varianceBadgeLabels: VarianceBadgeLabels;
  canResolve: boolean;
  labels: {
    summaryTitle: string;
    type: string;
    status: string;
    source: string;
    expected: string;
    actual: string;
    variance: string;
    createdAt: string;
    resolvedAt: string;
    notAvailable: string;
    resolutionTitle: string;
    resolutionUnavailableNote: string;
    decisionLabel: string;
    resolvedOption: string;
    waivedOption: string;
    reasonLabel: string;
    reasonRequired: string;
    decisionRequired: string;
    confirmTitle: string;
    confirmDescription: string;
    submit: string;
    confirm: string;
    dismiss: string;
    genericError: string;
    correlationLabel: string;
  };
}

export function VarianceDetailView({ variance, locale, typeLabels, varianceBadgeLabels, canResolve, labels }: VarianceDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.type} value={typeLabels[variance.type as VarianceType] ?? variance.type} />
            <DetailItem label={labels.status} value={<VarianceBadge status={variance.status} varianceAmount={variance.varianceAmount} labels={varianceBadgeLabels} />} />
            <DetailItem label={labels.source} value={`${variance.sourceReferenceType} (${variance.sourceReferenceId.slice(0, 8)})`} />
            <DetailItem label={labels.expected} value={<MoneyValue amount={variance.expectedAmount} currencyCode={undefined} locale={locale} />} />
            <DetailItem label={labels.actual} value={<MoneyValue amount={variance.actualAmount} currencyCode={undefined} locale={locale} />} />
            <DetailItem label={labels.variance} value={<MoneyValue amount={variance.varianceAmount} currencyCode={undefined} locale={locale} />} />
            <DetailItem label={labels.createdAt} value={variance.createdAt} />
            <DetailItem label={labels.resolvedAt} value={variance.resolvedAt ? String(variance.resolvedAt) : labels.notAvailable} />
          </DetailList>
        </CardContent>
      </Card>

      {variance.status === "OPEN" ? (
        <Card>
          <CardHeader>
            <CardTitle>{labels.resolutionTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {canResolve ? (
              <VarianceResolutionForm
                varianceId={variance.id}
                labels={{
                  decisionLabel: labels.decisionLabel,
                  resolvedOption: labels.resolvedOption,
                  waivedOption: labels.waivedOption,
                  reasonLabel: labels.reasonLabel,
                  reasonRequired: labels.reasonRequired,
                  decisionRequired: labels.decisionRequired,
                  confirmTitle: labels.confirmTitle,
                  confirmDescription: labels.confirmDescription,
                  submit: labels.submit,
                  confirm: labels.confirm,
                  dismiss: labels.dismiss,
                  genericError: labels.genericError,
                  correlationLabel: labels.correlationLabel,
                }}
              />
            ) : (
              <Alert tone="info">{labels.resolutionUnavailableNote}</Alert>
            )}
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
