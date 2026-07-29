import { createHash, randomUUID } from "node:crypto";
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
  "finance.obligation.manage",
  "finance.fee.read",
  "finance.fee.assess",
  "finance.fee_rule.read",
  "finance.fee_rule.manage",
  "finance.document.read",
  "finance.document.generate",
  "finance.document.approve",
  "finance.document.void",
  "finance.adjustment.read",
  "finance.adjustment.create",
  "finance.adjustment.approve",
  "finance.dispute.read",
  "finance.dispute.manage",
  "finance.payout.read",
  "finance.payout.prepare",
  "finance.payout.hold",
  "finance.payout.first_approve",
  "finance.payout.final_approve",
  "finance.payout.export",
  "finance.payout.mark_sent",
  "finance.payout.mark_paid",
  "finance.payout.mark_failed",
  "finance.payout.retry",
  "finance.payout.cancel",
  "finance.payout.reconcile",
  "finance.payment_method.read",
  "finance.payment_method.read_sensitive",
  "finance.payment_method.create",
  "finance.payment_method.approve",
  "finance.payment_method.suspend",
  "finance.payment_method.revoke",
  "finance.report.read",
  "finance.report.export",
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

// ---- Phase 4B finance state --------------------------------------------------

const SELLER_ID = "44444444-4444-4444-4444-444444444444";

const obligations = new Map();
const feeRules = new Map();
const feeAssessments = new Map();
const documents = new Map();
const adjustments = new Map();
const disputes = new Map();
const payouts = new Map();
const paymentMethods = new Map();
const auditEntries = [];

function logAudit(action, resourceType, resourceId, metadata) {
  auditEntries.push({
    id: `audit-${randomUUID()}`,
    actorId: "actor-finance-1",
    membershipId: "membership-1",
    organizationId: ORG_ID,
    countryId: COUNTRY_ID,
    action,
    resourceType,
    resourceId,
    correlationId: randomUUID(),
    metadata: metadata ?? null,
    occurredAt: now(),
  });
}

const seedObligationId = "obligation-seed-1";
obligations.set(seedObligationId, {
  id: seedObligationId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  currencyId: CURRENCY_ID,
  currency: "MAD",
  sourceDomain: "COMMERCE",
  sourceReferenceType: "Order",
  sourceReferenceId: "order-1",
  counterpartyType: "SELLER",
  counterpartyId: SELLER_ID,
  nature: "COMMISSION",
  direction: "RECEIVABLE",
  status: "OPEN",
  originalAmount: "100.00",
  allocatedAmount: "0.00",
  settledAmount: "0.00",
  remainingAmount: "100.00",
  effectiveAt: now(),
  dueAt: null,
  holdReason: null,
  version: 1,
  createdAt: now(),
  updatedAt: now(),
});
logAudit("finance.obligation.create", "FinancialObligation", seedObligationId, { nature: "COMMISSION", direction: "RECEIVABLE" });

const seedFeeRuleId = "fee-rule-seed-1";
feeRules.set(seedFeeRuleId, {
  id: seedFeeRuleId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  countryCode: "MA",
  currencyId: CURRENCY_ID,
  currencyCode: "MAD",
  type: "CONFIRMATION",
  scopeType: "COUNTRY",
  calculationType: "PERCENTAGE",
  sourceDomain: "COMMERCE",
  counterpartyType: "SELLER",
  serviceCode: null,
  sellerId: null,
  cityId: null,
  zoneId: null,
  subZoneId: null,
  fixedAmount: null,
  percentageRate: "2.5000",
  percentageBase: "amount",
  minimumAmount: "1.00",
  maximumAmount: "50.00",
  priority: 1,
  version: 1,
  workflowStatus: "APPROVED",
  status: "ACTIVE",
  validFrom: now(),
  validTo: null,
});
logAudit("finance.fee_rule.create", "FeeRule", seedFeeRuleId, { type: "CONFIRMATION" });

const seedFeeAssessmentId = "fee-assessment-seed-1";
feeAssessments.set(seedFeeAssessmentId, {
  id: seedFeeAssessmentId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  countryCode: "MA",
  currencyId: CURRENCY_ID,
  currency: "MAD",
  currencyCode: "MAD",
  financialObligationId: seedObligationId,
  orderId: "order-1",
  type: "CONFIRMATION",
  amount: "2.50",
  sourceFeeRuleId: seedFeeRuleId,
  ruleVersion: 1,
  calculationType: "PERCENTAGE",
  fixedAmount: null,
  percentageRate: "2.5000",
  percentageBase: "amount",
  minimumAmount: "1.00",
  maximumAmount: "50.00",
  sourceDomain: "COMMERCE",
  sourceReferenceType: "Order",
  sourceReferenceId: "order-1",
  counterpartyType: "SELLER",
  counterpartyId: SELLER_ID,
  status: "ASSESSED",
  effectiveAt: now(),
  createdAt: now(),
});
logAudit("finance.fee.assess", "FinanceFeeAssessment", seedFeeAssessmentId, { type: "CONFIRMATION" });

