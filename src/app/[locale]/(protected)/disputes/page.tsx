import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { DisputeLookup } from "@/features/disputes/components/dispute-lookup";
import { listDisputes } from "@/features/disputes/server/client";
import { FinanceListSection } from "@/features/finance-shared/components/finance-list-section";
import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { fetchResourceList, parseResourceListFilters } from "@/features/finance-shared/server/resource-list";
import { disputeStatusTone } from "@/features/finance-shared/status-maps";
import { Link } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const DISPUTE_STATUSES = ["OPEN", "RESOLVED", "WITHDRAWN"] as const;

export default async function DisputesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.dispute.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseResourceListFilters(new URLSearchParams(rawSearchParams as Record<string, string>), DISPUTE_STATUSES);
  const result = await fetchResourceList(session.actor, filters, context, (query) => listDisputes(query, context));

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

      <FinanceListSection
        result={result}
        namespace="disputes"
        columnKeys={["id", "obligation", "status", "reasonCode", "openedAt"]}
        statuses={DISPUTE_STATUSES.map((value) => ({ value, label: t(`disputes.status.${value}`) }))}
        toRow={(dispute) => ({
          id: dispute.id,
          cells: {
            id: <Link href={`/disputes/${dispute.id}`}>{dispute.id.slice(0, 8)}</Link>,
            obligation: <Link href={`/obligations/${dispute.obligationId}`}>{dispute.obligationId.slice(0, 8)}</Link>,
            status: <FinanceStatusBadge label={t(`disputes.status.${dispute.status}`)} tone={disputeStatusTone(dispute.status)} />,
            reasonCode: dispute.reasonCode,
            openedAt: dispute.openedAt,
          },
        })}
      />

      <DisputeLookup
        labels={{
          label: t("disputes.lookup.label"),
          button: t("disputes.lookup.button"),
          notFoundHint: t("disputes.lookup.notFoundHint"),
        }}
      />
    </PageStack>
  );
}
