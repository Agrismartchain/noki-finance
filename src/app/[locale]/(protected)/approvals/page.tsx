import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack } from "@/components/layout/page-shell";
import { ComingSoonView } from "@/features/finance-shared/components/coming-soon-view";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasAnyCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = { params: Promise<{ locale: string }> };

export default async function ApprovalsPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasAnyCapability(session.actor, ["finance.payout.first_approve", "finance.payout.final_approve"])) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  return (
    <PageStack>
      <ComingSoonView eyebrow={t("comingSoon.eyebrow")} title={t("navigation.approvals")} description={t("comingSoon.description")} notice={t("comingSoon.title")} />
    </PageStack>
  );
}