const seedDocumentId = "document-seed-1";
documents.set(seedDocumentId, {
  id: seedDocumentId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  currencyId: CURRENCY_ID,
  currency: "MAD",
  documentNumber: "INV-0001",
  documentType: "INVOICE",
  counterpartyType: "SELLER",
  counterpartyId: SELLER_ID,
  periodStart: now(),
  periodEnd: now(),
  status: "GENERATED",
  grossAmount: "100.00",
  feeAmount: "2.50",
  expenseAmount: "0.00",
  bonusAmount: "0.00",
  refundAmount: "0.00",
  withholdingAmount: "0.00",
  netAmount: "97.50",
  paidAmount: "0.00",
  remainingAmount: "97.50",
  approvedByActorId: null,
  approvedAt: null,
  voidedByActorId: null,
  voidedAt: null,
  voidReason: null,
  version: 1,
  lines: [{ id: "doc-line-1", type: "FEE", descriptionCode: "CONFIRMATION_FEE", sourceDomain: "COMMERCE", sourceReferenceType: "Order", sourceReferenceId: "order-1", obligationId: seedObligationId, feeAssessmentId: seedFeeAssessmentId, adjustmentId: null, amount: "2.50", currency: "MAD" }],
  createdAt: now(),
  updatedAt: now(),
});
logAudit("finance.document.generate", "FinancialDocument", seedDocumentId, { documentType: "INVOICE" });

const seedStatementId = "document-statement-seed-1";
documents.set(seedStatementId, {
  ...documents.get(seedDocumentId),
  id: seedStatementId,
  documentNumber: "STMT-0001",
  documentType: "STATEMENT",
  status: "APPROVED",
  approvedByActorId: "actor-finance-1",
  approvedAt: now(),
  lines: [{ id: "stmt-line-1", type: "SETTLEMENT", descriptionCode: "SELLER_STATEMENT", sourceDomain: "COMMERCE", sourceReferenceType: "Settlement", sourceReferenceId: "settlement-1", obligationId: seedObligationId, feeAssessmentId: null, adjustmentId: null, amount: "97.50", currency: "MAD" }],
});
logAudit("finance.document.generate", "FinancialDocument", seedStatementId, { documentType: "STATEMENT" });

const seedAdjustmentId = "adjustment-seed-1";
adjustments.set(seedAdjustmentId, {
  id: seedAdjustmentId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  currencyId: CURRENCY_ID,
  currency: "MAD",
  counterpartyType: "SELLER",
  counterpartyId: SELLER_ID,
  sourceDomain: "COMMERCE",
  sourceReferenceType: "Order",
  sourceReferenceId: "order-1",
  type: "EXPENSE",
  status: "SUBMITTED",
  amount: "10.00",
  reasonCode: "COURIER_FEE",
  reason: "Courier reimbursement for return shipment",
  attachmentReference: null,
  createdByActorId: "actor-finance-1",
  submittedByActorId: "actor-finance-1",
  approvedByActorId: null,
  appliedObligationId: null,
  createdAt: now(),
  updatedAt: now(),
});
logAudit("finance.adjustment.create", "FinancialAdjustment", seedAdjustmentId, { type: "EXPENSE" });

const seedDisputeId = "dispute-seed-1";
disputes.set(seedDisputeId, {
  id: seedDisputeId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  obligationId: seedObligationId,
  status: "OPEN",
  reasonCode: "AMOUNT_MISMATCH",
  reason: "Seller disputes the commission amount",
  openedByActorId: "actor-finance-1",
  resolvedByActorId: null,
  resolution: null,
  resolutionReason: null,
  adjustmentId: null,
  openedAt: now(),
  resolvedAt: null,
});
logAudit("finance.dispute.create", "FinancialDispute", seedDisputeId, { reasonCode: "AMOUNT_MISMATCH" });

const seedPaymentMethodId = "payment-method-seed-1";
paymentMethods.set(seedPaymentMethodId, {
  id: seedPaymentMethodId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  currencyId: CURRENCY_ID,
  counterpartyType: "SELLER",
  counterpartyId: SELLER_ID,
  type: "BANK_ACCOUNT",
  providerCode: "DEMO_BANK",
  displayLabel: "Seller main account",
  destinationMasked: "IBAN •••• 9012",
  destinationFingerprint: "fp-seed-not-rendered",
  sensitiveReference: "vault:seed-reference-123456",
  status: "PENDING_VERIFICATION",
  version: 1,
  createdByActorId: "actor-finance-1",
  approvedByActorId: null,
  approvedAt: null,
  suspendedAt: null,
  revokedAt: null,
  createdAt: now(),
  updatedAt: now(),
});
logAudit("finance.payment_method.create", "FinancePaymentMethod", seedPaymentMethodId, { type: "BANK_ACCOUNT", providerCode: "DEMO_BANK" });

const seedPayoutId = "payout-seed-1";
payouts.set(seedPayoutId, {
  id: seedPayoutId,
  organizationId: ORG_ID,
  countryId: COUNTRY_ID,
  currencyId: CURRENCY_ID,
  counterpartyType: "SELLER",
  counterpartyId: SELLER_ID,
  paymentMethodId: seedPaymentMethodId,
  paymentMethodVersion: 1,
  destinationMasked: "IBAN •••• 9012",
  code: "PO-0001",
  status: "PROPOSED",
  totalAmount: "97.50",
  createdByActorId: "actor-finance-1",
  approvedByActorId: null,
  firstApprovedByActorId: null,
  finalApprovedByActorId: null,
  exportedByActorId: null,
  sentByActorId: null,
  paidByActorId: null,
  failedByActorId: null,
  cancelledByActorId: null,
  reconciledByActorId: null,
  approvedAt: null,
  firstApprovedAt: null,
  finalApprovedAt: null,
  exportReadyAt: null,
  sentAt: null,
  paidAt: null,
  failedAt: null,
  cancelledAt: null,
  reconciledAt: null,
  exportChecksum: null,
  exportLineCount: null,
  exportReference: null,
  externalReference: null,
  proofReference: null,
  failureCode: null,
  failureReason: null,
  retryCount: 0,
  cancelReason: null,
  reconciliationReference: null,
  paymentMethod: { id: seedPaymentMethodId, status: "PENDING_VERIFICATION", version: 1, destinationMasked: "IBAN •••• 9012" },
  lines: [{ id: "payout-line-1", recipientId: SELLER_ID, orderId: "order-1", financialObligationId: seedObligationId, paymentMethodId: seedPaymentMethodId, paymentMethodVersion: 1, destinationMasked: "IBAN •••• 9012", amount: "97.50", status: "PROPOSED", settledAt: null, createdAt: now() }],
  holds: [],
  approvals: [],
  attempts: [],
  paymentProofs: [],
  createdAt: now(),
  updatedAt: now(),
});
logAudit("finance.payout.prepare", "PayoutBatch", seedPayoutId, { status: "PROPOSED" });

