"use client";

import { FilterBar, FilterGroup, Select, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceDateRangeFilter } from "@/features/finance-shared/components/finance-date-range-filter";
import { usePathname, useRouter } from "@/i18n/navigation";

import { PAYOUT_COUNTERPARTY_TYPES, type PayoutCounterpartyType } from "../server/client";
import { buildPayoutListSearchParams, PAYOUT_STATUSES, parsePayoutListFilters, type PayoutListFilters, type PayoutStatus } from "../server/list-query";

const ALL_OPTION_ID = "__all__";

export interface PayoutFiltersBarProps {
  statusLabels: Record<PayoutStatus, string>;
  counterpartyTypeLabels: Record<PayoutCounterpartyType, string>;
  statusLabel: string;
  counterpartyTypeLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

export function PayoutFiltersBar(props: PayoutFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parsePayoutListFilters(searchParams);

  function pushFilters(next: Partial<PayoutListFilters>) {
    const merged: PayoutListFilters = { ...filters, page: 1, ...next };
    const params = buildPayoutListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const statusOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: props.allLabel }, ...PAYOUT_STATUSES.map((status) => ({ id: status, label: props.statusLabels[status] }))];
  const counterpartyTypeOptions: SelectOption[] = [
    { id: ALL_OPTION_ID, label: props.allLabel },
    ...PAYOUT_COUNTERPARTY_TYPES.map((type) => ({ id: type, label: props.counterpartyTypeLabels[type] })),
  ];

  const activeFilterCount = [filters.status, filters.counterpartyType, filters.dateFrom, filters.dateTo].filter(Boolean).length;

  return (
    <FilterBar
      clearAllLabel={props.clearAllLabel}
      toggleLabel={props.toggleLabel}
      activeFilterCount={activeFilterCount}
      onClearAll={() => router.push(pathname)}
      filters={
        <>
          <FilterGroup label={props.statusLabel}>
            <Select options={statusOptions} selectedKey={filters.status || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ status: key === ALL_OPTION_ID ? "" : (key as PayoutStatus) })} />
          </FilterGroup>
          <FilterGroup label={props.counterpartyTypeLabel}>
            <Select
              options={counterpartyTypeOptions}
              selectedKey={filters.counterpartyType || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ counterpartyType: key === ALL_OPTION_ID ? "" : (key as PayoutCounterpartyType) })}
            />
          </FilterGroup>
          <FilterGroup>
            <FinanceDateRangeFilter
              fromLabel={props.dateFromLabel}
              toLabel={props.dateToLabel}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateFromChange={(dateFrom) => pushFilters({ dateFrom })}
              onDateToChange={(dateTo) => pushFilters({ dateTo })}
            />
          </FilterGroup>
        </>
      }
    />
  );
}
