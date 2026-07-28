"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { cashSessionStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import { buildSessionListSearchParams, parseSessionListFilters, type SessionStatus } from "../server/list-query";
import type { CashSessionResponseDto } from "../server/client";

export interface SessionTableProps {
  items: CashSessionResponseDto[];
  total: number;
  locale: Locale;
  currencyCodeById: Record<string, string>;
  statusLabels: Record<SessionStatus, string>;
  columnLabels: {
    reference: string;
    cashier: string;
    currency: string;
    openingAmount: string;
    variance: string;
    status: string;
    openedAt: string;
  };
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

export function SessionTable({
  items,
  total,
  locale,
  currencyCodeById,
  statusLabels,
  columnLabels,
  tableAriaLabel,
  emptyTitle,
  emptyDescription,
  pageSizeLabel,
  previousLabel,
  nextLabel,
  paginationAriaLabel,
}: SessionTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseSessionListFilters(searchParams);

  const columns: DataTableColumn<CashSessionResponseDto>[] = [
    {
      accessorKey: "id",
      header: columnLabels.reference,
      cell: ({ row }) => <Link href={`/cash-sessions/${row.original.id}`}>{row.original.id.slice(0, 8)}</Link>,
    },
    { accessorKey: "cashierActorId", header: columnLabels.cashier, cell: ({ row }) => row.original.cashierActorId.slice(0, 8) },
    { id: "currency", header: columnLabels.currency, cell: ({ row }) => currencyCodeById[row.original.currencyId] ?? row.original.currencyId },
    {
      id: "openingAmount",
      header: columnLabels.openingAmount,
      cell: ({ row }) => <MoneyValue amount={row.original.openingAmount} currencyCode={currencyCodeById[row.original.currencyId]} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "varianceAmount",
      header: columnLabels.variance,
      cell: ({ row }) => <MoneyValue amount={row.original.varianceAmount ? String(row.original.varianceAmount) : undefined} currencyCode={currencyCodeById[row.original.currencyId]} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      accessorKey: "status",
      header: columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={statusLabels[row.original.status as SessionStatus] ?? row.original.status} tone={cashSessionStatusTone(row.original.status)} />,
    },
    { accessorKey: "openedAt", header: columnLabels.openedAt },
  ];

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildSessionListSearchParams({ ...filters, page });
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
          const params = buildSessionListSearchParams({ ...filters, page: 1, pageSize });
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
