import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("receiving a submitted handover into an open session shows declared/handed-over/received figures and confirms via a Dialog", async ({ page }) => {
  await loginAsFinanceUser(page);

  // Create + submit a handover first so there is something SUBMITTED to receive.
  await page.goto("/fr/cash-handovers/new", { waitUntil: "networkidle" });
  await page.getByRole("checkbox").first().click({ force: true });
  await page.getByRole("button", { name: /créer la remise/i }).click();
  await page.waitForURL(/\/fr\/cash-handovers\/handover-/, { timeout: 10_000 });
  await page.getByRole("button", { name: /soumettre/i }).click();
  await expect(page.getByText(/soumise|submitted/i).first()).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: /réceptionner/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/déclaré|declared/i).first()).toBeVisible();
  await expect(dialog.getByText(/remis|handed over/i).first()).toBeVisible();

  await dialog.getByRole("button", { name: /confirmer|confirm/i }).click();
  await expect(page.getByText(/reçue|received/i).first()).toBeVisible({ timeout: 10_000 });
});
