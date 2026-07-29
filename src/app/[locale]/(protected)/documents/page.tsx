import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { DocumentFiltersBar } from "@/features/documents/components/document-filters-bar";
import { DocumentLookup } from "@/features/documents/components/document-lookup";
import { DocumentTable } from "@/features/documents/components/document-table";
import { listInvoiceDocuments, type DocumentReportResponse } from "@/features/documents/server/client";
import { DOCUMENT_STATUSES, parseDocumentListFilters } from "@/features/documents/server/list-query";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { FinanceNotice } from "@/features/finance-shared/components/finance-notice";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

type InvoiceListResult = { status: "ok"; documents: DocumentReportResponse } | { status: "no-scope" } | { status: "no-permission" } | { status: "error"; correlationId?: string };

/**
 * FinanceConsumerQueryDto accepts organizationId/countryCode directly (no countryId
 * resolution needed, unlike the create form's GenerateFinancialDocumentDto body) --
 * resolveCashScopeOptions already provides both straight from the actor's own session.
 */
async function fetchInvoiceListData(
  canListInvoices: boolean,
  scope: { organizationId: string; countryCode: string } | undefined,
  filters: ReturnType<typeof parseDocumentListFilters>,
  context: { accessToken?: string; locale: string },
): Promise<InvoiceListResult> {
  if (!canListInvoices) {
    return { status: "no-permission" };
  }
  if (!scope) {
    return { status: "no-scope" };
  }
  try {
    const documents = await listInvoiceDocuments(
      {
        organizationId: scope.organizationId,
        countryCode: scope.countryCode,
        status: filters.status || undefined,
        counterpartyType: filters.counterpartyType || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      },
      context,
    );
    return { status: "ok", documents };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

/**
 * The finance-phase2 controller has no list endpoint for documents at all -- only
 * POST create, GET {id}, POST {id}/approve, POST {id}/void exist. This page reuses the
 * real reports endpoint (reportType="invoices") to show INVOICE documents, clearly
 * labeled as invoices rather than "all documents", and offers a bounded ID lookup as
 * the only way to reach a STATEMENT or CREDIT_NOTE.
 */
export default async function DocumentsListPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.document.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseDocumentListFilters(new URLSearchParams(rawSearchParams as Record<string, string>));
  const scopeOptions = resolveCashScopeOptions(session.actor);
  const scope = scopeOptions[0];
  const canListInvoices = hasCapability(session.actor, "finance.report.read");

  const result = await fetchInvoiceListData(canListInvoices, scope, filters, context);
  const statusLabels = Object.fromEntries(DOCUMENT_STATUSES.map((status) => [status, t(`documents.status.${status}`)])) as Record<(typeof DOCUMENT_STATUSES)[number], string>;
  const typeLabels = { INVOICE: t("documents.type.INVOICE"), STATEMENT: t("documents.type.STATEMENT"), CREDIT_NOTE: t("documents.type.CREDIT_NOTE") };

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.documents")}
        eyebrow={t("documents.list.eyebrow")}
        title={t("documents.list.title")}
        description={t("documents.list.description")}
      />

      <FinanceNotice tone="info" message={t("documents.gapNotice")} />

      <DocumentLookup label={t("documents.lookup.label")} buttonLabel={t("documents.lookup.button")} />

      {result.status === "no-permission" ? null : result.status === "no-scope" ? (
        <FinanceEmptyState title={t("documents.empty.title")} description={t("documents.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <>
          <DocumentFiltersBar
            statusLabels={statusLabels}
            statusLabel={t("documents.columns.status")}
            counterpartyTypeLabel={t("documents.create.counterpartyType")}
            dateFromLabel={t("cashHandovers.list.dateFrom")}
            dateToLabel={t("cashHandovers.list.dateTo")}
            allLabel={t("common.filters.all")}
            clearAllLabel={t("common.filters.clearAll")}
            toggleLabel={t("common.filters.toggle")}
          />
          <DocumentTable
            items={result.documents.items}
            total={result.documents.total}
            locale={locale as Locale}
            statusLabels={statusLabels}
            typeLabels={typeLabels}
            columnLabels={{
              documentNumber: t("documents.columns.documentNumber"),
              documentType: t("documents.columns.documentType"),
              counterparty: t("documents.columns.counterparty"),
              period: t("documents.columns.period"),
              currency: t("documents.columns.currency"),
              gross: t("documents.columns.gross"),
              fees: t("documents.columns.fees"),
              expenses: t("documents.columns.expenses"),
              bonuses: t("documents.columns.bonuses"),
              refunds: t("documents.columns.refunds"),
              withholdings: t("documents.columns.withholdings"),
              net: t("documents.columns.net"),
              paid: t("documents.columns.paid"),
              remaining: t("documents.columns.remaining"),
              status: t("documents.columns.status"),
              approvedAt: t("documents.columns.approvedAt"),
            }}
            notAvailableLabel={t("cashHandovers.detail.notAvailable")}
            tableAriaLabel={t("documents.table.ariaLabel")}
            emptyTitle={t("documents.empty.title")}
            emptyDescription={t("documents.empty.description")}
            pageSizeLabel={t("common.pagination.rowsPerPage")}
            previousLabel={t("common.pagination.previous")}
            nextLabel={t("common.pagination.next")}
            paginationAriaLabel={t("common.pagination.ariaLabel")}
          />
        </>
      )}
    </PageStack>
  );
}
