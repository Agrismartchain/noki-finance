import type { FinanceCurrencyAmountDto, FinanceMetricDto } from "./server/client";

/**
 * The real metric `key` literals produced by noki-api's FinanceConsumerService.dashboard()
 * (src/modules/finance/finance-consumer.service.ts) -- confirmed by reading the service's
 * Promise.all() call list, not guessed. FinanceMetricDto.key is a free-form string on the
 * wire; this is the closed set noki-finance's dashboard actually renders as top-line KPIs.
 */
export const DASHBOARD_COUNT_KPI_KEYS = ["open_cash_sessions", "open_variances"] as const;
export const DASHBOARD_AMOUNT_KPI_KEYS = [
  "cod_expected",
  "cod_declared",
  "cash_received",
  "cash_reconciled",
  "unreconciled_amount",
] as const;
export const DASHBOARD_PAYOUT_STATUS_KEYS = [
  "payouts_proposed",
  "payouts_pending_first_approval",
  "payouts_pending_final_approval",
  "payouts_approved",
  "payouts_sent",
  "payouts_paid",
  "payouts_failed",
  "payouts_on_hold",
] as const;
export const DASHBOARD_COD_PIPELINE_KEYS = [
  "cod_expected",
  "cod_declared",
  "cash_handed_over",
  "cash_received",
  "cash_reconciled",
] as const;

/** noki-api's FinanceConsumerService.aging() section keys (obligations, invoices, payouts, cod), in the fixed order the backend returns them. */
export const AGING_SECTION_KEYS = ["open_obligations", "unpaid_invoices", "pending_payouts", "unreconciled_cod"] as const;

export function findMetric(metrics: FinanceMetricDto[], key: string): FinanceMetricDto | undefined {
  return metrics.find((metric) => metric.key === key);
}

export function amountForCurrency(metric: FinanceMetricDto | undefined, currencyCode: string): string | undefined {
  return metric?.amounts.find((amount: FinanceCurrencyAmountDto) => amount.currencyCode === currencyCode)?.amount;
}

/** Every currency code appearing anywhere across a set of metrics, sorted for stable rendering order. */
export function collectCurrencyCodes(metrics: FinanceMetricDto[]): string[] {
  const codes = new Set<string>();
  for (const metric of metrics) {
    for (const amount of metric.amounts) {
      codes.add(amount.currencyCode);
    }
  }
  return [...codes].sort((a, b) => a.localeCompare(b));
}
