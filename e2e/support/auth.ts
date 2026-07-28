import { expect, type Page } from "@playwright/test";

export async function loginAsFinanceUser(page: Page, locale = "fr") {
  await loginWithForm(page, "finance@noki.test", locale);
}

export async function loginAsNonFinanceUser(page: Page, locale = "fr") {
  await loginWithForm(page, "nonfinance@noki.test", locale);
}

async function loginWithForm(page: Page, email: string, locale: string) {
  await page.goto(`/${locale}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/e-mail|email|البريد/i).fill(email);
  await page.getByLabel(/mot de passe|password|كلمة المرور/i).fill("password123");

  let response: Awaited<ReturnType<Page["waitForResponse"]>> | undefined;
  const submit = page.getByRole("button", { name: /se connecter|sign in|تسجيل الدخول/i });
  for (let attempt = 0; attempt < 3 && !response; attempt += 1) {
    const responsePromise = page.waitForResponse((candidate) => candidate.url().includes("/api/auth/login"), { timeout: 5_000 });
    await submit.click();
    response = await responsePromise.catch(() => undefined);
  }

  expect(response, "login request was not observed").toBeDefined();
  expect(response!.status(), await response!.text()).toBe(200);
  await page.waitForURL(new RegExp(`/${locale}$`), { timeout: 10_000 });
}
