import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { ForbiddenView } from "@/components/auth/forbidden-view";
import { PageStack, SectionHeader } from "@/components/layout/page-shell";
import { FeeRuleLookup } from "@/features/fees/components/fee-rule-lookup";
import { FEE_RULE_WORKFLOW_STATUSES, listFeeRules } from "@/features/fees/server/client";
import { FinanceListSection } from "@/features/finance-shared/components/finance-list-section";
import { FinanceStatusBadge } from "@/features/finance-shared/components/finance-status-badge";
import { fetchResourceList, parseResourceListFilters } from "@/features/finance-shared/server/resource-list";
import { feeRuleWorkflowStatusTone } from "@/features/finance-shared/status-maps";
import { Link } from "@/i18n/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasCapability } from "@/lib/auth/session";
import { getServerSessionResolution } from "@/lib/auth/server-session";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function FeeRulesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const session = await getServerSessionResolution(accessToken, refreshToken, locale);
  if (session.status !== "authenticated" || !hasCapability(session.actor, "finance.fee_rule.read")) {
    return <ForbiddenView />;
  }

  const t = await getTranslations();
  const context = { accessToken, locale };
  const filters = parseResourceListFilters(new URLSearchParams(rawSearchParams as Record<string, string>), FEE_RULE_WORKFLOW_STATUSES);
  const result = await fetchResourceList(session.actor, filters, context, (query) => listFeeRules(query, context));
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

      <FinanceListSection
        result={result}
        namespace="fees.rules"
        columnKeys={["id", "type", "serviceCode", "calculationType", "priority", "workflowStatus"]}
        statuses={FEE_RULE_WORKFLOW_STATUSES.map((value) => ({ value, label: t(`fees.rules.workflowStatus.${value}`) }))}
        toRow={(rule) => ({
          id: rule.id,
          cells: {
            id: <Link href={`/fees/rules/${rule.id}`}>{rule.id.slice(0, 8)}</Link>,
            type: rule.type,
            serviceCode: rule.serviceCode ?? "—",
            calculationType: rule.calculationType,
            priority: String(rule.priority),
            workflowStatus: <FinanceStatusBadge label={t(`fees.rules.workflowStatus.${rule.workflowStatus}`)} tone={feeRuleWorkflowStatusTone(rule.workflowStatus)} />,
          },
        })}
      />

      <FeeRuleLookup labels={{ label: t("fees.rules.lookup.label"), button: t("fees.rules.lookup.button"), notFoundHint: t("fees.rules.lookup.notFoundHint") }} />

      {canManage ? <Link href="/fees/rules/new">{t("fees.rules.create.title")}</Link> : null}
    </PageStack>
  );
}
