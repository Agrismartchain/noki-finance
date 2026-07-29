"use client";

import { Alert, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { markPayoutFailedAction } from "../server/actions";

export interface PayoutMarkFailedDialogProps {
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
    errorCodeLabel: string;
    errorCodeRequired: string;
    reasonLabel: string;
    reasonRequired: string;
    externalReferenceLabel: string;
    nextAttemptAtLabel: string;
    confirm: string;
    cancel: string;
    genericError: string;
    correlationLabel: string;
  };
}

/** Only meaningful when status === "SENT" (a send attempt failed); the caller is responsible for gating on that status. */
export function PayoutMarkFailedDialog({ payoutId, amount, currencyCode, destinationMasked, locale, labels }: PayoutMarkFailedDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const [reason, setReason] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [nextAttemptAt, setNextAttemptAt] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleConfirm() {
    if (pending) return;
    if (!errorCode.trim()) {
      setValidationError(labels.errorCodeRequired);
      return;
    }
    if (!reason.trim()) {
      setValidationError(labels.reasonRequired);
      return;
    }
    setValidationError(null);
    setError(null);
    setPending(true);

    const result = await markPayoutFailedAction(
      payoutId,
      {
        errorCode: errorCode.trim(),
        reason: reason.trim(),
        externalReference: externalReference.trim() || undefined,
        nextAttemptAt: nextAttemptAt.trim() || undefined,
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
      <Button variant="secondary" onClick={() => setOpen(true)}>
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

            <Field id="payout-mark-failed-error-code" label={labels.errorCodeLabel} error={validationError === labels.errorCodeRequired ? validationError : undefined} invalid={validationError === labels.errorCodeRequired}>
              <Input value={errorCode} onChange={(event) => setErrorCode(event.target.value)} disabled={pending} />
            </Field>
            <Field id="payout-mark-failed-reason" label={labels.reasonLabel} error={validationError === labels.reasonRequired ? validationError : undefined} invalid={validationError === labels.reasonRequired}>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
            </Field>
            <Field id="payout-mark-failed-external-reference" label={labels.externalReferenceLabel}>
              <Input value={externalReference} onChange={(event) => setExternalReference(event.target.value)} disabled={pending} />
            </Field>
            <Field id="payout-mark-failed-next-attempt" label={labels.nextAttemptAtLabel}>
              <Input value={nextAttemptAt} onChange={(event) => setNextAttemptAt(event.target.value)} disabled={pending} />
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
