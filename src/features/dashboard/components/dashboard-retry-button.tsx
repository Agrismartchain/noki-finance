"use client";

import { Button } from "@agrismartchain/noki-design-system";
import { RotateCw } from "lucide-react";

import { useRouter } from "@/i18n/navigation";

export interface DashboardRetryButtonProps {
  label: string;
}

/** Re-runs the Server Component fetch (router.refresh()) rather than a client-side re-fetch, keeping the dashboard's data flow server-only. */
export function DashboardRetryButton({ label }: DashboardRetryButtonProps) {
  const router = useRouter();

  return (
    <Button variant="secondary" size="sm" startIcon={<RotateCw aria-hidden="true" size={16} />} onClick={() => router.refresh()}>
      {label}
    </Button>
  );
}
