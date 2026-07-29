import type { DomainDescriptor } from "./types";

/**
 * The 16 Finance navigation items, each gated by a real permission code from
 * noki-api's authorization catalog (src/modules/authorization/authorization.constants.ts).
 * The first 6 were delivered in Phase 4A (dashboard, COD, cash handovers,
 * cash sessions, cash variances, reconciliations); the remaining 10 are Phase
 * 4B modules connected to real Finance endpoints or explicit contract-limited
 * lookup/create flows -- never mock data. This registry also doubles as the app-level access gate
 * alongside hasAnyFinancePermission in (protected)/layout.tsx: an actor with
 * none of these capabilities never even reaches the shell.
 */
export const DOMAIN_REGISTRY: DomainDescriptor[] = [
  { id: "dashboard", labelKey: "navigation.dashboard", href: "/", capability: "finance.dashboard.read", implemented: true },
  { id: "cod", labelKey: "navigation.cod", href: "/cod", capability: "finance.executive.read", implemented: true },
  { id: "cash-handovers", labelKey: "navigation.cashHandovers", href: "/cash-handovers", capability: "finance.cash.read", implemented: true },
  { id: "cash-sessions", labelKey: "navigation.cashSessions", href: "/cash-sessions", capability: "finance.cash.read", implemented: true },
  { id: "cash-variances", labelKey: "navigation.cashVariances", href: "/cash-variances", capability: "finance.cash_variance.read", implemented: true },
  { id: "reconciliations", labelKey: "navigation.reconciliations", href: "/reconciliations", capability: "finance.cash.read", implemented: true },

  { id: "obligations", labelKey: "navigation.obligations", href: "/obligations", capability: "finance.obligation.read", implemented: true },
  { id: "fees", labelKey: "navigation.fees", href: "/fees", capability: "finance.fee.read", implemented: true },
  { id: "documents", labelKey: "navigation.documents", href: "/documents", capability: "finance.document.read", implemented: true },
  { id: "adjustments", labelKey: "navigation.adjustments", href: "/adjustments", capability: "finance.adjustment.read", implemented: true },
  { id: "disputes", labelKey: "navigation.disputes", href: "/disputes", capability: "finance.dispute.read", implemented: true },
  { id: "payouts", labelKey: "navigation.payouts", href: "/payouts", capability: "finance.payout.read", implemented: true },
  { id: "approvals", labelKey: "navigation.approvals", href: "/approvals", capability: ["finance.payout.first_approve", "finance.payout.final_approve"], implemented: true },
  { id: "payment-methods", labelKey: "navigation.paymentMethods", href: "/payment-methods", capability: "finance.payment_method.read", implemented: true },
  { id: "reports", labelKey: "navigation.reports", href: "/reports", capability: "finance.report.read", implemented: true },
  { id: "audit", labelKey: "navigation.audit", href: "/audit", capability: "finance.audit.read", implemented: true },
];
