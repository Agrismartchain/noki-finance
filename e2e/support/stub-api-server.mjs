import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? process.env.PORT ?? 4701);
const now = () => new Date().toISOString();

// ---- Fixed reference data -------------------------------------------------

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const COUNTRY_ID = "22222222-2222-2222-2222-222222222222";
const CURRENCY_ID = "33333333-3333-3333-3333-333333333333";

const FINANCE_CAPABILITIES = [
  "auth.me.read",
  "countries.read",
  "currencies.read",
  "finance.dashboard.read",
  "finance.executive.read",
  "finance.cod.read",
  "finance.cash.read",
  "finance.cash.handover.create",
  "finance.cash.handover.submit",
  "finance.cash.receive",
  "finance.cash_session.open",
  "finance.cash_session.close",
  "finance.cash_variance.read",
  "finance.cash_variance.resolve",
  "finance.reconciliation.create",
  "finance.reconciliation.submit",
  "finance.reconciliation.approve",
  "finance.obligation.read",
  "finance.fee.read",
  "finance.document.read",
  "finance.adjustment.read",
  "finance.dispute.read",
  "finance.payout.read",
  "finance.payout.first_approve",
  "finance.payment_method.read",
  "finance.report.read",
  "finance.audit.read",
];

const USERS = {
  "finance@noki.test": {
    password: "password123",
    actorId: "actor-finance-1",
    displayName: "Finance Tester",
    email: "finance@noki.test",
    capabilities: FINANCE_CAPABILITIES,
  },
  "nonfinance@noki.test": {
    password: "password123",
    actorId: "actor-nonfinance-1",
    displayName: "Non Finance Tester",
    email: "nonfinance@noki.test",
    capabilities: ["auth.me.read"],
  },
};

/** token -> email */
const tokens = new Map();

function issueTokens(email) {
  const accessToken = `access-${randomUUID()}`;
  const refreshToken = `refresh-${randomUUID()}`;
  tokens.set(accessToken, email);
  tokens.set(refreshToken, email);
  return {
    tokenType: "Bearer",
    accessToken,
    accessTokenExpiresIn: 900,
    refreshToken,
    refreshTokenExpiresIn: 2_592_000,
  };
}

function actorFromRequest(req) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const email = token ? tokens.get(token) : undefined;
  return email ? USERS[email] : undefined;
}

// ---- In-memory finance state ------------------------------------------------

const codCollections = [
  { id: "cod-1", organizationId: ORG_ID, organizationName: "NOKI Demo Org", countryId: COUNTRY_ID, countryCode: "MA", currencyId: CURRENCY_ID, currencyCode: "MAD", orderId: "order-1", orderNumber: "ORD-1001", deliveryShipmentId: "ship-1", expectedAmount: "250.00", collectedAmount: "250.00", status: "DECLARED", declaredAt: now(), updatedAt: now() },
  { id: "cod-2", organizationId: ORG_ID, organizationName: "NOKI Demo Org", countryId: COUNTRY_ID, countryCode: "MA", currencyId: CURRENCY_ID, currencyCode: "MAD", orderId: "order-2", orderNumber: "ORD-1002", deliveryShipmentId: "ship-2", expectedAmount: "120.00", collectedAmount: "120.00", status: "RECONCILED", declaredAt: now(), updatedAt: now() },
];

const handovers = new Map();
const sessions = new Map();
const variances = new Map();
const reconciliations = new Map();

const seedSessionId = "session-seed-1";
sessions.set(seedSessionId, {
  id: seedSessionId,
  status: "OPEN",
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  currencyId: CURRENCY_ID,
  cashierActorId: "actor-finance-1",
  openingAmount: "0.00",
  openedAt: now(),
});

const seedClosedSessionId = "session-seed-closed-1";
sessions.set(seedClosedSessionId, {
  id: seedClosedSessionId,
  status: "CLOSED",
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  currencyId: CURRENCY_ID,
  cashierActorId: "actor-finance-1",
  openingAmount: "0.00",
  systemExpectedClosingAmount: "250.00",
  countedClosingAmount: "245.00",
  varianceAmount: "-5.00",
  openedAt: now(),
  closedAt: now(),
});

