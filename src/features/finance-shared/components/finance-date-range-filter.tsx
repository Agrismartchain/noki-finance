"use client";

import { Field, Input, Inline } from "@agrismartchain/noki-design-system";

export interface FinanceDateRangeFilterProps {
  fromLabel: string;
  toLabel: string;
  /** ISO date strings (yyyy-mm-dd), matching the dateFrom/dateTo URL filter convention. */
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  fromError?: string;
  toError?: string;
}

/**
 * Native `<input type="date">` fields (via the design system's Input, which
 * forwards standard HTML input attributes) rather than the design system's
 * react-aria DateInput -- simpler for a plain ISO-string URL filter, and RTL
 * layout comes for free from the surrounding Inline/Field primitives.
 */
export function FinanceDateRangeFilter({
  fromLabel,
  toLabel,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  fromError,
  toError,
}: FinanceDateRangeFilterProps) {
  return (
    <Inline gap="sm" align="end">
      <Field id="finance-date-from" label={fromLabel} error={fromError} invalid={Boolean(fromError)}>
        <Input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} max={dateTo || undefined} />
      </Field>
      <Field id="finance-date-to" label={toLabel} error={toError} invalid={Boolean(toError)}>
        <Input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} min={dateFrom || undefined} />
      </Field>
    </Inline>
  );
}
