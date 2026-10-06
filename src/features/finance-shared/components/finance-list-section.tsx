import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { ResourceListResult } from "@/features/finance-shared/server/resource-list";

import { FinanceResourceList, type FinanceResourceRow } from "./finance-resource-list";

export interface FinanceListSectionProps<T> {
  result: ResourceListResult<T>;
  toRow: (item: T) => FinanceResourceRow;
  /** next-intl namespace of the resource, e.g. "disputes" -- must define list.table / list.columns / list.empty. */
  namespace: string;
  columnKeys: string[];
  statuses: { value: string; label: string }[];
}

/** Server-side wrapper shared by the Finance fee-rule, adjustment and dispute lists: scope/error states plus the filter+table. */
export async function FinanceListSection<T>({ result, toRow, namespace, columnKeys, statuses }: FinanceListSectionProps<T>): Promise<ReactNode> {
  const t = await getTranslations();

  if (result.status === "no-scope") {
    return <FinanceEmptyState title={t(`${namespace}.list.empty.title`)} description={t("finance.list.noScopeDescription")} />;
  }
  if (result.status === "error") {
    return <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />;
  }

  return (
    <FinanceResourceList
      rows={result.items.map(toRow)}
      total={result.total}
      columns={columnKeys.map((key) => ({ key, label: t(`${namespace}.list.columns.${key}`) }))}
      statuses={statuses}
      statusLabel={t(`${namespace}.list.columns.status`)}
      allLabel={t("common.filters.all")}
      clearAllLabel={t("common.filters.clearAll")}
      toggleLabel={t("common.filters.toggle")}
      tableAriaLabel={t(`${namespace}.list.table.ariaLabel`)}
      emptyTitle={t(`${namespace}.list.empty.title`)}
      emptyDescription={t(`${namespace}.list.empty.description`)}
      pageSizeLabel={t("common.pagination.rowsPerPage")}
      previousLabel={t("common.pagination.previous")}
      nextLabel={t("common.pagination.next")}
      paginationAriaLabel={t("common.pagination.ariaLabel")}
    />
  );
}
