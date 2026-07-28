import { expect, test } from "@playwright/test";

import { loginAsNonFinanceUser } from "./support/auth";

test("an actor with no finance.* permission sees Forbidden instead of the Finance shell", async ({ page }) => {
  await loginAsNonFinanceUser(page);

  await expect(page.getByRole("heading", { name: /accès refusé|access denied/i })).toBeVisible({ timeout: 10_000 });
  // Never a Finance nav item / KPI leaks through.
  await expect(page.getByText(/encaissements cod|cod collections/i)).toHaveCount(0);
});
