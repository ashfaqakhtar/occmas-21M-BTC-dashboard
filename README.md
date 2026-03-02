# 21M Internal Market Terminal

Private internal market monitoring terminal built with Next.js.

## Phase 1 Scope Implemented

- Secure login gate for all app/API routes (except auth endpoints)
- Bloomberg-style monitoring layout, branded as **21M Internal Market Terminal**
- Preconfigured watchlists:
  - BTC
  - MSTR + major miners
  - SPX / NDX
  - DXY
  - 2Y / 10Y yield proxies
  - Gold
- Simplified monitoring-focused UI (demo-heavy views removed from primary flow)
- Environment-based key/config management for cloud deployment

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Create local env:

```bash
cp .env.local.example .env.local
```

3. Set required env vars in `.env.local`:

- `TERMINAL_ADMIN_USERNAME`
- `TERMINAL_ADMIN_PASSWORD`
- `TERMINAL_AUTH_TOKEN`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (recommended)
- `ALPHA_VANTAGE_API_KEY`

4. Start:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), authenticate, and use watchlist dropdown to switch focus sets.

## Deploy (Vercel)

Deployment steps and production checklist are in:

- `docs/SETUP_DEPLOYMENT.md`
- `docs/ARCHITECTURE.md`
