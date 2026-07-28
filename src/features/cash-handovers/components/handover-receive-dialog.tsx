"use client";

import { Alert, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, Stack, type SelectOption } from "@agrismartchain/noki-design-system";
import { useState } from "react";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import type { Locale } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { generateIdempotencyKey } from "@/lib/api/idempotency";

import { receiveHandoverAction } from "../server/actions";
import type { CashHandoverResponseDto } from "../server/client";

export interface OpenSessionOption {
  id: string;
  label: string;
}

export interface HandoverReceiveDialogProps {
  handover: CashHandoverResponseDto;
  currencyCode: string | undefined;
  locale: Locale;
  openSessions: OpenSessionOption[];
  labels: {
    trigger: string;
    title: string;
    sessionLabel: string;
    lineDeclared: string;
    lineHandedOver: string;
    lineReceived: string;
    confirm: string;
    cancel: string;
    noOpenSession: string;
    genericError: string;
    correlationLabel: string;
  };
}

/**
 * The caissier chooses a compatible open session, enters the received amount
 * per line, sees declared/handed-over/received as three separate MoneyValue
 * figures (no new value is computed client-side), then confirms in a Dialog.
 * The declared and handed-over amounts submitted earlier are never editable
 * here -- only receivedAmount is collected.
 */
export function HandoverReceiveDialog({ handover, currencyCode, locale, openSessions, labels }: HandoverReceiveDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(openSessions[0]?.id ?? null);
  const [receivedAmounts, setReceivedAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(handover.items.map((item) => [item.id, item.handedOverAmount])),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ kind: string; correlationId?: string } | null>(null);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());

  const sessionOptions: SelectOption[] = openSessions.map((session) => ({ id: session.id, label: session.label }));

  async function handleConfirm() {
    if (!sessionId || pending) {
      return;
    }
    setPending(true);
    setError(null);

    const result = await receiveHandoverAction(
      handover.id,
      {
        cashSessionId: sessionId,
        items: handover.items.map((item) => ({ codCollectionId: item.codCollectionId, receivedAmount: receivedAmounts[item.id] ?? item.handedOverAmount })),
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

  if (openSessions.length === 0) {
    return <Alert tone="warning">{labels.noOpenSession}</Alert>;
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {labels.trigger}
      </Button>
      <Dialog isOpen={open} onOpenChange={setOpen} size="lg">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <Stack gap="md">
            <Field id="receive-session" label={labels.sessionLabel}>
              <Select options={sessionOptions} selectedKey={sessionId ?? undefined} onSelectionChange={(key) => setSessionId(String(key))} />
            </Field>

            {handover.items.map((item) => (
              <Stack key={item.id} gap="xs">
                <Stack gap="none">
                  <span>{labels.lineDeclared}</span>
                  <MoneyValue amount={item.declaredAmountSnapshot} currencyCode={currencyCode} locale={locale} />
                </Stack>
                <Stack gap="none">
                  <span>{labels.lineHandedOver}</span>
                  <MoneyValue amount={item.handedOverAmount} currencyCode={currencyCode} locale={locale} />
                </Stack>
                <Field id={`receive-amount-${item.id}`} label={labels.lineReceived}>
                  <Input
                    inputMode="decimal"
                    value={receivedAmounts[item.id] ?? ""}
                    onChange={(event) => setReceivedAmounts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    disabled={pending}
                  />
                </Field>
              </Stack>
            ))}

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
          <Button variant="primary" onClick={handleConfirm} loading={pending} disabled={pending || !sessionId}>
            {labels.confirm}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
