import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test.use({ viewport: { width: 390, height: 844 } });

test("no page overflows horizontally at 390px", async ({ page }) => {
  await loginAsFinanceUser(page);

  for (const path of ["/fr", "/fr/cod", "/fr/cash-handovers", "/fr/cash-sessions", "/fr/cash-variances", "/fr/reconciliations"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth, `${path} overflows horizontally at 390px`).toBeLessThanOrEqual(clientWidth + 1);
  }
});
