"use client";

import { Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { cashHandoverStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { HANDOVER_STATUSES } from "../server/list-query";
import type { CashHandoverResponseDto } from "../server/client";
import { HandoverActions } from "./handover-actions";
import { HandoverReceiveDialog, type OpenSessionOption } from "./handover-receive-dialog";

export interface HandoverDetailViewProps {
  handover: CashHandoverResponseDto;
  currencyCode: string | undefined;
  locale: Locale;
  statusLabels: Record<(typeof HANDOVER_STATUSES)[number], string>;
  openSessions: OpenSessionOption[];
  canSubmit: boolean;
  canCancel: boolean;
  canReject: boolean;
  canReceive: boolean;
  labels: {
    summaryTitle: string;
    organization: string;
    country: string;
    currency: string;
    status: string;
    createdAt: string;
    submittedAt: string;
    receivedAt: string;
    itemsTitle: string;
    itemsAriaLabel: string;
    colCollection: string;
    colDeclared: string;
    colHandedOver: string;
    colReceived: string;
    colReconciled: string;
    notAvailable: string;
    actionsTitle: string;
    submit: string;
    cancel: string;
    reject: string;
    reasonLabel: string;
    reasonRequired: string;
    confirm: string;
    dismiss: string;
    genericError: string;
    correlationLabel: string;
    receiveTitle: string;
    receiveTrigger: string;
    receiveSession: string;
    receiveLineDeclared: string;
    receiveLineHandedOver: string;
    receiveLineReceived: string;
    receiveNoOpenSession: string;
  };
}

export function HandoverDetailView({
  handover,
  currencyCode,
  locale,
  statusLabels,
  openSessions,
  canSubmit,
  canCancel,
  canReject,
  canReceive,
  labels,
}: HandoverDetailViewProps) {
  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.organization} value={handover.organizationId} />
            <DetailItem label={labels.country} value={handover.countryId} />
            <DetailItem label={labels.currency} value={currencyCode ?? handover.currencyId} />
            <DetailItem
              label={labels.status}
              value={<FinanceStatusBadge label={statusLabels[handover.status as (typeof HANDOVER_STATUSES)[number]] ?? handover.status} tone={cashHandoverStatusTone(handover.status)} />}
            />
            <DetailItem label={labels.createdAt} value={handover.createdAt} />
            <DetailItem label={labels.submittedAt} value={handover.submittedAt ? String(handover.submittedAt) : labels.notAvailable} />
            <DetailItem label={labels.receivedAt} value={handover.receivedAt ? String(handover.receivedAt) : labels.notAvailable} />
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.itemsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table aria-label={labels.itemsAriaLabel}>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.colCollection}</TableHead>
                <TableHead align="end">{labels.colDeclared}</TableHead>
                <TableHead align="end">{labels.colHandedOver}</TableHead>
                <TableHead align="end">{labels.colReceived}</TableHead>
                <TableHead align="end">{labels.colReconciled}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {handover.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.codCollectionId.slice(0, 8)}</TableCell>
                  <TableCell align="end">
                    <MoneyValue amount={item.declaredAmountSnapshot} currencyCode={currencyCode} locale={locale} />
                  </TableCell>
                  <TableCell align="end">
                    <MoneyValue amount={item.handedOverAmount} currencyCode={currencyCode} locale={locale} />
                  </TableCell>
                  <TableCell align="end">
                    <MoneyValue amount={item.receivedAmount ? String(item.receivedAmount) : undefined} currencyCode={currencyCode} locale={locale} />
                  </TableCell>
                  <TableCell align="end">
                    <MoneyValue amount={item.reconciledAmount} currencyCode={currencyCode} locale={locale} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.actionsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack gap="md">
            <HandoverActions
              handoverId={handover.id}
              status={handover.status}
              canSubmit={canSubmit}
              canCancel={canCancel}
              canReject={canReject}
              labels={{
                submit: labels.submit,
                cancel: labels.cancel,
                reject: labels.reject,
                reasonLabel: labels.reasonLabel,
                reasonRequired: labels.reasonRequired,
                confirm: labels.confirm,
                dismiss: labels.dismiss,
                genericError: labels.genericError,
                correlationLabel: labels.correlationLabel,
              }}
            />
            {handover.status === "SUBMITTED" && canReceive ? (
              <HandoverReceiveDialog
                handover={handover}
                currencyCode={currencyCode}
                locale={locale}
                openSessions={openSessions}
                labels={{
                  trigger: labels.receiveTrigger,
                  title: labels.receiveTitle,
                  sessionLabel: labels.receiveSession,
                  lineDeclared: labels.receiveLineDeclared,
                  lineHandedOver: labels.receiveLineHandedOver,
                  lineReceived: labels.receiveLineReceived,
                  confirm: labels.confirm,
                  cancel: labels.dismiss,
                  noOpenSession: labels.receiveNoOpenSession,
                  genericError: labels.genericError,
                  correlationLabel: labels.correlationLabel,
                }}
              />
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
