"use client";

import { Card, CardContent, CardHeader, CardTitle, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";

import { DASHBOARD_PAYOUT_STATUS_KEYS, findMetric } from "../metrics";
import type { FinanceMetricDto } from "../server/client";

export interface PayoutsByStatusBlockProps {
  metrics: FinanceMetricDto[];
  locale: Locale;
}

export function PayoutsByStatusBlock({ metrics, locale }: PayoutsByStatusBlockProps) {
  const t = useTranslations();
  const title = t("dashboard.sections.payoutsByStatus");
  const statusLabels = Object.fromEntries(DASHBOARD_PAYOUT_STATUS_KEYS.map((key) => [key, t(`dashboard.metrics.${key}`)])) as Record<(typeof DASHBOARD_PAYOUT_STATUS_KEYS)[number], string>;
  const countLabel = (count: number) => t("dashboard.states.bucketCount", { count });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="sm">
          {DASHBOARD_PAYOUT_STATUS_KEYS.map((key) => {
            const metric = findMetric(metrics, key);
            return (
              <Stack key={key} gap="none">
                <span>
                  {statusLabels[key]} — {countLabel(metric?.count ?? 0)}
                </span>
                <Stack gap="none">
                  {metric && metric.amounts.length > 0 ? (
                    metric.amounts.map((amount) => (
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
