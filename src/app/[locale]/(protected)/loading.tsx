"use client";

import { Grid, Skeleton, Stack } from "@agrismartchain/noki-design-system";

/** Next.js App Router loading boundary: shown while the dashboard Server Component's data fetch is in flight. */
export default function DashboardLoading() {
  return (
    <Stack gap="lg">
      <Grid columns={3} gap="md">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height="6rem" />
        ))}
      </Grid>
      <Skeleton height="10rem" />
      <Skeleton height="10rem" />
    </Stack>
  );
}
