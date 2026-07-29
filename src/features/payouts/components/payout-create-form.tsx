"use client";

import { Alert, Button, Field, FormActions, Input, Select, Stack, Textarea, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { proposePayoutAction } from "../server/actions";
import { PAYOUT_COUNTERPARTY_TYPES, type PayoutCounterpartyType } from "../server/client";

export interface PayoutCreateFormProps {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  labels: {
    counterpartyType: string;
    counterpartyTypeOptions: Record<PayoutCounterpartyType, string>;
    counterpartyId: string;
    counterpartyIdRequired: string;
    paymentMethodId: string;
    paymentMethodIdRequired: string;
    code: string;
    obligationIds: string;
    obligationIdsHint: string;
    obligationIdsRequired: string;
    submit: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * `paymentMethodId` is a plain text Input rather than a selector sourced from the real
 * payment-methods list -- that module is a parallel, not-yet-available workstream (per the
 * brief), so this deliberately does not block on it. `obligationIds` is a bounded,
 * one-id-per-line textarea (not an unbounded picker scanning every obligation), split/
 * trimmed/filtered-empty on submit.
 */
export function PayoutCreateForm({ organizationId, countryId, countryCode, currencyId, labels }: PayoutCreateFormProps) {
  const router = useRouter();
  const [counterpartyType, setCounterpartyType] = useState<PayoutCounterpartyType>(PAYOUT_COUNTERPARTY_TYPES[0]);
  const [counterpartyId, setCounterpartyId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [code, setCode] = useState("");
  const [obligationIdsRaw, setObligationIdsRaw] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const counterpartyTypeOptions: SelectOption[] = PAYOUT_COUNTERPARTY_TYPES.map((type) => ({ id: type, label: labels.counterpartyTypeOptions[type] ?? type }));

  async function handleSubmit() {
    if (pending) return;

    if (!counterpartyId.trim()) {
      setValidationError(labels.counterpartyIdRequired);
      return;
    }
    if (!paymentMethodId.trim()) {
      setValidationError(labels.paymentMethodIdRequired);
      return;
    }
    const obligationIds = obligationIdsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (obligationIds.length === 0) {
      setValidationError(labels.obligationIdsRequired);
      return;
    }

    setValidationError(null);
    setError(null);
    setPending(true);

    const result = await proposePayoutAction(
      {
        organizationId,
        countryId,
        countryCode,
        currencyId,
        counterpartyType,
        counterpartyId: counterpartyId.trim(),
        paymentMethodId: paymentMethodId.trim(),
        code: code.trim() || undefined,
        obligationIds,
      },
      idempotencyKey,
    );

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/payouts/${result.payout.id}`);
  }

  return (
    <Stack gap="md">
      <Field id="payout-counterparty-type" label={labels.counterpartyType}>
        <Select options={counterpartyTypeOptions} selectedKey={counterpartyType} onSelectionChange={(key) => setCounterpartyType(key as PayoutCounterpartyType)} />
      </Field>
      <Field id="payout-counterparty-id" label={labels.counterpartyId}>
        <Input value={counterpartyId} onChange={(event) => setCounterpartyId(event.target.value)} disabled={pending} />
      </Field>
      <Field id="payout-payment-method-id" label={labels.paymentMethodId}>
        <Input value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} disabled={pending} />
      </Field>
      <Field id="payout-code" label={labels.code}>
        <Input value={code} onChange={(event) => setCode(event.target.value)} disabled={pending} />
      </Field>
      <Field id="payout-obligation-ids" label={labels.obligationIds} description={labels.obligationIdsHint}>
        <Textarea value={obligationIdsRaw} onChange={(event) => setObligationIdsRaw(event.target.value)} disabled={pending} rows={6} />
      </Field>

      {validationError ? <Alert tone="warning">{validationError}</Alert> : null}
      {error ? (
        <Alert tone="danger">
          {labels.genericError}
          {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
        </Alert>
      ) : null}

      <FormActions align="end">
        <Button variant="primary" onClick={handleSubmit} loading={pending} disabled={pending}>
          {labels.submit}
        </Button>
      </FormActions>
    </Stack>
  );
}
