import type { DomainDescriptor } from "./types";

/**
 * The 16 Finance navigation items, each gated by a real permission code from
 * noki-api's authorization catalog (src/modules/authorization/authorization.constants.ts).
 * The first 6 are fully implemented against real backend endpoints in Phase
 * 4A (dashboard, COD, cash handovers, cash sessions, cash variances,
 * reconciliations); the remaining 10 are Phase 4B modules, routed and
 * capability-gated today but rendered as a "coming soon" placeholder -- never
 * mock data. This registry also doubles as the app-level access gate
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

  { id: "obligations", labelKey: "navigation.obligations", href: "/obligations", capability: "finance.obligation.read", implemented: false },
  { id: "fees", labelKey: "navigation.fees", href: "/fees", capability: "finance.fee.read", implemented: false },
  { id: "documents", labelKey: "navigation.documents", href: "/documents", capability: "finance.document.read", implemented: false },
  { id: "adjustments", labelKey: "navigation.adjustments", href: "/adjustments", capability: "finance.adjustment.read", implemented: false },
  { id: "disputes", labelKey: "navigation.disputes", href: "/disputes", capability: "finance.dispute.read", implemented: false },
  { id: "payouts", labelKey: "navigation.payouts", href: "/payouts", capability: "finance.payout.read", implemented: false },
  { id: "approvals", labelKey: "navigation.approvals", href: "/approvals", capability: ["finance.payout.first_approve", "finance.payout.final_approve"], implemented: false },
  { id: "payment-methods", labelKey: "navigation.paymentMethods", href: "/payment-methods", capability: "finance.payment_method.read", implemented: false },
  { id: "reports", labelKey: "navigation.reports", href: "/reports", capability: "finance.report.read", implemented: false },
  { id: "audit", labelKey: "navigation.audit", href: "/audit", capability: "finance.audit.read", implemented: false },
];
