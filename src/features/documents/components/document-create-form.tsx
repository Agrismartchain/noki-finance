"use client";

import { Alert, Button, Field, FormActions, Input, Select, Stack, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createDocumentAction } from "../server/actions";
import type { CreateDocumentInput } from "../server/client";
import { DOCUMENT_COUNTERPARTY_TYPES, DOCUMENT_TYPES, type DocumentCounterpartyType, type DocumentType } from "../server/list-query";

export interface DocumentCreateFormProps {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencies: { id: string; label: string }[];
  labels: {
    documentType: string;
    documentTypeOptions: Record<DocumentType, string>;
    /**
     * DOCUMENT_COUNTERPARTY_TYPES has no dedicated i18n tree -- only this field label is
     * translated; option labels fall back to the raw backend enum value.
     */
    counterpartyType: string;
    counterpartyId: string;
    currency: string;
    periodStart: string;
    periodEnd: string;
    submit: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Accepts exactly GenerateFinancialDocumentDto's fields -- no gross/net/fee total, no
 * status, no approver field is ever collected here; the server derives every money
 * amount from the referenced obligations. Scope (organization/country) comes from the
 * actor's own session, never a free-text field. `obligationIds` (optional on the DTO)
 * is intentionally not exposed as a UI field -- there is no i18n label for it and no
 * obligation-lookup UI in this phase; the create call always omits it, which the DTO
 * treats identically to an empty list. The Idempotency-Key is generated once per form
 * mount and reused across retries of the same submission.
 */
export function DocumentCreateForm({ organizationId, countryId, countryCode, currencies, labels }: DocumentCreateFormProps) {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<DocumentType>("INVOICE");
  const [counterpartyType, setCounterpartyType] = useState<DocumentCounterpartyType>("SELLER");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [currencyId, setCurrencyId] = useState<string | null>(currencies[0]?.id ?? null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const documentTypeOptions: SelectOption[] = DOCUMENT_TYPES.map((type) => ({ id: type, label: labels.documentTypeOptions[type] ?? type }));
  const counterpartyTypeOptions: SelectOption[] = DOCUMENT_COUNTERPARTY_TYPES.map((type) => ({ id: type, label: type }));
  const currencyOptions: SelectOption[] = currencies.map((currency) => ({ id: currency.id, label: currency.label }));

  /**
   * Gates the submit button rather than showing a validation-message Alert -- the
   * documents.create i18n tree has no dedicated validation-error key, so this avoids
   * inventing one.
   */
  const canSubmit = Boolean(counterpartyId.trim() && periodStart && periodEnd && currencyId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSubmit || !currencyId) {
      return;
    }

    setError(null);
    setPending(true);

    const body: CreateDocumentInput = {
      organizationId,
      countryId,
      countryCode,
      currencyId,
      documentType,
      counterpartyType,
      counterpartyId: counterpartyId.trim(),
      periodStart,
      periodEnd,
    };

    const result = await createDocumentAction(body, idempotencyKey);
    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/documents/${result.document.id}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Field id="document-type" label={labels.documentType}>
          <Select options={documentTypeOptions} selectedKey={documentType} onSelectionChange={(key) => setDocumentType(key as DocumentType)} />
        </Field>
        <Field id="document-counterparty-type" label={labels.counterpartyType}>
          <Select options={counterpartyTypeOptions} selectedKey={counterpartyType} onSelectionChange={(key) => setCounterpartyType(key as DocumentCounterpartyType)} />
        </Field>
        <Field id="document-counterparty-id" label={labels.counterpartyId}>
          <Input value={counterpartyId} onChange={(event) => setCounterpartyId(event.target.value)} disabled={pending} />
        </Field>
        <Field id="document-currency" label={labels.currency}>
          <Select options={currencyOptions} selectedKey={currencyId ?? undefined} onSelectionChange={(key) => setCurrencyId(String(key))} />
        </Field>
        <Field id="document-period-start" label={labels.periodStart}>
          <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} disabled={pending} max={periodEnd || undefined} />
        </Field>
        <Field id="document-period-end" label={labels.periodEnd}>
          <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} disabled={pending} min={periodStart || undefined} />
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
