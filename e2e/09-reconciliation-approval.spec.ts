import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("creating, submitting, and approving a reconciliation shows the maker/checker explanation throughout", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/reconciliations/new", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /créer le rapprochement/i }).click();
  await page.waitForURL(/\/fr\/reconciliations\/reconciliation-/, { timeout: 10_000 });

  await expect(page.getByText(/maker.checker|préparateur.approbateur/i)).toBeVisible();
  await page.getByRole("button", { name: /soumettre/i }).click();
  await expect(page.getByText(/soumis|submitted/i).first()).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: /approuver|approve/i }).click();
  await expect(page.getByText(/approuvé|approved/i).first()).toBeVisible({ timeout: 10_000 });
});
