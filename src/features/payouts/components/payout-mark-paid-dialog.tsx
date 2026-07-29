"use client";

import { Alert, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, Stack } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { markPayoutPaidAction } from "../server/actions";

export interface PayoutMarkPaidDialogProps {
  payoutId: string;
  reference: string | null | undefined;
  amount: string | null | undefined;
  currencyCode: string | null | undefined;
  counterpartyType: string;
  counterpartyId: string;
  destinationMasked: string | null | undefined;
  locale: Locale;
  labels: {
    trigger: string;
    title: string;
    referenceLabel: string;
    amountLabel: string;
    counterpartyLabel: string;
    destinationLabel: string;
    proofReferenceLabel: string;
    proofReferenceRequired: string;
    checksumLabel: string;
    mimeTypeLabel: string;
    sizeLabel: string;
    confirm: string;
    cancel: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * Reinforced confirmation per spec section 14: shows reference/amount/currency/
 * counterparty/masked destination/proof-reference before confirming. There is no amount
 * field on MarkPayoutPaidDto at all -- this dialog must never accept an amount override.
 * Only meaningful when status === "SENT"; the caller is responsible for gating on that
 * status.
 */
export function PayoutMarkPaidDialog({ payoutId, reference, amount, currencyCode, counterpartyType, counterpartyId, destinationMasked, locale, labels }: PayoutMarkPaidDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [proofReference, setProofReference] = useState("");
  const [checksum, setChecksum] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [size, setSize] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleConfirm() {
    if (pending) return;
    if (!proofReference.trim()) {
      setValidationError(labels.proofReferenceRequired);
      return;
    }
    setValidationError(null);
    setError(null);
    setPending(true);

    const parsedSize = size.trim() ? Number.parseInt(size.trim(), 10) : undefined;
    const result = await markPayoutPaidAction(
      payoutId,
      {
        proofReference: proofReference.trim(),
        checksum: checksum.trim() || undefined,
        mimeType: mimeType.trim() || undefined,
        size: parsedSize !== undefined && Number.isFinite(parsedSize) ? parsedSize : undefined,
      },
      idempotencyKey,
    );

    setPending(false);

    if (!result.ok) {
      setError({ kind: result.kind, correlationId: result.correlationId });
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {labels.trigger}
      </Button>
      <Dialog isOpen={open} onOpenChange={setOpen} size="md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <Stack gap="md">
            <Stack gap="none">
              <span>{labels.referenceLabel}</span>
              <span>{reference ?? "—"}</span>
            </Stack>
            <Stack gap="none">
              <span>{labels.amountLabel}</span>
              <MoneyValue amount={amount} currencyCode={currencyCode} locale={locale} />
            </Stack>
            <Stack gap="none">
              <span>{labels.counterpartyLabel}</span>
              <span>{`${counterpartyType} · ${counterpartyId}`}</span>
            </Stack>
            <Stack gap="none">
              <span>{labels.destinationLabel}</span>
              <MaskedDestination maskedValue={destinationMasked} />
            </Stack>

            <Field id="payout-mark-paid-proof-reference" label={labels.proofReferenceLabel} error={validationError ?? undefined} invalid={Boolean(validationError)}>
              <Input value={proofReference} onChange={(event) => setProofReference(event.target.value)} disabled={pending} />
            </Field>
            <Field id="payout-mark-paid-checksum" label={labels.checksumLabel}>
              <Input value={checksum} onChange={(event) => setChecksum(event.target.value)} disabled={pending} />
            </Field>
            <Field id="payout-mark-paid-mime-type" label={labels.mimeTypeLabel}>
              <Input value={mimeType} onChange={(event) => setMimeType(event.target.value)} disabled={pending} />
            </Field>
            <Field id="payout-mark-paid-size" label={labels.sizeLabel}>
              <Input inputMode="numeric" value={size} onChange={(event) => setSize(event.target.value)} disabled={pending} />
            </Field>

            {error ? (
              <Alert tone="danger">
                {labels.genericError}
                {error.correlationId ? ` — ${labels.correlationLabel}: ${error.correlationId}` : ""}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            {labels.cancel}
          </Button>
          <Button variant="primary" onClick={handleConfirm} loading={pending} disabled={pending}>
            {labels.confirm}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
