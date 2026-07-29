"use client";

import { Alert, Button, Field, FormActions, Input, Radio, RadioGroup, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { resolveDisputeAction } from "../server/actions";

export interface DisputeResolutionFormProps {
  disputeId: string;
  labels: {
    resolution: string;
    releaseOption: string;
    adjustmentOption: string;
    reason: string;
    reasonRequired: string;
    resolutionRequired: string;
    adjustmentIdLabel: string;
    adjustmentIdRequired: string;
    confirmTitle: string;
    continue: string;
    confirm: string;
    cancel: string;
    genericError: string;
    correlationLabel: string;
  };
}

type Resolution = "RELEASE" | "ADJUSTMENT" | null;

/**
 * Only ever collects resolution + reason (+ adjustmentId when resolution is
 * ADJUSTMENT). The DTO itself only marks adjustmentId as optional -- the
 * "required when ADJUSTMENT" rule below is a client-side UX nicety, not the
 * real enforcement boundary; noki-api is the sole authority on whether a
 * resolution is accepted. A genuine two-step confirm is required before the
 * mutation fires, mirroring cash-variances' VarianceResolutionForm exactly,
 * since resolving a dispute is a significant, irreversible action.
 */
export function DisputeResolutionForm({ disputeId, labels }: DisputeResolutionFormProps) {
  const router = useRouter();
  const [resolution, setResolution] = useState<Resolution>(null);
  const [reason, setReason] = useState("");
  const [adjustmentId, setAdjustmentId] = useState("");
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [adjustmentIdError, setAdjustmentIdError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  function handleRequestConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasError = false;
    if (!resolution) {
      setResolutionError(labels.resolutionRequired);
      hasError = true;
    } else {
      setResolutionError(null);
    }
    if (reason.trim().length === 0) {
      setReasonError(labels.reasonRequired);
      hasError = true;
    } else {
      setReasonError(null);
    }
    if (resolution === "ADJUSTMENT" && adjustmentId.trim().length === 0) {
      setAdjustmentIdError(labels.adjustmentIdRequired);
      hasError = true;
    } else {
      setAdjustmentIdError(null);
    }

    if (hasError) {
      return;
    }

    setConfirming(true);
  }

  async function handleConfirm() {
    if (!resolution || pending) {
      return;
    }
    setPending(true);
    setError(null);

    const result = await resolveDisputeAction(
      disputeId,
      { resolution, reason: reason.trim(), adjustmentId: resolution === "ADJUSTMENT" ? adjustmentId.trim() : undefined },
      idempotencyKey,
    );

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
          {labels.reason}: {reason}
        </Alert>
        {error ? (
          <Alert tone="danger">
            {labels.genericError}
            {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
          </Alert>
        ) : null}
        <FormActions align="end">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
            {labels.cancel}
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
        <Field id="dispute-resolution" label={labels.resolution} error={resolutionError ?? undefined} invalid={Boolean(resolutionError)}>
          <RadioGroup value={resolution ?? undefined} onChange={(value) => setResolution(value as Resolution)}>
            <Radio value="RELEASE">{labels.releaseOption}</Radio>
            <Radio value="ADJUSTMENT">{labels.adjustmentOption}</Radio>
          </RadioGroup>
        </Field>

        {resolution === "ADJUSTMENT" ? (
          <Field id="dispute-adjustment-id" label={labels.adjustmentIdLabel} error={adjustmentIdError ?? undefined} invalid={Boolean(adjustmentIdError)}>
            <Input value={adjustmentId} onChange={(event) => setAdjustmentId(event.target.value)} />
          </Field>
        ) : null}

        <Field id="dispute-resolution-reason" label={labels.reason} error={reasonError ?? undefined} invalid={Boolean(reasonError)}>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
        </Field>

        <FormActions align="end">
          <Button type="submit" variant="primary">
            {labels.continue}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
