"use client";

import { FilterBar, FilterGroup, Select, type SelectOption, SearchInput } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

import { buildCodListSearchParams, COD_STATUSES, parseCodListFilters, type CodListFilters } from "../server/list-query";

const SEARCH_DEBOUNCE_MS = 400;

export interface CodFiltersBarProps {
  countries: { id: string; label: string }[];
  currencies: { id: string; label: string }[];
  statusLabels: Record<(typeof COD_STATUSES)[number], string>;
  searchLabel: string;
  statusLabel: string;
  countryLabel: string;
  currencyLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

const ALL_OPTION_ID = "__all__";

export function CodFiltersBar({ countries, currencies, statusLabels, searchLabel, statusLabel, countryLabel, currencyLabel, allLabel, clearAllLabel, toggleLabel }: CodFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseCodListFilters(searchParams);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [syncedSearch, setSyncedSearch] = useState(filters.search);

  // Adjusts local draft state when the URL's own search value changes (e.g. browser
  // back/forward, or "Clear all") without a useEffect -- see the React docs' "adjusting
  // state when a prop changes" pattern.
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search);
    setSearchDraft(filters.search);
  }

  function pushFilters(next: Partial<CodListFilters>) {
    const merged: CodListFilters = { ...filters, page: 1, ...next };
    const params = buildCodListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  useEffect(() => {
    if (searchDraft === filters.search) {
      return;
    }
    const timer = setTimeout(() => pushFilters({ search: searchDraft }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const statusOptions: SelectOption[] = [
    { id: ALL_OPTION_ID, label: allLabel },
    ...COD_STATUSES.map((status) => ({ id: status, label: statusLabels[status] })),
  ];
  const countryOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: allLabel }, ...countries.map((c) => ({ id: c.id, label: c.label }))];
  const currencyOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: allLabel }, ...currencies.map((c) => ({ id: c.id, label: c.label }))];

  const activeFilterCount = [filters.search, filters.status, filters.countryId, filters.currencyId].filter(Boolean).length;

  return (
    <FilterBar
      clearAllLabel={clearAllLabel}
      toggleLabel={toggleLabel}
      activeFilterCount={activeFilterCount}
      onClearAll={() => router.push(pathname)}
      search={<SearchInput label={searchLabel} value={searchDraft} onChange={(value) => setSearchDraft(value)} />}
      filters={
        <>
          <FilterGroup label={statusLabel}>
            <Select
              options={statusOptions}
              selectedKey={filters.status || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ status: key === ALL_OPTION_ID ? "" : (key as (typeof COD_STATUSES)[number]) })}
            />
          </FilterGroup>
          <FilterGroup label={countryLabel}>
            <Select
              options={countryOptions}
              selectedKey={filters.countryId || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ countryId: key === ALL_OPTION_ID ? "" : String(key) })}
            />
          </FilterGroup>
          <FilterGroup label={currencyLabel}>
            <Select
              options={currencyOptions}
              selectedKey={filters.currencyId || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ currencyId: key === ALL_OPTION_ID ? "" : String(key) })}
            />
          </FilterGroup>
        </>
      }
    />
  );
}
