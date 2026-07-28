"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@agrismartchain/noki-design-system";
import { useTranslations } from "next-intl";

import { FinanceMetricCard } from "@/features/finance-shared/components/finance-metric-card";

import { findMetric } from "../metrics";
import type { FinanceMetricDto } from "../server/client";

export interface SessionStatusBlockProps {
  metrics: FinanceMetricDto[];
}

/**
 * GET /v1/finance/dashboard only aggregates a single "open_cash_sessions"
 * count -- no CLOSED/RECONCILED breakdown is exposed at this endpoint. This
 * block shows exactly that, with an honest note rather than inventing a
 * fuller status breakdown; the full list lives on the Cash Sessions page.
 */
export function SessionStatusBlock({ metrics }: SessionStatusBlockProps) {
  const t = useTranslations();
  const title = t("dashboard.sections.sessionStatus");
  const openLabel = t("dashboard.metrics.open_cash_sessions");
  const note = t("dashboard.states.sessionStatusNote");
  const metric = findMetric(metrics, "open_cash_sessions");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <FinanceMetricCard label={openLabel} value={metric?.count ?? 0} supportingText={note} />
      </CardContent>
    </Card>
  );
}
