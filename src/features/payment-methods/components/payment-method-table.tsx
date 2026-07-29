"use client";

import { DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";

import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { MaskedDestination } from "@/features/finance-shared/components/masked-destination";
import { paymentMethodStatusTone } from "@/features/finance-shared/status-maps";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

import type { PaymentMethodDto } from "../server/client";
import { buildPaymentMethodListSearchParams, parsePaymentMethodListFilters, type PaymentMethodStatus } from "../server/list-query";

export interface PaymentMethodTableProps {
  items: PaymentMethodDto[];
  total: number;
  statusLabels: Record<PaymentMethodStatus, string>;
  typeLabels: Record<PaymentMethodDto["type"], string>;
  columnLabels: {
    type: string;
    provider: string;
    label: string;
    destination: string;
    status: string;
    version: string;
    counterparty: string;
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

/**
 * "New version visible without overwriting old" (spec requirement): there is
 * no dedicated versions-list endpoint -- creating another payment method for
 * the same counterpartyId simply produces a new record, and since nothing is
 * ever deleted, this table naturally shows every version once counterpartyId
 * and version are both columns.
 */
export function PaymentMethodTable(props: PaymentMethodTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parsePaymentMethodListFilters(searchParams);

  const columns: DataTableColumn<PaymentMethodDto>[] = [
    {
      accessorKey: "id",
      header: props.columnLabels.label,
      cell: ({ row }) => <Link href={`/payment-methods/${row.original.id}`}>{row.original.displayLabel}</Link>,
    },
    { id: "type", header: props.columnLabels.type, cell: ({ row }) => props.typeLabels[row.original.type] ?? row.original.type },
    { accessorKey: "providerCode", header: props.columnLabels.provider },
    {
      id: "destinationMasked",
      header: props.columnLabels.destination,
      cell: ({ row }) => <MaskedDestination maskedValue={row.original.destinationMasked} />,
    },
    {
      accessorKey: "status",
      header: props.columnLabels.status,
      cell: ({ row }) => <FinanceStatusBadge label={props.statusLabels[row.original.status]} tone={paymentMethodStatusTone(row.original.status)} />,
    },
    { accessorKey: "version", header: props.columnLabels.version },
    { id: "counterparty", header: props.columnLabels.counterparty, cell: ({ row }) => `${row.original.counterpartyType} · ${row.original.counterpartyId.slice(0, 8)}` },
    { accessorKey: "createdAt", header: props.columnLabels.createdAt },
  ];

  const pageCount = Math.max(1, Math.ceil(props.total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildPaymentMethodListSearchParams({ ...filters, page });
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
          const params = buildPaymentMethodListSearchParams({ ...filters, page: 1, pageSize });
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
