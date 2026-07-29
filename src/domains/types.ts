/**
 * Single source of truth for a top-level noki-finance navigation domain.
 * Like noki-operations' DOMAIN_REGISTRY, Finance navigation is a flat list
 * (no nested sections): every domain renders as exactly one sidebar link.
 *
 * `capability` accepts a single permission code, or an array of codes with
 * OR semantics (an actor needs at least one) -- wider than noki-operations'
 * single-string field because "Approbations" is legitimately gated by either
 * finance.payout.first_approve or finance.payout.final_approve.
 */
export interface DomainDescriptor {
  id: string;
  labelKey: string;
  href: string;
  /** One or more SYSTEM_PERMISSION_CODES values from noki-api's authorization catalog (OR semantics when an array). */
  capability?: string | string[];
  /** True when the navigation item resolves to a real endpoint-backed or explicitly contract-limited workflow. */
  implemented: boolean;
}
