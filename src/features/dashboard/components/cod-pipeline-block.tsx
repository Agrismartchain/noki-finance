"use client";

import { Card, CardContent, CardHeader, CardTitle, Inline, Stack } from "@agrismartchain/noki-design-system";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";

import { amountForCurrency, collectCurrencyCodes, DASHBOARD_COD_PIPELINE_KEYS, findMetric } from "../metrics";
import type { FinanceMetricDto } from "../server/client";

export interface CodPipelineBlockProps {
  metrics: FinanceMetricDto[];
  locale: Locale;
}

/**
 * Attendu -> Déclaré -> Remis -> Reçu -> Rapproché, per currency. Every step
 * is always rendered, even when the backend metric has no amount for a given
 * currency (shown as "—" by MoneyValue) -- the cycle's missing steps are
 * never hidden, per spec section 8/17.
 */
export function CodPipelineBlock({ metrics, locale }: CodPipelineBlockProps) {
  const t = useTranslations();
  const title = t("dashboard.sections.codPipeline");
  const stepLabels = Object.fromEntries(DASHBOARD_COD_PIPELINE_KEYS.map((key) => [key, t(`dashboard.metrics.${key}`)])) as Record<(typeof DASHBOARD_COD_PIPELINE_KEYS)[number], string>;
  const currencies = collectCurrencyCodes(metrics);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="md">
          {currencies.length === 0 ? null : null}
          {currencies.map((currencyCode) => (
            <Stack key={currencyCode} gap="xs">
              <span>{t("dashboard.states.currencySection", { currency: currencyCode })}</span>
              <Inline gap="sm" align="center" wrap>
                {DASHBOARD_COD_PIPELINE_KEYS.map((key, index) => {
                  const metric = findMetric(metrics, key);
                  const amount = amountForCurrency(metric, currencyCode);
                  return (
                    <Inline key={key} gap="sm" align="center">
                      <Stack gap="none">
                        <span>{stepLabels[key]}</span>
                        <MoneyValue amount={amount} currencyCode={currencyCode} locale={locale} />
                      </Stack>
                      {index < DASHBOARD_COD_PIPELINE_KEYS.length - 1 ? <ArrowRight aria-hidden="true" size={16} /> : null}
                    </Inline>
                  );
                })}
              </Inline>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
