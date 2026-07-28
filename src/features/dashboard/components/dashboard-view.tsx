"use client";

import { Grid, Stack } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";

import type { FinanceAgingDto, FinanceCashflowDto, FinanceDashboardDto } from "../server/client";
import { AgingBlock } from "./aging-block";
import { CashflowBlock } from "./cashflow-block";
import { CodPipelineBlock } from "./cod-pipeline-block";
import { DashboardRetryButton } from "./dashboard-retry-button";
import { KpiGrid } from "./kpi-grid";
import { PayoutsByStatusBlock } from "./payouts-by-status-block";
import { PriorityVariancesBlock } from "./priority-variances-block";
import { SessionStatusBlock } from "./session-status-block";

export type SettledResult<T> = { status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown };

export interface DashboardViewProps {
  locale: Locale;
  dashboard: SettledResult<FinanceDashboardDto>;
  aging: SettledResult<FinanceAgingDto>;
  cashflow: SettledResult<FinanceCashflowDto>;
}

function correlationIdOf(reason: unknown): string | undefined {
  return reason instanceof NokiApiError ? reason.correlationId : undefined;
}

/**
 * Composition root for the six required dashboard states: loading is handled
 * one level up by (protected)/loading.tsx (the Server Component itself is
 * the async boundary), forbidden is handled one level up by the page's own
 * capability check, and this component covers empty / error / partial /
 * retry for data it has already received. Every sub-block reads its own
 * translations via useTranslations() (this whole tree is Client Components
 * under NextIntlClientProvider) -- a Server Component can pass data and
 * strings across the RSC boundary but never a formatter function, which is
 * why no *Label functions are threaded through props here.
 */
export function DashboardView({ locale, dashboard, aging, cashflow }: DashboardViewProps) {
  const t = useTranslations();

  if (dashboard.status === "rejected") {
    return (
      <FinanceErrorState
        title={t("dashboard.states.errorTitle")}
        description={t("dashboard.states.errorDescription")}
        correlationId={correlationIdOf(dashboard.reason)}
        correlationLabel={t("mutations.correlationId")}
        retryAction={<DashboardRetryButton label={t("dashboard.states.retry")} />}
      />
    );
  }

  const dashboardData = dashboard.value;

  if (dashboardData.metrics.length === 0) {
    return <FinanceEmptyState title={t("dashboard.states.emptyTitle")} description={t("dashboard.states.emptyDescription")} />;
  }

  return (
    <Stack gap="lg">
      <KpiGrid metrics={dashboardData.metrics} locale={locale} />

      <CodPipelineBlock metrics={dashboardData.metrics} locale={locale} />

      <Grid columns={2} gap="lg">
        <SessionStatusBlock metrics={dashboardData.metrics} />
        <PriorityVariancesBlock metrics={dashboardData.metrics} locale={locale} />
      </Grid>

      <PayoutsByStatusBlock metrics={dashboardData.metrics} locale={locale} />

      {aging.status === "fulfilled" ? (
        <AgingBlock aging={aging.value} locale={locale} />
      ) : (
        <FinanceErrorState
          title={t("dashboard.states.partialNotice", { block: t("dashboard.sections.aging") })}
          description={t("dashboard.states.errorDescription")}
          correlationId={correlationIdOf(aging.reason)}
          correlationLabel={t("mutations.correlationId")}
        />
      )}

      {cashflow.status === "fulfilled" ? (
        <CashflowBlock cashflow={cashflow.value} locale={locale} />
      ) : (
        <FinanceErrorState
          title={t("dashboard.states.partialNotice", { block: t("dashboard.sections.cashflow") })}
          description={t("dashboard.states.errorDescription")}
          correlationId={correlationIdOf(cashflow.reason)}
          correlationLabel={t("mutations.correlationId")}
        />
      )}
    </Stack>
  );
}
