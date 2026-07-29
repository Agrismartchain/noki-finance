"use client";

import { Alert, Button, Field, Inline, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { applyAdjustmentAction, approveAdjustmentAction, rejectAdjustmentAction } from "../server/actions";

export interface AdjustmentActionsProps {
  adjustmentId: string;
  status: string;
  /** approve/reject/apply all require the same finance.adjustment.approve capability. */
  canManage: boolean;
  labels: {
    approve: string;
    reject: string;
    apply: string;
    reasonLabel: string;
    reasonRequired: string;
    confirm: string;
    dismiss: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Status-driven actions: DRAFT has no action shown (there is no submit endpoint distinct
 * from create for adjustments -- creation directly produces the object in whatever
 * status the backend assigns). SUBMITTED -> approve/reject, APPROVED -> apply. Reject
 * uses the reason-mode inline pattern (handover-actions.tsx); approve/apply use the
 * simple-button pattern (reconciliation-approval-state.tsx). Approve and apply each get
 * their own Idempotency-Key, generated once per mount and reused across retries of that
 * same submission; reject sends none -- the real endpoint has no Idempotency-Key header.
 */
export function AdjustmentActions({ adjustmentId, status, canManage, labels }: AdjustmentActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [approveIdempotencyKey] = useState(() => generateIdempotencyKey());
  const [applyIdempotencyKey] = useState(() => generateIdempotencyKey());

  if (!canManage || (status !== "SUBMITTED" && status !== "APPROVED")) {
    return null;
  }

  async function handleApprove() {
    setPending(true);
    setError(null);
    const result = await approveAdjustmentAction(adjustmentId, {}, approveIdempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.refresh();
  }

  async function handleReject() {
    if (reason.trim().length < 3) {
      setReasonError(labels.reasonRequired);
      return;
    }
    setPending(true);
    setError(null);
    const result = await rejectAdjustmentAction(adjustmentId, { reason: reason.trim() });
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    setRejectMode(false);
    setReason("");
    router.refresh();
  }

  async function handleApply() {
    setPending(true);
    setError(null);
    const result = await applyAdjustmentAction(adjustmentId, applyIdempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.refresh();
  }

  function openRejectMode() {
    setRejectMode(true);
    setReason("");
    setReasonError(null);
  }

  return (
    <Stack gap="sm">
      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}

      {rejectMode ? (
        <Stack gap="sm">
          <Field id="adjustment-reject-reason" label={labels.reasonLabel} error={reasonError ?? undefined} invalid={Boolean(reasonError)}>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
          </Field>
          <Inline gap="sm">
            <Button variant="primary" onClick={handleReject} loading={pending} disabled={pending}>
              {labels.confirm}
            </Button>
            <Button variant="secondary" onClick={() => setRejectMode(false)} disabled={pending}>
              {labels.dismiss}
            </Button>
          </Inline>
        </Stack>
      ) : (
        <Inline gap="sm">
          {status === "SUBMITTED" ? (
            <Button variant="primary" onClick={handleApprove} loading={pending} disabled={pending}>
              {labels.approve}
            </Button>
          ) : null}
          {status === "SUBMITTED" ? (
            <Button variant="secondary" onClick={openRejectMode} disabled={pending}>
              {labels.reject}
            </Button>
          ) : null}
          {status === "APPROVED" ? (
            <Button variant="primary" onClick={handleApply} loading={pending} disabled={pending}>
              {labels.apply}
            </Button>
          ) : null}
        </Inline>
      )}
    </Stack>
  );
}
