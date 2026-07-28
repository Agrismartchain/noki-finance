import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { CodDetailView } from "@/features/cod/components/cod-detail-view";
import { getCodCollection, listCurrencies, type CodCollectionResponseDto } from "@/features/cod/server/client";
import { FinanceErrorState } from "@/features/finance-shared/components/finance-error-state";
import type { Locale } from "@/i18n/locales";
import { NokiApiError } from "@/lib/api/errors";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

type CodDetailResult =
  | { status: "ok"; collection: CodCollectionResponseDto; currencyCode: string | undefined }
  | { status: "error"; correlationId?: string };

async function fetchCodDetailData(id: string, context: { accessToken?: string; locale: string }): Promise<CodDetailResult> {
  try {
    const [collection, currencies] = await Promise.all([getCodCollection(id, context), listCurrencies(context)]);
    const currencyCode = currencies.find((currency) => currency.id === collection.currencyId)?.code;
    return { status: "ok", collection, currencyCode };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}

export default async function CodDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.cod.read")) {
    return <ForbiddenView />;
  }

  const context = { accessToken, locale };
  const t = await getTranslations();
  const result = await fetchCodDetailData(id, context);

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.cod")}
        eyebrow={t("cod.detail.eyebrow")}
        title={t("cod.detail.title")}
        description={t("cod.detail.description")}
      />
      {result.status === "error" ? (
        <FinanceErrorState
          title={t("dashboard.states.errorTitle")}
          description={t("dashboard.states.errorDescription")}
          correlationId={result.correlationId}
          correlationLabel={t("mutations.correlationId")}
        />
      ) : (
        <CodDetailView
          collection={result.collection}
          currencyCode={result.currencyCode}
          locale={locale as Locale}
          statusLabel={t(`cod.status.${result.collection.status}`)}
          labels={{
            orderId: t("cod.detail.orderId"),
            organizationId: t("cod.detail.organizationId"),
            countryId: t("cod.detail.countryId"),
            status: t("cod.columns.status"),
            declaredAt: t("cod.columns.declaredAt"),
            cycleTitle: t("cod.detail.cycleTitle"),
            stepExpected: t("cod.detail.stepExpected"),
            stepDeclared: t("cod.detail.stepDeclared"),
            stepHandedOver: t("cod.detail.stepHandedOver"),
            stepReceived: t("cod.detail.stepReceived"),
            stepReconciled: t("cod.detail.stepReconciled"),
            unresolvedStep: t("cod.detail.unresolvedStep"),
            reachedNoAmount: t("cod.detail.reachedNoAmount"),
          }}
        />
      )}
    </PageStack>
  );
}
