"use client";

import { Badge } from "@agrismartchain/noki-design-system";

import { varianceSign } from "../format";

export interface VarianceBadgeLabels {
  shortfall: string;
  excess: string;
  resolved: string;
  waived: string;
  balanced: string;
}

export interface VarianceBadgeProps {
  /** CashVarianceResponseDto.status */
  status: "OPEN" | "RESOLVED" | "WAIVED" | string;
  /** CashVarianceResponseDto.varianceAmount (actualAmount - expectedAmount). Sign inspected only, never parsed as a financial decision. */
  varianceAmount: string;
  labels: VarianceBadgeLabels;
}

/**
 * Resolved status always wins over the amount's sign: once a variance is
 * RESOLVED or WAIVED, that decision is what matters, not whether it used to
 * be a shortfall or an excess. While OPEN, the sign of varianceAmount
 * decides shortfall (manque, negative -- actual below expected) vs excess
 * (excédent, positive -- actual above expected).
 */
export function VarianceBadge({ status, varianceAmount, labels }: VarianceBadgeProps) {
  if (status === "RESOLVED") {
    return <Badge tone="success">{labels.resolved}</Badge>;
  }

  if (status === "WAIVED") {
    return <Badge tone="neutral">{labels.waived}</Badge>;
  }

  const sign = varianceSign(varianceAmount);

  if (sign === "negative") {
    return <Badge tone="danger">{labels.shortfall}</Badge>;
  }

  if (sign === "positive") {
    return <Badge tone="warning">{labels.excess}</Badge>;
  }

  return <Badge tone="neutral">{labels.balanced}</Badge>;
}
