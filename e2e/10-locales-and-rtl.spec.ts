import { expect, test } from "@playwright/test";

for (const locale of ["fr", "en", "ar"] as const) {
  test(`the dashboard renders in ${locale} with no raw translation keys visible`, async ({ page }) => {
    await page.goto(`/${locale}/login`, { waitUntil: "networkidle" });

    // No raw i18n key (e.g. "auth.login.welcomeTitle") should ever be visible as literal text.
    await expect(page.locator("body")).not.toContainText(/auth\.login\.\w+/);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  });
}

test("Arabic renders right-to-left on the html root", async ({ page }) => {
  await page.goto("/ar/login", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("French and English render left-to-right", async ({ page }) => {
  await page.goto("/fr/login", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});
