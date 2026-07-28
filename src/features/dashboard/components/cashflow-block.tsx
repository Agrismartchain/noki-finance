"use client";

import { Card, CardContent, CardHeader, CardTitle, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";

import { findMetric } from "../metrics";
import type { FinanceCashflowDto } from "../server/client";

export interface CashflowBlockProps {
  cashflow: FinanceCashflowDto;
  locale: Locale;
}

/**
 * One row per period returned by GET /v1/finance/dashboard/cashflow, showing
 * the "net_platform" combined metric (the backend's own computed net figure
 * -- never recomputed here) per currency present in that period.
 */
export function CashflowBlock({ cashflow, locale }: CashflowBlockProps) {
  const t = useTranslations();
  const title = t("dashboard.sections.cashflow");
  const netPlatformLabel = t("dashboard.metrics.net_platform");
  const periodRangeLabel = (start: string, end: string) => t("dashboard.states.periodRange", { start, end });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          {cashflow.periods.map((period) => {
            const netPlatform = findMetric(period.metrics, "net_platform");
            return (
              <Stack key={`${period.periodStart}-${period.periodEnd}`} gap="xs">
                <span>{periodRangeLabel(period.periodStart, period.periodEnd)}</span>
                <Stack gap="none">
                  <span>{netPlatformLabel}</span>
                  {netPlatform && netPlatform.amounts.length > 0 ? (
                    netPlatform.amounts.map((amount) => (
                      <MoneyValue key={amount.currencyCode} amount={amount.amount} currencyCode={amount.currencyCode} locale={locale} />
                    ))
                  ) : (
                    <MoneyValue amount={undefined} currencyCode={undefined} locale={locale} />
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
