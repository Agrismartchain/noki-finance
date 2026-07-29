"use client";

import { Alert, Button, Field, Inline, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { voidDocumentAction } from "../server/actions";

export interface DocumentVoidActionProps {
  documentId: string;
  labels: {
    void: string;
    voidReasonLabel: string;
    voidReasonRequired: string;
    confirm: string;
    dismiss: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Reason-mode inline destructive action (handover-actions.tsx's pattern), not a Dialog.
 * Void is the only state-changing action available on an approved document -- there is
 * no edit/update endpoint at all -- so this is the sole mutation this component exposes.
 * The Idempotency-Key is regenerated each time the reason form is (re)opened, matching
 * "one key per logical action, reused across retries of that same submission."
 */
export function DocumentVoidAction({ documentId, labels }: DocumentVoidActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  function openForm() {
    setOpen(true);
    setReason("");
    setReasonError(null);
    setIdempotencyKey(generateIdempotencyKey());
  }

  async function handleConfirm() {
    if (reason.trim().length < 3) {
      setReasonError(labels.voidReasonRequired);
      return;
    }
    setPending(true);
    setError(null);
    const result = await voidDocumentAction(documentId, { reason: reason.trim() }, idempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <Stack gap="sm">
      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}

      {open ? (
        <Stack gap="sm">
          <Field id="document-void-reason" label={labels.voidReasonLabel} error={reasonError ?? undefined} invalid={Boolean(reasonError)}>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
          </Field>
          <Inline gap="sm">
            <Button variant="danger" onClick={handleConfirm} loading={pending} disabled={pending}>
              {labels.confirm}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              {labels.dismiss}
            </Button>
          </Inline>
        </Stack>
      ) : (
        <Button variant="secondary" onClick={openForm} disabled={pending}>
          {labels.void}
        </Button>
      )}
    </Stack>
  );
}
