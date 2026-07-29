"use client";

import { Alert, Card, CardContent, CardHeader, CardTitle, Stack, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { Link } from "@/i18n/navigation";
import { NokiApiError } from "@/lib/api/errors";

import type { ApprovalQueueRow, SettledResult } from "../server/client";

function correlationIdOf(reason: unknown): string | undefined {
  return reason instanceof NokiApiError ? reason.correlationId : undefined;
}

export interface ApprovalQueueViewProps {
  locale: Locale;
  showPayoutFirstApprove: boolean;
  showPayoutFinalApprove: boolean;
  showPaymentMethods: boolean;
  showInvoices: boolean;
  showAdjustmentsGapNotice: boolean;
  payoutFirstApprove: SettledResult<ApprovalQueueRow[]>;
  payoutFinalApprove: SettledResult<ApprovalQueueRow[]>;
  paymentMethodsPending: SettledResult<ApprovalQueueRow[]>;
  invoicesPending: SettledResult<ApprovalQueueRow[]>;
}

interface SectionProps {
  title: string;
  ariaLabel: string;
  result: SettledResult<ApprovalQueueRow[]>;
  locale: Locale;
}

/**
 * Renders one composed queue section. Never duplicates the approve/reject mutation itself
 * -- each row only links out to the resource's own detail page, which already has the real
 * action wired (per this brief and the sibling documents/payment-methods briefs), so there
 * is exactly one code path for each mutation.
 */
function ApprovalQueueSection({ title, ariaLabel, result, locale }: SectionProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {result.status === "rejected" ? (
          <Alert tone="danger">
            {t("mutations.errors.unexpected")}
            {correlationIdOf(result.reason) ? ` — ${t("mutations.correlationId")}: ${correlationIdOf(result.reason)}` : ""}
          </Alert>
        ) : result.value.length === 0 ? (
          <Alert tone="neutral">{t("approvals.empty.description")}</Alert>
        ) : (
          <Table aria-label={ariaLabel}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("approvals.columns.resourceType")}</TableHead>
                <TableHead>{t("approvals.columns.reference")}</TableHead>
                <TableHead align="end">{t("approvals.columns.amount")}</TableHead>
                <TableHead>{t("approvals.columns.requester")}</TableHead>
                <TableHead>{t("approvals.columns.date")}</TableHead>
                <TableHead>{t("approvals.columns.stage")}</TableHead>
                <TableHead>{t("approvals.columns.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.value.map((row) => (
                <TableRow key={`${row.resourceType}-${row.id}`}>
                  <TableCell>{row.resourceType}</TableCell>
                  <TableCell>{row.reference}</TableCell>
                  <TableCell align="end">
                    <MoneyValue amount={row.amount} currencyCode={row.currencyCode} locale={locale} />
                  </TableCell>
                  <TableCell>{row.requester ?? "—"}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.stage}</TableCell>
                  <TableCell>
                    <Link href={row.href}>{t("approvals.viewLink")}</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Composition root for the approvals queue. Each section is gated at the page level (the
 * server component that fetched the data) on both the specific act-on capability and the
 * underlying read/report capability -- a section this actor cannot act on is simply not
 * rendered here, rather than shown disabled. Per spec section 13, a persistent Alert lists
 * the categories of reasons an approval might still be blocked -- purely explanatory, never
 * enforced client-side; the API is the sole authority.
 */
export function ApprovalQueueView({
  locale,
  showPayoutFirstApprove,
  showPayoutFinalApprove,
  showPaymentMethods,
  showInvoices,
  showAdjustmentsGapNotice,
  payoutFirstApprove,
  payoutFinalApprove,
  paymentMethodsPending,
  invoicesPending,
}: ApprovalQueueViewProps) {
  const t = useTranslations();

  const anySectionShown = showPayoutFirstApprove || showPayoutFinalApprove || showPaymentMethods || showInvoices;

  return (
    <Stack gap="lg">
      <Alert tone="info">
        <Stack gap="xs">
          <span>{t("approvals.blockedReasons.samePreparer")}</span>
          <span>{t("approvals.blockedReasons.sameFirstApprover")}</span>
          <span>{t("approvals.blockedReasons.modifiedPaymentMethod")}</span>
          <span>{t("approvals.blockedReasons.missingPermission")}</span>
          <span>{t("approvals.blockedReasons.activeHold")}</span>
          <span>{t("approvals.blockedReasons.incompatibleStatus")}</span>
        </Stack>
      </Alert>

      {!anySectionShown && !showAdjustmentsGapNotice ? <Alert tone="neutral">{t("approvals.empty.title")}</Alert> : null}

      {showPayoutFirstApprove ? (
        <ApprovalQueueSection title={t("approvals.sections.payoutFirstApprove")} ariaLabel={t("approvals.sections.payoutFirstApprove")} result={payoutFirstApprove} locale={locale} />
      ) : null}

      {showPayoutFinalApprove ? (
        <ApprovalQueueSection title={t("approvals.sections.payoutFinalApprove")} ariaLabel={t("approvals.sections.payoutFinalApprove")} result={payoutFinalApprove} locale={locale} />
      ) : null}

      {showPaymentMethods ? (
        <ApprovalQueueSection title={t("approvals.sections.paymentMethods")} ariaLabel={t("approvals.sections.paymentMethods")} result={paymentMethodsPending} locale={locale} />
      ) : null}

      {showInvoices ? <ApprovalQueueSection title={t("approvals.sections.invoices")} ariaLabel={t("approvals.sections.invoices")} result={invoicesPending} locale={locale} /> : null}

      {showAdjustmentsGapNotice ? <Alert tone="info">{t("approvals.sections.adjustmentsGapNotice")}</Alert> : null}
    </Stack>
  );
}
