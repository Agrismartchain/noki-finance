import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { NokiRequestContext } from "@/lib/api/request-context";

/**
 * FinanceAuditEntryDto types actorId/membershipId/organizationId/countryId/
 * resourceId/correlationId/metadata as `Record<string, never>` (optionally
 * absent) in the generated OpenAPI schema -- the same known contract-typing
 * quirk already documented for MeResponseDto.email (see
 * src/lib/auth/session.ts's asNullableString) -- even though the backend
 * actually returns `string | null` (or an object, for metadata). This
 * interface reflects the real verified shape; toAuditEntry narrows
 * defensively at runtime instead of trusting the generated type.
 */
export interface FinanceAuditEntryDto {
  id: string;
  actorId: string | null;
  membershipId: string | null;
  organizationId: string | null;
  countryId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
}

export interface FinanceAuditListResponse {
  items: FinanceAuditEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}

interface OpenApiFetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function unwrap<T>(result: OpenApiFetchResult<T>): T {
  if (!result.response.ok || result.error !== undefined) {
    throw toNokiApiError(result.response.status, result.error);
  }
  if (result.data === undefined) {
    throw new NokiApiError("unexpected", "NOKI API returned an empty success payload.", { status: result.response.status });
  }
  return result.data;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toAuditEntry(raw: Record<string, unknown>): FinanceAuditEntryDto {
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    actorId: asNullableString(raw.actorId),
    membershipId: asNullableString(raw.membershipId),
    organizationId: asNullableString(raw.organizationId),
    countryId: asNullableString(raw.countryId),
    action: typeof raw.action === "string" ? raw.action : "",
    resourceType: typeof raw.resourceType === "string" ? raw.resourceType : "",
    resourceId: asNullableString(raw.resourceId),
    correlationId: asNullableString(raw.correlationId),
    metadata: asRecord(raw.metadata),
    occurredAt: typeof raw.occurredAt === "string" ? raw.occurredAt : "",
  };
}

export interface AuditQuery {
  organizationId?: string;
  countryId?: string;
  countryCode?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  actorId?: string;
  /** Substring match; server defaults to actions starting with "finance." unless overridden (FinanceAuditQueryDto). */
  action?: string;
  resourceType?: string;
  resourceId?: string;
  correlationId?: string;
  /** Accepted by the DTO but currently has no effect server-side (verified against the audit service's `where` clause construction) -- passed through as a real accepted param regardless. */
  result?: string;
}

/**
 * GET /v1/finance/audit -- requires finance.audit.read. Read-only: this
 * controller has no mutation endpoint at all, so this module exposes no
 * create/edit/delete actions.
 */
export async function searchAudit(query: AuditQuery, context: NokiRequestContext): Promise<FinanceAuditListResponse> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/audit", { params: { query } });
  const data = unwrap(result) as unknown as { items: Record<string, unknown>[]; total: number; page: number; pageSize: number };
  return {
    items: data.items.map(toAuditEntry),
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
  };
}
