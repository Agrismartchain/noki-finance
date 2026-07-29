import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FeeAssessmentCreateForm } from "@/features/fees/components/fee-assessment-create-form";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

export default async function FeeAssessmentCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.fee.assess")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.fees")}
        eyebrow={t("fees.assessments.create.eyebrow")}
        title={t("fees.assessments.create.title")}
        description={t("fees.assessments.create.description")}
      />
      <FeeAssessmentCreateForm
        labels={{
          obligationId: t("fees.assessments.create.obligationId"),
          obligationIdRequired: t("fees.assessments.create.obligationIdRequired"),
          type: t("fees.assessments.create.type"),
          serviceCode: t("fees.rules.columns.serviceCode"),
          percentageBase: t("fees.rules.columns.percentageBase"),
          submit: t("fees.assessments.create.submit"),
          genericError: t("mutations.errors.unexpected"),
          correlationLabel: t("mutations.correlationId"),
        }}
      />
    </PageStack>
  );
}
