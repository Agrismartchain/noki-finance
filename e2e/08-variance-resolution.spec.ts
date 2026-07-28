import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("resolving an open variance requires a decision, a reason, and an explicit confirmation step", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/cash-variances", { waitUntil: "networkidle" });

  // getByRole("link").first() would grab a sidebar nav link instead of the table
  // row's own link (the sidebar renders earlier in the DOM) -- scope to the href.
  await page.locator('a[href*="/cash-variances/variance-"]').first().click();
  await page.waitForURL(/\/fr\/cash-variances\/variance-/);

  await page.getByRole("radio", { name: /résoudre|resolve/i }).click({ force: true });
  await page.getByLabel(/motif|reason/i).fill("Confirmed with the cashier on-site");
  await page.getByRole("button", { name: /continuer|continue/i }).click();

  await expect(page.getByText(/confirmer la résolution|confirm resolution/i)).toBeVisible();
  await page.getByRole("button", { name: /confirmer|confirm/i }).click();

  await expect(page.getByText(/résolu|resolved/i).first()).toBeVisible({ timeout: 10_000 });
});
