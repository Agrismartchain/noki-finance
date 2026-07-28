"use client";

import { ErrorState, type ErrorStateProps } from "@agrismartchain/noki-design-system";

export interface FinanceErrorStateProps extends Omit<ErrorStateProps, "details"> {
  /** Shown as "<correlationLabel>: <correlationId>" so a support ticket can reference the exact failed request, without a stack trace. */
  correlationId?: string;
  correlationLabel: string;
}

export function FinanceErrorState({ correlationId, correlationLabel, ...props }: FinanceErrorStateProps) {
  return (
    <div role="alert" aria-live="assertive">
      <ErrorState {...props} details={correlationId ? <span>{correlationLabel}: {correlationId}</span> : undefined} />
    </div>
  );
}
