"use client";

import { Alert, Button, Field, FormActions, Select, Stack, Textarea, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createReconciliationAction } from "../server/actions";

export interface ReconciliationCreateFormProps {
  closedSessions: { id: string; label: string }[];
  labels: {
    sessionLabel: string;
    reasonLabel: string;
    submit: string;
    noEligible: string;
    validationError: string;
    genericError: string;
    correlationLabel: string;
  };
}

/** Only CLOSED cash sessions are eligible -- a reconciliation is created from an already-closed session, per CreateFinancialReconciliationDto's required cashSessionId. */
export function ReconciliationCreateForm({ closedSessions, labels }: ReconciliationCreateFormProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(closedSessions[0]?.id ?? null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const sessionOptions: SelectOption[] = closedSessions.map((session) => ({ id: session.id, label: session.label }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    if (!sessionId) {
      setValidationError(true);
      return;
    }

    setValidationError(false);
    setPending(true);
    setError(null);

    const result = await createReconciliationAction({ cashSessionId: sessionId, reason: reason || undefined }, idempotencyKey);

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/reconciliations/${result.reconciliation.id}`);
  }

  if (closedSessions.length === 0) {
    return <Alert tone="info">{labels.noEligible}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Field id="reconciliation-session" label={labels.sessionLabel}>
          <Select options={sessionOptions} selectedKey={sessionId ?? undefined} onSelectionChange={(key) => setSessionId(String(key))} />
        </Field>
        <Field id="reconciliation-reason" label={labels.reasonLabel}>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
        </Field>

        {validationError ? <Alert tone="warning">{labels.validationError}</Alert> : null}
        {error ? (
          <Alert tone="danger">
            {labels.genericError}
            {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
          </Alert>
        ) : null}

        <FormActions align="end">
          <Button type="submit" variant="primary" loading={pending} disabled={pending}>
            {labels.submit}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
