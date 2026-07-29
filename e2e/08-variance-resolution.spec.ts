import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("resolving an open variance requires a decision, a reason, and an explicit confirmation step", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/cash-variances/variance-seed-1", { waitUntil: "networkidle" });

  await page.getByRole("radio", { name: /résoudre|resolve/i }).click({ force: true });
  await page.getByLabel(/motif|reason/i).fill("Confirmed with the cashier on-site");
  await page.getByRole("button", { name: /continuer|continue/i }).click();

  await expect(page.getByText(/confirmer la résolution|confirm resolution/i)).toBeVisible();
  await page.getByRole("button", { name: /confirmer|confirm/i }).click();

  await expect(page.getByText(/résolu|resolved/i).first()).toBeVisible({ timeout: 10_000 });
});
