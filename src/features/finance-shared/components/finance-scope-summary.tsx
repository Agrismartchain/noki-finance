"use client";

import { Select, type SelectOption } from "@agrismartchain/noki-design-system";

export interface FinanceScopeOption {
  /** `${organizationId}:${countryCode}`, unique per actor scope. */
  id: string;
  organizationId: string;
  organizationName: string;
  countryCode: string;
}

export interface FinanceScopeSummaryProps {
  label: string;
  options: FinanceScopeOption[];
  selectedId: string | null;
  onChange: (option: FinanceScopeOption) => void;
  emptyLabel: string;
}

/**
 * Surfaces the actor's finance scope (organization + country) required by
 * the cash endpoints (CashListQueryDto.organizationId/countryCode are both
 * required server-side). Renders a static summary when the actor has exactly
 * one valid scope, or a Select to switch between them when they have more
 * than one -- the frontend never invents a scope the backend didn't grant.
 */
export function FinanceScopeSummary({ label, options, selectedId, onChange, emptyLabel }: FinanceScopeSummaryProps) {
  if (options.length === 0) {
    return <span>{emptyLabel}</span>;
  }

  if (options.length === 1) {
    const only = options[0];
    return <span>{only ? `${only.organizationName} — ${only.countryCode}` : emptyLabel}</span>;
  }

  const selectOptions: SelectOption[] = options.map((option) => ({
    id: option.id,
    label: `${option.organizationName} — ${option.countryCode}`,
  }));

  return (
    <Select
      label={label}
      options={selectOptions}
      selectedKey={selectedId ?? undefined}
      onSelectionChange={(key) => {
        const found = options.find((option) => option.id === key);
        if (found) {
          onChange(found);
        }
      }}
    />
  );
}