function clonePayout(id, status, extra = {}) {
  const base = payouts.get(seedPayoutId);
  payouts.set(id, {
    ...base,
    id,
    code: `PO-${id.replace("payout-", "").slice(0, 12)}`,
    status,
    holds: [],
    approvals: [],
    attempts: [],
    paymentProofs: [],
    lines: base.lines.map((line) => ({ ...line, id: `${id}-line-1`, status })),
    createdAt: now(),
    updatedAt: now(),
    ...extra,
  });
}

clonePayout("payout-hold-seed-1", "ON_HOLD", {
  holds: [{ id: "hold-seed-1", financialObligationId: seedObligationId, type: "DISPUTE", status: "ACTIVE", reason: "Seller dispute review", createdByActorId: "actor-finance-1", releasedByActorId: null, releasedAt: null, releaseReason: null, createdAt: now() }],
});
clonePayout("payout-first-seed-1", "PENDING_FIRST_APPROVAL");
clonePayout("payout-final-seed-1", "PENDING_FINAL_APPROVAL", {
  firstApprovedByActorId: "actor-finance-2",
  firstApprovedAt: now(),
  approvals: [{ id: "approval-first-seed-1", stage: "FIRST", decision: "APPROVED", actorId: "actor-finance-2", reason: "First check complete", createdAt: now() }],
});
clonePayout("payout-approved-seed-1", "APPROVED");
clonePayout("payout-export-ready-seed-1", "EXPORT_READY", { exportReadyAt: now(), exportChecksum: "export-ready-checksum", exportLineCount: 1 });
clonePayout("payout-sent-paid-seed-1", "SENT", { sentAt: now(), externalReference: "bank-sent-1" });
clonePayout("payout-sent-failed-seed-1", "SENT", { sentAt: now(), externalReference: "bank-sent-2" });
clonePayout("payout-failed-seed-1", "FAILED", { failedAt: now(), failureCode: "BANK_TIMEOUT", failureReason: "Provider timeout", retryCount: 1 });
clonePayout("payout-paid-seed-1", "PAID", { paidAt: now(), proofReference: "proof-seed-1" });

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

/**
 * The 10 report types are all backed by real underlying state (the same
 * maps the dedicated endpoints use) -- mirrors the real backend's
 * FinanceConsumerService.report(), which projects each domain's own rows
 * rather than maintaining a separate report-only dataset. Returns null for
 * an unsupported reportType, matching the real backend's 400 response.
 */
