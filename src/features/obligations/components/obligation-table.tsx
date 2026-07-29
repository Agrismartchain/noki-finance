"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { obligationStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import type { FinancialObligationDto } from "../server/client";
import { buildObligationListSearchParams, parseObligationListFilters, type ObligationStatus } from "../server/list-query";

export interface ObligationTableProps {
  items: FinancialObligationDto[];
  total: number;
  locale: Locale;
  statusLabels: Record<ObligationStatus, string>;
  columnLabels: {
    reference: string;
    nature: string;
    direction: string;
    counterparty: string;
    source: string;
    original: string;
    allocated: string;
    settled: string;
    remaining: string;
    status: string;
    effectiveAt: string;
    dueAt: string;
    hold: string;
  };
  natureLabels: Record<string, string>;
  directionLabels: Record<string, string>;
  holdLabel: string;
  noHoldLabel: string;
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

export function ObligationTable(props: ObligationTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseObligationListFilters(searchParams);

  const columns: DataTableColumn<FinancialObligationDto>[] = [
    {
      accessorKey: "id",
      header: props.columnLabels.reference,
      cell: ({ row }) => <Link href={`/obligations/${row.original.id}`}>{row.original.id.slice(0, 8)}</Link>,
    },
    { id: "nature", header: props.columnLabels.nature, cell: ({ row }) => props.natureLabels[row.original.nature] ?? row.original.nature },
    { id: "direction", header: props.columnLabels.direction, cell: ({ row }) => props.directionLabels[row.original.direction] ?? row.original.direction },
    { id: "counterparty", header: props.columnLabels.counterparty, cell: ({ row }) => `${row.original.counterpartyType} · ${row.original.counterpartyId.slice(0, 8)}` },
    { id: "source", header: props.columnLabels.source, cell: ({ row }) => row.original.sourceDomain },
    {
      id: "originalAmount",
      header: props.columnLabels.original,
      cell: ({ row }) => <MoneyValue amount={row.original.originalAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "allocatedAmount",
      header: props.columnLabels.allocated,
      cell: ({ row }) => <MoneyValue amount={row.original.allocatedAmount} currencyCode={row.original.currency} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    {
      id: "settledAmount",
      header: props.columnLabels.settled,
      cell: ({ row }) => <MoneyValue amount={row.original.settledAmount} currencyCode={row.original.currency} locale={props.locale} />,
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
      cell: ({ row }) => <FinanceStatusBadge label={props.statusLabels[row.original.status as ObligationStatus] ?? row.original.status} tone={obligationStatusTone(row.original.status)} />,
    },
    { accessorKey: "effectiveAt", header: props.columnLabels.effectiveAt },
    { id: "dueAt", header: props.columnLabels.dueAt, cell: ({ row }) => row.original.dueAt ?? "—" },
    { id: "hold", header: props.columnLabels.hold, cell: ({ row }) => (row.original.holdReason ? props.holdLabel : props.noHoldLabel) },
  ];

  const pageCount = Math.max(1, Math.ceil(props.total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildObligationListSearchParams({ ...filters, page });
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
          const params = buildObligationListSearchParams({ ...filters, page: 1, pageSize });
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
