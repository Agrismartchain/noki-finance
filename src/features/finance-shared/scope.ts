import type { SanitizedActor } from "@/lib/auth/session";

import type { AdminCountryDto } from "./server/master-data";

export interface CashScopeOption {
  /** `${organizationId}:${countryCode}` */
  id: string;
  organizationId: string;
  countryCode: string;
}

/**
 * Cash handovers/sessions/variances/reconciliations all require both
 * organizationId and countryCode server-side (CashListQueryDto). Unlike
 * noki-operations (which cannot resolve a real Country.id from its session),
 * Finance's cash endpoints filter on countryCode directly -- exactly what
 * Membership.countryScopes[].countryCode already provides -- so a full scope
 * resolver is both possible and required here.
 */
export function resolveCashScopeOptions(actor: SanitizedActor): CashScopeOption[] {
  const options = new Map<string, CashScopeOption>();
  for (const membership of actor.memberships) {
    for (const scope of membership.countryScopes) {
      const id = `${membership.organizationId}:${scope.countryCode}`;
      if (!options.has(id)) {
        options.set(id, { id, organizationId: membership.organizationId, countryCode: scope.countryCode });
      }
    }
  }
  return [...options.values()];
}

export interface CountryScopeOption {
  organizationId: string;
  countryId: string;
  countryCode: string;
}

/**
 * FinancePhase2PageQueryDto (payment methods, obligations) requires the real
 * Country.id, not the organization-country association id. Membership.
 * countryScopes only exposes countryCode + organizationCountryId, so this
 * resolves the actual Country.id by matching countryCode against
 * `listCountries(context)` -- organizationCountryId is never used as a
 * substitute. Returns undefined when there is no scope, or no country in
 * the master-data list matches the scope's countryCode (no id is invented).
 */
export function resolveScopeCountryId(scope: { organizationId: string; countryCode: string } | undefined, countries: AdminCountryDto[]): CountryScopeOption | undefined {
  if (!scope) {
    return undefined;
  }
  const country = countries.find((candidate) => candidate.code === scope.countryCode);
  if (!country) {
    return undefined;
  }
  return { organizationId: scope.organizationId, countryId: country.id, countryCode: scope.countryCode };
}