const seedVarianceId = "variance-seed-1";
variances.set(seedVarianceId, {
  id: seedVarianceId,
  type: "SESSION",
  status: "OPEN",
  sourceReferenceType: "CASH_SESSION",
  sourceReferenceId: seedClosedSessionId,
  expectedAmount: "250.00",
  actualAmount: "245.00",
  varianceAmount: "-5.00",
  createdAt: now(),
});

// ---- HTTP plumbing ----------------------------------------------------------

function send(res, status, body) {
  const payload = JSON.stringify(body ?? {});
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

function notFound(res) {
  send(res, 404, { statusCode: 404, code: "NOT_FOUND", message: "Not found", correlationId: randomUUID() });
}

function unauthorized(res) {
  send(res, 401, { statusCode: 401, code: "UNAUTHORIZED", message: "Unauthorized", correlationId: randomUUID() });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function paginated(items, total) {
  return { items, total };
}

function metric(key, amounts, count) {
  return { key, amounts, count, statusBreakdown: [], sourceBreakdown: [] };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (path === "/health") {
    return send(res, 200, { status: "ok" });
  }

  // ---- Auth --------------------------------------------------------------
  if (method === "POST" && path === "/v1/auth/login") {
    const body = await readBody(req);
    const user = USERS[body.email];
    if (!user || user.password !== body.password) {
      return send(res, 401, { statusCode: 401, code: "INVALID_CREDENTIALS", message: "Invalid credentials", correlationId: randomUUID() });
    }
    return send(res, 200, issueTokens(body.email));
  }

  if (method === "POST" && path === "/v1/auth/refresh") {
    const body = await readBody(req);
    const email = tokens.get(body.refreshToken);
    if (!email) {
      return unauthorized(res);
    }
    return send(res, 200, issueTokens(email));
  }

  if (method === "POST" && path === "/v1/auth/logout") {
    return send(res, 200, { revoked: true });
  }

  if (method === "GET" && path === "/v1/auth/me") {
    const user = actorFromRequest(req);
    if (!user) return unauthorized(res);
    return send(res, 200, {
      actorId: user.actorId,
      displayName: user.displayName,
      email: user.email,
      memberships: [{ membershipId: "membership-1", organizationId: ORG_ID, countryScopes: [{ organizationCountryId: COUNTRY_ID, countryCode: "MA" }] }],
    });
  }

  if (method === "GET" && path === "/v1/auth/capabilities") {
    const user = actorFromRequest(req);
    if (!user) return unauthorized(res);
    if (user.capabilities.length <= 1) {
      // Non-finance actor: valid session, but forbidden from the app's baseline gate -- not this endpoint itself.
    }
    return send(res, 200, {
      actorId: user.actorId,
      memberships: [{ membershipId: "membership-1", organizationId: ORG_ID, countryScopes: [{ organizationCountryId: COUNTRY_ID, countryCode: "MA" }], roles: [{ roleId: "role-1", code: "FINANCE", description: "Finance" }], permissionCodes: user.capabilities }],
      effectivePermissionCodes: user.capabilities,
      capabilities: user.capabilities,
    });
  }

  // ---- Master data ---------------------------------------------------------
  if (method === "GET" && path === "/v1/admin/master-data/countries") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, paginated([{ id: COUNTRY_ID, code: "MA", name: "Morocco", status: "ACTIVE", organizationsCount: 1, zonesCount: 1 }], 1));
  }

  if (method === "GET" && path === "/v1/admin/master-data/currencies") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, paginated([{ id: CURRENCY_ID, code: "MAD", name: "Moroccan Dirham", minorUnit: 2, status: "ACTIVE" }], 1));
  }

  // ---- Dashboard -------------------------------------------------------------
  if (method === "GET" && path === "/v1/finance/dashboard") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const amounts = [{ currencyId: CURRENCY_ID, currencyCode: "MAD", amount: "370.00" }];
    return send(res, 200, {
      projection: "finance_dashboard",
      generatedAt: now(),
      appliedFilters: {},
      metrics: [
        metric("cod_expected", amounts, 2),
        metric("cod_declared", amounts, 2),
        metric("cash_handed_over", [], 0),
        metric("cash_received", [], 0),
        metric("cash_reconciled", [{ currencyId: CURRENCY_ID, currencyCode: "MAD", amount: "120.00" }], 1),
        metric("unreconciled_amount", [{ currencyId: CURRENCY_ID, currencyCode: "MAD", amount: "250.00" }], 1),
        metric("open_cash_sessions", [], 1),
        metric("open_variances", [{ currencyId: CURRENCY_ID, currencyCode: "MAD", amount: "-5.00" }], 1),
        metric("payouts_proposed", [], 0),
        metric("payouts_pending_first_approval", [], 0),
        metric("payouts_pending_final_approval", [], 0),
        metric("payouts_approved", [], 0),
        metric("payouts_sent", [], 0),
        metric("payouts_paid", [], 0),
        metric("payouts_failed", [], 0),
        metric("payouts_on_hold", [], 0),
      ],
    });
  }

  if (method === "GET" && path === "/v1/finance/dashboard/aging") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, { projection: "finance_aging", referenceDate: now(), appliedFilters: {}, sections: [] });
  }

  if (method === "GET" && path === "/v1/finance/dashboard/cashflow") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, { projection: "operational_cashflow", generatedAt: now(), period: "range", appliedFilters: {}, periods: [] });
  }

  // ---- COD -------------------------------------------------------------------
  if (method === "GET" && path === "/v1/admin/finance/cod/collections") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, { items: codCollections, total: codCollections.length, page: 1, pageSize: 25 });
  }

  const codDetailMatch = path.match(/^\/v1\/finance\/cod\/collections\/([^/]+)$/);
  if (method === "GET" && codDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = codCollections.find((c) => c.id === codDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, {
      id: found.id,
      organizationId: found.organizationId,
      countryId: found.countryId,
      currencyId: found.currencyId,
      orderId: found.orderId,
      deliveryShipmentId: found.deliveryShipmentId,
      deliveryAttemptId: "attempt-1",
      expectedAmount: found.expectedAmount,
      collectedAmount: found.collectedAmount,
      status: found.status,
      declaredAt: found.declaredAt,
    });
  }

  // ---- Cash handovers ----------------------------------------------------
  if (method === "GET" && path === "/v1/finance/cash/handovers") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, { items: [...handovers.values()], total: handovers.size });
  }

  if (method === "POST" && path === "/v1/finance/cash/handovers") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `handover-${randomUUID()}`;
    const items = (body.items ?? []).map((item) => ({
      id: `item-${randomUUID()}`,
      codCollectionId: item.codCollectionId,
      declaredAmountSnapshot: item.handedOverAmount,
      handedOverAmount: item.handedOverAmount,
      reconciledAmount: "0.00",
    }));
    const record = {
      id,
      status: "DRAFT",
      organizationId: body.organizationId,
      countryId: body.countryId,
      currencyId: body.currencyId,
      totalHandedOverAmount: items.reduce((sum, item) => (Number(sum) + Number(item.handedOverAmount)).toFixed(2), "0.00"),
      totalReceivedAmount: "0.00",
      items,
      createdAt: now(),
    };
    handovers.set(id, record);
    return send(res, 201, record);
  }

  const handoverDetailMatch = path.match(/^\/v1\/finance\/cash\/handovers\/([^/]+)$/);
  if (method === "GET" && handoverDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = handovers.get(handoverDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const handoverSubmitMatch = path.match(/^\/v1\/finance\/cash\/handovers\/([^/]+)\/submit$/);
  if (method === "POST" && handoverSubmitMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = handovers.get(handoverSubmitMatch[1]);
    if (!found) return notFound(res);
    found.status = "SUBMITTED";
    found.submittedAt = now();
    return send(res, 200, found);
  }

  const handoverReceiveMatch = path.match(/^\/v1\/finance\/cash\/handovers\/([^/]+)\/receive$/);
  if (method === "POST" && handoverReceiveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = handovers.get(handoverReceiveMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    const byCollection = new Map((body.items ?? []).map((item) => [item.codCollectionId, item.receivedAmount]));
    found.items = found.items.map((item) => ({ ...item, receivedAmount: byCollection.get(item.codCollectionId) ?? item.handedOverAmount }));
    found.totalReceivedAmount = found.items.reduce((sum, item) => (Number(sum) + Number(item.receivedAmount ?? 0)).toFixed(2), "0.00");
    found.status = "RECEIVED";
    found.receivedAt = now();
    found.cashSessionId = body.cashSessionId;
    return send(res, 200, found);
  }

  // ---- Cash sessions -------------------------------------------------------
  if (method === "GET" && path === "/v1/finance/cash/sessions") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const status = url.searchParams.get("status");
    const items = [...sessions.values()].filter((session) => !status || session.status === status);
    return send(res, 200, { items, total: items.length });
  }

  if (method === "POST" && path === "/v1/finance/cash/sessions") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `session-${randomUUID()}`;
    // A real backend continuously derives the expected closing amount from
    // opening float + net cash movements since opening; this stub keeps it
    // simple and just mirrors the opening amount for an OPEN session.
    const record = { id, status: "OPEN", organizationId: body.organizationId, countryId: body.countryId, currencyId: body.currencyId, cashierActorId: "actor-finance-1", openingAmount: body.openingAmount, systemExpectedClosingAmount: body.openingAmount, openedAt: now() };
    sessions.set(id, record);
    return send(res, 201, record);
  }

  const sessionDetailMatch = path.match(/^\/v1\/finance\/cash\/sessions\/([^/]+)$/);
  if (method === "GET" && sessionDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = sessions.get(sessionDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const sessionCloseMatch = path.match(/^\/v1\/finance\/cash\/sessions\/([^/]+)\/close$/);
  if (method === "POST" && sessionCloseMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = sessions.get(sessionCloseMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    const expected = found.openingAmount;
    const variance = (Number(body.countedClosingAmount) - Number(expected)).toFixed(2);
    found.status = "CLOSED";
    found.systemExpectedClosingAmount = expected;
    found.countedClosingAmount = body.countedClosingAmount;
    found.varianceAmount = variance;
    found.closedAt = now();
    return send(res, 200, found);
  }

  // ---- Cash variances --------------------------------------------------------
  if (method === "GET" && path === "/v1/finance/cash/variances") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, { items: [...variances.values()], total: variances.size });
  }

  const varianceDetailMatch = path.match(/^\/v1\/finance\/cash\/variances\/([^/]+)$/);
  if (method === "GET" && varianceDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = variances.get(varianceDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const varianceResolveMatch = path.match(/^\/v1\/finance\/cash\/variances\/([^/]+)\/resolve$/);
  if (method === "POST" && varianceResolveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = variances.get(varianceResolveMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = body.resolutionStatus;
    found.resolvedAt = now();
    return send(res, 200, found);
  }

  // ---- Reconciliations --------------------------------------------------------
  if (method === "GET" && path === "/v1/finance/reconciliations") {
    if (!actorFromRequest(req)) return unauthorized(res);
    return send(res, 200, { items: [...reconciliations.values()], total: reconciliations.size });
  }

  if (method === "POST" && path === "/v1/finance/reconciliations") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `reconciliation-${randomUUID()}`;
    const session = sessions.get(body.cashSessionId);
    const record = {
      id,
      status: "DRAFT",
      cashSessionId: body.cashSessionId,
      expectedAmount: session?.systemExpectedClosingAmount ?? "0.00",
      receivedAmount: session?.countedClosingAmount ?? "0.00",
      varianceAmount: session?.varianceAmount ?? "0.00",
      createdAt: now(),
    };
    reconciliations.set(id, record);
    return send(res, 201, record);
  }

  const reconciliationDetailMatch = path.match(/^\/v1\/finance\/reconciliations\/([^/]+)$/);
  if (method === "GET" && reconciliationDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = reconciliations.get(reconciliationDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const reconciliationSubmitMatch = path.match(/^\/v1\/finance\/reconciliations\/([^/]+)\/submit$/);
  if (method === "POST" && reconciliationSubmitMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = reconciliations.get(reconciliationSubmitMatch[1]);
    if (!found) return notFound(res);
    found.status = "SUBMITTED";
    found.submittedAt = now();
    return send(res, 200, found);
  }

  const reconciliationApproveMatch = path.match(/^\/v1\/finance\/reconciliations\/([^/]+)\/approve$/);
  if (method === "POST" && reconciliationApproveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = reconciliations.get(reconciliationApproveMatch[1]);
    if (!found) return notFound(res);
    found.status = "APPROVED";
    found.approvedAt = now();
    return send(res, 200, found);
  }

  return notFound(res);
});

server.listen(port, () => {
  console.log(`stub-api-server listening on ${port}`);
});
