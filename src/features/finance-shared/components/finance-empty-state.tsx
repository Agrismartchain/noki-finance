"use client";

import { EmptyState, type EmptyStateProps } from "@agrismartchain/noki-design-system";

export type FinanceEmptyStateProps = EmptyStateProps;

/**
 * Finance's single "no data" surface -- every functional list/detail view
 * renders through this instead of inventing its own empty-state markup, so
 * empty results are never confused with a loading or error state.
 */
export function FinanceEmptyState(props: FinanceEmptyStateProps) {
  return <EmptyState {...props} />;
}
