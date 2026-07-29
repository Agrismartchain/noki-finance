"use client";

import { FilterBar, FilterGroup, Input, Select, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceDateRangeFilter } from "@/features/finance-shared/components/finance-date-range-filter";
import { usePathname, useRouter } from "@/i18n/navigation";

import { AUDIT_RESOURCE_TYPE_SUGGESTIONS, buildAuditListSearchParams, parseAuditListFilters, type AuditListFilters } from "../server/list-query";

const ALL_OPTION_ID = "__all__";
const RESOURCE_TYPE_DATALIST_ID = "audit-resource-type-suggestions";

export interface AuditFiltersBarProps {
  countryCodes: string[];
  labels: {
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    country: string;
    correlationId: string;
    dateFrom: string;
    dateTo: string;
    resultNotice: string;
    all: string;
    clearAll: string;
    toggle: string;
  };
}

/** Common filter form for GET /v1/finance/audit (FinanceAuditQueryDto). No search field: audit intentionally exposes only the fields listed in the brief, not the full inherited FinanceConsumerQueryDto. */
export function AuditFiltersBar({ countryCodes, labels }: AuditFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseAuditListFilters(searchParams);

  function pushFilters(next: Partial<AuditListFilters>) {
    const merged: AuditListFilters = { ...filters, page: 1, ...next };
    const params = buildAuditListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const countryOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: labels.all }, ...countryCodes.map((code) => ({ id: code, label: code }))];

  const activeFilterCount = [filters.actorId, filters.action, filters.resourceType, filters.resourceId, filters.countryCode, filters.correlationId, filters.dateFrom, filters.dateTo, filters.result].filter(Boolean).length;

  return (
    <FilterBar
      clearAllLabel={labels.clearAll}
      toggleLabel={labels.toggle}
      activeFilterCount={activeFilterCount}
      onClearAll={() => router.push(pathname)}
      filters={
        <>
          <FilterGroup label={labels.actorId}>
            <Input aria-label={labels.actorId} value={filters.actorId} onChange={(event) => pushFilters({ actorId: event.target.value })} />
          </FilterGroup>
          <FilterGroup label={labels.action}>
            <Input aria-label={labels.action} value={filters.action} onChange={(event) => pushFilters({ action: event.target.value })} />
          </FilterGroup>
          <FilterGroup label={labels.resourceType}>
            <Input aria-label={labels.resourceType} value={filters.resourceType} onChange={(event) => pushFilters({ resourceType: event.target.value })} list={RESOURCE_TYPE_DATALIST_ID} />
            <datalist id={RESOURCE_TYPE_DATALIST_ID}>
              {AUDIT_RESOURCE_TYPE_SUGGESTIONS.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </FilterGroup>
          <FilterGroup label={labels.resourceId}>
            <Input aria-label={labels.resourceId} value={filters.resourceId} onChange={(event) => pushFilters({ resourceId: event.target.value })} />
          </FilterGroup>
          <FilterGroup label={labels.country}>
            <Select options={countryOptions} selectedKey={filters.countryCode || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ countryCode: key === ALL_OPTION_ID ? "" : String(key) })} />
          </FilterGroup>
          <FilterGroup label={labels.correlationId}>
            <Input aria-label={labels.correlationId} value={filters.correlationId} onChange={(event) => pushFilters({ correlationId: event.target.value })} />
          </FilterGroup>
          <FilterGroup>
            <FinanceDateRangeFilter fromLabel={labels.dateFrom} toLabel={labels.dateTo} dateFrom={filters.dateFrom} dateTo={filters.dateTo} onDateFromChange={(value) => pushFilters({ dateFrom: value })} onDateToChange={(value) => pushFilters({ dateTo: value })} />
          </FilterGroup>
          {/* Label doubles as the disclaimer: `result` is accepted by the DTO but currently has no effect on filtering server-side (verified). */}
          <FilterGroup label={labels.resultNotice}>
            <Input aria-label={labels.resultNotice} value={filters.result} onChange={(event) => pushFilters({ result: event.target.value })} />
          </FilterGroup>
        </>
      }
    />
  );
}
