import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import { IDEMPOTENCY_KEY_HEADER } from "@/lib/api/idempotency";
import type { NokiRequestContext } from "@/lib/api/request-context";

export type FinancialReconciliationResponseDto = components["schemas"]["FinancialReconciliationResponseDto"];
export type FinancialReconciliationListResponseDto = components["schemas"]["FinancialReconciliationListResponseDto"];
export type CreateFinancialReconciliationDto = components["schemas"]["CreateFinancialReconciliationDto"];

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

export interface ListReconciliationsQuery {
  organizationId: string;
  countryCode: string;
  currencyId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** GET /v1/finance/reconciliations -- requires finance.cash.read. */
export async function listReconciliations(query: ListReconciliationsQuery, context: NokiRequestContext): Promise<FinancialReconciliationListResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/reconciliations", { params: { query } });
  return unwrap(result);
}

/** GET /v1/finance/reconciliations/{id} -- requires finance.cash.read. */
export async function getReconciliation(id: string, context: NokiRequestContext): Promise<FinancialReconciliationResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/reconciliations/{id}", { params: { path: { id } } });
  return unwrap(result);
}

/** POST /v1/finance/reconciliations -- requires finance.reconciliation.create. */
export async function createReconciliation(body: CreateFinancialReconciliationDto, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialReconciliationResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/reconciliations", { params: { header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } }, body });
  return unwrap(result);
}

/** POST /v1/finance/reconciliations/{id}/submit -- requires finance.reconciliation.submit. */
export async function submitReconciliation(id: string, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialReconciliationResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/reconciliations/{id}/submit", { params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } } });
  return unwrap(result);
}

/**
 * POST /v1/finance/reconciliations/{id}/approve -- requires finance.reconciliation.approve.
 * The maker/checker rule (submitter != approver) is enforced entirely
 * server-side; this client never encodes that logic itself.
 */
export async function approveReconciliation(id: string, idempotencyKey: string, context: NokiRequestContext): Promise<FinancialReconciliationResponseDto> {
  const { client } = createServerNokiClient(context);
  const result = await client.POST("/v1/finance/reconciliations/{id}/approve", { params: { path: { id }, header: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey } } });
  return unwrap(result);
}
