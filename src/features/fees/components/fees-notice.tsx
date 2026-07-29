"use client";

import { Alert, type AlertTone } from "@agrismartchain/noki-design-system";

export interface FeesNoticeProps {
  tone: AlertTone;
  message: string;
}

/**
 * `@agrismartchain/noki-design-system`'s barrel cannot be imported directly
 * from a Server Component (see page-shell.tsx's comment) -- every other
 * Finance feature that needs a bare inline notice routes it through a thin
 * "use client" wrapper (FinanceEmptyState, FinanceErrorState).
 * This is that same wrapper for a one-off Alert, used for fees' gap notice
 * and its partial-capability notices.
 */
export function FeesNotice({ tone, message }: FeesNoticeProps) {
  return <Alert tone={tone}>{message}</Alert>;
}
