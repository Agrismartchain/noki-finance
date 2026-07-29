import type { BadgeTone } from "@agrismartchain/noki-design-system";

/**
 * Tone maps for the real backend enums (verified against noki-shared-contracts'
 * generated OpenAPI schema). Each function is a pure, testable presentational
 * mapping -- the translated label always comes from the caller's own
 * feature-namespaced messages (e.g. t("cod.status.DECLARED")), never
 * hardcoded here, per the "no raw technical codes without mapping" rule.
 */

/** AdminFinanceCodCollectionDto.status / CodCollectionResponseDto.status */
export function codCollectionStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DECLARED":
      return "info";
    case "REMITTED":
      return "warning";
    case "RECONCILED":
      return "success";
    case "VOIDED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** CashHandoverResponseDto.status */
export function cashHandoverStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "SUBMITTED":
      return "info";
    case "RECEIVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "CANCELLED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** CashSessionResponseDto.status */
export function cashSessionStatusTone(status: string): BadgeTone {
  switch (status) {
    case "OPEN":
      return "info";
    case "CLOSED":
      return "warning";
    case "RECONCILED":
      return "success";
    default:
      return "neutral";
  }
}

/** CashVarianceResponseDto.status */
export function cashVarianceStatusTone(status: string): BadgeTone {
  switch (status) {
    case "OPEN":
      return "danger";
    case "RESOLVED":
      return "success";
    case "WAIVED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** FinancialReconciliationResponseDto.status */
export function reconciliationStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "SUBMITTED":
      return "info";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

/** FinancialObligationStatus (prisma/schema.prisma) */
export function obligationStatusTone(status: string): BadgeTone {
  switch (status) {
    case "OPEN":
      return "info";
    case "PARTIALLY_ALLOCATED":
      return "warning";
    case "ALLOCATED":
      return "info";
    case "ON_HOLD":
      return "danger";
    case "PARTIALLY_SETTLED":
      return "warning";
    case "SETTLED":
      return "success";
    case "CANCELLED":
      return "neutral";
    case "REVERSED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** FeeRuleWorkflowStatus */
export function feeRuleWorkflowStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "PENDING_APPROVAL":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "SUSPENDED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** FinanceFeeAssessmentStatus */
export function feeAssessmentStatusTone(status: string): BadgeTone {
  switch (status) {
    case "ASSESSED":
      return "info";
    case "VOIDED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** FinancialDocumentStatus */
export function documentStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "GENERATED":
      return "info";
    case "SUBMITTED":
      return "warning";
    case "APPROVED":
      return "success";
    case "VOIDED":
      return "danger";
    default:
      return "neutral";
  }
}

/** FinancialAdjustmentStatus */
export function adjustmentStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "SUBMITTED":
      return "warning";
    case "APPROVED":
      return "info";
    case "REJECTED":
      return "danger";
    case "APPLIED":
      return "success";
    case "REVERSED":
      return "neutral";
    default:
      return "neutral";
  }
}

/** FinancialDisputeStatus */
export function disputeStatusTone(status: string): BadgeTone {
  switch (status) {
    case "OPEN":
      return "danger";
    case "RESOLVED":
      return "success";
    default:
      return "neutral";
  }
}

/** PayoutBatchStatus (prisma/schema.prisma) */
export function payoutStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DRAFT":
      return "neutral";
    case "PROPOSED":
      return "info";
    case "ON_HOLD":
      return "danger";
    case "PENDING_FIRST_APPROVAL":
      return "warning";
    case "PENDING_FINAL_APPROVAL":
      return "warning";
    case "APPROVED":
      return "info";
    case "EXPORT_READY":
      return "info";
    case "SENT":
      return "warning";
    case "PAID":
    case "MARKED_PAID":
      return "success";
    case "FAILED":
      return "danger";
    case "CANCELLED":
      return "neutral";
    case "RECONCILED":
      return "success";
    default:
      return "neutral";
  }
}

/** PaymentMethodStatus */
export function paymentMethodStatusTone(status: string): BadgeTone {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "warning";
    case "ACTIVE":
      return "success";
    case "SUSPENDED":
      return "danger";
    case "REVOKED":
      return "neutral";
    default:
      return "neutral";
  }
}
