"use client";

import { FilterBar, FilterGroup, Select, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceDateRangeFilter } from "@/features/finance-shared/components/finance-date-range-filter";
import { usePathname, useRouter } from "@/i18n/navigation";

import {
  buildFeeAssessmentListSearchParams,
  FEE_ASSESSMENT_COUNTERPARTY_TYPES,
  FEE_ASSESSMENT_STATUSES,
  parseFeeAssessmentListFilters,
  type FeeAssessmentCounterpartyType,
  type FeeAssessmentListFilters,
  type FeeAssessmentStatus,
} from "../server/list-query";

const ALL_OPTION_ID = "__all__";

export interface FeeAssessmentFiltersBarProps {
  statusLabels: Record<FeeAssessmentStatus, string>;
  counterpartyTypeLabels: Record<FeeAssessmentCounterpartyType, string>;
  statusLabel: string;
  counterpartyTypeLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

/** status/counterpartyType/dateFrom/dateTo -- all real, server-supported FinanceConsumerQueryDto fields. */
export function FeeAssessmentFiltersBar(props: FeeAssessmentFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFeeAssessmentListFilters(searchParams);

  function pushFilters(next: Partial<FeeAssessmentListFilters>) {
    const merged: FeeAssessmentListFilters = { ...filters, page: 1, ...next };
    const params = buildFeeAssessmentListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const statusOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: props.allLabel }, ...FEE_ASSESSMENT_STATUSES.map((status) => ({ id: status, label: props.statusLabels[status] }))];
  const counterpartyTypeOptions: SelectOption[] = [
    { id: ALL_OPTION_ID, label: props.allLabel },
    ...FEE_ASSESSMENT_COUNTERPARTY_TYPES.map((type) => ({ id: type, label: props.counterpartyTypeLabels[type] })),
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
            <Select options={statusOptions} selectedKey={filters.status || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ status: key === ALL_OPTION_ID ? "" : (key as FeeAssessmentStatus) })} />
          </FilterGroup>
          <FilterGroup label={props.counterpartyTypeLabel}>
            <Select
              options={counterpartyTypeOptions}
              selectedKey={filters.counterpartyType || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ counterpartyType: key === ALL_OPTION_ID ? "" : (key as FeeAssessmentCounterpartyType) })}
            />
          </FilterGroup>
          <FilterGroup>
            <FinanceDateRangeFilter
              fromLabel={props.dateFromLabel}
              toLabel={props.dateToLabel}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateFromChange={(value) => pushFilters({ dateFrom: value })}
              onDateToChange={(value) => pushFilters({ dateTo: value })}
            />
          </FilterGroup>
        </>
      }
    />
  );
}
