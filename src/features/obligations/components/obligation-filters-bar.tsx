"use client";

import { FilterBar, FilterGroup, Select, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";

import { buildObligationListSearchParams, OBLIGATION_STATUSES, parseObligationListFilters, type ObligationListFilters, type ObligationStatus } from "../server/list-query";

const ALL_OPTION_ID = "__all__";

export interface ObligationFiltersBarProps {
  statusLabels: Record<ObligationStatus, string>;
  statusLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

export function ObligationFiltersBar(props: ObligationFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseObligationListFilters(searchParams);

  function pushFilters(next: Partial<ObligationListFilters>) {
    const merged: ObligationListFilters = { ...filters, page: 1, ...next };
    const params = buildObligationListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const statusOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: props.allLabel }, ...OBLIGATION_STATUSES.map((status) => ({ id: status, label: props.statusLabels[status] }))];

  return (
    <FilterBar
      clearAllLabel={props.clearAllLabel}
      toggleLabel={props.toggleLabel}
      activeFilterCount={filters.status ? 1 : 0}
      onClearAll={() => router.push(pathname)}
      filters={
        <FilterGroup label={props.statusLabel}>
          <Select options={statusOptions} selectedKey={filters.status || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ status: key === ALL_OPTION_ID ? "" : (key as ObligationStatus) })} />
        </FilterGroup>
      }
    />
  );
}
