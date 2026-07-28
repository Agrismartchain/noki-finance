import { expect, test } from "@playwright/test";

import { loginAsFinanceUser } from "./support/auth";

// A manual mobile viewport rather than a device preset (e.g. devices["iPhone 12"]),
// which would force the WebKit engine -- this project's single configured
// project is chromium.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("at 390px the sidebar collapses into a drawer reachable via the mobile navigation toggle", async ({ page }) => {
  await loginAsFinanceUser(page);

  // The desktop-visible sidebar nav is not directly visible; a toggle opens it as a drawer.
  const toggle = page.getByRole("button", { name: /ouvrir le menu|open menu/i });
  await expect(toggle).toBeVisible();

  await toggle.click();
  await expect(page.getByRole("link", { name: /encaissements cod|cod collections/i })).toBeVisible();
});
