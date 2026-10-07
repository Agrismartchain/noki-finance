"use client";

import { Card, CardContent, CardHeader, CardTitle, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";

import type { FinanceProviderBalancesDto } from "../server/client";

export type ProviderBalancesResult = { status: "ok"; value: FinanceProviderBalancesDto } | { status: "error" };

/**
 * MTN / Airtel float held AT the operators. Always rendered under its own heading, with an explicit "not the NOKI ledger"
 * note, one block per operator and environment -- never merged into, or summed with, any NOKI ledger figure.
 */
export function ExternalProviderBalances({ result, locale }: { result: ProviderBalancesResult; locale: Locale }) {
  const t = useTranslations("providerBalances");
  return (
    <section aria-labelledby="external-provider-balances-title" data-testid="external-provider-balances">
      <Stack gap="md">
        <h2 id="external-provider-balances-title">{t("title")}</h2>
        <p role="note">{t("note")}</p>
        {result.status === "error" ? (
          <p role="alert">{t("unavailable")}</p>
        ) : result.value.items.length === 0 ? (
          <p>{t("empty")}</p>
        ) : (
          <Stack gap="md">
            {result.value.items.map((item) => (
              <Card key={`${item.providerCode}-${item.environment}-${item.countryCode}`} data-testid={`provider-balance-${item.providerCode}-${item.environment}`}>
                <CardHeader>
                  <CardTitle>
                    {item.displayName} — {t(`environment.${item.environment}`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Stack gap="xs">
                    <span>{t("externalLabel")}</span>
                    {item.balance ? (
                      <>
                        <strong>
                          <MoneyValue amount={item.balance.amount} currencyCode={item.balance.currencyCode} locale={locale} />
                        </strong>
                        <small>{t("asOf", { date: new Date(item.balance.asOf).toLocaleString(locale) })}</small>
                      </>
                    ) : (
                      <span>{t("notRead")}</span>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </section>
  );
}
