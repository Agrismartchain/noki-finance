"use client";

import { Alert, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Stack, Textarea } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { finalApprovePayoutAction, firstApprovePayoutAction } from "../server/actions";

export interface PayoutApproveDialogProps {
  stage: "first" | "final";
  payoutId: string;
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
    makerCheckerNote: string;
    confirm: string;
    cancel: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * First and final approval share the identical PayoutDecisionDto body ({reason?}), so one
 * component handles both stages. Per spec section 14, the maker/checker rule (same actor
 * cannot prepare and approve, cannot perform both approval stages, cannot approve after
 * modifying the payment method) is explained here as a persistent, purely explanatory
 * Alert -- it is NEVER enforced client-side (no actor-identity comparison), the API is the
 * sole authority, and a 409/403 surfaces via the generic error Alert + correlationId.
 */
export function PayoutApproveDialog({ stage, payoutId, amount, currencyCode, destinationMasked, locale, labels }: PayoutApproveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  async function handleConfirm() {
    if (pending) return;
    setError(null);
    setPending(true);

    const body = { reason: reason.trim() || undefined };
    const result = stage === "first" ? await firstApprovePayoutAction(payoutId, body, idempotencyKey) : await finalApprovePayoutAction(payoutId, body, idempotencyKey);

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

            <Alert tone="info">{labels.makerCheckerNote}</Alert>

            <Field id={`payout-approve-${stage}-reason`} label={labels.reasonLabel}>
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
