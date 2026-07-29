import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { DisputeCreateForm } from "@/features/disputes/components/dispute-create-form";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

/**
 * CreateFinancialDisputeDto carries no scope fields (organizationId/countryId
 * are inferred server-side from the referenced obligation), so unlike most
 * other "new" pages in this app, this page needs no scope resolution --
 * it renders the form directly once the actor is confirmed to hold
 * finance.dispute.manage.
 */
export default async function DisputeCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.dispute.manage")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.disputes")}
        eyebrow={t("disputes.create.eyebrow")}
        title={t("disputes.create.title")}
        description={t("disputes.create.description")}
      />
      <DisputeCreateForm
        labels={{
          obligationId: t("disputes.create.obligationId"),
          reasonCode: t("disputes.create.reasonCode"),
          reason: t("disputes.create.reason"),
          submit: t("disputes.create.submit"),
          holdNotice: t("disputes.create.holdNotice"),
          validationError: t("cashHandovers.create.validationError"),
          genericError: t("mutations.errors.unexpected"),
          correlationLabel: t("mutations.correlationId"),
        }}
      />
    </PageStack>
  );
}
