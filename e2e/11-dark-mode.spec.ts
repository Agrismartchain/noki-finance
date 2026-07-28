import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("toggling the theme switches data-noki-theme and persists across a reload", async ({ page }) => {
  await loginAsFinanceUser(page);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-noki-theme", "dashboard-light");

  await page.getByRole("button", { name: /sombre|dark/i }).click();
  await expect(html).toHaveAttribute("data-noki-theme", "dashboard-dark");

  await page.reload({ waitUntil: "networkidle" });
  await expect(html).toHaveAttribute("data-noki-theme", "dashboard-dark");
});
