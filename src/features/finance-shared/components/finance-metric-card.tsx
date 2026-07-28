"use client";

import { MetricCard, type MetricCardProps } from "@agrismartchain/noki-design-system";

import type { Locale } from "@/i18n/locales";

import { formatMoney } from "../format";

export interface FinanceMetricCardProps extends Omit<MetricCardProps, "value"> {
  /** Set for a currency KPI (e.g. "COD expected"); formatted via MoneyValue's own Intl.NumberFormat boundary. */
  amount?: string;
  currencyCode?: string | null;
  locale?: Locale;
  /** Set for a plain-count KPI (e.g. "open sessions: 4") instead of `amount`. */
  value?: MetricCardProps["value"];
  emptyLabel?: string;
}

/**
 * Thin Finance-aware wrapper around the design system's MetricCard: pass
 * either `amount` (+ `currencyCode`, `locale`) for a currency KPI, or `value`
 * directly for a plain count. Never sums multiple currencies into one card --
 * each currency gets its own FinanceMetricCard instance.
 */
export function FinanceMetricCard({ amount, currencyCode, locale, value, emptyLabel = "—", ...props }: FinanceMetricCardProps) {
  const resolvedValue = amount !== undefined ? (locale ? formatMoney(locale, amount, currencyCode) : amount) : (value ?? emptyLabel);

  return <MetricCard value={resolvedValue} {...props} />;
}
