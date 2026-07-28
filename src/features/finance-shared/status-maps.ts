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
