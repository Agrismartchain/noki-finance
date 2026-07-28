# noki-finance

Internal Finance frontend for NOKI SERVICE — a same-origin BFF Next.js app covering the Finance dashboard, COD collections, cash handovers, cash sessions, cash variances, and reconciliations, consuming the real `noki-api` Finance backend. No runtime-mocked data.

## Stack

- Next.js `16.2.10` (App Router, Turbopack), React `19.2.4`, TypeScript `5.9.3` (strict)
- `next-intl` `4.13.3` for i18n (fr/en/ar, Arabic RTL)
- `@agrismartchain/noki-design-system@0.2.0` (all UI primitives — this repo builds only Finance-specific composites on top)
- `@agrismartchain/noki-shared-contracts@0.31.0` — installed from a **local tarball**, not the GitHub Packages registry (see below)
- pnpm `10.23.0`, Vitest `4.1.10`, Testing Library, Playwright `1.61.1`, ESLint `9.39.5`

## Install

### 1. Produce the Contracts tarball

This app requires `@agrismartchain/noki-shared-contracts@0.31.0` newer than what's published to the registry, so it's vendored as a local tarball rather than fetched remotely:

```bash
cd ../noki-shared-contracts
pnpm run check   # confirms the checkout is clean: lint, typecheck, test, build, contract/version/publication guards
pnpm pack        # produces agrismartchain-noki-shared-contracts-0.31.0.tgz
cp agrismartchain-noki-shared-contracts-0.31.0.tgz ../noki-finance/vendor/
```

The tarball is committed to `vendor/` (an explicit `.dockerignore`/`.gitignore` exception) so both local installs and the Docker build resolve it deterministically via `pnpm install --frozen-lockfile`.

### 2. Install dependencies

`@agrismartchain/noki-design-system` still comes from GitHub Packages and needs a `NODE_AUTH_TOKEN` with `read:packages` on the `Agrismartchain` org:

```bash
NODE_AUTH_TOKEN=<token> pnpm install
```

## Environment variables

| Variable | Scope | Required | Notes |
|---|---|---|---|
| `NOKI_API_BASE_URL` | server-only | yes | Base URL of `noki-api`. Read lazily, only when a backend call is attempted. Never exposed to the browser (no `NEXT_PUBLIC_` prefix). |

**Reconciliation with the original spec**: the spec also requested `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_DEFAULT_LOCALE`, and `SESSION_COOKIE_NAME`. These are deliberately **not** implemented: every sibling NOKI frontend (`noki-admin`, `noki-operations`, `noki-contact-center`) uses only `NOKI_API_BASE_URL`, with cookie names as tested, hardcoded constants (`src/lib/auth/cookies.ts`). Introducing `SESSION_COOKIE_NAME` as a runtime env var would make cookie naming configurable with no current consumer, code path, or test coverage — an unrequested abstraction. If a future need for brand name/default-locale configurability arises, add it then, matching an actual call site.

Copy `.env.example` to `.env.local` for local development:

```bash
NOKI_API_BASE_URL=http://localhost:3001
```

## Commands

```bash
pnpm dev          # http://localhost:3004
pnpm build        # standalone production build
pnpm start        # run the standalone build
pnpm lint         # eslint .
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm test:watch   # vitest
pnpm playwright   # playwright test -c playwright.recette.config.ts (needs a running app + reachable noki-api)
pnpm check        # lint && typecheck && test && build
```

## Tests

