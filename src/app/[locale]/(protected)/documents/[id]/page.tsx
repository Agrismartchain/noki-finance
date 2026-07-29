import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { DocumentDetailView } from "@/features/documents/components/document-detail-view";
import { getDocument, type FinancialDocumentDto } from "@/features/documents/server/client";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string; id: string }> };

type DetailResult = { status: "ok"; document: FinancialDocumentDto } | { status: "error"; correlationId?: string };

async function fetchDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<DetailResult> {
  try {
    const document = await getDocument(id, context);
    return { status: "ok", document };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.document.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const result = await fetchDetailData(id, context);

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.documents")}
        eyebrow={t("documents.detail.eyebrow")}
        title={t("documents.detail.title")}
        description={t("documents.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <DocumentDetailView
          document={result.document}
          locale={locale as Locale}
          canApprove={hasCapability(session.actor, "finance.document.approve")}
          canVoid={hasCapability(session.actor, "finance.document.void")}
          approveLabels={{
            approve: t("documents.actions.approve"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
          voidLabels={{
            void: t("documents.actions.void"),
            voidReasonLabel: t("documents.actions.voidReasonLabel"),
            voidReasonRequired: t("documents.actions.voidReasonRequired"),
            confirm: t("documents.actions.confirm"),
            dismiss: t("documents.actions.dismiss"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
          labels={{
            summaryTitle: t("documents.detail.summaryTitle"),
            linesTitle: t("documents.detail.linesTitle"),
            statusLabel: t("documents.columns.status"),
            documentType: t("documents.columns.documentType"),
            typeLabels: { INVOICE: t("documents.type.INVOICE"), STATEMENT: t("documents.type.STATEMENT"), CREDIT_NOTE: t("documents.type.CREDIT_NOTE") },
            statementNotice: t("documents.statementNotice"),
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
            voidReason: t("documents.detail.voidReason"),
            voidedAt: t("documents.detail.voidedAt"),
            approvedAt: t("documents.columns.approvedAt"),
            notAvailable: t("cashHandovers.detail.notAvailable"),
            version: t("obligations.detail.version"),
            lineAmount: t("documents.columns.net"),
            noLines: t("documents.empty.description"),
          }}
        />
      )}
    </PageStack>
  );
}
