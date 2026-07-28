import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { DashboardView, type SettledResult } from "@/features/dashboard/components/dashboard-view";
import { getDashboard, getDashboardAging, getDashboardCashflow } from "@/features/dashboard/server/client";
import type { Locale } from "@/i18n/locales";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
};

async function settle<T>(promise: Promise<T>): Promise<SettledResult<T>> {
  try {
    return { status: "fulfilled", value: await promise };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.dashboard.read")) {
    return <ForbiddenView />;
  }

  const context = { accessToken, locale };
  const [dashboard, aging, cashflow] = await Promise.all([
    settle(getDashboard({}, context)),
    settle(getDashboardAging({}, context)),
    settle(getDashboardCashflow({}, context)),
  ]);

  const t = await getTranslations();

  return (
    <PageStack>
      <SectionHeader
        breadcrumbsLabel={t("navigation.landmarkLabel")}
        brandLabel={t("common.brand")}
        brandHref="/"
        sectionLabel={t("navigation.dashboard")}
        eyebrow={t("dashboard.title")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />
      <DashboardView locale={locale as Locale} dashboard={dashboard} aging={aging} cashflow={cashflow} />
    </PageStack>
  );
}
