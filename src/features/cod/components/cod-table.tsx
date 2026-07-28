"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { codCollectionStatusTone } from "@/features/finance-shared/status-maps";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";

import { buildCodListSearchParams, parseCodListFilters } from "../server/list-query";
import type { AdminFinanceCodCollectionDto } from "../server/client";

export interface CodTableProps {
  items: AdminFinanceCodCollectionDto[];
  total: number;
  locale: Locale;
  columnLabels: {
    orderNumber: string;
    organization: string;
    country: string;
    currency: string;
    expected: string;
    declared: string;
    status: string;
    declaredAt: string;
  };
  statusLabels: Record<string, string>;
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

export function CodTable({
  items,
  total,
  locale,
  columnLabels,
  statusLabels,
  tableAriaLabel,
  emptyTitle,
  emptyDescription,
  pageSizeLabel,
  previousLabel,
  nextLabel,
  paginationAriaLabel,
}: CodTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseCodListFilters(searchParams);

  const columns: DataTableColumn<AdminFinanceCodCollectionDto>[] = [
    {
      accessorKey: "orderNumber",
      header: columnLabels.orderNumber,
      cell: ({ row }) => (
        <Link href={`/cod/${row.original.id}`}>{row.original.orderNumber}</Link>
      ),
    },
    { accessorKey: "organizationName", header: columnLabels.organization },
    { accessorKey: "countryCode", header: columnLabels.country },
    { accessorKey: "currencyCode", header: columnLabels.currency },
    {
      id: "expectedAmount",
      header: columnLabels.expected,
      cell: ({ row }) => <MoneyValue amount={row.original.expectedAmount} currencyCode={row.original.currencyCode} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "collectedAmount",
      header: columnLabels.declared,
      cell: ({ row }) => <MoneyValue amount={row.original.collectedAmount} currencyCode={row.original.currencyCode} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      accessorKey: "status",
      header: columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={statusLabels[row.original.status] ?? row.original.status} tone={codCollectionStatusTone(row.original.status)} />,
    },
    { accessorKey: "declaredAt", header: columnLabels.declaredAt },
  ];

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildCodListSearchParams({ ...filters, page });
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
          const params = buildCodListSearchParams({ ...filters, page: 1, pageSize });
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