- **Unit** (22 files, co-located as `src/**/*.test.ts(x)`): shared Finance components (`MoneyValue`, `FinanceStatusBadge`, `VarianceBadge`), the API client/error normalization, permission mapping (`hasAnyFinancePermission`, `hasAnyCapability`), i18n message parity + locale formatting, URL filter parsing for every list page, dashboard states, and every mutation form (handover create/receive, session open/close, variance resolution, reconciliation approval).
- **BFF/integration** (9 files): `src/proxy.test.ts`, `src/lib/auth/{cookies,origin,request-body,session}.test.ts`, `src/app/api/auth/{login,logout,session}/route.test.ts`, `src/app/api/health/route.test.ts` — assert httpOnly/secure/sameSite cookies, that a token never appears in a JSON response body, that refresh is only ever persisted from `/api/auth/session`, that logout always clears cookies even when the backend is unreachable, and same-origin enforcement on the BFF's own mutation routes.
- **Total**: 31 test files, 179 tests, all passing (`pnpm test`).
- **Playwright** (`e2e/`, 14 spec files, 25 scenarios): `playwright.config.ts` is the primary, self-contained config. Because every `noki-api` call happens server-side (the BFF pattern), "network-level controlled APIs" means pointing the real Next.js server's `NOKI_API_BASE_URL` at a stub HTTP server (`e2e/support/stub-api-server.mjs`) rather than browser-level `page.route()` interception — Playwright drives the real, built app against deterministic (stubbed) HTTP responses, and no mock fixture is ever imported into application source. Covers: login, dashboard load, forbidden non-Finance actor, mobile navigation drawer, multi-currency display, handovers list/create/submit/receive, cash session open/close with the indicative variance preview, variance resolution with confirmation, reconciliation create/submit/approve with the maker/checker note, fr/en/ar rendering with no raw i18n keys, RTL, dark mode, and no horizontal overflow at 390px. `playwright.recette.config.ts` is a lighter alternative for manual/staging runs against a real, reachable `noki-api` instance.

## Architecture

### BFF (same-origin, no direct browser → noki-api calls)

```
browser  →  noki-finance (cookies only, no tokens)  →  noki-api
```

- `src/proxy.ts` — Next.js 16 middleware: cheap cookie-presence redirect to `/login` + locale routing (`next-intl`). Real session/permission validation happens server-side, not here.
- `src/lib/auth/` — cookie construction (`noki_finance_access_token` / `noki_finance_refresh_token`, both httpOnly, `secure` in production, `sameSite: lax`), session resolution against `GET /v1/auth/me` + `GET /v1/auth/capabilities` with a single backend-proven refresh attempt, origin validation for the BFF's own mutation routes, and bounded/whitelisted login body parsing.
- `src/app/api/auth/{login,logout,session}/route.ts` — the only three BFF routes. `login` never returns a token in its JSON body (only via `Set-Cookie`). `logout` always clears cookies, even if the backend is unreachable. `session` is the only place a rotated token pair is persisted (Route Handlers can set cookies; Server Components cannot).
- `src/lib/api/client.ts` — `createServerNokiClient()` is a per-request factory (never a singleton) wrapping `@agrismartchain/noki-shared-contracts/client`, with a 10s timeout, `x-correlation-id` propagation, and `NokiApiError` classification that never leaks a stack trace, token, or raw backend message to the browser.
- No generic `/api/finance/*` passthrough exists. Every feature's data access is a typed, server-side call (`src/features/<domain>/server/*.ts`) from a Server Component, Route Handler, or Server Action — matching the pattern already proven in `noki-admin`/`noki-operations`/`noki-contact-center`. The browser never calls `noki-api` directly, and never calls an untyped passthrough either.

### Protected layout & app-level gate

`src/app/[locale]/(protected)/layout.tsx` resolves the session, redirects to `/login` if unauthenticated, and renders `ForbiddenView` unless `hasAnyFinancePermission(actor)` — true when the actor holds at least one permission code equal to `"finance"` or starting with `"finance."`. This matches exactly the real `FINANCE` role bundle in `noki-api`'s authorization catalog and excludes the unrelated `seller.finance.*`/`commerce.finance.*` namespaces. Each nav item and each page additionally re-checks its own specific capability (e.g. `finance.cash.read`) server-side — hiding a sidebar link is never treated as the real access-control boundary.

### Client API layer

`src/lib/api/` (config validation, headers, timeout/abort, error classification) and `src/lib/api/idempotency.ts` (new in this repo — every finance mutation endpoint declares `Idempotency-Key` as a required typed OpenAPI header parameter; a fresh key is generated once per logical user action via `useState(() => generateIdempotencyKey())` and reused across retries of that same action, never regenerated automatically).

