import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import fr from "@/messages/fr.json";

import type { FinanceProviderBalancesDto } from "../server/client";
import { ExternalProviderBalances } from "./external-provider-balances";

const dto: FinanceProviderBalancesDto = {
  label: "EXTERNAL_PROVIDER_BALANCE",
  items: [
    { providerCode: "MTN_MOMO", displayName: "MTN MoMo", environment: "SANDBOX", countryCode: "CG", status: "ACTIVE", balance: { amount: "1250000", currencyCode: "XAF", asOf: "2026-10-07T10:00:00.000Z" } },
    { providerCode: "AIRTEL_MONEY", displayName: "Airtel Money", environment: "PRODUCTION", countryCode: "CG", status: "CONFIGURED", balance: null },
  ],
} as unknown as FinanceProviderBalancesDto;

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="fr" messages={fr}>{ui}</NextIntlClientProvider>);

describe("ExternalProviderBalances", () => {
  it("shows one separate block per operator/environment, explicitly labelled as external and not the NOKI ledger", () => {
    wrap(<ExternalProviderBalances result={{ status: "ok", value: dto }} locale="fr" />);
    expect(screen.getByRole("heading", { name: /Soldes externes des opérateurs/ })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Ce n'est pas le solde du grand livre NOKI");
    const mtn = screen.getByTestId("provider-balance-MTN_MOMO-SANDBOX");
    expect(within(mtn).getByText("SOLDE EXTERNE FOURNISSEUR")).toBeInTheDocument();
    expect(mtn.textContent).toMatch(/1\s?250\s?000/);
    const airtel = screen.getByTestId("provider-balance-AIRTEL_MONEY-PRODUCTION");
    expect(within(airtel).getByText("Pas encore lu chez l'opérateur")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/total|somme/i);
  });

  it("degrades to a message when the balances cannot be loaded and never throws", () => {
    wrap(<ExternalProviderBalances result={{ status: "error" }} locale="fr" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Soldes opérateurs indisponibles");
  });

  it("explains when no operator is configured", () => {
    wrap(<ExternalProviderBalances result={{ status: "ok", value: { ...dto, items: [] } }} locale="fr" />);
    expect(screen.getByText("Aucun opérateur de paiement n'est configuré.")).toBeInTheDocument();
  });
});
