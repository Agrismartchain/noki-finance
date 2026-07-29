import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FeeRuleLookup } from "@/features/fees/components/fee-rule-lookup";
import { FeesNotice } from "@/features/fees/components/fees-notice";
import { Link } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

/**
 * There is no GET list endpoint for fee rules (verified: only GET by id and
 * POST exist on FinancePhase2Controller) -- this page is a bounded lookup
 * plus a link to creation, not a table.
 */
export default async function FeeRulesPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.fee_rule.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const canManage = hasCapability(session.actor, "finance.fee_rule.manage");

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.fees")}
        eyebrow={t("fees.rules.list.eyebrow")}
        title={t("fees.rules.list.title")}
        description={t("fees.rules.list.description")}
      />

      <FeesNotice tone="info" message={t("fees.gapNotice")} />

      <FeeRuleLookup labels={{ label: t("fees.rules.lookup.label"), button: t("fees.rules.lookup.button"), notFoundHint: t("fees.rules.lookup.notFoundHint") }} />

      {canManage ? <Link href="/fees/rules/new">{t("fees.rules.create.title")}</Link> : null}
    </PageStack>
  );
}
