"use client";

import { Alert, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, Stack } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { markPayoutSentAction } from "../server/actions";

export interface PayoutMarkSentDialogProps {
  payoutId: string;
  amount: string | null | undefined;
  currencyCode: string | null | undefined;
  destinationMasked: string | null | undefined;
  locale: Locale;
  labels: {
    trigger: string;
    title: string;
    amountLabel: string;
    destinationLabel: string;
    externalReferenceLabel: string;
    confirm: string;
    cancel: string;
    genericError: string;
    correlationLabel: string;
  };
}

/** Only meaningful when status === "EXPORT_READY"; the caller is responsible for gating on that status. */
export function PayoutMarkSentDialog({ payoutId, amount, currencyCode, destinationMasked, locale, labels }: PayoutMarkSentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [externalReference, setExternalReference] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleConfirm() {
    if (pending) return;
    setError(null);
    setPending(true);

    const result = await markPayoutSentAction(payoutId, { externalReference: externalReference.trim() || undefined }, idempotencyKey);

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
              <span>{labels.amountLabel}</span>
              <MoneyValue amount={amount} currencyCode={currencyCode} locale={locale} />
            </Stack>
            <Stack gap="none">
              <span>{labels.destinationLabel}</span>
              <MaskedDestination maskedValue={destinationMasked} />
            </Stack>
            <Field id="payout-mark-sent-external-reference" label={labels.externalReferenceLabel}>
              <Input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} disabled={pending} />
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
