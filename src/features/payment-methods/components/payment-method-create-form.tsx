"use client";

import { Alert, Button, Field, FormActions, Input, Select, Stack, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createPaymentMethodAction } from "../server/actions";
import type { CreatePaymentMethodInput } from "../server/client";
import { PAYMENT_METHOD_COUNTERPARTY_TYPES, PAYMENT_METHOD_TYPES } from "../server/list-query";

/**
 * `destinationFingerprint` is a required field on CreateFinancePaymentMethodDto
 * (a one-way hash used server-side for duplicate detection), but this app has
 * no real vaulting/tokenization integration yet -- there is no dedicated form
 * field or i18n copy for it (verified against the message key spec), so a
 * human never types or sees it. Until a real vaulting step provides this
 * value directly, this derives a SHA-256 digest of the opaque
 * sensitiveReference the user entered -- still a one-way hash, never the raw
 * reference itself -- as the closest honest stand-in. This is a documented
 * gap, not a faked value.
 */
async function deriveDestinationFingerprint(sensitiveReference: string): Promise<string> {
  const encoded = new TextEncoder().encode(sensitiveReference);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface PaymentMethodCreateFormProps {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  typeLabels: Record<CreatePaymentMethodInput["type"], string>;
  labels: {
    counterpartyType: string;
    counterpartyId: string;
    type: string;
    providerCode: string;
    displayLabel: string;
    destinationMasked: string;
    destinationMaskedHint: string;
    sensitiveReference: string;
    sensitiveReferenceHint: string;
    submit: string;
    validationError: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * SECURITY: `sensitiveReference` must be an opaque vault/token/pmref
 * reference from an external vaulting step (backend-enforced pattern:
 * ^(vault|token|pmref):[A-Za-z0-9._:-]{6,}$), never a raw account number,
 * IBAN, or phone number. `destinationMasked` must already be a masked
 * display string (e.g. "**** 4242" / "IBAN •••• 9012"), never raw digits --
 * the backend rejects an unmasked IBAN or long digit run. This form
 * deliberately has no field labeled IBAN/RIB/compte/téléphone or any field
 * that invites a raw bank/mobile-money number.
 */
export function PaymentMethodCreateForm({ organizationId, countryId, countryCode, currencyId, typeLabels, labels }: PaymentMethodCreateFormProps) {
  const router = useRouter();
  const [counterpartyType, setCounterpartyType] = useState<string>(PAYMENT_METHOD_COUNTERPARTY_TYPES[0]);
  const [counterpartyId, setCounterpartyId] = useState("");
  const [type, setType] = useState<CreatePaymentMethodInput["type"]>(PAYMENT_METHOD_TYPES[0]);
  const [providerCode, setProviderCode] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [destinationMasked, setDestinationMasked] = useState("");
  const [sensitiveReference, setSensitiveReference] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const counterpartyTypeOptions: SelectOption[] = PAYMENT_METHOD_COUNTERPARTY_TYPES.map((value) => ({ id: value, label: value }));
  const typeOptions: SelectOption[] = PAYMENT_METHOD_TYPES.map((value) => ({ id: value, label: typeLabels[value] ?? value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    if (!counterpartyId.trim() || !providerCode.trim() || !displayLabel.trim() || !destinationMasked.trim() || !sensitiveReference.trim()) {
      setValidationError(true);
      return;
    }

    setValidationError(false);
    setPending(true);
    setError(null);

    const trimmedSensitiveReference = sensitiveReference.trim();
    const destinationFingerprint = await deriveDestinationFingerprint(trimmedSensitiveReference);

    const result = await createPaymentMethodAction(
      {
        organizationId,
        countryId,
        countryCode,
        currencyId,
        counterpartyType,
        counterpartyId: counterpartyId.trim(),
        type,
        providerCode: providerCode.trim(),
        displayLabel: displayLabel.trim(),
        destinationMasked: destinationMasked.trim(),
        destinationFingerprint,
        sensitiveReference: trimmedSensitiveReference,
      },
      idempotencyKey,
    );

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/payment-methods/${result.paymentMethod.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Field id="payment-method-counterparty-type" label={labels.counterpartyType}>
          <Select options={counterpartyTypeOptions} selectedKey={counterpartyType} onSelectionChange={(key) => setCounterpartyType(String(key))} />
        </Field>
        <Field id="payment-method-counterparty-id" label={labels.counterpartyId}>
          <Input value={counterpartyId} onChange={(event) => setCounterpartyId(event.target.value)} disabled={pending} />
        </Field>
        <Field id="payment-method-type" label={labels.type}>
          <Select options={typeOptions} selectedKey={type} onSelectionChange={(key) => setType(key as CreatePaymentMethodInput["type"])} />
        </Field>
        <Field id="payment-method-provider-code" label={labels.providerCode}>
          <Input value={providerCode} onChange={(event) => setProviderCode(event.target.value)} disabled={pending} maxLength={40} />
        </Field>
        <Field id="payment-method-display-label" label={labels.displayLabel}>
          <Input value={displayLabel} onChange={(event) => setDisplayLabel(event.target.value)} disabled={pending} maxLength={120} />
        </Field>
        <Field id="payment-method-destination-masked" label={labels.destinationMasked} description={labels.destinationMaskedHint}>
          <Input value={destinationMasked} onChange={(event) => setDestinationMasked(event.target.value)} disabled={pending} maxLength={120} placeholder="**** 4242" />
        </Field>
        <Field id="payment-method-sensitive-reference" label={labels.sensitiveReference} description={labels.sensitiveReferenceHint}>
          <Input value={sensitiveReference} onChange={(event) => setSensitiveReference(event.target.value)} disabled={pending} maxLength={160} placeholder="vault:..." />
        </Field>

        {validationError ? <Alert tone="warning">{labels.validationError}</Alert> : null}
        {error ? (
          <Alert tone="danger">
            {labels.genericError}
            {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
          </Alert>
        ) : null}

        <FormActions align="end">
          <Button type="submit" variant="primary" loading={pending} disabled={pending}>
            {labels.submit}
          </Button>
        </FormActions>
      </Stack>
    </form>
  );
}
