"use client";

import { Alert, Button, Field, FormActions, Radio, RadioGroup, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { resolveVarianceAction } from "../server/actions";

export interface VarianceResolutionFormProps {
  varianceId: string;
  labels: {
    decisionLabel: string;
    resolvedOption: string;
    waivedOption: string;
    reasonLabel: string;
    reasonRequired: string;
    decisionRequired: string;
    confirmTitle: string;
    confirmDescription: string;
    submit: string;
    confirm: string;
    dismiss: string;
    genericError: string;
    correlationLabel: string;
  };
}

type Decision = "RESOLVED" | "WAIVED" | null;

/**
 * The decision (RESOLVED/WAIVED) and reason are the only inputs collected --
 * expectedAmount/actualAmount/varianceAmount are never editable here, only
 * ever displayed. A confirmation step is required before the mutation fires.
 */
export function VarianceResolutionForm({ varianceId, labels }: VarianceResolutionFormProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>(null);
  const [reason, setReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  function handleRequestConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasError = false;
    if (!decision) {
      setDecisionError(labels.decisionRequired);
      hasError = true;
    } else {
      setDecisionError(null);
    }
    if (reason.trim().length === 0) {
      setReasonError(labels.reasonRequired);
      hasError = true;
    } else {
      setReasonError(null);
    }

    if (hasError) {
      return;
    }

    setConfirming(true);
  }

  async function handleConfirm() {
    if (!decision || pending) {
      return;
    }
    setPending(true);
    setError(null);

    const result = await resolveVarianceAction(varianceId, { resolutionStatus: decision, reason }, idempotencyKey);

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      setConfirming(false);
      return;
    }

    router.refresh();
  }

  if (confirming) {
    return (
      <Stack gap="md">
        <Alert tone="warning" title={labels.confirmTitle}>
          {labels.confirmDescription}
        </Alert>
        {error ? (
          <Alert tone="danger">
            {labels.genericError}
            {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
          </Alert>
        ) : null}
        <FormActions align="end">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
            {labels.dismiss}
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={pending} disabled={pending}>
            {labels.confirm}
          </Button>
        </FormActions>
      </Stack>
    );
  }

  return (
    <form onSubmit={handleRequestConfirm} noValidate>
      <Stack gap="md">
        <Field id="variance-decision" label={labels.decisionLabel} error={decisionError ?? undefined} invalid={Boolean(decisionError)}>
          <RadioGroup value={decision ?? undefined} onChange={(value) => setDecision(value as Decision)}>
            <Radio value="RESOLVED">{labels.resolvedOption}</Radio>
            <Radio value="WAIVED">{labels.waivedOption}</Radio>
          </RadioGroup>
        </Field>

        <Field id="variance-reason" label={labels.reasonLabel} error={reasonError ?? undefined} invalid={Boolean(reasonError)}>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>

        <FormActions align="end">
          <Button type="submit" variant="primary">
            {labels.submit}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
