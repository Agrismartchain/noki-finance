"use client";

import { Alert, Button, Field, Inline, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { cancelHandoverAction, rejectHandoverAction, submitHandoverAction } from "../server/actions";

export interface HandoverActionsProps {
  handoverId: string;
  status: string;
  canSubmit: boolean;
  canCancel: boolean;
  canReject: boolean;
  labels: {
    submit: string;
    cancel: string;
    reject: string;
    reasonLabel: string;
    reasonRequired: string;
    confirm: string;
    dismiss: string;
    genericError: string;
    correlationLabel: string;
  };
}

type ReasonMode = "cancel" | "reject" | null;

/**
 * Status-appropriate actions for a handover in DRAFT/SUBMITTED state. Each
 * action generates its own Idempotency-Key once, when the user opens that
 * action's form -- not regenerated on a retry of the same submission.
 */
export function HandoverActions({ handoverId, status, canSubmit, canCancel, canReject, labels }: HandoverActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [reasonMode, setReasonMode] = useState<ReasonMode>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  if (status !== "DRAFT" && status !== "SUBMITTED") {
    return null;
  }

  async function runSubmit() {
    setPending(true);
    setError(null);
    const result = await submitHandoverAction(handoverId, idempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.refresh();
  }

  async function runReasonAction() {
    if (reason.trim().length === 0) {
      setReasonError(labels.reasonRequired);
      return;
    }
    setPending(true);
    setError(null);
    const result =
      reasonMode === "cancel"
        ? await cancelHandoverAction(handoverId, { reason }, idempotencyKey)
        : await rejectHandoverAction(handoverId, { reason }, idempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    setReasonMode(null);
    setReason("");
    router.refresh();
  }

  function openReasonMode(mode: ReasonMode) {
    setReasonMode(mode);
    setReason("");
    setReasonError(null);
    setIdempotencyKey(generateIdempotencyKey());
  }

  return (
    <Stack gap="sm">
      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}

      {reasonMode ? (
        <Stack gap="sm">
          <Field id="handover-action-reason" label={labels.reasonLabel} error={reasonError ?? undefined} invalid={Boolean(reasonError)}>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
          </Field>
          <Inline gap="sm">
            <Button variant="primary" onClick={runReasonAction} loading={pending} disabled={pending}>
              {labels.confirm}
            </Button>
            <Button variant="secondary" onClick={() => setReasonMode(null)} disabled={pending}>
              {labels.dismiss}
            </Button>
          </Inline>
        </Stack>
      ) : (
        <Inline gap="sm">
          {status === "DRAFT" && canSubmit ? (
            <Button variant="primary" onClick={runSubmit} loading={pending} disabled={pending}>
              {labels.submit}
            </Button>
          ) : null}
          {status === "DRAFT" && canCancel ? (
            <Button variant="secondary" onClick={() => openReasonMode("cancel")} disabled={pending}>
              {labels.cancel}
            </Button>
          ) : null}
          {status === "SUBMITTED" && canReject ? (
            <Button variant="secondary" onClick={() => openReasonMode("reject")} disabled={pending}>
              {labels.reject}
            </Button>
          ) : null}
        </Inline>
      )}
    </Stack>
  );
}
