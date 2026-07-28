"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { VarianceBadge, type VarianceBadgeLabels } from "@/features/finance-shared/components/variance-badge";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import { buildVarianceListSearchParams, parseVarianceListFilters, type VarianceType } from "../server/list-query";
import type { CashVarianceResponseDto } from "../server/client";

export interface VarianceTableProps {
  items: CashVarianceResponseDto[];
  total: number;
  locale: Locale;
  /** CashVarianceResponseDto has no currencyId field -- amounts are shown without a resolved currency code, an honest reflection of the DTO's own shape. */
  typeLabels: Record<VarianceType, string>;
  varianceBadgeLabels: VarianceBadgeLabels;
  columnLabels: {
    reference: string;
    type: string;
    source: string;
    expected: string;
    actual: string;
    variance: string;
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

export function VarianceTable({
  items,
  total,
  locale,
  typeLabels,
  varianceBadgeLabels,
  columnLabels,
  tableAriaLabel,
  emptyTitle,
  emptyDescription,
  pageSizeLabel,
  previousLabel,
  nextLabel,
  paginationAriaLabel,
}: VarianceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseVarianceListFilters(searchParams);

  const columns: DataTableColumn<CashVarianceResponseDto>[] = [
    {
      accessorKey: "id",
      header: columnLabels.reference,
      cell: ({ row }) => <Link href={`/cash-variances/${row.original.id}`}>{row.original.id.slice(0, 8)}</Link>,
    },
    { accessorKey: "type", header: columnLabels.type, cell: ({ row }) => typeLabels[row.original.type as VarianceType] ?? row.original.type },
    { accessorKey: "sourceReferenceType", header: columnLabels.source },
    {
      id: "expectedAmount",
      header: columnLabels.expected,
      cell: ({ row }) => <MoneyValue amount={row.original.expectedAmount} currencyCode={undefined} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "actualAmount",
      header: columnLabels.actual,
      cell: ({ row }) => <MoneyValue amount={row.original.actualAmount} currencyCode={undefined} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "variance",
      header: columnLabels.variance,
      cell: ({ row }) => <VarianceBadge status={row.original.status} varianceAmount={row.original.varianceAmount} labels={varianceBadgeLabels} />,
    },
    { accessorKey: "createdAt", header: columnLabels.createdAt },
  ];

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildVarianceListSearchParams({ ...filters, page });
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
          const params = buildVarianceListSearchParams({ ...filters, page: 1, pageSize });
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
