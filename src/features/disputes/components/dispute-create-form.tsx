"use client";

import { Alert, Button, Field, FormActions, Input, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createDisputeAction } from "../server/actions";

export interface DisputeCreateFormProps {
  labels: {
    obligationId: string;
    reasonCode: string;
    reason: string;
    submit: string;
    holdNotice: string;
    validationError: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * CreateFinancialDisputeDto carries no scope fields -- organizationId and
 * countryId are inferred server-side from the referenced obligation, so this
 * form only ever collects obligationId/reasonCode/reason. The user is
 * expected to paste an obligation id they already know (e.g. copied from an
 * obligation's detail page).
 */
export function DisputeCreateForm({ labels }: DisputeCreateFormProps) {
  const router = useRouter();
  const [obligationId, setObligationId] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    if (!obligationId.trim() || !reasonCode.trim() || reason.trim().length < 3) {
      setValidationError(true);
      return;
    }

    setValidationError(false);
    setPending(true);
    setError(null);

    const result = await createDisputeAction({ obligationId: obligationId.trim(), reasonCode: reasonCode.trim(), reason: reason.trim() }, idempotencyKey);

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/disputes/${result.dispute.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Alert tone="info">{labels.holdNotice}</Alert>

        <Field id="dispute-obligation-id" label={labels.obligationId}>
          <Input value={obligationId} onChange={(event) => setObligationId(event.target.value)} disabled={pending} />
        </Field>
        <Field id="dispute-reason-code" label={labels.reasonCode}>
          <Input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} disabled={pending} maxLength={80} />
        </Field>
        <Field id="dispute-reason" label={labels.reason}>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} maxLength={500} />
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
