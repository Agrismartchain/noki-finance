import { getTranslations } from "next-intl/server";

import type { SanitizedActor } from "@/lib/auth";

import { FinanceTopbarView } from "./finance-topbar-view";

interface FinanceTopbarProps {
  actor?: SanitizedActor;
}

export async function FinanceTopbar({ actor }: FinanceTopbarProps) {
  const t = await getTranslations();

  return <FinanceTopbarView actor={actor} context={t("navigation.dashboard")} />;
}
