"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { cashHandoverStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import { buildHandoverListSearchParams, HANDOVER_STATUSES, parseHandoverListFilters } from "../server/list-query";
import type { CashHandoverResponseDto } from "../server/client";

export interface HandoverTableProps {
  items: CashHandoverResponseDto[];
  total: number;
  locale: Locale;
  currencyCodeById: Record<string, string>;
  statusLabels: Record<(typeof HANDOVER_STATUSES)[number], string>;
  columnLabels: {
    reference: string;
    organization: string;
    session: string;
    currency: string;
    lineCount: string;
    totalHandedOver: string;
    totalReceived: string;
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
  noSessionLabel: string;
}

export function HandoverTable({
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
  noSessionLabel,
}: HandoverTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseHandoverListFilters(searchParams);

  const columns: DataTableColumn<CashHandoverResponseDto>[] = [
    {
      accessorKey: "id",
      header: columnLabels.reference,
      cell: ({ row }) => <Link href={`/cash-handovers/${row.original.id}`}>{row.original.id.slice(0, 8)}</Link>,
    },
    { accessorKey: "organizationId", header: columnLabels.organization },
    {
      id: "cashSessionId",
      header: columnLabels.session,
      cell: ({ row }) => (row.original.cashSessionId ? String(row.original.cashSessionId).slice(0, 8) : noSessionLabel),
    },
    {
      id: "currency",
      header: columnLabels.currency,
      cell: ({ row }) => currencyCodeById[row.original.currencyId] ?? row.original.currencyId,
    },
    { id: "lineCount", header: columnLabels.lineCount, cell: ({ row }) => row.original.items.length },
    {
      id: "totalHandedOverAmount",
      header: columnLabels.totalHandedOver,
      cell: ({ row }) => <MoneyValue amount={row.original.totalHandedOverAmount} currencyCode={currencyCodeById[row.original.currencyId]} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "totalReceivedAmount",
      header: columnLabels.totalReceived,
      cell: ({ row }) => <MoneyValue amount={row.original.totalReceivedAmount} currencyCode={currencyCodeById[row.original.currencyId]} locale={locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      accessorKey: "status",
      header: columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={statusLabels[row.original.status as (typeof HANDOVER_STATUSES)[number]] ?? row.original.status} tone={cashHandoverStatusTone(row.original.status)} />,
    },
    { accessorKey: "createdAt", header: columnLabels.createdAt },
  ];

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildHandoverListSearchParams({ ...filters, page });
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
          const params = buildHandoverListSearchParams({ ...filters, page: 1, pageSize });
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
