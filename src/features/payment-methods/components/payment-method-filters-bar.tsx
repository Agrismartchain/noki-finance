"use client";

import { FilterBar, FilterGroup, Select, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";

import { buildPaymentMethodListSearchParams, PAYMENT_METHOD_STATUSES, parsePaymentMethodListFilters, type PaymentMethodListFilters, type PaymentMethodStatus } from "../server/list-query";

const ALL_OPTION_ID = "__all__";

export interface PaymentMethodFiltersBarProps {
  statusLabels: Record<PaymentMethodStatus, string>;
  statusLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
}

export function PaymentMethodFiltersBar(props: PaymentMethodFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parsePaymentMethodListFilters(searchParams);

  function pushFilters(next: Partial<PaymentMethodListFilters>) {
    const merged: PaymentMethodListFilters = { ...filters, page: 1, ...next };
    const params = buildPaymentMethodListSearchParams(merged);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const statusOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: props.allLabel }, ...PAYMENT_METHOD_STATUSES.map((status) => ({ id: status, label: props.statusLabels[status] }))];

  return (
    <FilterBar
      clearAllLabel={props.clearAllLabel}
      toggleLabel={props.toggleLabel}
      activeFilterCount={filters.status ? 1 : 0}
      onClearAll={() => router.push(pathname)}
      filters={
        <FilterGroup label={props.statusLabel}>
          <Select options={statusOptions} selectedKey={filters.status || ALL_OPTION_ID} onSelectionChange={(key) => pushFilters({ status: key === ALL_OPTION_ID ? "" : (key as PaymentMethodStatus) })} />
        </FilterGroup>
      }
    />
  );
}
