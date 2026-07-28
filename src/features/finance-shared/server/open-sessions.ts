import type { components } from "@agrismartchain/noki-shared-contracts";

import { createServerNokiClient } from "@/lib/api/client";
import { NokiApiError, toNokiApiError } from "@/lib/api/errors";
import type { NokiRequestContext } from "@/lib/api/request-context";

export type CashSessionResponseDto = components["schemas"]["CashSessionResponseDto"];

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

/**
 * GET /v1/finance/cash/sessions filtered to OPEN -- used by the cash
 * handover receive flow's session picker (a handover can only be received
 * into a compatible open session). The full Cash Sessions feature (list/open/
 * close, all statuses) has its own richer client; this is deliberately
 * narrow to that one lookup need.
 */
export async function listOpenCashSessions(
  organizationId: string,
  countryCode: string,
  currencyId: string | undefined,
  context: NokiRequestContext,
): Promise<CashSessionResponseDto[]> {
  const { client } = createServerNokiClient(context);
  const result = await client.GET("/v1/finance/cash/sessions", {
    params: { query: { organizationId, countryCode, currencyId, status: "OPEN", limit: 100, offset: 0 } },
  });
  return unwrap(result).items;
}
