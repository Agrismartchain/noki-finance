import { expect, test, type Page } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

async function runServerActionAndReload(page: Page, action: () => Promise<void>) {
  const actionUrl = page.url();
  const response = page.waitForResponse((candidate) => candidate.url() === actionUrl && candidate.request().method() === "POST" && candidate.status() === 200);
  await action();
  await response;
  await page.reload({ waitUntil: "networkidle" });
}

test("creating, submitting, and approving a reconciliation shows the maker/checker explanation throughout", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/reconciliations/new", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /créer le rapprochement/i }).click();
  await page.waitForURL(/\/fr\/reconciliations\/reconciliation-/, { timeout: 10_000 });

  await expect(page.getByText(/maker.checker|préparateur.approbateur/i)).toBeVisible();
  await runServerActionAndReload(page, () => page.getByRole("button", { name: /soumettre/i }).click());
  await expect(page.getByRole("definition").filter({ hasText: /^Soumis$/i })).toBeVisible({ timeout: 10_000 });

  await runServerActionAndReload(page, () => page.getByRole("button", { name: /approuver|approve/i }).click());
  await expect(page.getByRole("definition").filter({ hasText: /^Approuvé$/i })).toBeVisible({ timeout: 10_000 });
});
