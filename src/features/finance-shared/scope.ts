import type { SanitizedActor } from "@/lib/auth/session";

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
