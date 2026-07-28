"use client";

import { useSearchParams } from "next/navigation";

import { CashListFiltersBar } from "@/features/finance-shared/components/cash-list-filters-bar";
import { usePathname, useRouter } from "@/i18n/navigation";

import { buildHandoverListSearchParams, HANDOVER_STATUSES, parseHandoverListFilters, type HandoverListFilters, type HandoverStatus } from "../server/list-query";

export interface HandoverFiltersBarProps {
  currencies: { id: string; label: string }[];
  statusLabels: Record<HandoverStatus, string>;
  currencyLabel: string;
  statusLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

export function HandoverFiltersBar(props: HandoverFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseHandoverListFilters(searchParams);

  function pushFilters(next: Partial<HandoverListFilters>) {
    const merged: HandoverListFilters = { ...filters, page: 1, ...next };
    const params = buildHandoverListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <CashListFiltersBar
      currencies={props.currencies}
      statuses={HANDOVER_STATUSES}
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
