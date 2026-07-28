"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { reconciliationStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import { buildReconciliationListSearchParams, parseReconciliationListFilters, type ReconciliationStatus } from "../server/list-query";
import type { FinancialReconciliationResponseDto } from "../server/client";

export interface ReconciliationTableProps {
  items: FinancialReconciliationResponseDto[];
  total: number;
  locale: Locale;
  statusLabels: Record<ReconciliationStatus, string>;
  columnLabels: {
    reference: string;
    session: string;
    expected: string;
    received: string;
    variance: string;
    status: string;
    createdAt: string;
  };
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

export function ReconciliationTable({
  items,
  total,
  locale,
  statusLabels,
  columnLabels,
  tableAriaLabel,
  emptyTitle,
  emptyDescription,
  pageSizeLabel,
  previousLabel,
  nextLabel,
  paginationAriaLabel,
}: ReconciliationTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseReconciliationListFilters(searchParams);

  const columns: DataTableColumn<FinancialReconciliationResponseDto>[] = [
    {
      accessorKey: "id",
      header: columnLabels.reference,
      cell: ({ row }) => <Link href={`/reconciliations/${row.original.id}`}>{row.original.id.slice(0, 8)}</Link>,
    },
    { accessorKey: "cashSessionId", header: columnLabels.session, cell: ({ row }) => row.original.cashSessionId.slice(0, 8) },
    {
      id: "expectedAmount",
      header: columnLabels.expected,
      cell: ({ row }) => <MoneyValue amount={row.original.expectedAmount} currencyCode={undefined} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "receivedAmount",
      header: columnLabels.received,
      cell: ({ row }) => <MoneyValue amount={row.original.receivedAmount} currencyCode={undefined} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "varianceAmount",
      header: columnLabels.variance,
      cell: ({ row }) => <MoneyValue amount={row.original.varianceAmount} currencyCode={undefined} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      accessorKey: "status",
      header: columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={statusLabels[row.original.status as ReconciliationStatus] ?? row.original.status} tone={reconciliationStatusTone(row.original.status)} />,
    },
    { accessorKey: "createdAt", header: columnLabels.createdAt },
  ];

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildReconciliationListSearchParams({ ...filters, page });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <>
      <DataTable data={items} columns={columns} getRowId={(row) => row.id} aria-label={tableAriaLabel} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
      <Pagination
        page={filters.page}
        pageCount={pageCount}
        onPageChange={goToPage}
        pageSize={filters.pageSize}
        pageSizeOptions={[25, 50, 100]}
        onPageSizeChange={(pageSize) => {
          const params = buildReconciliationListSearchParams({ ...filters, page: 1, pageSize });
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
