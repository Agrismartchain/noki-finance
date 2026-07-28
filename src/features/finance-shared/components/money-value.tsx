import type { Locale } from "@/i18n/locales";

import { formatMoney } from "../format";

export interface MoneyValueProps {
  /** Decimal amount as returned by noki-api. Never a `number` -- the frontend never computes this value. */
  amount: string | null | undefined;
  /** ISO 4217 currency code (e.g. "MAD", "XAF"). Resolve currencyId -> code via master-data before rendering. */
  currencyCode: string | null | undefined;
  locale: Locale;
  emptyLabel?: string;
}

/**
 * Displays a server-provided decimal amount in its currency, via
 * Intl.NumberFormat. Never performs a financial computation: no rounding for
 * business purposes, no summing, no conversion between currencies. Handles a
 * missing amount/currency without throwing.
 */
export function MoneyValue({ amount, currencyCode, locale, emptyLabel = "—" }: MoneyValueProps) {
  if (amount === null || amount === undefined || amount.trim().length === 0) {
    return <span>{emptyLabel}</span>;
  }

  return <span>{formatMoney(locale, amount, currencyCode)}</span>;
}
