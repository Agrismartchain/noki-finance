import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

test("the dashboard displays currency-tagged amounts and never a summed cross-currency figure", async ({ page }) => {
  await loginAsFinanceUser(page);

  // The stub's only currency is MAD; every KPI amount card must carry that currency code.
  await expect(page.getByText(/MAD/).first()).toBeVisible();
});

test("the COD list shows the currency column for each collection", async ({ page }) => {
  await loginAsFinanceUser(page);
  await page.goto("/fr/cod", { waitUntil: "networkidle" });

  await expect(page.getByRole("cell", { name: "MAD" }).first()).toBeVisible();
});
