"use client";

import { Alert, Button, Field, FormActions, Input, Stack } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { closeSessionAction } from "../server/actions";
import type { CashSessionResponseDto } from "../server/client";

export interface CloseSessionFormProps {
  session: CashSessionResponseDto;
  currencyCode: string | undefined;
  locale: Locale;
  labels: {
    expectedLabel: string;
    countedLabel: string;
    previewLabel: string;
    previewWarning: string;
    submit: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Per spec section 19, the client ONLY ever submits `countedClosingAmount`
 * (never the expected amount, which is server-computed) -- but the spec also
 * explicitly asks for an indicative client-side variance preview here (unlike
 * every other Finance screen, where recomputing a variance is forbidden).
 * This is the one deliberate, narrowly-scoped exception: the preview number
 * is never sent to the server, is always shown next to a "server is the
 * source of truth" warning, and uses the same display-only Number()
 * conversion boundary as MoneyValue's own formatting -- not a business
 * decision.
 */
function previewVariance(counted: string, expected: string | null | undefined): string | null {
  if (!expected) {
    return null;
  }
  const countedValue = Number(counted);
  const expectedValue = Number(expected);
  if (!Number.isFinite(countedValue) || !Number.isFinite(expectedValue)) {
    return null;
  }
  const difference = countedValue - expectedValue;
  return difference >= 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2);
}

export function CloseSessionForm({ session, currencyCode, locale, labels }: CloseSessionFormProps) {
  const router = useRouter();
  const [countedClosingAmount, setCountedClosingAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const expected = session.systemExpectedClosingAmount ? String(session.systemExpectedClosingAmount) : undefined;
  const preview = countedClosingAmount ? previewVariance(countedClosingAmount, expected) : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || countedClosingAmount.trim().length === 0) {
      return;
    }

    setPending(true);
    setError(null);

    const result = await closeSessionAction(session.id, { countedClosingAmount }, idempotencyKey);

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Stack gap="none">
          <span>{labels.expectedLabel}</span>
          <MoneyValue amount={expected} currencyCode={currencyCode} locale={locale} />
        </Stack>

        <Field id="close-session-counted" label={labels.countedLabel}>
          <Input inputMode="decimal" value={countedClosingAmount} onChange={(event) => setCountedClosingAmount(event.target.value)} disabled={pending} />
        </Field>

        {preview ? (
          <Alert tone="warning" title={labels.previewLabel}>
            {preview} {currencyCode ?? ""} — {labels.previewWarning}
          </Alert>
        ) : null}

        {error ? (
          <Alert tone="danger">
            {labels.genericError}
            {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
          </Alert>
        ) : null}

        <FormActions align="end">
          <Button type="submit" variant="primary" loading={pending} disabled={pending || countedClosingAmount.trim().length === 0}>
            {labels.submit}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
