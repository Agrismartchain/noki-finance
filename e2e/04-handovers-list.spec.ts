import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("the cash handovers list page loads and offers a create action", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/cash-handovers", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: /remises de cash/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /nouvelle remise/i })).toBeVisible();
});
