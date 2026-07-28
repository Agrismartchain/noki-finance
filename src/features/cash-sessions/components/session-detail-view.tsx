"use client";

import { Alert, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { cashSessionStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { SessionStatus } from "../server/list-query";
import type { CashSessionResponseDto } from "../server/client";
import { CloseSessionForm } from "./close-session-form";

export interface SessionDetailViewProps {
  session: CashSessionResponseDto;
  currencyCode: string | undefined;
  locale: Locale;
  statusLabels: Record<SessionStatus, string>;
  canClose: boolean;
  labels: {
    summaryTitle: string;
    cashier: string;
    currency: string;
    status: string;
    openingAmount: string;
    expectedAmount: string;
    countedAmount: string;
    varianceAmount: string;
    openedAt: string;
    closedAt: string;
    notAvailable: string;
    closeTitle: string;
    closeExpectedLabel: string;
    closeCountedLabel: string;
    closePreviewLabel: string;
    closePreviewWarning: string;
    closeSubmit: string;
    genericError: string;
    correlationLabel: string;
    handoversNote: string;
  };
}

export function SessionDetailView({ session, currencyCode, locale, statusLabels, canClose, labels }: SessionDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.cashier} value={session.cashierActorId} />
            <DetailItem label={labels.currency} value={currencyCode ?? session.currencyId} />
            <DetailItem label={labels.status} value={<FinanceStatusBadge label={statusLabels[session.status as SessionStatus] ?? session.status} tone={cashSessionStatusTone(session.status)} />} />
            <DetailItem label={labels.openingAmount} value={<MoneyValue amount={session.openingAmount} currencyCode={currencyCode} locale={locale} />} />
            <DetailItem
              label={labels.expectedAmount}
              value={<MoneyValue amount={session.systemExpectedClosingAmount ? String(session.systemExpectedClosingAmount) : undefined} currencyCode={currencyCode} locale={locale} />}
            />
            <DetailItem
              label={labels.countedAmount}
              value={<MoneyValue amount={session.countedClosingAmount ? String(session.countedClosingAmount) : undefined} currencyCode={currencyCode} locale={locale} />}
            />
            <DetailItem
              label={labels.varianceAmount}
              value={<MoneyValue amount={session.varianceAmount ? String(session.varianceAmount) : undefined} currencyCode={currencyCode} locale={locale} />}
            />
            <DetailItem label={labels.openedAt} value={session.openedAt} />
            <DetailItem label={labels.closedAt} value={session.closedAt ? String(session.closedAt) : labels.notAvailable} />
          </DetailList>
        </CardContent>
      </Card>

      <Alert tone="info">{labels.handoversNote}</Alert>

      {session.status === "OPEN" && canClose ? (
        <Card>
          <CardHeader>
            <CardTitle>{labels.closeTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <CloseSessionForm
              session={session}
              currencyCode={currencyCode}
              locale={locale}
              labels={{
                expectedLabel: labels.closeExpectedLabel,
                countedLabel: labels.closeCountedLabel,
                previewLabel: labels.closePreviewLabel,
                previewWarning: labels.closePreviewWarning,
                submit: labels.closeSubmit,
                genericError: labels.genericError,
                correlationLabel: labels.correlationLabel,
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
