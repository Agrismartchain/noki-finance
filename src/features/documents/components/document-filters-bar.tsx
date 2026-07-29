"use client";

import { FilterBar, FilterGroup, Select, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceDateRangeFilter } from "@/features/finance-shared/components/finance-date-range-filter";
import { usePathname, useRouter } from "@/i18n/navigation";

import {
  buildDocumentListSearchParams,
  DOCUMENT_COUNTERPARTY_TYPES,
  DOCUMENT_STATUSES,
  parseDocumentListFilters,
  type DocumentCounterpartyType,
  type DocumentListFilters,
  type DocumentStatus,
} from "../server/list-query";

const ALL_OPTION_ID = "__all__";

export interface DocumentFiltersBarProps {
  statusLabels: Record<DocumentStatus, string>;
  statusLabel: string;
  /**
   * DOCUMENT_COUNTERPARTY_TYPES has no dedicated i18n tree (only documentType has one,
   * via documents.type.*) -- option labels are the raw backend enum values, same
   * undecorated treatment obligation-table.tsx already gives sourceDomain/counterpartyType.
   */
  counterpartyTypeLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

export function DocumentFiltersBar(props: DocumentFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseDocumentListFilters(searchParams);

  function pushFilters(next: Partial<DocumentListFilters>) {
    const merged: DocumentListFilters = { ...filters, page: 1, ...next };
    const params = buildDocumentListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const statusOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: props.allLabel }, ...DOCUMENT_STATUSES.map((status) => ({ id: status, label: props.statusLabels[status] }))];
  const counterpartyTypeOptions: SelectOption[] = [
    { id: ALL_OPTION_ID, label: props.allLabel },
    ...DOCUMENT_COUNTERPARTY_TYPES.map((type) => ({ id: type, label: type })),
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
            <Select options={statusOptions} selectedKey={filters.status || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ status: key === ALL_OPTION_ID ? "" : (key as DocumentStatus) })} />
          </FilterGroup>
          <FilterGroup label={props.counterpartyTypeLabel}>
            <Select
              options={counterpartyTypeOptions}
              selectedKey={filters.counterpartyType || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ counterpartyType: key === ALL_OPTION_ID ? "" : (key as DocumentCounterpartyType) })}
            />
          </FilterGroup>
          <FilterGroup label={`${props.dateFromLabel} – ${props.dateToLabel}`}>
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
