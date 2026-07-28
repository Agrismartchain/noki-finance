"use client";

import { Badge, type BadgeTone } from "@agrismartchain/noki-design-system";

export interface FinanceStatusBadgeProps {
  /** Already-translated label -- callers resolve the raw backend status code via their own feature namespace and a status-maps.ts tone function. */
  label: string;
  tone: BadgeTone;
}

export function FinanceStatusBadge({ label, tone }: FinanceStatusBadgeProps) {
  return <Badge tone={tone}>{label}</Badge>;
}
