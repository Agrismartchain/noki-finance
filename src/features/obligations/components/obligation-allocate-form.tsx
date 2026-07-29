"use client";

import { Alert, Button, Field, Input, Select, Stack, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { allocateObligationAction } from "../server/actions";
import type { AllocateObligationInput } from "../server/client";

const ALLOCATION_TYPES: AllocateObligationInput["allocationType"][] = ["DOCUMENT_LINE", "STATEMENT", "PAYOUT", "REFUND", "WITHHOLDING", "ADJUSTMENT"];

export interface ObligationAllocateFormProps {
  obligationId: string;
  labels: {
    title: string;
    allocationType: string;
    allocationTypeOptions: Record<string, string>;
    referenceId: string;
    referenceIdRequired: string;
    amount: string;
    amountRequired: string;
    submit: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Server is the sole authority on remainingAmount after this mutation --
 * the form only collects the three fields the real AllocateFinancialObligationDto
 * accepts and never previews a recomputed remaining balance.
 */
export function ObligationAllocateForm({ obligationId, labels }: ObligationAllocateFormProps) {
  const router = useRouter();
  const [allocationType, setAllocationType] = useState<AllocateObligationInput["allocationType"]>("DOCUMENT_LINE");
  const [allocationReferenceId, setAllocationReferenceId] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const typeOptions: SelectOption[] = ALLOCATION_TYPES.map((type) => ({ id: type, label: labels.allocationTypeOptions[type] ?? type }));

  async function handleSubmit() {
    if (pending) return;
    if (!allocationReferenceId.trim()) {
      setValidationError(labels.referenceIdRequired);
      return;
    }
    if (!amount.trim()) {
      setValidationError(labels.amountRequired);
      return;
    }
    setValidationError(null);
    setError(null);
    setPending(true);
    const result = await allocateObligationAction(obligationId, { allocationType, allocationReferenceId: allocationReferenceId.trim(), amount: amount.trim() }, idempotencyKey);
    setPending(false);
    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }
    router.refresh();
  }

  return (
    <Stack gap="md">
      <span>{labels.title}</span>
      <Field id="allocation-type" label={labels.allocationType}>
        <Select options={typeOptions} selectedKey={allocationType} onSelectionChange={(key) => setAllocationType(key as AllocateObligationInput["allocationType"])} />
      </Field>
      <Field id="allocation-reference" label={labels.referenceId}>
        <Input value={allocationReferenceId} onChange={(event) => setAllocationReferenceId(event.target.value)} disabled={pending} />
      </Field>
      <Field id="allocation-amount" label={labels.amount}>
        <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={pending} />
      </Field>
      {validationError ? <Alert tone="warning">{validationError}</Alert> : null}
      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}
      <Button variant="primary" onClick={handleSubmit} loading={pending} disabled={pending}>
        {labels.submit}
      </Button>
    </Stack>
  );
}