### Feature folders

```
src/features/
  finance-shared/    MoneyValue, CurrencyBadge, FinanceStatusBadge, VarianceBadge, MaskedDestination,
                      FinanceMetricCard, FinanceDateRangeFilter, FinanceScopeSummary, FinanceEmptyState,
                      FinanceErrorState, ComingSoonView, cash-list-query.ts, scope.ts, url-query.ts,
                      server/{master-data,open-sessions}.ts
  dashboard/         GET /v1/finance/dashboard{,/aging,/cashflow}
  cod/                GET /v1/admin/finance/cod/collections (list), GET /v1/finance/cod/collections/{id}
  cash-handovers/     full CRUD against /v1/finance/cash/handovers*
  cash-sessions/      full CRUD against /v1/finance/cash/sessions*
  cash-variances/     list/detail/resolve against /v1/finance/cash/variances*
  reconciliations/    full CRUD against /v1/finance/reconciliations*
```

Money is never computed client-side: `MoneyValue`/`formatMoney` convert a decimal string to a number only at the `Intl.NumberFormat` display boundary (never for a business decision), and the cash-session close form's "indicative variance preview" is the one spec-mandated exception — explicitly labeled non-authoritative, never submitted to the server (only `countedClosingAmount` is sent).

## Security

- No token is ever stored in `localStorage`/`sessionStorage` — httpOnly cookies only.
- No direct browser → `noki-api` call exists anywhere in the codebase.
- Every mutation carries a per-action `Idempotency-Key` and a propagated correlation ID, shown in error states without a stack trace.
- The BFF's own `login`/`logout` routes validate same-origin (Origin/Referer/`Sec-Fetch-Site`) before touching the backend.
- Permissions always come from `GET /v1/auth/capabilities` — never a hardcoded frontend role name.

## Docker

Multi-stage (`base` → `deps` → `builder` → `runner`), `pnpm install --frozen-lockfile`, non-root user (`nodeapp`, 1001:1001), Next.js `standalone` output, healthcheck against `GET /api/health`, port 3000. Built and smoke-tested locally: image size **283MB**, healthcheck responds `{"status":"ok","service":"noki-finance"}` with no sensitive data, confirmed running as `nodeapp` (not root).

```bash
DOCKER_BUILDKIT=1 docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t noki-finance .
docker run --rm -p 3000:3000 -e NOKI_API_BASE_URL=https://api.example.test noki-finance
```

## Delivered modules (Phase 4A)

| Module | Status |
|---|---|
| Dashboard | Functional |
| COD collections | Functional |
| Cash handovers | Functional |
| Cash sessions | Functional |
| Cash variances | Functional |
| Reconciliations | Functional |
| Obligations, Fees, Documents, Adjustments, Disputes, Payouts, Approvals, Payment methods, Reports, Audit | Placeholder (routed, capability-gated, "coming soon" — no mock data) |

## Known backend gaps (documented, not worked around)

- **COD cycle**: `CodCollectionResponseDto` has no back-reference to its cash handover, so the "Remis/Reçu/Rapproché" steps on the COD detail page are shown as explicitly unresolved (with a pointer to the related handover) rather than guessed.
- **COD date filter**: `AdminFinanceCodCollectionsQueryDto` has no `dateFrom`/`dateTo` parameter — not implemented, to avoid silently misfiltering an already server-paginated result set.
- **Reconciliation preparer/approver**: `FinancialReconciliationResponseDto` exposes no preparer/approver actor identity — rendered as an explicit "not exposed by the API" note.
- **Linked variances**: neither `CashListQueryDto` nor `CashVarianceResponseDto`'s query surface supports filtering by `sourceReferenceId`, so a reconciliation's linked variances aren't fetchable via a bounded query; the detail page links to the Variances list instead of performing an unbounded scan.

## Phase 4B (not in this delivery)

Obligations, Fees, Documents, Adjustments, Disputes, Payouts, Approvals, Payment methods, Reports, Audit.
