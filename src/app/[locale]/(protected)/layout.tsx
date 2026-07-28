import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { SessionKeepAlive } from "@/components/auth/session-keepalive";
import { FinanceShell } from "@/components/shell/finance-shell";
import { FinanceSidebar } from "@/components/shell/finance-sidebar";
import { FinanceTopbar } from "@/components/shell/finance-topbar";
import { redirect } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasAnyFinancePermission } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type ProtectedLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ProtectedLayout({ children, params }: ProtectedLayoutProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);

  if (session.status === "unauthenticated") {
    redirect({ href: "/login", locale });
  }

  if (session.status !== "authenticated" || !hasAnyFinancePermission(session.actor)) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const actor = session.actor;

  return (
    <FinanceShell
      sidebar={<FinanceSidebar actor={actor} />}
      topbar={<FinanceTopbar actor={actor} />}
      mobileNavigationLabel={t("shell.openMenu")}
    >
      <SessionKeepAlive />
      {children}
    </FinanceShell>
  );
}
