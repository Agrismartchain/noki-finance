"use client";

import { Alert, Button, Field, FormActions, Input, Select, Stack, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { openSessionAction } from "../server/actions";

export interface OpenSessionFormProps {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencies: { id: string; label: string }[];
  labels: {
    currencyLabel: string;
    openingAmountLabel: string;
    submit: string;
    genericError: string;
    validationError: string;
    correlationLabel: string;
  };
}

/** Scopes (organization/country) come from the actor's own session, never a free-text field the client invents. */
export function OpenSessionForm({ organizationId, countryId, countryCode, currencies, labels }: OpenSessionFormProps) {
  const router = useRouter();
  const [currencyId, setCurrencyId] = useState<string | null>(currencies[0]?.id ?? null);
  const [openingAmount, setOpeningAmount] = useState("0.00");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const currencyOptions: SelectOption[] = currencies.map((currency) => ({ id: currency.id, label: currency.label }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    if (!currencyId || openingAmount.trim().length === 0) {
      setValidationError(true);
      return;
    }

    setValidationError(false);
    setPending(true);
    setError(null);

    const result = await openSessionAction({ organizationId, countryId, countryCode, currencyId, openingAmount }, idempotencyKey);

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/cash-sessions/${result.session.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Field id="open-session-currency" label={labels.currencyLabel}>
          <Select label={labels.currencyLabel} options={currencyOptions} selectedKey={currencyId ?? undefined} onSelectionChange={(key) => setCurrencyId(String(key))} />
        </Field>
        <Field id="open-session-amount" label={labels.openingAmountLabel}>
          <Input inputMode="decimal" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} disabled={pending} />
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
