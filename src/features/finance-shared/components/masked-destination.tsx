export interface MaskedDestinationProps {
  /** Server-provided masked value (e.g. "**** 4242", "IBAN •••• 9012"). The frontend never derives or performs its own masking. */
  maskedValue: string | null | undefined;
  emptyLabel?: string;
}

export function MaskedDestination({ maskedValue, emptyLabel = "—" }: MaskedDestinationProps) {
  if (!maskedValue) {
    return <span>{emptyLabel}</span>;
  }

  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{maskedValue}</span>;
}
