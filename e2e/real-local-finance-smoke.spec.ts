import { createHash, randomUUID } from "node:crypto";

import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";

const appBaseUrl = process.env.NOKI_REAL_LOCAL_E2E_APP_URL ?? "http://localhost:3004";
const apiBaseUrl = process.env.NOKI_REAL_LOCAL_E2E_API_URL ?? "http://localhost:3000";
const email = process.env.NOKI_REAL_LOCAL_E2E_EMAIL;
const password = process.env.NOKI_REAL_LOCAL_E2E_PASSWORD;

test.skip(process.env.NOKI_REAL_LOCAL_E2E !== "1", "Set NOKI_REAL_LOCAL_E2E=1 with local recette credentials to run against real local services.");
test.skip(!email || !password, "Set NOKI_REAL_LOCAL_E2E_EMAIL and NOKI_REAL_LOCAL_E2E_PASSWORD.");

type JsonObject = Record<string, unknown>;

interface SessionActor {
  email: string | null;
  memberships: Array<{
    organizationId: string;
    countryScopes: Array<{ countryCode: string; organizationCountryId: string | null }>;
    roles: Array<{ code: string }>;
  }>;
  capabilities: string[];
  effectivePermissionCodes: string[];
}

interface BffSession {
  status: string;
  actor?: SessionActor;
}

interface ApiTokens {
  accessToken: string;
}

interface CodCollection {
  id: string;
  organizationId: string;
  countryId: string;
  countryCode: string;
  currencyId: string;
  collectedAmount: string;
}

function asJsonObject(value: unknown): JsonObject {
  expect(value).toEqual(expect.any(Object));
  return value as JsonObject;
}

async function loginThroughUi(page: Page): Promise<void> {
  await page.goto(`${appBaseUrl}/fr/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/e-mail|email/i).fill(email!);
  await page.getByLabel(/mot de passe|password/i).fill(password!);

  const responsePromise = page.waitForResponse((response) => response.url() === `${appBaseUrl}/api/auth/login`);
  await page.getByRole("button", { name: /se connecter|sign in/i }).click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(200);
  await expect(page).toHaveURL(/\/fr$/, { timeout: 15_000 });
}

async function expectBffSession(context: BrowserContext): Promise<SessionActor> {
  const response = await context.request.get(`${appBaseUrl}/api/auth/session`, { headers: { "Accept-Language": "fr" } });
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as BffSession;
  expect(body.status).toBe("authenticated");
  expect(body.actor?.email).toBe(email);
  expect(body.actor?.memberships.flatMap((membership) => membership.roles.map((role) => role.code))).toContain("FINANCE");
  expect(body.actor?.memberships.flatMap((membership) => membership.countryScopes.map((scope) => scope.countryCode))).toContain("MA");
  expect(body.actor?.capabilities.some((capability) => capability === "finance" || capability.startsWith("finance."))).toBe(true);
  return body.actor!;
}

async function apiLogin(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${apiBaseUrl}/v1/auth/login`, { data: { email, password } });
  expect(response.status(), await response.text()).toBe(200);
  return ((await response.json()) as ApiTokens).accessToken;
}

async function apiFetchJson(
  request: APIRequestContext,
  token: string,
  method: "GET" | "POST",
  path: string,
  options: { data?: JsonObject; idempotencyKey?: string; expectedStatus?: number } = {},
): Promise<JsonObject> {
  const response = await request.fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    data: options.data,
  });
  expect(response.status(), await response.text()).toBe(options.expectedStatus ?? (method === "POST" ? 201 : 200));
  return asJsonObject(await response.json());
}

async function getDeclaredCodCollections(request: APIRequestContext, token: string, organizationId: string): Promise<CodCollection[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "10", organizationId, status: "DECLARED" });
  const body = await apiFetchJson(request, token, "GET", `/v1/admin/finance/cod/collections?${params}`);
  const items = body.items as CodCollection[] | undefined;
  expect(items?.length, "local provisioner must seed at least one DECLARED COD collection").toBeGreaterThan(0);
  return items!;
}

