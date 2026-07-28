"use client";

import { Card, CardContent, CardHeader, CardTitle, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";

import { AGING_SECTION_KEYS } from "../metrics";
import type { FinanceAgingDto } from "../server/client";

export interface AgingBlockProps {
  aging: FinanceAgingDto;
  locale: Locale;
}

/** Aging buckets by section (obligations, invoices, payouts, unreconciled COD), each already scoped/currency-tagged by the backend. */
export function AgingBlock({ aging, locale }: AgingBlockProps) {
  const t = useTranslations();
  const title = t("dashboard.sections.aging");
  const sectionLabels = Object.fromEntries(AGING_SECTION_KEYS.map((key) => [key, t(`dashboard.agingSections.${key}`)])) as Record<(typeof AGING_SECTION_KEYS)[number], string>;
  const bucketCountLabel = (count: number) => t("dashboard.states.bucketCount", { count });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="lg">
          {aging.sections.map((section) => (
            <Stack key={section.key} gap="xs">
              <span>{sectionLabels[section.key as (typeof AGING_SECTION_KEYS)[number]] ?? section.key}</span>
              <Stack gap="xs">
                {section.buckets.map((bucket) => (
                  <Stack key={bucket.bucket} gap="none">
                    <span>
                      {bucket.bucket} — {bucketCountLabel(bucket.count)}
                    </span>
                    <Stack gap="none">
                      {bucket.amounts.map((amount) => (
                        <MoneyValue key={amount.currencyCode} amount={amount.amount} currencyCode={amount.currencyCode} locale={locale} />
                      ))}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
