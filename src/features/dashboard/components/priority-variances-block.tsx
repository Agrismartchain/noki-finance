"use client";

import { Card, CardContent, CardHeader, CardTitle, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";

import { findMetric } from "../metrics";
import type { FinanceMetricDto } from "../server/client";

export interface PriorityVariancesBlockProps {
  metrics: FinanceMetricDto[];
  locale: Locale;
}

/**
 * GET /v1/finance/dashboard exposes an aggregate "open_variances"
 * count/amount only -- no per-variance severity ranking. This block shows
 * that aggregate honestly, with a note pointing to the full Variances page
 * (Phase 7) for a prioritized, actionable list.
 */
export function PriorityVariancesBlock({ metrics, locale }: PriorityVariancesBlockProps) {
  const t = useTranslations();
  const title = t("dashboard.sections.priorityVariances");
  const countLabel = t("dashboard.metrics.open_variances");
  const note = t("dashboard.states.varianceNote");
  const metric = findMetric(metrics, "open_variances");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="xs">
          <span>
            {countLabel}: {metric?.count ?? 0}
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
          <span>{note}</span>
        </Stack>
      </CardContent>
    </Card>
  );
}