function reportRows(reportType) {
  const withoutDocumentLines = (doc) => {
    const rest = { ...doc };
    delete rest.lines;
    return rest;
  };
  const withoutPayoutDetail = (payout) => {
    const rest = { ...payout };
    delete rest.lines;
    delete rest.holds;
    delete rest.approvals;
    delete rest.attempts;
    delete rest.paymentProofs;
    delete rest.paymentMethod;
    return rest;
  };
  const withoutSensitivePaymentFields = (paymentMethod) => {
    const rest = { ...paymentMethod };
    delete rest.destinationFingerprint;
    delete rest.sensitiveReference;
    return rest;
  };

  switch (reportType) {
    case "cod":
      return codCollections;
    case "cash-sessions":
      return [...sessions.values()];
    case "variances":
      return [...variances.values()];
    case "reconciliations":
      return [...reconciliations.values()];
    case "fees":
      return [...feeAssessments.values()].map((row) => ({
        id: row.id, organizationId: row.organizationId, countryId: row.countryId, countryCode: row.countryCode,
        currencyId: row.currencyId, currencyCode: row.currencyCode, financialObligationId: row.financialObligationId,
        type: row.type, amount: row.amount, sourceDomain: row.sourceDomain, sourceReferenceType: row.sourceReferenceType,
        sourceReferenceId: row.sourceReferenceId, counterpartyType: row.counterpartyType, counterpartyId: row.counterpartyId,
        status: row.status, effectiveAt: row.effectiveAt, createdAt: row.createdAt,
      }));
    case "invoices":
      return [...documents.values()].filter((doc) => doc.documentType === "INVOICE").map(withoutDocumentLines);
    case "obligations":
      return [...obligations.values()];
    case "payouts":
      return [...payouts.values()].map(withoutPayoutDetail);
    case "payment-method-status":
      return [...paymentMethods.values()].map(withoutSensitivePaymentFields);
    case "seller-settlements":
      return [...documents.values()].filter((doc) => doc.counterpartyType === "SELLER").map(withoutDocumentLines);
    default:
      return null;
  }
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

  // ---- Obligations -------------------------------------------------------
  if (method === "GET" && path === "/v1/finance/obligations") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const status = url.searchParams.get("status");
    const items = [...obligations.values()].filter((item) => !status || item.status === status);
    return send(res, 200, { items, total: items.length, page: 1, pageSize: 25 });
  }

  if (method === "POST" && path === "/v1/finance/obligations") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `obligation-${randomUUID()}`;
    const record = {
      id,
      organizationId: body.organizationId,
      countryId: body.countryId,
      currencyId: body.currencyId,
      currency: "MAD",
      sourceDomain: body.sourceDomain,
      sourceReferenceType: body.sourceReferenceType,
      sourceReferenceId: body.sourceReferenceId,
      counterpartyType: body.counterpartyType,
      counterpartyId: body.counterpartyId,
      nature: body.nature,
      direction: body.direction,
      status: "OPEN",
      originalAmount: body.originalAmount,
      allocatedAmount: "0.00",
      settledAmount: "0.00",
      remainingAmount: body.originalAmount,
      effectiveAt: body.effectiveAt ?? now(),
      dueAt: body.dueAt ?? null,
      holdReason: null,
      version: 1,
      createdAt: now(),
      updatedAt: now(),
    };
    obligations.set(id, record);
    logAudit("finance.obligation.create", "FinancialObligation", id, { nature: body.nature });
    return send(res, 201, record);
  }

  const obligationDetailMatch = path.match(/^\/v1\/finance\/obligations\/([^/]+)$/);
  if (method === "GET" && obligationDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = obligations.get(obligationDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const obligationAllocateMatch = path.match(/^\/v1\/finance\/obligations\/([^/]+)\/allocations$/);
  if (method === "POST" && obligationAllocateMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = obligations.get(obligationAllocateMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    const allocated = (Number(found.allocatedAmount) + Number(body.amount)).toFixed(2);
    const remaining = (Number(found.originalAmount) - Number(allocated)).toFixed(2);
    found.allocatedAmount = allocated;
    found.remainingAmount = remaining;
    found.status = Number(remaining) <= 0 ? "ALLOCATED" : "PARTIALLY_ALLOCATED";
    found.version += 1;
    found.updatedAt = now();
    logAudit("finance.obligation.allocate", "FinancialObligationAllocation", found.id, { allocationType: body.allocationType, amount: body.amount });
    return send(res, 201, found);
  }

  // ---- Fee rules & fee assessments ----------------------------------------
  if (method === "POST" && path === "/v1/finance/fee-rules") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `fee-rule-${randomUUID()}`;
    const record = { id, organizationId: body.organizationId, countryId: body.countryId, countryCode: body.countryCode, currencyId: body.currencyId, currencyCode: "MAD", type: body.type, scopeType: body.scopeType, calculationType: body.calculationType, sourceDomain: body.sourceDomain ?? null, counterpartyType: body.counterpartyType ?? null, serviceCode: body.serviceCode ?? null, sellerId: body.sellerId ?? null, cityId: body.cityId ?? null, zoneId: body.zoneId ?? null, subZoneId: body.subZoneId ?? null, fixedAmount: body.fixedAmount ?? null, percentageRate: body.percentageRate ?? null, percentageBase: body.percentageBase ?? null, minimumAmount: body.minimumAmount ?? null, maximumAmount: body.maximumAmount ?? null, priority: body.priority ?? 0, version: 1, workflowStatus: "DRAFT", status: "ACTIVE", validFrom: body.validFrom ?? now(), validTo: body.validTo ?? null };
    feeRules.set(id, record);
    logAudit("finance.fee_rule.create", "FeeRule", id, { type: body.type });
    return send(res, 201, record);
  }

  const feeRuleDetailMatch = path.match(/^\/v1\/finance\/fee-rules\/([^/]+)$/);
  if (method === "GET" && feeRuleDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = feeRules.get(feeRuleDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  if (method === "POST" && path === "/v1/finance/fee-assessments") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const obligation = obligations.get(body.obligationId);
    const id = `fee-assessment-${randomUUID()}`;
    const record = { id, organizationId: obligation?.organizationId ?? ORG_ID, countryId: obligation?.countryId ?? COUNTRY_ID, countryCode: "MA", currencyId: obligation?.currencyId ?? CURRENCY_ID, currency: "MAD", currencyCode: "MAD", financialObligationId: body.obligationId, orderId: "order-1", type: body.type, amount: "1.00", sourceFeeRuleId: seedFeeRuleId, ruleVersion: 1, calculationType: "FIXED", fixedAmount: "1.00", percentageRate: null, percentageBase: body.percentageBase ?? null, minimumAmount: null, maximumAmount: null, sourceDomain: obligation?.sourceDomain ?? "COMMERCE", sourceReferenceType: obligation?.sourceReferenceType ?? "Order", sourceReferenceId: obligation?.sourceReferenceId ?? "order-1", counterpartyType: obligation?.counterpartyType ?? "SELLER", counterpartyId: obligation?.counterpartyId ?? SELLER_ID, status: "ASSESSED", effectiveAt: now(), createdAt: now() };
    feeAssessments.set(id, record);
    logAudit("finance.fee.assess", "FinanceFeeAssessment", id, { type: body.type });
    return send(res, 201, record);
  }

  const feeAssessmentDetailMatch = path.match(/^\/v1\/finance\/fee-assessments\/([^/]+)$/);
  if (method === "GET" && feeAssessmentDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = feeAssessments.get(feeAssessmentDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  // ---- Documents -----------------------------------------------------------
  if (method === "POST" && path === "/v1/finance/documents") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `document-${randomUUID()}`;
    const record = { id, organizationId: body.organizationId, countryId: body.countryId, currencyId: body.currencyId, currency: "MAD", documentNumber: `INV-${String(documents.size + 1).padStart(4, "0")}`, documentType: body.documentType, counterpartyType: body.counterpartyType, counterpartyId: body.counterpartyId, periodStart: body.periodStart, periodEnd: body.periodEnd, status: "GENERATED", grossAmount: "0.00", feeAmount: "0.00", expenseAmount: "0.00", bonusAmount: "0.00", refundAmount: "0.00", withholdingAmount: "0.00", netAmount: "0.00", paidAmount: "0.00", remainingAmount: "0.00", approvedByActorId: null, approvedAt: null, voidedByActorId: null, voidedAt: null, voidReason: null, version: 1, lines: [], createdAt: now(), updatedAt: now() };
    documents.set(id, record);
    logAudit("finance.document.generate", "FinancialDocument", id, { documentType: body.documentType });
    return send(res, 201, record);
  }

  const documentDetailMatch = path.match(/^\/v1\/finance\/documents\/([^/]+)$/);
  if (method === "GET" && documentDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = documents.get(documentDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const documentApproveMatch = path.match(/^\/v1\/finance\/documents\/([^/]+)\/approve$/);
  if (method === "POST" && documentApproveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = documents.get(documentApproveMatch[1]);
    if (!found) return notFound(res);
    found.status = "APPROVED";
    found.approvedByActorId = "actor-finance-1";
    found.approvedAt = now();
    logAudit("finance.document.approve", "FinancialDocument", found.id, {});
    return send(res, 200, found);
  }

  const documentVoidMatch = path.match(/^\/v1\/finance\/documents\/([^/]+)\/void$/);
  if (method === "POST" && documentVoidMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = documents.get(documentVoidMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "VOIDED";
    found.voidedByActorId = "actor-finance-1";
    found.voidedAt = now();
    found.voidReason = body.reason;
    logAudit("finance.document.void", "FinancialDocument", found.id, { reason: body.reason });
    return send(res, 200, found);
  }

  // ---- Adjustments -----------------------------------------------------------
  if (method === "POST" && path === "/v1/finance/adjustments") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `adjustment-${randomUUID()}`;
    const record = { id, organizationId: body.organizationId, countryId: body.countryId, currencyId: body.currencyId, currency: "MAD", counterpartyType: body.counterpartyType, counterpartyId: body.counterpartyId, sourceDomain: body.sourceDomain, sourceReferenceType: body.sourceReferenceType, sourceReferenceId: body.sourceReferenceId, type: body.type, status: "SUBMITTED", amount: body.amount, reasonCode: body.reasonCode, reason: body.reason, attachmentReference: body.attachmentReference ?? null, createdByActorId: "actor-finance-1", submittedByActorId: "actor-finance-1", approvedByActorId: null, appliedObligationId: null, createdAt: now(), updatedAt: now() };
    adjustments.set(id, record);
    logAudit("finance.adjustment.create", "FinancialAdjustment", id, { type: body.type });
    return send(res, 201, record);
  }

  const adjustmentDetailMatch = path.match(/^\/v1\/finance\/adjustments\/([^/]+)$/);
  if (method === "GET" && adjustmentDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = adjustments.get(adjustmentDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const adjustmentApproveMatch = path.match(/^\/v1\/finance\/adjustments\/([^/]+)\/approve$/);
  if (method === "POST" && adjustmentApproveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = adjustments.get(adjustmentApproveMatch[1]);
    if (!found) return notFound(res);
    found.status = "APPROVED";
    found.approvedByActorId = "actor-finance-1";
    logAudit("finance.adjustment.approve", "FinancialAdjustment", found.id, {});
    return send(res, 200, found);
  }

  const adjustmentRejectMatch = path.match(/^\/v1\/finance\/adjustments\/([^/]+)\/reject$/);
  if (method === "POST" && adjustmentRejectMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = adjustments.get(adjustmentRejectMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "REJECTED";
    logAudit("finance.adjustment.reject", "FinancialAdjustment", found.id, { reason: body.reason });
    return send(res, 200, found);
  }

  const adjustmentApplyMatch = path.match(/^\/v1\/finance\/adjustments\/([^/]+)\/apply$/);
  if (method === "POST" && adjustmentApplyMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = adjustments.get(adjustmentApplyMatch[1]);
    if (!found) return notFound(res);
    found.status = "APPLIED";
    found.appliedObligationId = `obligation-${randomUUID()}`;
    logAudit("finance.adjustment.apply", "FinancialAdjustment", found.id, {});
    return send(res, 200, found);
  }

  // ---- Disputes --------------------------------------------------------------
  if (method === "POST" && path === "/v1/finance/disputes") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const obligation = obligations.get(body.obligationId);
    const id = `dispute-${randomUUID()}`;
    const record = { id, organizationId: obligation?.organizationId ?? ORG_ID, countryId: obligation?.countryId ?? COUNTRY_ID, obligationId: body.obligationId, status: "OPEN", reasonCode: body.reasonCode, reason: body.reason, openedByActorId: "actor-finance-1", resolvedByActorId: null, resolution: null, resolutionReason: null, adjustmentId: null, openedAt: now(), resolvedAt: null };
    disputes.set(id, record);
    if (obligation) {
      obligation.status = "ON_HOLD";
      obligation.holdReason = body.reasonCode;
    }
    logAudit("finance.dispute.create", "FinancialDispute", id, { reasonCode: body.reasonCode });
    return send(res, 201, record);
  }

  const disputeDetailMatch = path.match(/^\/v1\/finance\/disputes\/([^/]+)$/);
  if (method === "GET" && disputeDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = disputes.get(disputeDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const disputeResolveMatch = path.match(/^\/v1\/finance\/disputes\/([^/]+)\/resolve$/);
  if (method === "POST" && disputeResolveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = disputes.get(disputeResolveMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "RESOLVED";
    found.resolution = body.resolution;
    found.resolutionReason = body.reason;
    found.resolvedByActorId = "actor-finance-1";
    found.adjustmentId = body.adjustmentId ?? null;
    found.resolvedAt = now();
    const obligation = obligations.get(found.obligationId);
    if (obligation && obligation.status === "ON_HOLD") {
      obligation.status = "OPEN";
      obligation.holdReason = null;
    }
    logAudit("finance.dispute.resolve", "FinancialDispute", found.id, { resolution: body.resolution });
    return send(res, 200, found);
  }

  // ---- Payment methods ---------------------------------------------------
  if (method === "GET" && path === "/v1/finance/payment-methods") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const status = url.searchParams.get("status");
    const items = [...paymentMethods.values()].filter((item) => !status || item.status === status);
    return send(res, 200, { items, total: items.length, page: 1, pageSize: 25 });
  }

  if (method === "POST" && path === "/v1/finance/payment-methods") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `payment-method-${randomUUID()}`;
    const record = { id, organizationId: body.organizationId, countryId: body.countryId, currencyId: body.currencyId, counterpartyType: body.counterpartyType, counterpartyId: body.counterpartyId, type: body.type, providerCode: body.providerCode, displayLabel: body.displayLabel, destinationMasked: body.destinationMasked, destinationFingerprint: `fp-${randomUUID()}`, sensitiveReference: body.sensitiveReference, status: "PENDING_VERIFICATION", version: 1, createdByActorId: "actor-finance-1", approvedByActorId: null, approvedAt: null, suspendedAt: null, revokedAt: null, createdAt: now(), updatedAt: now() };
    paymentMethods.set(id, record);
    logAudit("finance.payment_method.create", "FinancePaymentMethod", id, { type: body.type, providerCode: body.providerCode });
    return send(res, 201, record);
  }

  const paymentMethodSensitiveMatch = path.match(/^\/v1\/finance\/payment-methods\/([^/]+)\/sensitive-reference$/);
  if (method === "GET" && paymentMethodSensitiveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = paymentMethods.get(paymentMethodSensitiveMatch[1]);
    if (!found) return notFound(res);
    logAudit("finance.payment_method.sensitive_reference.read", "FinancePaymentMethod", found.id, { counterpartyType: found.counterpartyType, version: found.version });
    return send(res, 200, { id: found.id, sensitiveReference: found.sensitiveReference, status: found.status, version: found.version });
  }

  const paymentMethodDetailMatch = path.match(/^\/v1\/finance\/payment-methods\/([^/]+)$/);
  if (method === "GET" && paymentMethodDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = paymentMethods.get(paymentMethodDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const paymentMethodApproveMatch = path.match(/^\/v1\/finance\/payment-methods\/([^/]+)\/approve$/);
  if (method === "POST" && paymentMethodApproveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = paymentMethods.get(paymentMethodApproveMatch[1]);
    if (!found) return notFound(res);
    found.status = "ACTIVE";
    found.approvedByActorId = "actor-finance-1";
    found.approvedAt = now();
    found.version += 1;
    logAudit("finance.payment_method.approve", "FinancePaymentMethod", found.id, {});
    return send(res, 200, found);
  }

  const paymentMethodSuspendMatch = path.match(/^\/v1\/finance\/payment-methods\/([^/]+)\/suspend$/);
  if (method === "POST" && paymentMethodSuspendMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = paymentMethods.get(paymentMethodSuspendMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "SUSPENDED";
    found.suspendedAt = now();
    logAudit("finance.payment_method.suspend", "FinancePaymentMethod", found.id, { reason: body.reason });
    return send(res, 200, found);
  }

  const paymentMethodRevokeMatch = path.match(/^\/v1\/finance\/payment-methods\/([^/]+)\/revoke$/);
  if (method === "POST" && paymentMethodRevokeMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = paymentMethods.get(paymentMethodRevokeMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "REVOKED";
    found.revokedAt = now();
    logAudit("finance.payment_method.revoke", "FinancePaymentMethod", found.id, { reason: body.reason });
    return send(res, 200, found);
  }

  // ---- Payouts ---------------------------------------------------------------
  if (method === "POST" && path === "/v1/finance/payouts") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const body = await readBody(req);
    const id = `payout-${randomUUID()}`;
    const paymentMethod = paymentMethods.get(body.paymentMethodId);
    const record = {
      id, organizationId: body.organizationId, countryId: body.countryId, currencyId: body.currencyId,
      counterpartyType: body.counterpartyType, counterpartyId: body.counterpartyId,
      paymentMethodId: body.paymentMethodId, paymentMethodVersion: paymentMethod?.version ?? 1,
      destinationMasked: paymentMethod?.destinationMasked ?? "—",
      code: body.code ?? `PO-${String(payouts.size + 1).padStart(4, "0")}`,
      status: "PROPOSED", totalAmount: "0.00",
      createdByActorId: "actor-finance-1", approvedByActorId: null, firstApprovedByActorId: null, finalApprovedByActorId: null,
      exportedByActorId: null, sentByActorId: null, paidByActorId: null, failedByActorId: null, cancelledByActorId: null, reconciledByActorId: null,
      approvedAt: null, firstApprovedAt: null, finalApprovedAt: null, exportReadyAt: null, sentAt: null, paidAt: null, failedAt: null, cancelledAt: null, reconciledAt: null,
      exportChecksum: null, exportLineCount: null, exportReference: null, externalReference: null, proofReference: null,
      failureCode: null, failureReason: null, retryCount: 0, cancelReason: null, reconciliationReference: null,
      paymentMethod: paymentMethod ? { id: paymentMethod.id, status: paymentMethod.status, version: paymentMethod.version, destinationMasked: paymentMethod.destinationMasked } : null,
      lines: (body.obligationIds ?? []).map((obligationId) => ({ id: `payout-line-${randomUUID()}`, recipientId: body.counterpartyId, orderId: "order-1", financialObligationId: obligationId, paymentMethodId: body.paymentMethodId, paymentMethodVersion: paymentMethod?.version ?? 1, destinationMasked: paymentMethod?.destinationMasked ?? "—", amount: obligations.get(obligationId)?.remainingAmount ?? "0.00", status: "PROPOSED", settledAt: null, createdAt: now() })),
      holds: [], approvals: [], attempts: [], paymentProofs: [], createdAt: now(), updatedAt: now(),
    };
    record.totalAmount = record.lines.reduce((sum, line) => (Number(sum) + Number(line.amount)).toFixed(2), "0.00");
    payouts.set(id, record);
    logAudit("finance.payout.prepare", "PayoutBatch", id, { status: "PROPOSED" });
    return send(res, 201, record);
  }

  const payoutDetailMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)$/);
  if (method === "GET" && payoutDetailMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutDetailMatch[1]);
    if (!found) return notFound(res);
    return send(res, 200, found);
  }

  const payoutHoldMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/holds$/);
  if (method === "POST" && payoutHoldMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutHoldMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    const hold = { id: `hold-${randomUUID()}`, financialObligationId: body.obligationId ?? null, type: body.type, status: "ACTIVE", reason: body.reason, createdByActorId: "actor-finance-1", releasedByActorId: null, releasedAt: null, releaseReason: null, createdAt: now() };
    found.holds.push(hold);
    found.status = "ON_HOLD";
    logAudit("finance.payout.hold", "PayoutHold", hold.id, { type: body.type });
    return send(res, 201, found);
  }

  const payoutReleaseHoldMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/holds\/([^/]+)\/release$/);
  if (method === "POST" && payoutReleaseHoldMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutReleaseHoldMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    const hold = found.holds.find((h) => h.id === payoutReleaseHoldMatch[2]);
    if (!hold) return notFound(res);
    hold.status = "RELEASED";
    hold.releasedByActorId = "actor-finance-1";
    hold.releasedAt = now();
    hold.releaseReason = body.reason;
    if (found.holds.every((h) => h.status === "RELEASED")) {
      found.status = "PROPOSED";
    }
    logAudit("finance.payout.hold.release", "PayoutHold", hold.id, { reason: body.reason });
    return send(res, 200, found);
  }

  const payoutFirstApproveMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/first-approve$/);
  if (method === "POST" && payoutFirstApproveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutFirstApproveMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.approvals.push({ id: `approval-${randomUUID()}`, stage: "FIRST", decision: "APPROVED", actorId: "actor-finance-1", reason: body.reason ?? null, createdAt: now() });
    found.firstApprovedByActorId = "actor-finance-1";
    found.firstApprovedAt = now();
    found.status = "PENDING_FINAL_APPROVAL";
    logAudit("finance.payout.first_approve", "PayoutBatch", found.id, {});
    return send(res, 200, found);
  }

  const payoutFinalApproveMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/final-approve$/);
  if (method === "POST" && payoutFinalApproveMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutFinalApproveMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.approvals.push({ id: `approval-${randomUUID()}`, stage: "FINAL", decision: "APPROVED", actorId: "actor-finance-1", reason: body.reason ?? null, createdAt: now() });
    found.finalApprovedByActorId = "actor-finance-1";
    found.finalApprovedAt = now();
    found.status = "APPROVED";
    logAudit("finance.payout.final_approve", "PayoutBatch", found.id, {});
    return send(res, 200, found);
  }

  const payoutExportMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/export$/);
  if (method === "POST" && payoutExportMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutExportMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "EXPORT_READY";
    found.exportReadyAt = now();
    found.exportedByActorId = "actor-finance-1";
    found.exportReference = body.exportReference ?? `export-${randomUUID()}`;
    found.exportChecksum = createHash("sha256").update(found.id).digest("hex");
    found.exportLineCount = found.lines.length;
    logAudit("finance.payout.export", "PayoutBatch", found.id, {});
    return send(res, 200, found);
  }

  const payoutSentMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/sent$/);
  if (method === "POST" && payoutSentMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutSentMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "SENT";
    found.sentAt = now();
    found.sentByActorId = "actor-finance-1";
    found.externalReference = body.externalReference ?? null;
    found.attempts.push({ id: `attempt-${randomUUID()}`, attemptNumber: found.attempts.length + 1, status: "SENT", exportChecksum: found.exportChecksum, externalReference: found.externalReference, errorCode: null, reason: null, nextAttemptAt: null, createdByActorId: "actor-finance-1", createdAt: now() });
    logAudit("finance.payout.mark_sent", "PayoutBatch", found.id, {});
    return send(res, 200, found);
  }

  const payoutPaidMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/paid$/);
  if (method === "POST" && payoutPaidMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutPaidMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "PAID";
    found.paidAt = now();
    found.paidByActorId = "actor-finance-1";
    found.proofReference = body.proofReference;
    found.paymentProofs.push({ id: `proof-${randomUUID()}`, proofReference: body.proofReference, checksum: body.checksum ?? null, mimeType: body.mimeType ?? null, size: body.size ?? null, active: true, createdByActorId: "actor-finance-1", createdAt: now() });
    logAudit("finance.payout.mark_paid", "PayoutBatch", found.id, {});
    return send(res, 200, found);
  }

  const payoutFailedMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/failed$/);
  if (method === "POST" && payoutFailedMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutFailedMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "FAILED";
    found.failedAt = now();
    found.failedByActorId = "actor-finance-1";
    found.failureCode = body.errorCode;
    found.failureReason = body.reason;
    found.attempts.push({ id: `attempt-${randomUUID()}`, attemptNumber: found.attempts.length + 1, status: "FAILED", exportChecksum: found.exportChecksum, externalReference: body.externalReference ?? null, errorCode: body.errorCode, reason: body.reason, nextAttemptAt: body.nextAttemptAt ?? null, createdByActorId: "actor-finance-1", createdAt: now() });
    logAudit("finance.payout.mark_failed", "PayoutBatch", found.id, { errorCode: body.errorCode });
    return send(res, 200, found);
  }

  const payoutRetryMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/retry$/);
  if (method === "POST" && payoutRetryMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutRetryMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "EXPORT_READY";
    found.retryCount += 1;
    found.failureCode = null;
    found.failureReason = null;
    if (body.paymentMethodId) found.paymentMethodId = body.paymentMethodId;
    logAudit("finance.payout.retry", "PayoutBatch", found.id, { reason: body.reason });
    return send(res, 200, found);
  }

  const payoutCancelMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/cancel$/);
  if (method === "POST" && payoutCancelMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutCancelMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "CANCELLED";
    found.cancelledAt = now();
    found.cancelledByActorId = "actor-finance-1";
    found.cancelReason = body.reason;
    logAudit("finance.payout.cancel", "PayoutBatch", found.id, { reason: body.reason });
    return send(res, 200, found);
  }

  const payoutReconcileMatch = path.match(/^\/v1\/finance\/payouts\/([^/]+)\/reconcile$/);
  if (method === "POST" && payoutReconcileMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const found = payouts.get(payoutReconcileMatch[1]);
    if (!found) return notFound(res);
    const body = await readBody(req);
    found.status = "RECONCILED";
    found.reconciledAt = now();
    found.reconciledByActorId = "actor-finance-1";
    found.reconciliationReference = body.reconciliationReference;
    logAudit("finance.payout.reconcile", "PayoutBatch", found.id, {});
    return send(res, 200, found);
  }

  // ---- Reports ---------------------------------------------------------------
  const reportMatch = path.match(/^\/v1\/finance\/reports\/([^/]+)$/);
  if (method === "GET" && reportMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const reportType = reportMatch[1];
    const rows = reportRows(reportType);
    if (rows === null) return send(res, 400, { statusCode: 400, code: "UNSUPPORTED_REPORT_TYPE", message: "Unsupported Finance report type", correlationId: randomUUID() });
    const status = url.searchParams.get("status");
    const filtered = status ? rows.filter((row) => row.status === status) : rows;
    return send(res, 200, { reportType, items: filtered, total: filtered.length, page: 1, pageSize: 25, appliedFilters: { status: status ?? undefined }, generatedAt: now() });
  }

  const exportMatch = path.match(/^\/v1\/finance\/reports\/([^/]+)\/exports$/);
  if (method === "POST" && exportMatch) {
    if (!actorFromRequest(req)) return unauthorized(res);
    const reportType = exportMatch[1];
    const rows = reportRows(reportType);
    if (rows === null) return send(res, 400, { statusCode: 400, code: "UNSUPPORTED_REPORT_TYPE", message: "Unsupported Finance report type", correlationId: randomUUID() });
    const header = rows.length > 0 ? Object.keys(rows[0]) : [];
    const csvLines = [header.join(","), ...rows.map((row) => header.map((key) => JSON.stringify(row[key] ?? "")).join(","))];
    const content = csvLines.join("\n");
    const filename = `finance-${reportType}-${now().slice(0, 10)}.csv`;
    return send(res, 201, {
      reportType,
      format: "CSV",
      mimeType: "text/csv; charset=utf-8",
      filename,
      checksum: createHash("sha256").update(content, "utf8").digest("hex"),
      rowCount: rows.length,
      maxRows: 1000,
      content,
      appliedFilters: {},
    });
  }

  // ---- Audit -------------------------------------------------------------
  if (method === "GET" && path === "/v1/finance/audit") {
    if (!actorFromRequest(req)) return unauthorized(res);
    const actorId = url.searchParams.get("actorId");
    const action = url.searchParams.get("action");
    const resourceType = url.searchParams.get("resourceType");
    const resourceId = url.searchParams.get("resourceId");
    const items = auditEntries.filter((entry) => {
      if (actorId && entry.actorId !== actorId) return false;
      if (action && !entry.action.includes(action)) return false;
      if (resourceType && entry.resourceType !== resourceType) return false;
      if (resourceId && entry.resourceId !== resourceId) return false;
      return true;
    });
    return send(res, 200, { items, total: items.length, page: 1, pageSize: 25 });
  }

  return notFound(res);
});

server.listen(port, () => {
  console.log(`stub-api-server listening on ${port}`);
});
