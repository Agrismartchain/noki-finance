"use client";

import { Alert, type AlertTone } from "@agrismartchain/noki-design-system";

export interface FinanceNoticeProps {
  tone: AlertTone;
  message: string;
}

export function FinanceNotice({ tone, message }: FinanceNoticeProps) {
  return <Alert tone={tone}>{message}</Alert>;
}
