# Architecture Note

## Objective

Deliver a stable, low-maintenance internal market monitoring terminal with private access and cloud deployment support.

## High-Level Design

- Frontend: Next.js App Router + React + Tailwind
- Data pipeline: API routes provide market data with fallback behavior
- Cache/storage: Upstash Redis (optional but recommended)
- Auth: App-level login + middleware route protection
- Deployment: Vercel (managed runtime and TLS)

## Request Flow

1. User hits terminal URL.
2. `middleware.ts` checks `terminal_session` cookie.
3. If unauthenticated, user is redirected to `/login`.
4. Login form posts to `/api/auth/login`.
5. On success, server sets secure HTTP-only cookie and redirects to `/`.
6. UI fetches `/api/market-data` for live table updates.
7. API returns Redis-backed data when available; fallback dataset otherwise.

## Authentication Model

- Credentials are environment-driven:
  - `TERMINAL_ADMIN_USERNAME`
  - `TERMINAL_ADMIN_PASSWORD`
- Session marker is environment-driven:
  - `TERMINAL_AUTH_TOKEN`
- Cookie is HTTP-only, `SameSite=Lax`, and `Secure` in production.
- Middleware blocks all non-public routes and APIs for unauthenticated users.

This is intentionally simple for Phase 1 and optimized for internal usage with low maintenance overhead.

## Market Universe (Phase 1)

Core instruments are grouped for monitoring:

- Bitcoin/Bitcoin equities: BTC, MSTR, MARA, RIOT, CLSK, HUT, IREN, CORZ
- Equity and dollar: SPX, NDX, DXY
- Rates and commodity proxies: US 2Y (SHY), US 10Y (IEF), GOLD

Watchlists are preconfigured to match requested operational views.

## Stability and Maintenance Choices

- Reduced surface area: monitoring-only UI path, no trading flows.
- Graceful degradation: if Redis/API data is unavailable, fallback market dataset still renders.
- Minimal moving parts: no dependency on internal systems.
- Environment isolation: all secrets in deployment environment, not in repo.

## Security Posture (Phase 1)

- Private access enforced at middleware layer.
- APIs require authenticated session cookie.
- Credential and token rotation managed through environment variables.
- Origin allowlist available via `ALLOWED_ORIGINS` for API protection policy.

## Future Extension Path (Out of Scope for Phase 1)

- SSO (OIDC/SAML) instead of shared credentials
- Role-based permissions and audit logs
- Provider abstraction for institutional-grade market data feeds
- Advanced dashboards/analytics modules

Current implementation intentionally avoids these expansions per scope constraints.
