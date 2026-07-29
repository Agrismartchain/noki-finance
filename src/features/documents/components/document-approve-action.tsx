"use client";

import { Alert, Button } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { approveDocumentAction } from "../server/actions";

export interface DocumentApproveActionProps {
  documentId: string;
  labels: {
    approve: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Simple-button approve action (reconciliation-approval-state.tsx's pattern). The caller
 * only renders this when status !== "APPROVED" && status !== "VOIDED" -- the real
 * enforcement of which statuses actually permit approval is server-side only.
 */
export function DocumentApproveAction({ documentId, labels }: DocumentApproveActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleApprove() {
    setPending(true);
    setError(null);
    const result = await approveDocumentAction(documentId, {}, idempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}
      <Button variant="primary" onClick={handleApprove} loading={pending} disabled={pending}>
        {labels.approve}
      </Button>
    </>
  );
}
