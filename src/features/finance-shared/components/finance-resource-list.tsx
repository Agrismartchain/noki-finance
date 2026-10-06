"use client";

import { DataTable, FilterBar, FilterGroup, Pagination, Select, type DataTableColumn, type SelectOption } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

import { buildResourceListSearchParams, parseResourceListFilters } from "../server/resource-list";

const ALL_OPTION_ID = "__all__";

/** One already-resolved table row: cells are rendered nodes, so the page keeps all labels/links server-side. */
export interface FinanceResourceRow {
  id: string;
  cells: Record<string, ReactNode>;
}

export interface FinanceResourceListProps {
  rows: FinanceResourceRow[];
  total: number;
  columns: { key: string; label: string }[];
  statuses: { value: string; label: string }[];
  statusLabel: string;
  allLabel: string;
  clearAllLabel: string;
  toggleLabel: string;
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

export function FinanceResourceList(props: FinanceResourceListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseResourceListFilters(searchParams, props.statuses.map((status) => status.value));

  function push(next: Partial<typeof filters>) {
    const query = buildResourceListSearchParams({ ...filters, ...next }).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const columns: DataTableColumn<FinanceResourceRow>[] = props.columns.map((column) => ({
    id: column.key,
    header: column.label,
    cell: ({ row }) => row.original.cells[column.key] ?? "—",
  }));
  const statusOptions: SelectOption[] = [{ id: ALL_OPTION_ID, label: props.allLabel }, ...props.statuses.map((status) => ({ id: status.value, label: status.label }))];
  const pageCount = Math.max(1, Math.ceil(props.total / filters.pageSize));

  return (
    <>
      <FilterBar
        clearAllLabel={props.clearAllLabel}
        toggleLabel={props.toggleLabel}
        activeFilterCount={filters.status ? 1 : 0}
        onClearAll={() => router.push(pathname)}
        filters={
          <FilterGroup label={props.statusLabel}>
            <Select options={statusOptions} selectedKey={filters.status || ALL_OPTION_ID} onSelectionChange={(key) => push({ status: key === ALL_OPTION_ID ? "" : String(key), page: 1 })} />
          </FilterGroup>
        }
      />
      <DataTable data={props.rows} columns={columns} getRowId={(row) => row.id} aria-label={props.tableAriaLabel} emptyTitle={props.emptyTitle} emptyDescription={props.emptyDescription} />
      <Pagination
        page={filters.page}
        pageCount={pageCount}
        onPageChange={(page) => push({ page })}
        pageSize={filters.pageSize}
        pageSizeOptions={[25, 50, 100]}
        onPageSizeChange={(pageSize) => push({ pageSize, page: 1 })}
        pageSizeLabel={props.pageSizeLabel}
        previousLabel={props.previousLabel}
        nextLabel={props.nextLabel}
        aria-label={props.paginationAriaLabel}
      />
    </>
  );
}
