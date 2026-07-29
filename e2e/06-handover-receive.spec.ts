import { expect, test, type Page } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

async function runCurrentPageServerActionAndReload(page: Page, action: () => Promise<void>) {
  const actionUrl = page.url();
  const response = page.waitForResponse((candidate) => candidate.url() === actionUrl && candidate.request().method() === "POST" && candidate.status() === 200);
  await action();
  await response;
  await page.reload({ waitUntil: "networkidle" });
}

test("receiving a submitted handover into an open session shows declared/handed-over/received figures and confirms via a Dialog", async ({ page }) => {
  await loginAsFinanceUser(page);

  // Create + submit a handover first so there is something SUBMITTED to receive.
  await page.goto("/fr/cash-handovers/new", { waitUntil: "networkidle" });
  await page.getByRole("checkbox").first().click({ force: true });
  await page.getByRole("button", { name: /créer la remise/i }).click();
  await page.waitForURL(/\/fr\/cash-handovers\/handover-/, { timeout: 10_000 });
  await runCurrentPageServerActionAndReload(page, () => page.getByRole("button", { name: /soumettre/i }).click());
  await expect(page.getByText(/soumise|submitted/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /réceptionner/i })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: /réceptionner/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/déclaré|declared/i).first()).toBeVisible();
  await expect(dialog.getByText(/remis|handed over/i).first()).toBeVisible();

  await runCurrentPageServerActionAndReload(page, () => dialog.getByRole("button", { name: /confirmer|confirm/i }).click());
  await expect(page.getByText(/reçue|received/i).first()).toBeVisible({ timeout: 10_000 });
});
