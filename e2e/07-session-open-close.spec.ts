import { expect, test, type Page } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

async function runCurrentPageServerAction(page: Page, action: () => Promise<void>) {
  const actionUrl = page.url();
  const responsePromise = page.waitForResponse((candidate) => candidate.url() === actionUrl && candidate.request().method() === "POST" && candidate.status() === 200);
  await action();
  return responsePromise;
}

async function openSessionAndWaitForDetail(page: Page) {
  const detailNavigation = page.waitForURL(/\/fr\/cash-sessions\/session-/, { timeout: 10_000 });
  await runCurrentPageServerAction(page, () => page.getByRole("button", { name: /ouvrir la session/i }).click());
  await detailNavigation;
  await page.waitForLoadState("networkidle");
}

test("opening a cash session and closing it only submits countedClosingAmount, with an indicative variance preview", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/cash-sessions/new", { waitUntil: "networkidle" });

  await page.getByLabel(/fond de caisse initial/i).fill("100.00");
  await openSessionAndWaitForDetail(page);
  await expect(page.getByText(/ouverte|open/i).first()).toBeVisible();

  await page.getByLabel(/montant compté/i).fill("95.00");
  await expect(page.getByText(/écart indicatif|indicative variance/i)).toBeVisible();
  await expect(page.getByText(/source de vérité|source of truth/i)).toBeVisible();

  await runCurrentPageServerAction(page, () => page.getByRole("button", { name: /clôturer la session/i }).click());
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText(/clôturée|closed/i).first()).toBeVisible({ timeout: 10_000 });
});
