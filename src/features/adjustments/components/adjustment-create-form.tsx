"use client";

import { Alert, Button, Field, FormActions, Input, Select, Stack, Textarea, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createAdjustmentAction } from "../server/actions";
import {
  ADJUSTMENT_COUNTERPARTY_TYPES,
  ADJUSTMENT_SOURCE_DOMAINS,
  ADJUSTMENT_TYPES,
  type AdjustmentCounterpartyType,
  type AdjustmentSourceDomain,
  type AdjustmentType,
  type CreateAdjustmentInput,
} from "../server/client";

export interface AdjustmentCreateFormProps {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencies: { id: string; label: string }[];
  labels: {
    counterpartyType: string;
    counterpartyId: string;
    sourceDomain: string;
    sourceReferenceType: string;
    sourceReferenceId: string;
    type: string;
    typeOptions: Record<AdjustmentType, string>;
    amount: string;
    reasonCode: string;
    reason: string;
    attachmentReference: string;
    currency: string;
    submit: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Accepts exactly the 7 fields CreateFinancialAdjustmentDto exposes -- counterpartyType,
 * counterpartyId, sourceDomain, sourceReferenceType, sourceReferenceId, type, amount,
 * reasonCode, reason, and the optional attachmentReference (a plain opaque text field,
 * never a file upload, since the API exposes no upload endpoint). Deliberately NEVER
 * collects a direction, a negative amount, a status, an approver, or a resulting
 * obligation id -- the server rejects a negative amount, and there is no sign toggle
 * here. Scope (organization/country) comes from the actor's own session. The
 * Idempotency-Key is generated once per form mount and reused across retries of the
 * same submission.
 */
export function AdjustmentCreateForm({ organizationId, countryId, countryCode, currencies, labels }: AdjustmentCreateFormProps) {
  const router = useRouter();
  const [counterpartyType, setCounterpartyType] = useState<AdjustmentCounterpartyType>("SELLER");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [sourceDomain, setSourceDomain] = useState<AdjustmentSourceDomain>("MANUAL_ADJUSTMENT");
  const [sourceReferenceType, setSourceReferenceType] = useState("");
  const [sourceReferenceId, setSourceReferenceId] = useState("");
  const [type, setType] = useState<AdjustmentType>("MANUAL_ADJUSTMENT");
  const [currencyId, setCurrencyId] = useState<string | null>(currencies[0]?.id ?? null);
  const [amount, setAmount] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");
  const [attachmentReference, setAttachmentReference] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const counterpartyTypeOptions: SelectOption[] = ADJUSTMENT_COUNTERPARTY_TYPES.map((value) => ({ id: value, label: value }));
  const sourceDomainOptions: SelectOption[] = ADJUSTMENT_SOURCE_DOMAINS.map((value) => ({ id: value, label: value }));
  const typeOptions: SelectOption[] = ADJUSTMENT_TYPES.map((value) => ({ id: value, label: labels.typeOptions[value] ?? value }));
  const currencyOptions: SelectOption[] = currencies.map((currency) => ({ id: currency.id, label: currency.label }));

  /**
   * Gates the submit button rather than showing a validation-message Alert -- the
   * adjustments.create i18n tree has no dedicated validation-error key, so this avoids
   * inventing one.
   */
  const canSubmit = Boolean(counterpartyId.trim() && sourceReferenceType.trim() && sourceReferenceId.trim() && amount.trim() && reasonCode.trim() && reason.trim().length >= 3 && currencyId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSubmit || !currencyId) {
      return;
    }

    setError(null);
    setPending(true);

    const body: CreateAdjustmentInput = {
      organizationId,
      countryId,
      countryCode,
      currencyId,
      counterpartyType,
      counterpartyId: counterpartyId.trim(),
      sourceDomain,
      sourceReferenceType: sourceReferenceType.trim(),
      sourceReferenceId: sourceReferenceId.trim(),
      type,
      amount: amount.trim(),
      reasonCode: reasonCode.trim(),
      reason: reason.trim(),
      ...(attachmentReference.trim() ? { attachmentReference: attachmentReference.trim() } : {}),
    };

    const result = await createAdjustmentAction(body, idempotencyKey);
    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/adjustments/${result.adjustment.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Field id="adjustment-counterparty-type" label={labels.counterpartyType}>
          <Select options={counterpartyTypeOptions} selectedKey={counterpartyType} onSelectionChange={(key) => setCounterpartyType(key as AdjustmentCounterpartyType)} />
        </Field>
        <Field id="adjustment-counterparty-id" label={labels.counterpartyId}>
          <Input value={counterpartyId} onChange={(event) => setCounterpartyId(event.target.value)} disabled={pending} />
        </Field>
        <Field id="adjustment-source-domain" label={labels.sourceDomain}>
          <Select options={sourceDomainOptions} selectedKey={sourceDomain} onSelectionChange={(key) => setSourceDomain(key as AdjustmentSourceDomain)} />
        </Field>
        <Field id="adjustment-source-reference-type" label={labels.sourceReferenceType}>
          <Input value={sourceReferenceType} onChange={(event) => setSourceReferenceType(event.target.value)} disabled={pending} />
        </Field>
        <Field id="adjustment-source-reference-id" label={labels.sourceReferenceId}>
          <Input value={sourceReferenceId} onChange={(event) => setSourceReferenceId(event.target.value)} disabled={pending} />
        </Field>
        <Field id="adjustment-type" label={labels.type}>
          <Select options={typeOptions} selectedKey={type} onSelectionChange={(key) => setType(key as AdjustmentType)} />
        </Field>
        <Field id="adjustment-currency" label={labels.currency}>
          <Select options={currencyOptions} selectedKey={currencyId ?? undefined} onSelectionChange={(key) => setCurrencyId(String(key))} />
        </Field>
        <Field id="adjustment-amount" label={labels.amount}>
          <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={pending} />
        </Field>
        <Field id="adjustment-reason-code" label={labels.reasonCode}>
          <Input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} disabled={pending} />
        </Field>
        <Field id="adjustment-reason" label={labels.reason}>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
        </Field>
        <Field id="adjustment-attachment-reference" label={labels.attachmentReference} optional>
          <Input value={attachmentReference} onChange={(event) => setAttachmentReference(event.target.value)} disabled={pending} />
        </Field>

        {error ? (
          <Alert tone="danger">
            {labels.genericError}
            {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
          </Alert>
        ) : null}

        <FormActions align="end">
          <Button type="submit" variant="primary" loading={pending} disabled={pending || !canSubmit}>
            {labels.submit}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
