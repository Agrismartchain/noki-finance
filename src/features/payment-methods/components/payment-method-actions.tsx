"use client";

import { Alert, Button, Field, Inline, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { approvePaymentMethodAction, revokePaymentMethodAction, suspendPaymentMethodAction } from "../server/actions";

export interface PaymentMethodActionsProps {
  paymentMethodId: string;
  status: string;
  canApprove: boolean;
  canSuspend: boolean;
  canRevoke: boolean;
  labels: {
    approve: string;
    suspend: string;
    revoke: string;
    reasonLabel: string;
    reasonRequired: string;
    confirm: string;
    dismiss: string;
    genericError: string;
    correlationLabel: string;
  };
}

type ReasonMode = "suspend" | "revoke" | null;

/**
 * Status-appropriate lifecycle actions. Approve's reason is optional on the
 * real ApprovePaymentMethodDto, so it fires immediately (no reason step);
 * suspend/revoke both require a 3-500 char reason server-side, so they go
 * through the same reason-mode pattern as HandoverActions' cancel/reject.
 * "Revoke" is rendered whenever status is not already REVOKED -- the real
 * ACTIVE-or-SUSPENDED precondition is enforced server-side, not here.
 */
export function PaymentMethodActions({ paymentMethodId, status, canApprove, canSuspend, canRevoke, labels }: PaymentMethodActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [reasonMode, setReasonMode] = useState<ReasonMode>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());

  const showApprove = status === "PENDING_VERIFICATION" && canApprove;
  const showSuspend = status === "ACTIVE" && canSuspend;
  const showRevoke = status !== "REVOKED" && canRevoke;

  if (!showApprove && !showSuspend && !showRevoke) {
    return null;
  }

  async function runApprove() {
    setPending(true);
    setError(null);
    const result = await approvePaymentMethodAction(paymentMethodId, {}, idempotencyKey);
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
      reasonMode === "suspend"
        ? await suspendPaymentMethodAction(paymentMethodId, { reason: reason.trim() }, idempotencyKey)
        : await revokePaymentMethodAction(paymentMethodId, { reason: reason.trim() }, idempotencyKey);
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
          <Field id="payment-method-action-reason" label={labels.reasonLabel} error={reasonError ?? undefined} invalid={Boolean(reasonError)}>
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
          {showApprove ? (
            <Button variant="primary" onClick={runApprove} loading={pending} disabled={pending}>
              {labels.approve}
            </Button>
          ) : null}
          {showSuspend ? (
            <Button variant="secondary" onClick={() => openReasonMode("suspend")} disabled={pending}>
              {labels.suspend}
            </Button>
          ) : null}
          {showRevoke ? (
            <Button variant="secondary" onClick={() => openReasonMode("revoke")} disabled={pending}>
              {labels.revoke}
            </Button>
          ) : null}
        </Inline>
      )}
    </Stack>
  );
}
