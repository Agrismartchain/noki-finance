import type { Locale } from "@/i18n/locales";

const INTL_LOCALE_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-u-nu-latn",
};

/**
 * The single sanctioned place a Finance amount string is converted to a JS
 * `number`. This conversion exists ONLY to satisfy `Intl.NumberFormat`'s
 * signature for on-screen currency formatting -- it is never used for a
 * financial decision (no comparison, no arithmetic, no totals). If the
 * string cannot be represented as a finite number (unusual, but backend
 * amount strings are not restricted to JS's safe numeric range), the raw
 * string is shown alongside the currency code instead of risking a silently
 * wrong display value.
 */
export function formatMoney(locale: Locale, amount: string, currencyCode: string | null | undefined): string {
  if (!currencyCode) {
    return amount;
  }

  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return `${amount} ${currencyCode}`;
  }

  try {
    return new Intl.NumberFormat(INTL_LOCALE_TAGS[locale], { style: "currency", currency: currencyCode }).format(numeric);
  } catch {
    // Unrecognized ISO 4217 code (e.g. a not-yet-standard currency) -- Intl throws a RangeError.
    return `${amount} ${currencyCode}`;
  }
}

/**
 * Renders the first 8 characters of an identifier for compact table display.
 * Real staging data has confirmed-nullable reference fields (e.g. a fee
 * assessment's financialObligationId, a payout's paymentMethodId) -- this
 * never throws on null/undefined/empty and never fabricates an id, it falls
 * back to the caller-supplied translated label instead.
 */
export function formatShortReference(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  return value.slice(0, 8);
}

export type VarianceSign = "negative" | "zero" | "positive";

/**
 * Sign-only classification of a decimal amount string, used purely for a
 * presentational branch (which badge tone/label to show) -- never for a
 * financial decision. Deliberately does NOT use parseFloat/Number() for
 * this: a leading "-" followed by any non-zero digit is enough to know the
 * value is negative without risking float coercion of an arbitrary-precision
 * decimal string.
 */
export function varianceSign(amount: string): VarianceSign {
  const trimmed = amount.trim();
  const isNegative = trimmed.startsWith("-");
  const digits = isNegative ? trimmed.slice(1) : trimmed;
  const isNonZero = /[1-9]/.test(digits);

  if (!isNonZero) {
    return "zero";
  }

  return isNegative ? "negative" : "positive";
}
