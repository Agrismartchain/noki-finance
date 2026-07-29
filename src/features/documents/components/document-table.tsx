"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { documentStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import type { DocumentReportRow } from "../server/client";
import { buildDocumentListSearchParams, parseDocumentListFilters, type DocumentStatus } from "../server/list-query";

export interface DocumentTableProps {
  items: DocumentReportRow[];
  total: number;
  locale: Locale;
  statusLabels: Record<DocumentStatus, string>;
  typeLabels: Record<string, string>;
  columnLabels: {
    documentNumber: string;
    documentType: string;
    counterparty: string;
    period: string;
    currency: string;
    gross: string;
    fees: string;
    expenses: string;
    bonuses: string;
    refunds: string;
    withholdings: string;
    net: string;
    paid: string;
    remaining: string;
    status: string;
    approvedAt: string;
  };
  notAvailableLabel: string;
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

export function DocumentTable(props: DocumentTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseDocumentListFilters(searchParams);

  const columns: DataTableColumn<DocumentReportRow>[] = [
    { id: "documentNumber", header: props.columnLabels.documentNumber, cell: ({ row }) => <Link href={`/documents/${row.original.id}`}>{row.original.documentNumber}</Link> },
    { id: "documentType", header: props.columnLabels.documentType, cell: ({ row }) => props.typeLabels[row.original.documentType] ?? row.original.documentType },
    { id: "counterparty", header: props.columnLabels.counterparty, cell: ({ row }) => `${row.original.counterpartyType} · ${row.original.counterpartyId.slice(0, 8)}` },
    { id: "period", header: props.columnLabels.period, cell: ({ row }) => `${row.original.periodStart} → ${row.original.periodEnd}` },
    { accessorKey: "currency", header: props.columnLabels.currency },
    {
      id: "grossAmount",
      header: props.columnLabels.gross,
      cell: ({ row }) => <MoneyValue amount={row.original.grossAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "feeAmount",
      header: props.columnLabels.fees,
      cell: ({ row }) => <MoneyValue amount={row.original.feeAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "expenseAmount",
      header: props.columnLabels.expenses,
      cell: ({ row }) => <MoneyValue amount={row.original.expenseAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "bonusAmount",
      header: props.columnLabels.bonuses,
      cell: ({ row }) => <MoneyValue amount={row.original.bonusAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "refundAmount",
      header: props.columnLabels.refunds,
      cell: ({ row }) => <MoneyValue amount={row.original.refundAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "withholdingAmount",
      header: props.columnLabels.withholdings,
      cell: ({ row }) => <MoneyValue amount={row.original.withholdingAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "netAmount",
      header: props.columnLabels.net,
      cell: ({ row }) => <MoneyValue amount={row.original.netAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "paidAmount",
      header: props.columnLabels.paid,
      cell: ({ row }) => <MoneyValue amount={row.original.paidAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "remainingAmount",
      header: props.columnLabels.remaining,
      cell: ({ row }) => <MoneyValue amount={row.original.remainingAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      accessorKey: "status",
      header: props.columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={props.statusLabels[row.original.status as DocumentStatus] ?? row.original.status} tone={documentStatusTone(row.original.status)} />,
    },
    { id: "approvedAt", header: props.columnLabels.approvedAt, cell: ({ row }) => row.original.approvedAt ?? props.notAvailableLabel },
  ];

  const pageCount = Math.max(1, Math.ceil(props.total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildDocumentListSearchParams({ ...filters, page });
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
          const params = buildDocumentListSearchParams({ ...filters, page: 1, pageSize });
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
