import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

/**
 * Captures the design gate screenshot matrix (spec section 33): desktop/mobile
 * x light/dark, plus Arabic RTL desktop/mobile, across the six required pages.
 * This is a manual visual review aid, not automated pixel-diffing -- there is
 * no baseline for a brand-new app yet.
 */
const PAGES: { path: string; name: string }[] = [
  { path: "/fr/login", name: "login" },
  { path: "/fr", name: "dashboard" },
  { path: "/fr/cash-handovers", name: "handovers-list" },
];

async function gotoAndSettle(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

test.describe("visual gate matrix", () => {
  test("desktop light", async ({ page }) => {
    await loginAsFinanceUser(page, "fr");
    for (const { path, name } of PAGES) {
      await gotoAndSettle(page, path);
      await page.screenshot({ path: `screenshots/desktop-light-${name}.png`, fullPage: true });
    }
  });

  test("desktop dark", async ({ page }) => {
    await loginAsFinanceUser(page, "fr");
    await page.getByRole("button", { name: /sombre|dark/i }).click();
    for (const { path, name } of PAGES) {
      await gotoAndSettle(page, path);
      await page.screenshot({ path: `screenshots/desktop-dark-${name}.png`, fullPage: true });
    }
  });

  test("mobile 390 light", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsFinanceUser(page, "fr");
    for (const { path, name } of PAGES) {
      await gotoAndSettle(page, path);
      await page.screenshot({ path: `screenshots/mobile-light-${name}.png`, fullPage: true });
    }
  });

  test("mobile 390 dark", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsFinanceUser(page, "fr");
    await page.getByRole("button", { name: /sombre|dark/i }).click();
    for (const { path, name } of PAGES) {
      await gotoAndSettle(page, path);
      await page.screenshot({ path: `screenshots/mobile-dark-${name}.png`, fullPage: true });
    }
  });

  test("arabic RTL desktop", async ({ page }) => {
    await loginAsFinanceUser(page, "ar");
    for (const { name } of PAGES) {
      const path = PAGES.find((p) => p.name === name)!.path.replace("/fr", "/ar");
      await gotoAndSettle(page, path);
      await page.screenshot({ path: `screenshots/rtl-desktop-${name}.png`, fullPage: true });
    }
  });

  test("arabic RTL mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsFinanceUser(page, "ar");
    for (const { name } of PAGES) {
      const path = PAGES.find((p) => p.name === name)!.path.replace("/fr", "/ar");
      await gotoAndSettle(page, path);
      await page.screenshot({ path: `screenshots/rtl-mobile-${name}.png`, fullPage: true });
    }
  });
});

test("smoke: dashboard is visible after screenshotting", async ({ page }) => {
  await loginAsFinanceUser(page);
  await expect(page).toHaveURL(/\/fr$/);
});
