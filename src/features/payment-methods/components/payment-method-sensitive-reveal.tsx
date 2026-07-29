"use client";

import { Alert, Button, Stack } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { revealSensitiveReferenceAction } from "../server/actions";

export interface PaymentMethodSensitiveRevealProps {
  paymentMethodId: string;
  canReveal: boolean;
  labels: {
    reveal: string;
    revealedLabel: string;
    hide: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * GET /v1/finance/payment-methods/{id}/sensitive-reference requires the
 * separate finance.payment_method.read_sensitive permission and is
 * audit-logged on the real backend, so this component only renders the
 * trigger when the actor holds that capability, and only fetches on an
 * explicit click -- never prefetched as part of the page render. The raw
 * sensitiveReference returned by that endpoint is intentionally not stored
 * in client state or rendered into HTML.
 */
export function PaymentMethodSensitiveReveal({ paymentMethodId, canReveal, labels }: PaymentMethodSensitiveRevealProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!canReveal) {
    return null;
  }

  async function handleReveal() {
    setPending(true);
    setError(null);
    const result = await revealSensitiveReferenceAction(paymentMethodId);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    setConfirmed(true);
  }

  function handleHide() {
    setConfirmed(false);
  }

  return (
    <Stack gap="sm">
      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}

      {confirmed ? (
        <Stack gap="sm">
          <Alert tone="success">{labels.revealedLabel}</Alert>
          <Button variant="secondary" onClick={handleHide}>
            {labels.hide}
          </Button>
        </Stack>
      ) : (
        <Button variant="secondary" onClick={handleReveal} loading={pending} disabled={pending}>
          {labels.reveal}
        </Button>
      )}
    </Stack>
  );
}
