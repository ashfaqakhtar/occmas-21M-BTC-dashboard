# Setup and Deployment

## 1) Fork to Organization GitHub

1. Open upstream repository in GitHub.
2. Click **Fork** and select your organization account.
3. Clone your org fork locally.
4. Push this Phase 1 branch to your org fork.

## 2) Configure Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- `TERMINAL_ADMIN_USERNAME`
- `TERMINAL_ADMIN_PASSWORD`
- `TERMINAL_AUTH_TOKEN` (long random secret)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ALPHA_VANTAGE_API_KEY`
- `ALLOWED_ORIGINS` = your production URL and optional preview URLs

Recommended generation commands:

```bash
openssl rand -base64 32
```

Use one for `TERMINAL_AUTH_TOKEN` and a separate strong value for `TERMINAL_ADMIN_PASSWORD`.

## 3) Deploy to Vercel

1. Import the org fork into Vercel.
2. Framework: `Next.js` (auto-detected).
3. Build command: `pnpm build`.
4. Install command: `pnpm install`.
5. Deploy.

## 4) Validate Production

- Open the deployed URL and confirm redirect to `/login`.
- Sign in with admin credentials.
- Confirm `/api/market-data` returns `401` when not authenticated.
- Confirm watchlist dropdown includes:
  - BTC
  - MSTR + Major Miners
  - SPX / NDX
  - DXY
  - 2Y / 10Y Proxies
  - Gold
- Confirm market table updates with LIVE mode and manual REFR.

## 5) Operational Notes

- Rotate `TERMINAL_ADMIN_PASSWORD` and `TERMINAL_AUTH_TOKEN` periodically.
- Keep API keys only in Vercel environment variables.
- Keep `ALLOWED_ORIGINS` tight to known domains.
- No trading actions are enabled in this app (monitoring-only).
