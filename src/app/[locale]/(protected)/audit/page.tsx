import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { AuditFiltersBar } from "@/features/audit/components/audit-filters-bar";
import { AuditTable } from "@/features/audit/components/audit-table";
import { searchAudit, type FinanceAuditListResponse } from "@/features/audit/server/client";
import { parseAuditListFilters } from "@/features/audit/server/list-query";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type AuditResult = { status: "ok"; audit: FinanceAuditListResponse } | { status: "no-scope" } | { status: "error"; correlationId?: string };

async function fetchAuditData(
  organizationId: string,
  filters: ReturnType<typeof parseAuditListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<AuditResult> {
  try {
    const audit = await searchAudit(
      {
        organizationId,
        countryCode: filters.countryCode || undefined,
        actorId: filters.actorId || undefined,
        action: filters.action || undefined,
        resourceType: filters.resourceType || undefined,
        resourceId: filters.resourceId || undefined,
        correlationId: filters.correlationId || undefined,
        result: filters.result || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      },
      context,
    );
    return { status: "ok", audit };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function AuditPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.audit.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseAuditListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scopeOptions = resolveCashScopeOptions(session.actor);
  const scope = scopeOptions[0];

  const result = scope ? await fetchAuditData(scope.organizationId, filters, context) : { status: "no-scope" as const };
  const countryCodes = scope ? [...new Set(scopeOptions.filter((option) => option.organizationId === scope.organizationId).map((option) => option.countryCode))] : [];

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.audit")}
        eyebrow={t("audit.list.eyebrow")}
        title={t("audit.list.title")}
        description={t("audit.list.description")}
      />

      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("audit.empty.title")} description={t("audit.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <AuditFiltersBar
            countryCodes={countryCodes}
            labels={{
              actorId: t("audit.filters.actorId"),
              action: t("audit.filters.action"),
              resourceType: t("audit.filters.resourceType"),
              resourceId: t("audit.filters.resourceId"),
              country: t("audit.filters.country"),
              correlationId: t("audit.filters.correlationId"),
              dateFrom: t("audit.filters.dateFrom"),
              dateTo: t("audit.filters.dateTo"),
              resultNotice: t("audit.filters.resultNotice"),
              all: t("common.filters.all"),
              clearAll: t("common.filters.clearAll"),
              toggle: t("common.filters.toggle"),
            }}
          />

          {result.audit.items.length === 0 ? (
            <FinanceEmptyState title={t("audit.empty.title")} description={t("audit.empty.description")} />
          ) : (
            <AuditTable
              items={result.audit.items}
              total={result.audit.total}
              columnLabels={{
                occurredAt: t("audit.columns.occurredAt"),
                actor: t("audit.columns.actor"),
                action: t("audit.columns.action"),
                resourceType: t("audit.columns.resourceType"),
                resourceId: t("audit.columns.resourceId"),
                correlationId: t("audit.columns.correlationId"),
                metadata: t("audit.columns.metadata"),
              }}
              notAvailableLabel={t("cashHandovers.detail.notAvailable")}
              hiddenValueLabel={t("audit.row.hiddenValue")}
              expandLabel={t("audit.row.expand")}
              collapseLabel={t("audit.row.collapse")}
              tableAriaLabel={t("audit.table.ariaLabel")}
              emptyTitle={t("audit.empty.title")}
              emptyDescription={t("audit.empty.description")}
              pageSizeLabel={t("common.pagination.rowsPerPage")}
              previousLabel={t("common.pagination.previous")}
              nextLabel={t("common.pagination.next")}
              paginationAriaLabel={t("common.pagination.ariaLabel")}
            />
          )}
        </>
      )}
    </PageStack>
  );
}
