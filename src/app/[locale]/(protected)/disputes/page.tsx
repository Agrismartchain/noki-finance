import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { DisputeLookup } from "@/features/disputes/components/dispute-lookup";
import { Link } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

/**
 * Disputes have no list or report endpoint (verified against
 * finance-phase2.controller.ts) -- a dispute is only reachable by a known
 * id. This page documents that gap with an Alert (same "gap documented, not
 * faked" pattern as obligations' gapNotice) and offers only an id lookup
 * plus a link to create a new dispute.
 */
export default async function DisputesPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.dispute.read")) {
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
        eyebrow={t("disputes.list.eyebrow")}
        title={t("disputes.list.title")}
        description={t("disputes.list.description")}
      />

      {hasCapability(session.actor, "finance.dispute.manage") ? <Link href="/disputes/new">{t("disputes.create.title")}</Link> : null}

      <DisputeLookup
        labels={{
          label: t("disputes.lookup.label"),
          button: t("disputes.lookup.button"),
          notFoundHint: t("disputes.lookup.notFoundHint"),
          gapNotice: t("disputes.gapNotice"),
        }}
      />
    </PageStack>
  );
}
