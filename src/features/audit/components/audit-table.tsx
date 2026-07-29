"use client";

import { Button, DataTable, Pagination, type DataTableColumn } from "@agrismartchain/noki-design-system";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

import type { FinanceAuditEntryDto } from "../server/client";
import { buildAuditListSearchParams, isSensitiveKey, parseAuditListFilters } from "../server/list-query";

const METADATA_PREVIEW_LENGTH = 80;

export interface AuditTableProps {
  items: FinanceAuditEntryDto[];
  total: number;
  columnLabels: {
    occurredAt: string;
    actor: string;
    action: string;
    resourceType: string;
    resourceId: string;
    correlationId: string;
    metadata: string;
  };
  notAvailableLabel: string;
  hiddenValueLabel: string;
  expandLabel: string;
  collapseLabel: string;
  tableAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  pageSizeLabel: string;
  previousLabel: string;
  nextLabel: string;
  paginationAriaLabel: string;
}

/**
 * Hides any metadata key matching isSensitiveKey (defense-in-depth; none
 * are currently expected to appear -- see FinanceAuditEntryDto's
 * verification notes in ../server/client.ts), rendering the key name with
 * a placeholder instead of its value.
 */
function sanitizeMetadata(metadata: Record<string, unknown> | null, hiddenValueLabel: string): Record<string, unknown> {
  if (!metadata) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    result[key] = isSensitiveKey(key) ? hiddenValueLabel : value;
  }
  return result;
}

/**
 * No dedicated `/audit/{id}` endpoint exists, so "detail" for an entry is
 * in-page: a metadata column that truncates its JSON preview and expands
 * on click via local `expandedIds` state, rather than a separate route or
 * a DataTable sub-row feature (the design system's DataTable has no
 * expandable-row API to hook into).
 */
export function AuditTable({
  items,
  total,
  columnLabels,
  notAvailableLabel,
  hiddenValueLabel,
  expandLabel,
  collapseLabel,
  tableAriaLabel,
  emptyTitle,
  emptyDescription,
  pageSizeLabel,
  previousLabel,
  nextLabel,
  paginationAriaLabel,
}: AuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseAuditListFilters(searchParams);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const columns: DataTableColumn<FinanceAuditEntryDto>[] = [
    { accessorKey: "occurredAt", header: columnLabels.occurredAt },
    { id: "actor", header: columnLabels.actor, cell: ({ row }) => row.original.actorId ?? notAvailableLabel },
    { accessorKey: "action", header: columnLabels.action },
    { accessorKey: "resourceType", header: columnLabels.resourceType },
    { id: "resourceId", header: columnLabels.resourceId, cell: ({ row }) => row.original.resourceId ?? notAvailableLabel },
    { id: "correlationId", header: columnLabels.correlationId, cell: ({ row }) => row.original.correlationId ?? notAvailableLabel },
    {
      id: "metadata",
      header: columnLabels.metadata,
      cell: ({ row }) => {
        const sanitized = sanitizeMetadata(row.original.metadata, hiddenValueLabel);
        if (Object.keys(sanitized).length === 0) {
          return notAvailableLabel;
        }
        const isExpanded = expandedIds.has(row.original.id);
        const json = JSON.stringify(sanitized);
        const preview = json.length > METADATA_PREVIEW_LENGTH ? `${json.slice(0, METADATA_PREVIEW_LENGTH)}…` : json;
        return (
          <>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{isExpanded ? JSON.stringify(sanitized, null, 2) : preview}</pre>
            {json.length > METADATA_PREVIEW_LENGTH ? (
              <Button variant="ghost" size="sm" onClick={() => toggleExpanded(row.original.id)}>
                {isExpanded ? collapseLabel : expandLabel}
              </Button>
            ) : null}
          </>
        );
      },
    },
  ];

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  function goToPage(page: number) {
    const params = buildAuditListSearchParams({ ...filters, page });
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
          const params = buildAuditListSearchParams({ ...filters, page: 1, pageSize });
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
