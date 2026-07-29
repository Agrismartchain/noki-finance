"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";

import type { FinanceReportRow } from "../server/client";
import { buildReportListSearchParams, isSensitiveKey, parseReportListFilters } from "../server/list-query";

export interface ReportPreviewTableProps {
  items: FinanceReportRow[];
  total: number;
  ariaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * Generic, reportType-agnostic preview: columns are whatever keys the
 * backend's rows actually carry, per the brief -- report shapes vary across
 * the 10 report types and are not individually enumerated here (unlike
 * obligations/payouts' dedicated tables). Any key matching isSensitiveKey
 * is dropped defensively, even though none are currently expected.
 */
export function ReportPreviewTable({ items, total, ariaLabel, emptyTitle, emptyDescription, pageSizeLabel, previousLabel, nextLabel, paginationAriaLabel }: ReportPreviewTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseReportListFilters(searchParams);

  const columnKeys = Array.from(
    items.reduce((keys, row) => {
      for (const key of Object.keys(row)) {
        if (!isSensitiveKey(key)) keys.add(key);
      }
      return keys;
    }, new Set<string>()),
  );

  const columns: DataTableColumn<FinanceReportRow>[] = columnKeys.map((key) => ({
    id: key,
    header: key,
    cell: ({ row }) => formatCellValue(row.original[key]),
  }));

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildReportListSearchParams({ ...filters, page });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <>
      <DataTable data={items} columns={columns} getRowId={(row, index) => (typeof row.id === "string" ? row.id : String(index))} aria-label={ariaLabel} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
      <Pagination
        page={filters.page}
        pageCount={pageCount}
        onPageChange={goToPage}
        pageSize={filters.pageSize}
        pageSizeOptions={[25, 50, 100]}
        onPageSizeChange={(pageSize) => {
          const params = buildReportListSearchParams({ ...filters, page: 1, pageSize });
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }}
        pageSizeLabel={pageSizeLabel}
        previousLabel={previousLabel}
        nextLabel={nextLabel}
        aria-label={paginationAriaLabel}
      />
    </>
  );
}
