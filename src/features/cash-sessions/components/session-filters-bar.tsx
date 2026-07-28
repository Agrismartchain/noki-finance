"use client";

import { useSearchParams } from "next/navigation";

import { CashListFiltersBar } from "@/features/finance-shared/components/cash-list-filters-bar";
import { usePathname, useRouter } from "@/i18n/navigation";

import { buildSessionListSearchParams, parseSessionListFilters, SESSION_STATUSES, type SessionListFilters, type SessionStatus } from "../server/list-query";

export interface SessionFiltersBarProps {
  currencies: { id: string; label: string }[];
  statusLabels: Record<SessionStatus, string>;
  currencyLabel: string;
  statusLabel: string;
  dateFromLabel: string;
  dateToLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

export function SessionFiltersBar(props: SessionFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseSessionListFilters(searchParams);

  function pushFilters(next: Partial<SessionListFilters>) {
    const merged: SessionListFilters = { ...filters, page: 1, ...next };
    const params = buildSessionListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <CashListFiltersBar
      currencies={props.currencies}
      statuses={SESSION_STATUSES}
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
