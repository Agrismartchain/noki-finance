"use client";

import { Alert, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { reconciliationStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { FinancialReconciliationResponseDto } from "../server/client";
import type { ReconciliationStatus } from "../server/list-query";
import { ReconciliationApprovalState } from "./reconciliation-approval-state";

export interface ReconciliationDetailViewProps {
  reconciliation: FinancialReconciliationResponseDto;
  locale: Locale;
  statusLabels: Record<ReconciliationStatus, string>;
  canSubmit: boolean;
  canApprove: boolean;
  labels: {
    summaryTitle: string;
    session: string;
    status: string;
    expected: string;
    received: string;
    variance: string;
    createdAt: string;
    submittedAt: string;
    approvedAt: string;
    notAvailable: string;
    preparerNotExposed: string;
    approverNotExposed: string;
    linkedVariancesNote: string;
    actionsTitle: string;
    makerCheckerNote: string;
    submit: string;
    approve: string;
    genericError: string;
    correlationLabel: string;
    noActionAvailable: string;
  };
}

export function ReconciliationDetailView({ reconciliation, locale, statusLabels, canSubmit, canApprove, labels }: ReconciliationDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.session} value={reconciliation.cashSessionId} />
            <DetailItem
              label={labels.status}
              value={<FinanceStatusBadge label={statusLabels[reconciliation.status as ReconciliationStatus] ?? reconciliation.status} tone={reconciliationStatusTone(reconciliation.status)} />}
            />
            <DetailItem label={labels.expected} value={<MoneyValue amount={reconciliation.expectedAmount} currencyCode={undefined} locale={locale} />} />
            <DetailItem label={labels.received} value={<MoneyValue amount={reconciliation.receivedAmount} currencyCode={undefined} locale={locale} />} />
            <DetailItem label={labels.variance} value={<MoneyValue amount={reconciliation.varianceAmount} currencyCode={undefined} locale={locale} />} />
            {/* FinancialReconciliationResponseDto exposes no preparer/approver actor field -- rendered as an explicit gap, not invented. */}
            <DetailItem label="—" value={labels.preparerNotExposed} />
            <DetailItem label="—" value={labels.approverNotExposed} />
            <DetailItem label={labels.createdAt} value={reconciliation.createdAt} />
            <DetailItem label={labels.submittedAt} value={reconciliation.submittedAt ? String(reconciliation.submittedAt) : labels.notAvailable} />
            <DetailItem label={labels.approvedAt} value={reconciliation.approvedAt ? String(reconciliation.approvedAt) : labels.notAvailable} />
          </DetailList>
        </CardContent>
      </Card>

      <Alert tone="info">{labels.linkedVariancesNote}</Alert>

      <Card>
        <CardHeader>
          <CardTitle>{labels.actionsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReconciliationApprovalState
            reconciliation={reconciliation}
            canSubmit={canSubmit}
            canApprove={canApprove}
            labels={{
              makerCheckerNote: labels.makerCheckerNote,
              submit: labels.submit,
              approve: labels.approve,
              genericError: labels.genericError,
              correlationLabel: labels.correlationLabel,
              noActionAvailable: labels.noActionAvailable,
            }}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
