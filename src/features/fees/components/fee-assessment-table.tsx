"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MoneyValue } from "@/features/finance-shared/components/money-value";
import { feeAssessmentStatusTone } from "@/features/finance-shared/status-maps";
import type { Locale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import type { FeeAssessmentReportRow } from "../server/client";
import { buildFeeAssessmentListSearchParams, parseFeeAssessmentListFilters, type FeeAssessmentStatus } from "../server/list-query";

export interface FeeAssessmentTableProps {
  items: FeeAssessmentReportRow[];
  total: number;
  locale: Locale;
  /** Detail links only render when the actor holds finance.fee.read -- the list itself only needs finance.report.read. */
  canReadDetail: boolean;
  statusLabels: Record<FeeAssessmentStatus, string>;
  columnLabels: {
    reference: string;
    obligationId: string;
    type: string;
    amount: string;
    sourceDomain: string;
    counterparty: string;
    status: string;
    effectiveAt: string;
  };
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

export function FeeAssessmentTable(props: FeeAssessmentTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFeeAssessmentListFilters(searchParams);

  const columns: DataTableColumn<FeeAssessmentReportRow>[] = [
    {
      accessorKey: "id",
      header: props.columnLabels.reference,
      cell: ({ row }) => (props.canReadDetail ? <Link href={`/fees/assessments/${row.original.id}`}>{row.original.id.slice(0, 8)}</Link> : row.original.id.slice(0, 8)),
    },
    { id: "obligationId", header: props.columnLabels.obligationId, cell: ({ row }) => row.original.financialObligationId.slice(0, 8) },
    { id: "type", header: props.columnLabels.type, cell: ({ row }) => row.original.type },
    {
      id: "amount",
      header: props.columnLabels.amount,
      cell: ({ row }) => <MoneyValue amount={row.original.amount} currencyCode={row.original.currencyCode} locale={props.locale} />,
      meta: { align: "end", numeric: true },
    },
    { id: "sourceDomain", header: props.columnLabels.sourceDomain, cell: ({ row }) => row.original.sourceDomain },
    { id: "counterparty", header: props.columnLabels.counterparty, cell: ({ row }) => `${row.original.counterpartyType} · ${row.original.counterpartyId.slice(0, 8)}` },
    {
      accessorKey: "status",
      header: props.columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={props.statusLabels[row.original.status as FeeAssessmentStatus] ?? row.original.status} tone={feeAssessmentStatusTone(row.original.status)} />,
    },
    { accessorKey: "effectiveAt", header: props.columnLabels.effectiveAt },
  ];

  const pageCount = Math.max(1, Math.ceil(props.total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildFeeAssessmentListSearchParams({ ...filters, page });
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
          const params = buildFeeAssessmentListSearchParams({ ...filters, page: 1, pageSize });
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
