"use client";

import { useSearchParams } from "next/navigation";

import { CashListFiltersBar } from "@/features/finance-shared/components/cash-list-filters-bar";
import { usePathname, useRouter } from "@/i18n/navigation";

import { buildVarianceListSearchParams, parseVarianceListFilters, VARIANCE_STATUSES, type VarianceListFilters, type VarianceStatus } from "../server/list-query";

export interface VarianceFiltersBarProps {
  currencies: { id: string; label: string }[];
  statusLabels: Record<VarianceStatus, string>;
  currencyLabel: string;
  statusLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

export function VarianceFiltersBar(props: VarianceFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseVarianceListFilters(searchParams);

  function pushFilters(next: Partial<VarianceListFilters>) {
    const merged: VarianceListFilters = { ...filters, page: 1, ...next };
    const params = buildVarianceListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <CashListFiltersBar
      currencies={props.currencies}
      statuses={VARIANCE_STATUSES}
      statusLabels={props.statusLabels}
      currencyId={filters.currencyId}
      status={filters.status}
      dateFrom={filters.dateFrom}
      dateTo={filters.dateTo}
      onCurrencyChange={(currencyId) => pushFilters({ currencyId })}
      onStatusChange={(status) => pushFilters({ status })}
      onDateFromChange={(dateFrom) => pushFilters({ dateFrom })}
      onDateToChange={(dateTo) => pushFilters({ dateTo })}
      onClearAll={() => router.push(pathname)}
      currencyLabel={props.currencyLabel}
      statusLabel={props.statusLabel}
      dateFromLabel={props.dateFromLabel}
      dateToLabel={props.dateToLabel}
      allLabel={props.allLabel}
      clearAllLabel={props.clearAllLabel}
      toggleLabel={props.toggleLabel}
    />
  );
}
