import { parsePage, parsePageSize } from "@/features/finance-shared/url-query";

const MAX_ACTOR_ID_LENGTH = 64;
const MAX_ACTION_LENGTH = 120;
const MAX_RESOURCE_TYPE_LENGTH = 80;
const MAX_RESOURCE_ID_LENGTH = 128;
const MAX_CORRELATION_ID_LENGTH = 120;
const MAX_RESULT_LENGTH = 40;

/** countryCode is 2-char and uppercased server-side (FinanceConsumerQueryDto, which FinanceAuditQueryDto extends). */
export function parseCountryCode(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : "";
}

/**
 * The 11 resourceType values currently written by the backend (verified
 * directly against finance-phase2.service.ts's audit-write calls). Offered
 * as datalist suggestions on an otherwise free-text input -- not rendered
 * as an exhaustive Select, since more resource types may exist and there
 * is no picklist endpoint for this field.
 */
export const AUDIT_RESOURCE_TYPE_SUGGESTIONS = [
  "FinancialObligation",
  "FinancialDocument",
  "FinancialAdjustment",
  "FinancialDispute",
  "PayoutBatch",
  "PayoutHold",
  "FinancePaymentMethod",
  "FeeRule",
  "FinanceFeeAssessment",
  "PayoutEligibilityPolicy",
  "FinancialObligationAllocation",
] as const;

export interface AuditListFilters {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  countryCode: string;
  correlationId: string;
  dateFrom: string;
  dateTo: string;
  /** Accepted by FinanceAuditQueryDto but currently has no effect on filtering server-side (verified) -- still URL-reflected since it is a real accepted param, not silently dropped. */
  result: string;
  page: number;
  pageSize: number;
}

export function parseAuditListFilters(searchParams: URLSearchParams): AuditListFilters {
  return {
    actorId: (searchParams.get("actorId") ?? "").trim().slice(0, MAX_ACTOR_ID_LENGTH),
    action: (searchParams.get("action") ?? "").trim().slice(0, MAX_ACTION_LENGTH),
    resourceType: (searchParams.get("resourceType") ?? "").trim().slice(0, MAX_RESOURCE_TYPE_LENGTH),
    resourceId: (searchParams.get("resourceId") ?? "").trim().slice(0, MAX_RESOURCE_ID_LENGTH),
    countryCode: parseCountryCode(searchParams.get("countryCode")),
    correlationId: (searchParams.get("correlationId") ?? "").trim().slice(0, MAX_CORRELATION_ID_LENGTH),
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    result: (searchParams.get("result") ?? "").trim().slice(0, MAX_RESULT_LENGTH),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildAuditListSearchParams(filters: AuditListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.action) params.set("action", filters.action);
  if (filters.resourceType) params.set("resourceType", filters.resourceType);
  if (filters.resourceId) params.set("resourceId", filters.resourceId);
  if (filters.countryCode) params.set("countryCode", filters.countryCode);
  if (filters.correlationId) params.set("correlationId", filters.correlationId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.result) params.set("result", filters.result);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}

/**
 * Defense-in-depth check applied when rendering an audit entry's metadata
 * object. No metadata key matching this pattern is currently expected
 * (every `metadata: {...}` write in finance-phase2.service.ts was verified
 * to exclude these), but a key matching it is still hidden, never rendered.
 */
export function isSensitiveKey(key: string): boolean {
  return /secret|token|password|fingerprint|sensitivereference|iban/i.test(key);
}
