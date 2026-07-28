/**
 * Header noki-api's finance mutation endpoints read via `@Headers('idempotency-key')`
 * (finance.controller.ts, finance-cash.controller.ts, finance-phase2.controller.ts).
 * No sibling NOKI frontend has this convention yet -- the one lookalike
 * (noki-operations' inbound receive flow) sends its idempotency key as a body
 * field, not a header, so it cannot be copied as-is.
 *
 * Each endpoint declares it as a typed OpenAPI header parameter (`@ApiHeader`),
 * so the generated openapi-fetch client requires it under a call's
 * `params.header` object (e.g. `{ params: { header: { [IDEMPOTENCY_KEY_HEADER]: key } } }`),
 * not as a free-form fetch header alongside `Authorization`/`Accept-Language`.
 */
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

/**
 * Generates a fresh idempotency key for one logical user action (e.g. "submit
 * this handover"). Callers must generate this once per action -- typically
 * via `useState(() => generateIdempotencyKey())` at the point a mutation form
 * mounts -- and reuse the same value across retries of that same action.
 * Never generate a new key for an automatic retry of an already-submitted
 * request: that would defeat the whole purpose of idempotency.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
