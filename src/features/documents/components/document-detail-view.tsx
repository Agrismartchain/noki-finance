"use client";

import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Stack, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agrismartchain/noki-design-system";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { documentStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { FinancialDocumentDto } from "../server/client";
import { DocumentApproveAction } from "./document-approve-action";
import { DocumentVoidAction, type DocumentVoidActionProps } from "./document-void-action";

export interface DocumentDetailViewProps {
  document: FinancialDocumentDto;
  locale: Locale;
  canApprove: boolean;
  canVoid: boolean;
  approveLabels: { approve: string; genericError: string; correlationLabel: string };
  voidLabels: DocumentVoidActionProps["labels"];
  labels: {
    summaryTitle: string;
    linesTitle: string;
    statusLabel: string;
    documentType: string;
    typeLabels: Record<string, string>;
    statementNotice: string;
    counterparty: string;
    period: string;
    currency: string;
    gross: string;
    fees: string;
    expenses: string;
    bonuses: string;
    refunds: string;
    withholdings: string;
    net: string;
    paid: string;
    remaining: string;
    voidReason: string;
    voidedAt: string;
    approvedAt: string;
    notAvailable: string;
    version: string;
    /**
     * The lines table has no dedicated i18n tree for its own column headers (only
     * summaryTitle/linesTitle exist under documents.detail.*) -- linesTitle doubles as
     * both the section title and the table's aria-label, and the amount column reuses
     * the "net" column label (the closest existing generic money-column header) rather
     * than inventing a new translation key. The line's own type/description/source
     * fields are shown as raw backend values in a single combined cell, matching the
     * "combine into one raw cell instead of inventing a header" pattern obligation-table.tsx
     * already uses for its source/counterparty columns.
     */
    lineAmount: string;
    noLines: string;
  };
}

/**
 * Renders every summary amount as its own server-provided MoneyValue -- never recomputes
 * netAmount from gross - fees, per the "server is the sole authority on totals" rule.
 * A STATEMENT is visually and textually distinguished from INVOICE/CREDIT_NOTE (a
 * distinct badge tone plus an explicit Alert) so the two natures are never mixed.
 */
export function DocumentDetailView({ document, locale, canApprove, canVoid, approveLabels, voidLabels, labels }: DocumentDetailViewProps) {
  const isStatement = document.documentType === "STATEMENT";
  const showApprove = canApprove && document.status !== "APPROVED" && document.status !== "VOIDED";
  const showVoid = canVoid && document.status !== "VOIDED";

  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{labels.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.statusLabel} value={<FinanceStatusBadge label={document.status} tone={documentStatusTone(document.status)} />} />
            <DetailItem
              label={labels.documentType}
              value={<Badge tone={isStatement ? "info" : "neutral"}>{labels.typeLabels[document.documentType] ?? document.documentType}</Badge>}
            />
            <DetailItem label={labels.counterparty} value={`${document.counterpartyType} · ${document.counterpartyId}`} />
            <DetailItem label={labels.period} value={`${document.periodStart} → ${document.periodEnd}`} />
            <DetailItem label={labels.currency} value={document.currency} />
            <DetailItem label={labels.gross} value={<MoneyValue amount={document.grossAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.fees} value={<MoneyValue amount={document.feeAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.expenses} value={<MoneyValue amount={document.expenseAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.bonuses} value={<MoneyValue amount={document.bonusAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.refunds} value={<MoneyValue amount={document.refundAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.withholdings} value={<MoneyValue amount={document.withholdingAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.net} value={<MoneyValue amount={document.netAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.paid} value={<MoneyValue amount={document.paidAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.remaining} value={<MoneyValue amount={document.remainingAmount} currencyCode={document.currency} locale={locale} />} />
            <DetailItem label={labels.approvedAt} value={document.approvedAt ?? labels.notAvailable} />
            {document.voidedAt ? <DetailItem label={labels.voidedAt} value={document.voidedAt} /> : null}
            {document.voidReason ? <DetailItem label={labels.voidReason} value={document.voidReason} /> : null}
            <DetailItem label={labels.version} value={document.version} />
          </DetailList>
        </CardContent>
      </Card>

      {isStatement ? <Alert tone="info">{labels.statementNotice}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>{labels.linesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {document.lines.length === 0 ? (
            <Alert tone="neutral">{labels.noLines}</Alert>
          ) : (
            <Table aria-label={labels.linesTitle}>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.linesTitle}</TableHead>
                  <TableHead align="end">{labels.lineAmount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{`${line.type} · ${line.descriptionCode} · ${line.sourceDomain} · ${line.sourceReferenceType} · ${line.sourceReferenceId}`}</TableCell>
                    <TableCell align="end">
                      <MoneyValue amount={line.amount} currencyCode={line.currency} locale={locale} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showApprove || showVoid ? (
        <Card>
          <CardContent>
            <Stack gap="md">
              {showApprove ? <DocumentApproveAction documentId={document.id} labels={approveLabels} /> : null}
              {showVoid ? <DocumentVoidAction documentId={document.id} labels={voidLabels} /> : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