async function expectNoSession(browser: Browser, path = "/fr"): Promise<void> {
  const context = await browser.newContext({ baseURL: appBaseUrl });
  const page = await context.newPage();
  await page.goto(`${appBaseUrl}${path}`);
  await expect(page).toHaveURL(/\/fr\/login/);
  await context.close();
}

test("real local finance login, modules, security boundaries, and non-destructive mutations", async ({ browser, context, page, request }) => {
  const browserApiRequests: string[] = [];
  page.on("request", (candidate) => {
    const url = new URL(candidate.url());
    if (url.origin === apiBaseUrl) {
      browserApiRequests.push(candidate.url());
    }
  });

  await expectNoSession(browser);
  await loginThroughUi(page);

  const accessCookies = await context.cookies(appBaseUrl);
  const authCookies = await context.cookies(`${appBaseUrl}/api/auth/session`);
  expect(accessCookies.find((cookie) => cookie.name === "noki_finance_access_token")).toMatchObject({ httpOnly: true });
  expect(authCookies.find((cookie) => cookie.name === "noki_finance_refresh_token")).toMatchObject({ httpOnly: true, path: "/api/auth" });

  const actor = await expectBffSession(context);
  const storageState = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  expect(JSON.stringify(storageState)).not.toMatch(/access[_-]?token|refresh[_-]?token|bearer/i);

  for (const path of ["/fr", "/fr/obligations", "/fr/fees", "/fr/documents", "/fr/adjustments", "/fr/disputes", "/fr/payouts", "/fr/approvals", "/fr/payment-methods", "/fr/reports", "/fr/audit"]) {
    const response = await page.goto(`${appBaseUrl}${path}`, { waitUntil: "networkidle" });
    expect(response?.status(), path).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /accès refusé|access denied/i })).toHaveCount(0);
    await expect(page.getByText(/données de démonstration|mock|stub/i)).toHaveCount(0);
  }

  const apiToken = await apiLogin(request);
  const organizationId = actor.memberships[0]!.organizationId;
  const codCollections = await getDeclaredCodCollections(request, apiToken, organizationId);
  const firstCod = codCollections[0]!;
  const scope = {
    organizationId: firstCod.organizationId,
    countryId: firstCod.countryId,
    countryCode: firstCod.countryCode,
    currencyId: firstCod.currencyId,
  };

  const cashSession = await apiFetchJson(request, apiToken, "POST", "/v1/finance/cash/sessions", {
    idempotencyKey: `real-local-session-${randomUUID()}`,
    data: { ...scope, openingAmount: "0.00" },
  });
  expect(cashSession.status).toBe("OPEN");

  let handoverKey = "";
  let handoverPayload: JsonObject | undefined;
  let handover: JsonObject | undefined;
  for (const cod of codCollections) {
    handoverKey = `real-local-handover-${randomUUID()}`;
    handoverPayload = { ...scope, items: [{ codCollectionId: cod.id, handedOverAmount: cod.collectedAmount }] };
    const response = await request.fetch(`${apiBaseUrl}/v1/finance/cash/handovers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Idempotency-Key": handoverKey },
      data: handoverPayload,
    });
    if (response.status() === 409) {
      continue;
    }
    expect(response.status(), await response.text()).toBe(201);
    handover = asJsonObject(await response.json());
    break;
  }
  if (!handover) {
    throw new Error("Local provisioner must leave at least one unallocated DECLARED COD collection.");
  }
  expect(handover.status).toBe("DRAFT");
  const handoverReplay = await apiFetchJson(request, apiToken, "POST", "/v1/finance/cash/handovers", {
    idempotencyKey: handoverKey,
    data: handoverPayload!,
  });
  expect(handoverReplay.id).toBe(handover.id);

  const suffix = randomUUID();
  const adjustment = await apiFetchJson(request, apiToken, "POST", "/v1/finance/adjustments", {
    idempotencyKey: `real-local-adjustment-${suffix}`,
    data: {
      ...scope,
      counterpartyType: "SELLER",
      counterpartyId: randomUUID(),
      sourceDomain: "MANUAL_ADJUSTMENT",
      sourceReferenceType: "REAL_LOCAL_SMOKE",
      sourceReferenceId: suffix,
      type: "MANUAL_ADJUSTMENT",
      amount: "1.00",
      reasonCode: "REAL_LOCAL_SMOKE",
      reason: "Real local smoke draft only.",
    },
  });
  expect(adjustment.status).toBe("SUBMITTED");

  const obligation = await apiFetchJson(request, apiToken, "POST", "/v1/finance/obligations", {
    idempotencyKey: `real-local-obligation-${suffix}`,
    data: {
      ...scope,
      sourceDomain: "MANUAL_ADJUSTMENT",
      sourceReferenceType: "REAL_LOCAL_SMOKE",
      sourceReferenceId: randomUUID(),
      counterpartyType: "SELLER",
      counterpartyId: randomUUID(),
      nature: "ADJUSTMENT",
      direction: "PAYABLE",
      originalAmount: "2.00",
    },
  });
  const dispute = await apiFetchJson(request, apiToken, "POST", "/v1/finance/disputes", {
    idempotencyKey: `real-local-dispute-${suffix}`,
    data: { obligationId: String(obligation.id), reasonCode: "REAL_LOCAL_SMOKE", reason: "Real local smoke hold only." },
  });
  expect(dispute.status).toBe("OPEN");

  const sensitiveReference = `vault:real-local-${randomUUID()}`;
  const paymentMethod = await apiFetchJson(request, apiToken, "POST", "/v1/finance/payment-methods", {
    idempotencyKey: `real-local-payment-method-${suffix}`,
    data: {
      ...scope,
      counterpartyType: "SELLER",
      counterpartyId: randomUUID(),
      type: "BANK_ACCOUNT",
      providerCode: "LOCAL",
      displayLabel: "Real local smoke vault ref",
      destinationMasked: "**** 4242",
      destinationFingerprint: createHash("sha256").update(sensitiveReference).digest("hex"),
      sensitiveReference,
    },
  });
  expect(paymentMethod.status).toBe("PENDING_VERIFICATION");
  expect(JSON.stringify(paymentMethod)).not.toContain(sensitiveReference);

  const auditParams = new URLSearchParams({ organizationId, resourceId: String(paymentMethod.id), page: "1", pageSize: "10" });
  const audit = await apiFetchJson(request, apiToken, "GET", `/v1/finance/audit?${auditParams}`);
  expect((audit.items as unknown[] | undefined)?.length).toBeGreaterThan(0);

  expect(browserApiRequests).toEqual([]);

  const badPassword = await request.post(`${appBaseUrl}/api/auth/login`, {
    headers: { Origin: appBaseUrl, "Content-Type": "application/json" },
    data: { email, password: `wrong-${randomUUID()}` },
  });
  expect(badPassword.status()).toBe(401);
  const unknownAccount = await request.post(`${appBaseUrl}/api/auth/login`, {
    headers: { Origin: appBaseUrl, "Content-Type": "application/json" },
    data: { email: `unknown-${randomUUID()}@local.noki.test`, password: "not-a-real-password" },
  });
  expect(unknownAccount.status()).toBe(401);

  const invalidCookieContext = await browser.newContext({ baseURL: appBaseUrl });
  await invalidCookieContext.addCookies([{ name: "noki_finance_access_token", value: "invalid", domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const invalidSession = await invalidCookieContext.request.get(`${appBaseUrl}/api/auth/session`);
  expect(invalidSession.status()).toBe(401);
  await invalidCookieContext.close();

  const logoutResponse = await context.request.post(`${appBaseUrl}/api/auth/logout`, { headers: { Origin: appBaseUrl } });
  expect(logoutResponse.status(), await logoutResponse.text()).toBe(200);
  const loggedOutSession = await context.request.get(`${appBaseUrl}/api/auth/session`);
  expect(loggedOutSession.status()).toBe(401);
  await page.goto(`${appBaseUrl}/fr`);
  await expect(page).toHaveURL(/\/fr\/login/);
});
