"use client";

import { Card, CardContent, CardHeader, CardTitle, DetailItem, DetailList, Inline, Stack } from "@agrismartchain/noki-design-system";
import { ArrowRight, CircleDashed } from "lucide-react";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { codCollectionStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";

import type { CodCollectionResponseDto } from "../server/client";

export interface CodDetailViewProps {
  collection: CodCollectionResponseDto;
  currencyCode: string | undefined;
  locale: Locale;
  labels: {
    orderId: string;
    organizationId: string;
    countryId: string;
    status: string;
    declaredAt: string;
    cycleTitle: string;
    stepExpected: string;
    stepDeclared: string;
    stepHandedOver: string;
    stepReceived: string;
    stepReconciled: string;
    unresolvedStep: string;
    reachedNoAmount: string;
  };
  statusLabel: string;
}

const REMITTED_OR_LATER = new Set(["REMITTED", "RECONCILED"]);

/**
 * Attendu -> Déclaré are always reliable, direct fields on CodCollectionResponseDto.
 * Remis/Reçu/Rapproché have no back-reference from a collection to its cash
 * handover item on this DTO (confirmed against the OpenAPI schema -- no
 * remittanceBatchId/handoverItemId field exists) -- so those three steps are
 * rendered as explicitly unresolved (not hidden, not guessed) unless the
 * collection's own status confirms the step was reached, in which case a
 * coarse "reached, no amount available here" indicator is shown instead of a
 * fabricated figure.
 */
export function CodDetailView({ collection, currencyCode, locale, labels, statusLabel }: CodDetailViewProps) {
  const reachedRemittedOrLater = REMITTED_OR_LATER.has(collection.status);
  const reachedReconciled = collection.status === "RECONCILED";

  return (
    <Stack gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>{collection.orderId}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <DetailItem label={labels.orderId} value={collection.orderId} />
            <DetailItem label={labels.organizationId} value={collection.organizationId} />
            <DetailItem label={labels.countryId} value={collection.countryId} />
            <DetailItem label={labels.status} value={<FinanceStatusBadge label={statusLabel} tone={codCollectionStatusTone(collection.status)} />} />
            <DetailItem label={labels.declaredAt} value={collection.declaredAt} />
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.cycleTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Inline gap="sm" align="center" wrap>
            <Stack gap="none">
              <span>{labels.stepExpected}</span>
              <MoneyValue amount={collection.expectedAmount} currencyCode={currencyCode} locale={locale} />
            </Stack>
            <ArrowRight aria-hidden="true" size={16} />
            <Stack gap="none">
              <span>{labels.stepDeclared}</span>
              <MoneyValue amount={collection.collectedAmount} currencyCode={currencyCode} locale={locale} />
            </Stack>
            <ArrowRight aria-hidden="true" size={16} />
            <Stack gap="none">
              <span>{labels.stepHandedOver}</span>
              {reachedRemittedOrLater ? <span>{labels.reachedNoAmount}</span> : <UnresolvedStep label={labels.unresolvedStep} />}
            </Stack>
            <ArrowRight aria-hidden="true" size={16} />
            <Stack gap="none">
              <span>{labels.stepReceived}</span>
              {reachedRemittedOrLater ? <span>{labels.reachedNoAmount}</span> : <UnresolvedStep label={labels.unresolvedStep} />}
            </Stack>
            <ArrowRight aria-hidden="true" size={16} />
            <Stack gap="none">
              <span>{labels.stepReconciled}</span>
              {reachedReconciled ? <span>{labels.reachedNoAmount}</span> : <UnresolvedStep label={labels.unresolvedStep} />}
            </Stack>
          </Inline>
        </CardContent>
      </Card>
    </Stack>
  );
}

function UnresolvedStep({ label }: { label: string }) {
  return (
    <Inline gap="xs" align="center">
      <CircleDashed aria-hidden="true" size={14} />
      <span>{label}</span>
    </Inline>
  );
}
