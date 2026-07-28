import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("creating a handover from an eligible COD collection and submitting it updates its status end to end", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/cash-handovers/new", { waitUntil: "networkidle" });

  // react-aria's real <input type="checkbox"> is visually covered by its own styled label,
  // so a plain .check() gets stuck retrying on a pointer-event interception; force the click.
  await page.getByRole("checkbox").first().click({ force: true });
  await page.getByRole("button", { name: /créer la remise/i }).click();

  await page.waitForURL(/\/fr\/cash-handovers\/handover-/, { timeout: 10_000 });
  await expect(page.getByText(/brouillon|draft/i).first()).toBeVisible();

  await page.getByRole("button", { name: /soumettre/i }).click();
  await expect(page.getByText(/soumise|submitted/i).first()).toBeVisible({ timeout: 10_000 });
});
