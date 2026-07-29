import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

const SCREENSHOTS = {
  obligations: "screenshots/phase-4b/obligations-desktop-light.png",
  invoice: "screenshots/phase-4b/invoice-detail-desktop-light.png",
  payout: "screenshots/phase-4b/payout-detail-desktop-light.png",
  approvals: "screenshots/phase-4b/approvals-desktop-light.png",
  paymentMethods: "screenshots/phase-4b/payment-methods-desktop-light.png",
  reports: "screenshots/phase-4b/reports-desktop-light.png",
  audit: "screenshots/phase-4b/audit-desktop-light.png",
  payoutMobile: "screenshots/phase-4b/payout-detail-mobile-390.png",
  reportsMobile: "screenshots/phase-4b/reports-mobile-390.png",
  payoutArabic: "screenshots/phase-4b/payout-arabic-rtl.png",
  payoutDark: "screenshots/phase-4b/payout-dark.png",
} as const;

async function gotoAndSettle(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.locator("body")).toBeVisible();
}

test.describe("visual gate matrix", () => {
  test("phase 4B required screenshot set", async ({ page }) => {
    await loginAsFinanceUser(page, "fr");
    await gotoAndSettle(page, "/fr/obligations");
    await page.screenshot({ path: SCREENSHOTS.obligations, fullPage: true });
    await gotoAndSettle(page, "/fr/documents/document-seed-1");
    await page.screenshot({ path: SCREENSHOTS.invoice, fullPage: true });
    await gotoAndSettle(page, "/fr/payouts/payout-seed-1");
    await page.screenshot({ path: SCREENSHOTS.payout, fullPage: true });
    await gotoAndSettle(page, "/fr/approvals");
    await page.screenshot({ path: SCREENSHOTS.approvals, fullPage: true });
    await gotoAndSettle(page, "/fr/payment-methods");
    await page.screenshot({ path: SCREENSHOTS.paymentMethods, fullPage: true });
    await gotoAndSettle(page, "/fr/reports?report=payouts");
    await page.screenshot({ path: SCREENSHOTS.reports, fullPage: true });
    await gotoAndSettle(page, "/fr/audit");
    await page.screenshot({ path: SCREENSHOTS.audit, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAndSettle(page, "/fr/payouts/payout-seed-1");
    await page.screenshot({ path: SCREENSHOTS.payoutMobile, fullPage: true });
    await gotoAndSettle(page, "/fr/reports?report=payouts");
    await page.screenshot({ path: SCREENSHOTS.reportsMobile, fullPage: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAndSettle(page, "/ar/payouts/payout-seed-1");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.screenshot({ path: SCREENSHOTS.payoutArabic, fullPage: true });

    await gotoAndSettle(page, "/fr");
    await page.getByRole("button", { name: /sombre|dark/i }).click();
    await gotoAndSettle(page, "/fr/payouts/payout-seed-1");
    await expect(page.locator("html")).toHaveAttribute("data-noki-theme", "dashboard-dark");
    await page.screenshot({ path: SCREENSHOTS.payoutDark, fullPage: true });
  });
});

test("smoke: dashboard is visible after screenshotting", async ({ page }) => {
  await loginAsFinanceUser(page);
  await expect(page).toHaveURL(/\/fr$/);
});
