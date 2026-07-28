import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("an authorized Finance actor can log in and the dashboard loads with real KPIs", async ({ page }) => {
  await loginAsFinanceUser(page);

  await expect(page.getByRole("heading", { name: /vue d.ensemble|overview/i }).first()).toBeVisible();
  // A real backend-derived metric, not a fixed placeholder string.
  await expect(page.getByText(/250[.,]00|250\s*MAD/).first()).toBeVisible();
});
