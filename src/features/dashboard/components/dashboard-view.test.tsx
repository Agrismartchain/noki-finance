import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import fr from "@/messages/fr.json";
import { NokiApiError } from "@/lib/api/errors";

import type { FinanceAgingDto, FinanceCashflowDto, FinanceDashboardDto } from "../server/client";
import { DashboardView, type SettledResult } from "./dashboard-view";

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="fr" messages={fr}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function fulfilled<T>(value: T): SettledResult<T> {
  return { status: "fulfilled", value };
}
function rejected<T>(reason: unknown): SettledResult<T> {
  return { status: "rejected", reason };
}

const emptyDashboard: FinanceDashboardDto = { projection: "finance_dashboard", generatedAt: "now", appliedFilters: {}, metrics: [] };
const emptyAging: FinanceAgingDto = { projection: "finance_aging", referenceDate: "now", appliedFilters: {}, sections: [] };
const emptyCashflow: FinanceCashflowDto = { projection: "operational_cashflow", generatedAt: "now", period: "range", appliedFilters: {}, periods: [] };

const populatedDashboard: FinanceDashboardDto = {
  projection: "finance_dashboard",
  generatedAt: "now",
  appliedFilters: {},
  metrics: [
    { key: "cod_expected", amounts: [{ currencyId: "c-1", currencyCode: "MAD", amount: "1000.00" }], count: 2, statusBreakdown: [], sourceBreakdown: [] },
    { key: "open_cash_sessions", amounts: [], count: 3, statusBreakdown: [], sourceBreakdown: [] },
  ],
};

describe("DashboardView", () => {
  it("renders the error state when the dashboard call itself is rejected", () => {
    renderWithIntl(
      <DashboardView
        locale="fr"
        dashboard={rejected(new NokiApiError("server_error", "boom", { correlationId: "corr-1" }))}
        aging={fulfilled(emptyAging)}
        cashflow={fulfilled(emptyCashflow)}
      />,
    );
    expect(screen.getByText(fr.dashboard.states.errorTitle)).toBeInTheDocument();
    expect(screen.getByText(/corr-1/)).toBeInTheDocument();
  });

  it("renders the empty state when the dashboard has no metrics", () => {
    renderWithIntl(<DashboardView locale="fr" dashboard={fulfilled(emptyDashboard)} aging={fulfilled(emptyAging)} cashflow={fulfilled(emptyCashflow)} />);
    expect(screen.getByText(fr.dashboard.states.emptyTitle)).toBeInTheDocument();
  });

  it("renders KPI blocks when the dashboard has metrics", () => {
    renderWithIntl(<DashboardView locale="fr" dashboard={fulfilled(populatedDashboard)} aging={fulfilled(emptyAging)} cashflow={fulfilled(emptyCashflow)} />);
    expect(screen.getByText(fr.dashboard.sections.codPipeline)).toBeInTheDocument();
    expect(screen.getByText(fr.dashboard.sections.sessionStatus)).toBeInTheDocument();
    expect(screen.getByText(fr.dashboard.sections.payoutsByStatus)).toBeInTheDocument();
  });

  it("renders a partial-failure notice for aging without blanking the rest of the page when aging fails", () => {
    renderWithIntl(
      <DashboardView locale="fr" dashboard={fulfilled(populatedDashboard)} aging={rejected(new NokiApiError("timeout", "timed out"))} cashflow={fulfilled(emptyCashflow)} />,
    );
    expect(screen.getByText(fr.dashboard.states.partialNotice.replace("{block}", fr.dashboard.sections.aging))).toBeInTheDocument();
    expect(screen.getByText(fr.dashboard.sections.codPipeline)).toBeInTheDocument();
  });

  it("renders a partial-failure notice for cashflow without blanking the rest of the page when cashflow fails", () => {
    renderWithIntl(
      <DashboardView locale="fr" dashboard={fulfilled(populatedDashboard)} aging={fulfilled(emptyAging)} cashflow={rejected(new NokiApiError("network", "down"))} />,
    );
    expect(screen.getByText(fr.dashboard.states.partialNotice.replace("{block}", fr.dashboard.sections.cashflow))).toBeInTheDocument();
    expect(screen.getByText(fr.dashboard.sections.codPipeline)).toBeInTheDocument();
  });

  it("shows a retry action in the full-page error state", () => {
    renderWithIntl(<DashboardView locale="fr" dashboard={rejected(new NokiApiError("server_error", "boom"))} aging={fulfilled(emptyAging)} cashflow={fulfilled(emptyCashflow)} />);
    expect(screen.getByText(fr.dashboard.states.retry)).toBeInTheDocument();
  });
});
