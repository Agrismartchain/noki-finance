"use client";

import { Grid, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { FinanceMetricCard } from "@/features/finance-shared/components/finance-metric-card";
import type { Locale } from "@/i18n/locales";

import { amountForCurrency, collectCurrencyCodes, DASHBOARD_AMOUNT_KPI_KEYS, DASHBOARD_COUNT_KPI_KEYS, findMetric } from "../metrics";
import type { FinanceMetricDto } from "../server/client";

export interface KpiGridProps {
  metrics: FinanceMetricDto[];
  locale: Locale;
}

/**
 * Renders the dashboard's top-line KPIs: a currency-agnostic row for plain
 * counts (open sessions, open variances), then one section per currency
 * present across the amount-bearing KPIs -- amounts from different
 * currencies are never summed into a single card. Translations are read via
 * useTranslations() directly (this is a Client Component under
 * NextIntlClientProvider) rather than received as formatter-function props --
 * a Server Component can pass strings across the RSC boundary but never a
 * plain function.
 */
export function KpiGrid({ metrics, locale }: KpiGridProps) {
  const t = useTranslations();
  const countLabels = Object.fromEntries(DASHBOARD_COUNT_KPI_KEYS.map((key) => [key, t(`dashboard.metrics.${key}`)])) as Record<(typeof DASHBOARD_COUNT_KPI_KEYS)[number], string>;
  const amountLabels = Object.fromEntries(DASHBOARD_AMOUNT_KPI_KEYS.map((key) => [key, t(`dashboard.metrics.${key}`)])) as Record<(typeof DASHBOARD_AMOUNT_KPI_KEYS)[number], string>;
  const currencies = collectCurrencyCodes(metrics);

  return (
    <Stack gap="lg">
      <Grid columns={2} gap="md">
        {DASHBOARD_COUNT_KPI_KEYS.map((key) => {
          const metric = findMetric(metrics, key);
          return <FinanceMetricCard key={key} label={countLabels[key]} value={metric?.count ?? 0} />;
        })}
      </Grid>

      {currencies.map((currencyCode) => (
        <Stack key={currencyCode} gap="sm">
          <h3>{t("dashboard.states.currencySection", { currency: currencyCode })}</h3>
          <Grid columns={3} gap="md">
            {DASHBOARD_AMOUNT_KPI_KEYS.map((key) => {
              const metric = findMetric(metrics, key);
              const amount = amountForCurrency(metric, currencyCode);
              return amount === undefined ? null : (
                <FinanceMetricCard key={key} label={amountLabels[key]} amount={amount} currencyCode={currencyCode} locale={locale} />
              );
            })}
          </Grid>
        </Stack>
      ))}
    </Stack>
  );
}
