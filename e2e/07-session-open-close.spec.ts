import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("opening a cash session and closing it only submits countedClosingAmount, with an indicative variance preview", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/cash-sessions/new", { waitUntil: "networkidle" });

  await page.getByLabel(/fond de caisse initial/i).fill("100.00");
  await page.getByRole("button", { name: /ouvrir la session/i }).click();

  await page.waitForURL(/\/fr\/cash-sessions\/session-/, { timeout: 10_000 });
  await expect(page.getByText(/ouverte|open/i).first()).toBeVisible();

  await page.getByLabel(/montant compté/i).fill("95.00");
  await expect(page.getByText(/écart indicatif|indicative variance/i)).toBeVisible();
  await expect(page.getByText(/source de vérité|source of truth/i)).toBeVisible();

  await page.getByRole("button", { name: /clôturer la session/i }).click();
  await expect(page.getByText(/clôturée|closed/i).first()).toBeVisible({ timeout: 10_000 });
});
