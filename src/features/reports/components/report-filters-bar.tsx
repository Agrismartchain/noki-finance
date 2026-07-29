"use client";

import { FilterBar, FilterGroup, Input, SearchInput, Select, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FinanceDateRangeFilter } from "@/features/finance-shared/components/finance-date-range-filter";
import { usePathname, useRouter } from "@/i18n/navigation";

import { buildReportListSearchParams, parseReportListFilters, REPORT_COUNTERPARTY_TYPES, REPORT_SOURCE_DOMAINS, type ReportListFilters } from "../server/list-query";

const ALL_OPTION_ID = "__all__";
const SEARCH_DEBOUNCE_MS = 400;

export interface ReportFiltersBarProps {
  countryCodes: string[];
  currencies: { id: string; label: string }[];
  labels: {
    country: string;
    currency: string;
    status: string;
    counterpartyType: string;
    sourceDomain: string;
    dateFrom: string;
    dateTo: string;
    search: string;
    all: string;
    clearAll: string;
    toggle: string;
  };
}

/** Common filter form shared by every report type (FinanceConsumerQueryDto's optional fields), URL-reflected alongside the selected `?report=` type. */
export function ReportFiltersBar({ countryCodes, currencies, labels }: ReportFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseReportListFilters(searchParams);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [syncedSearch, setSyncedSearch] = useState(filters.search);

  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search);
    setSearchDraft(filters.search);
  }

  function pushFilters(next: Partial<ReportListFilters>) {
    const merged: ReportListFilters = { ...filters, page: 1, ...next };
    const params = buildReportListSearchParams(merged);
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

  const countryOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: labels.all }, ...countryCodes.map((code) => ({ id: code, label: code }))];
  const currencyOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: labels.all }, ...currencies.map((c) => ({ id: c.id, label: c.label }))];
  const counterpartyTypeOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: labels.all }, ...REPORT_COUNTERPARTY_TYPES.map((value) => ({ id: value, label: value }))];
  const sourceDomainOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: labels.all }, ...REPORT_SOURCE_DOMAINS.map((value) => ({ id: value, label: value }))];

  const activeFilterCount = [filters.countryCode, filters.currencyId, filters.status, filters.counterpartyType, filters.counterpartyId, filters.sourceDomain, filters.dateFrom, filters.dateTo, filters.search].filter(Boolean).length;

  return (
    <FilterBar
      clearAllLabel={labels.clearAll}
      toggleLabel={labels.toggle}
      activeFilterCount={activeFilterCount}
      onClearAll={() => router.push(pathname + (filters.reportType ? `?report=${filters.reportType}` : ""))}
      search={<SearchInput label={labels.search} value={searchDraft} onChange={(value) => setSearchDraft(value)} />}
      filters={
        <>
          <FilterGroup label={labels.country}>
            <Select options={countryOptions} selectedKey={filters.countryCode || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ countryCode: key === ALL_OPTION_ID ? "" : String(key) })} />
          </FilterGroup>
          <FilterGroup label={labels.currency}>
            <Select options={currencyOptions} selectedKey={filters.currencyId || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ currencyId: key === ALL_OPTION_ID ? "" : String(key) })} />
          </FilterGroup>
          <FilterGroup label={labels.status}>
            <Input aria-label={labels.status} value={filters.status} onChange={(event) => pushFilters({ status: event.target.value })} />
          </FilterGroup>
          <FilterGroup label={labels.counterpartyType}>
            <Select
              options={counterpartyTypeOptions}
              selectedKey={filters.counterpartyType || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ counterpartyType: key === ALL_OPTION_ID ? "" : (key as ReportListFilters["counterpartyType"]) })}
            />
          </FilterGroup>
          <FilterGroup label={labels.sourceDomain}>
            <Select
              options={sourceDomainOptions}
              selectedKey={filters.sourceDomain || ALL_OPTION_ID}
              onSelectionChange={(key) => pushFilters({ sourceDomain: key === ALL_OPTION_ID ? "" : (key as ReportListFilters["sourceDomain"]) })}
            />
          </FilterGroup>
          <FilterGroup>
            <FinanceDateRangeFilter fromLabel={labels.dateFrom} toLabel={labels.dateTo} dateFrom={filters.dateFrom} dateTo={filters.dateTo} onDateFromChange={(value) => pushFilters({ dateFrom: value })} onDateToChange={(value) => pushFilters({ dateTo: value })} />
          </FilterGroup>
        </>
      }
    />
  );
}
