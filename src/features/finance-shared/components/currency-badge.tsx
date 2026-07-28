"use client";

import { Badge } from "@agrismartchain/noki-design-system";

export interface CurrencyBadgeProps {
  /** ISO 4217 currency code (e.g. "MAD", "XAF"). Renders nothing when absent -- never invents a default currency. */
  code: string | null | undefined;
}

export function CurrencyBadge({ code }: CurrencyBadgeProps) {
  if (!code) {
    return null;
  }

  return <Badge tone="neutral">{code}</Badge>;
}
