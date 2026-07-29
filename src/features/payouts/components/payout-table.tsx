"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { payoutStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import type { PayoutReportRow } from "../server/client";
import { buildPayoutListSearchParams, parsePayoutListFilters, type PayoutStatus } from "../server/list-query";

export interface PayoutTableProps {
  items: PayoutReportRow[];
  total: number;
  locale: Locale;
  statusLabels: Record<PayoutStatus, string>;
  columnLabels: {
    reference: string;
    counterparty: string;
    amount: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

/**
 * Status itself is the approval-stage indicator (e.g. PENDING_FIRST_APPROVAL,
 * PENDING_FINAL_APPROVAL) -- there is no separate server-provided "approval stage" field
 * on the payout report row, so no such column is invented here.
 */
export function PayoutTable(props: PayoutTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parsePayoutListFilters(searchParams);

  const columns: DataTableColumn<PayoutReportRow>[] = [
    {
      accessorKey: "id",
      header: props.columnLabels.reference,
      cell: ({ row }) => <Link href={`/payouts/${row.original.id}`}>{row.original.code ?? row.original.id.slice(0, 8)}</Link>,
    },
    { id: "counterparty", header: props.columnLabels.counterparty, cell: ({ row }) => `${row.original.counterpartyType} · ${row.original.counterpartyId.slice(0, 8)}` },
    {
      id: "amount",
      header: props.columnLabels.amount,
      cell: ({ row }) => <MoneyValue amount={row.original.totalAmount} currencyCode={row.original.currencyCode} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    { id: "paymentMethod", header: props.columnLabels.paymentMethod, cell: ({ row }) => row.original.paymentMethodId.slice(0, 8) },
    {
      accessorKey: "status",
      header: props.columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={props.statusLabels[row.original.status as PayoutStatus] ?? row.original.status} tone={payoutStatusTone(row.original.status)} />,
    },
    { accessorKey: "createdAt", header: props.columnLabels.createdAt },
    { accessorKey: "updatedAt", header: props.columnLabels.updatedAt },
  ];

  const pageCount = Math.max(1, Math.ceil(props.total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildPayoutListSearchParams({ ...filters, page });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <>
      <DataTable data={props.items} columns={columns} getRowId={(row) => row.id} aria-label={props.tableAriaLabel} emptyTitle={props.emptyTitle} emptyDescription={props.emptyDescription} />
      <Pagination
        page={filters.page}
        pageCount={pageCount}
        onPageChange={goToPage}
        pageSize={filters.pageSize}
        pageSizeOptions={[25, 50, 100]}
        onPageSizeChange={(pageSize) => {
          const params = buildPayoutListSearchParams({ ...filters, page: 1, pageSize });
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }}
        pageSizeLabel={props.pageSizeLabel}
        previousLabel={props.previousLabel}
        nextLabel={props.nextLabel}
        aria-label={props.paginationAriaLabel}
      />
    </>
  );
}
