"use client";

import { Alert, Button, Checkbox, FormActions, Input, Stack, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { createHandoverAction } from "../server/actions";

export interface EligibleCollection {
  id: string;
  orderNumber: string;
  expectedAmount: string;
  collectedAmount: string;
}

export interface HandoverCreateFormProps {
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  currencyCode: string;
  locale: Locale;
  eligibleCollections: EligibleCollection[];
  labels: {
    ariaLabel: string;
    colSelect: string;
    colOrder: string;
    colExpected: string;
    colDeclared: string;
    colHandedOver: string;
    noEligible: string;
    submit: string;
    genericError: string;
    validationError: string;
    correlationLabel: string;
  };
}

/**
 * Only backend-eligible COD collections (status DECLARED -- the only status
 * a collection can be in before being handed over, since the backend has no
 * dedicated "eligible" flag) are selectable. Amounts are entered as decimal
 * strings; the available amount shown is the server's own collectedAmount,
 * never a client-side recomputation.
 */
export function HandoverCreateForm({ organizationId, countryId, countryCode, currencyId, currencyCode, locale, eligibleCollections, labels }: HandoverCreateFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [validationError, setValidationError] = useState(false);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }

    const items = eligibleCollections
      .filter((collection) => selected[collection.id])
      .map((collection) => ({ codCollectionId: collection.id, handedOverAmount: amounts[collection.id] ?? collection.collectedAmount }));

    if (items.length === 0) {
      setValidationError(true);
      return;
    }

    setValidationError(false);
    setPending(true);
    setError(null);

    const result = await createHandoverAction({ organizationId, countryId, countryCode, currencyId, items }, idempotencyKey);

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    router.push(`/cash-handovers/${result.handover.id}`);
  }

  if (eligibleCollections.length === 0) {
    return <Alert tone="info">{labels.noEligible}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <Table aria-label={labels.ariaLabel}>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.colSelect}</TableHead>
              <TableHead>{labels.colOrder}</TableHead>
              <TableHead align="end">{labels.colExpected}</TableHead>
              <TableHead align="end">{labels.colDeclared}</TableHead>
              <TableHead align="end">{labels.colHandedOver}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eligibleCollections.map((collection) => (
              <TableRow key={collection.id}>
                <TableCell>
                  <Checkbox
                    label=""
                    isSelected={Boolean(selected[collection.id])}
                    onChange={(isSelected) => {
                      setSelected((prev) => ({ ...prev, [collection.id]: isSelected }));
                      if (isSelected && !amounts[collection.id]) {
                        setAmounts((prev) => ({ ...prev, [collection.id]: collection.collectedAmount }));
                      }
                    }}
                    isDisabled={pending}
                  />
                </TableCell>
                <TableCell>{collection.orderNumber}</TableCell>
                <TableCell align="end">
                  <MoneyValue amount={collection.expectedAmount} currencyCode={currencyCode} locale={locale} />
                </TableCell>
                <TableCell align="end">
                  <MoneyValue amount={collection.collectedAmount} currencyCode={currencyCode} locale={locale} />
                </TableCell>
                <TableCell align="end">
                  <Input
                    inputMode="decimal"
                    value={amounts[collection.id] ?? ""}
                    onChange={(event) => setAmounts((prev) => ({ ...prev, [collection.id]: event.target.value }))}
                    disabled={pending || !selected[collection.id]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
