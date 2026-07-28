"use client";

import { Alert, Button, FormActions, Stack } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { approveReconciliationAction, submitReconciliationAction } from "../server/actions";
import type { FinancialReconciliationResponseDto } from "../server/client";

export interface ReconciliationApprovalStateProps {
  reconciliation: FinancialReconciliationResponseDto;
  canSubmit: boolean;
  canApprove: boolean;
  labels: {
    makerCheckerNote: string;
    submit: string;
    approve: string;
    genericError: string;
    correlationLabel: string;
    noActionAvailable: string;
  };
}

/**
 * Status-driven action state (DRAFT -> submit, SUBMITTED -> approve). The
 * maker/checker rule (the submitter and approver must be different actors)
 * is explained here but is NEVER enforced client-side -- the DTO exposes no
 * preparer/approver identity to check against, and even if it did, hiding a
 * button is a UX nicety, not the real security boundary; noki-api rejects a
 * same-actor approval regardless of what this component renders.
 */
export function ReconciliationApprovalState({ reconciliation, canSubmit, canApprove, labels }: ReconciliationApprovalStateProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await submitReconciliationAction(reconciliation.id, idempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.refresh();
  }

  async function handleApprove() {
    setPending(true);
    setError(null);
    const result = await approveReconciliationAction(reconciliation.id, idempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.refresh();
  }

  const showSubmit = reconciliation.status === "DRAFT" && canSubmit;
  const showApprove = reconciliation.status === "SUBMITTED" && canApprove;

  return (
    <Stack gap="md">
      <Alert tone="info">{labels.makerCheckerNote}</Alert>

      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}

      {showSubmit || showApprove ? (
        <FormActions align="end">
          {showSubmit ? (
            <Button variant="primary" onClick={handleSubmit} loading={pending} disabled={pending}>
              {labels.submit}
            </Button>
          ) : null}
          {showApprove ? (
            <Button variant="primary" onClick={handleApprove} loading={pending} disabled={pending}>
              {labels.approve}
            </Button>
          ) : null}
        </FormActions>
      ) : (
        <Alert tone="neutral">{labels.noActionAvailable}</Alert>
      )}
    </Stack>
  );
}
