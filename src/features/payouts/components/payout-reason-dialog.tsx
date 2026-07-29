"use client";

import { Alert, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, Stack, Textarea, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { cancelPayoutAction, createPayoutHoldAction, releasePayoutHoldAction, retryPayoutAction } from "../server/actions";
import { PAYOUT_HOLD_TYPES, type PayoutHoldType } from "../server/client";

export type PayoutReasonDialogAction = "hold" | "releaseHold" | "cancel" | "retry";

export interface PayoutReasonDialogProps {
  action: PayoutReasonDialogAction;
  payoutId: string;
  /** Required when action === "releaseHold". */
  holdId?: string;
  amount: string | null | undefined;
  currencyCode: string | null | undefined;
  destinationMasked: string | null | undefined;
  locale: Locale;
  labels: {
    trigger: string;
    title: string;
    amountLabel: string;
    currencyLabel: string;
    destinationLabel: string;
    reasonLabel: string;
    reasonRequired: string;
    typeLabel: string;
    typeOptions: Record<PayoutHoldType, string>;
    obligationIdLabel: string;
    paymentMethodIdLabel: string;
    confirm: string;
    cancel: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * One generic reason-plus-confirm Dialog reused for the four payout mutations that only
 * ever need a reason (plus, for "hold", a type; plus, for "retry", an optional payment
 * method override): hold, release-hold, cancel, retry. First/final-approve and mark-paid
 * have meaningfully different confirmation content and stay as their own components.
 */
export function PayoutReasonDialog({ action, payoutId, holdId, amount, currencyCode, destinationMasked, locale, labels }: PayoutReasonDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [holdType, setHoldType] = useState<PayoutHoldType>(PAYOUT_HOLD_TYPES[0]);
  const [obligationId, setObligationId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [pending, setPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const holdTypeOptions: SelectOption[] = PAYOUT_HOLD_TYPES.map((type) => ({ id: type, label: labels.typeOptions[type] ?? type }));

  async function handleConfirm() {
    if (pending) return;
    if (!reason.trim()) {
      setValidationError(labels.reasonRequired);
      return;
    }
    setValidationError(null);
    setError(null);
    setPending(true);

    const result = await (action === "hold"
      ? createPayoutHoldAction(payoutId, { type: holdType, reason: reason.trim(), obligationId: obligationId.trim() || undefined }, idempotencyKey)
      : action === "releaseHold"
        ? releasePayoutHoldAction(payoutId, holdId ?? "", { reason: reason.trim() }, idempotencyKey)
        : action === "cancel"
          ? cancelPayoutAction(payoutId, { reason: reason.trim() }, idempotencyKey)
          : retryPayoutAction(payoutId, { reason: reason.trim(), paymentMethodId: paymentMethodId.trim() || undefined }, idempotencyKey));

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

            {action === "hold" ? (
              <>
                <Field id="payout-reason-hold-type" label={labels.typeLabel}>
                  <Select options={holdTypeOptions} selectedKey={holdType} onSelectionChange={(key) => setHoldType(key as PayoutHoldType)} />
                </Field>
                <Field id="payout-reason-obligation-id" label={labels.obligationIdLabel}>
                  <Input value={obligationId} onChange={(event) => setObligationId(event.target.value)} disabled={pending} />
                </Field>
              </>
            ) : null}

            {action === "retry" ? (
              <Field id="payout-reason-payment-method-id" label={labels.paymentMethodIdLabel}>
                <Input value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} disabled={pending} />
              </Field>
            ) : null}

            <Field id="payout-reason-text" label={labels.reasonLabel} error={validationError ?? undefined} invalid={Boolean(validationError)}>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} />
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
