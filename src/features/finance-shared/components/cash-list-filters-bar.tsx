"use client";

import { FilterBar, FilterGroup, Select, type SelectOption } from "@agrismartchain/noki-design-system";

import { FinanceDateRangeFilter } from "./finance-date-range-filter";

const ALL_OPTION_ID = "__all__";

export interface CashListFiltersBarProps<TStatus extends string> {
  currencies: { id: string; label: string }[];
  statuses: readonly TStatus[];
  statusLabels: Record<TStatus, string>;
  currencyId: string;
  status: TStatus | "";
  dateFrom: string;
  dateTo: string;
  onCurrencyChange: (currencyId: string) => void;
  onStatusChange: (status: TStatus | "") => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearAll: () => void;
  currencyLabel: string;
  statusLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

/** Shared currency + status + date-range filter bar for every CashListQueryDto-backed list page. */
export function CashListFiltersBar<TStatus extends string>({
  currencies,
  statuses,
  statusLabels,
  currencyId,
  status,
  dateFrom,
  dateTo,
  onCurrencyChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onClearAll,
  currencyLabel,
  statusLabel,
  dateFromLabel,
  dateToLabel,
  allLabel,
  clearAllLabel,
  toggleLabel,
}: CashListFiltersBarProps<TStatus>) {
  const statusOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: allLabel }, ...statuses.map((s) => ({ id: s, label: statusLabels[s] }))];
  const currencyOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: allLabel }, ...currencies.map((c) => ({ id: c.id, label: c.label }))];
  const activeFilterCount = [currencyId, status, dateFrom, dateTo].filter(Boolean).length;

  return (
    <FilterBar
      clearAllLabel={clearAllLabel}
      toggleLabel={toggleLabel}
      activeFilterCount={activeFilterCount}
      onClearAll={onClearAll}
      filters={
        <>
          <FilterGroup label={statusLabel}>
            <Select options={statusOptions} selectedKey={status || ALL_OPTION_ID} onSelectionChange={(key) => onStatusChange(key === ALL_OPTION_ID ? "" : (key as TStatus))} />
          </FilterGroup>
          <FilterGroup label={currencyLabel}>
            <Select options={currencyOptions} selectedKey={currencyId || ALL_OPTION_ID} onSelectionChange={(key) => onCurrencyChange(key === ALL_OPTION_ID ? "" : String(key))} />
          </FilterGroup>
          <FilterGroup>
            <FinanceDateRangeFilter fromLabel={dateFromLabel} toLabel={dateToLabel} dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={onDateFromChange} onDateToChange={onDateToChange} />
          </FilterGroup>
        </>
      }
    />
  );
}
