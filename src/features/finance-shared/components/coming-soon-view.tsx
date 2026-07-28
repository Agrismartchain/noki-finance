"use client";

import { Alert, PageHeader, Stack } from "@agrismartchain/noki-design-system";

export interface ComingSoonViewProps {
  eyebrow: string;
  title: string;
  description: string;
  notice: string;
}

/**
 * Phase 4B module placeholder -- a real, capability-gated Server Component
 * route renders this instead of the module's real UI. No mock data is ever
 * shown here: only a structured "coming soon" notice.
 */
export function ComingSoonView({ eyebrow, title, description, notice }: ComingSoonViewProps) {
  return (
    <Stack gap="lg">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Alert tone="info">{notice}</Alert>
    </Stack>
  );
}
