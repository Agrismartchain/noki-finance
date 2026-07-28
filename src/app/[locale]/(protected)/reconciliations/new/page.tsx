import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { listSessions } from "@/features/cash-sessions/server/client";
import { ReconciliationCreateForm } from "@/features/reconciliations/components/reconciliation-create-form";
import { FinanceEmptyState } from "@/features/finance-shared/components/finance-empty-state";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import { resolveCashScopeOptions } from "@/features/finance-shared/scope";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

type PageResult = { status: "no-scope" } | { status: "error"; correlationId?: string } | { status: "ok"; closedSessions: { id: string; label: string }[] };

async function fetchPageData(scope: { organizationId: string; countryCode: string } | undefined, context: { accessToken?: string; locale: string }): Promise<PageResult> {
  if (!scope) {
    return { status: "no-scope" };
  }
  try {
    const { items } = await listSessions({ organizationId: scope.organizationId, countryCode: scope.countryCode, status: "CLOSED", limit: 100, offset: 0 }, context);
    return { status: "ok", closedSessions: items.map((session) => ({ id: session.id, label: `${session.id.slice(0, 8)} — ${session.openedAt}` })) };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function ReconciliationCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.reconciliation.create")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const scope = resolveCashScopeOptions(session.actor)[0];
  const result = await fetchPageData(scope, context);

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.reconciliations")}
        eyebrow={t("reconciliations.create.eyebrow")}
        title={t("reconciliations.create.title")}
        description={t("reconciliations.create.description")}
      />
      {result.status === "no-scope" ? (
        <FinanceEmptyState title={t("reconciliations.empty.title")} description={t("reconciliations.empty.noScopeDescription")} />
      ) : result.status === "error" ? (
        <FinanceErrorState title={t("dashboard.states.errorTitle")} description={t("dashboard.states.errorDescription")} correlationId={result.correlationId} correlationLabel={t("mutations.correlationId")} />
      ) : (
        <ReconciliationCreateForm
          closedSessions={result.closedSessions}
          labels={{
            sessionLabel: t("cashHandovers.columns.session"),
            reasonLabel: t("cashHandovers.actions.reasonLabel"),
            submit: t("reconciliations.create.submit"),
            noEligible: t("reconciliations.create.noEligible"),
            validationError: t("reconciliations.create.validationError"),
            genericError: t("mutations.errors.unexpected"),
            correlationLabel: t("mutations.correlationId"),
          }}
        />
      )}
    </PageStack>
  );
}
