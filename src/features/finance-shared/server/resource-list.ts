import { listCountries } from "@/features/finance-shared/server/master-data";
import { resolveCashScopeOptions, resolveScopeCountryId } from "@/features/finance-shared/scope";
import { parseEnumFilter, parsePage, parsePageSize } from "@/features/finance-shared/url-query";
import { NokiApiError } from "@/lib/api/errors";
import type { SanitizedActor } from "@/lib/auth/session";

/**
 * Shared server-side plumbing for the Finance resource lists (fee rules,
 * adjustments, disputes). Every list is scoped by the API to one organization
 * and country: the scope comes from the actor's own membership, the real
 * Country.id is resolved from master data, and the API re-authorizes both --
 * nothing is filtered client-side.
 */
export interface ResourceListFilters {
  status: string;
  page: number;
  pageSize: number;
}

export function parseResourceListFilters(searchParams: URLSearchParams, allowedStatuses: readonly string[]): ResourceListFilters {
  return {
    status: parseEnumFilter(searchParams.get("status"), allowedStatuses),
    page: parsePage(searchParams.get("page")),
    pageSize: parsePageSize(searchParams.get("pageSize")),
  };
}

export function buildResourceListSearchParams(filters: ResourceListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  return params;
}

export type ResourceListResult<T> = { status: "ok"; items: T[]; total: number } | { status: "no-scope" } | { status: "error"; correlationId?: string };

export async function fetchResourceList<T>(
  actor: SanitizedActor,
  filters: ResourceListFilters,
  context: { accessToken?: string; locale: string },
  list: (query: { organizationId: string; countryId: string; status?: string; page: number; pageSize: number }) => Promise<{ items: T[]; total: number }>,
): Promise<ResourceListResult<T>> {
  const scope = resolveCashScopeOptions(actor)[0];
  if (!scope) {
    return { status: "no-scope" };
  }
  try {
    const countries = await listCountries(context);
    const resolved = resolveScopeCountryId(scope, countries);
    if (!resolved) {
      return { status: "no-scope" };
    }
    const result = await list({ organizationId: resolved.organizationId, countryId: resolved.countryId, status: filters.status || undefined, page: filters.page, pageSize: filters.pageSize });
    return { status: "ok", items: result.items, total: result.total };
  } catch (error) {
    return { status: "error", correlationId: error instanceof NokiApiError ? error.correlationId : undefined };
  }
}
