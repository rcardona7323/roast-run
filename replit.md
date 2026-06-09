# Roast & Run — Café Run Club Rewards

A café-owned run club rewards app where members log their runs manually, track miles, and earn café rewards. All data is owned by the café — no Strava or third-party dependency.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/run-club run dev` — run the frontend (port 25271)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-set by Replit DB)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Replit Auth (OIDC/PKCE, cookie sessions)
- Frontend: React + Vite + Tailwind CSS + shadcn/ui

## Where things live

- **API contract**: `lib/api-spec/openapi.yaml`
- **DB schema**: `lib/db/src/schema/runclub.ts` (app tables), `lib/db/src/schema/auth.ts` (sessions/users)
- **Auth**: `artifacts/api-server/src/lib/auth.ts`, `artifacts/api-server/src/routes/auth.ts`, `lib/replit-auth-web/`
- **API routes**: `artifacts/api-server/src/routes/` (members, runs, rewardTiers, redemptions, leaderboard, dashboard)
- **Frontend pages**: `artifacts/run-club/src/pages/`
- **Generated hooks**: `lib/api-client-react/src/generated/api.ts`
- **Generated Zod schemas**: `lib/api-zod/src/generated/api.ts`

## Architecture decisions

- No Strava integration — all run data is manually logged by members, café owns the data
- Reward tiers are fully configurable by admin (miles required, reward type, active flag)
- `totalMiles` is stored on the member record and updated atomically on run log/delete
- Redemptions are request-based (member requests, admin approves/rejects)
- First user to log in becomes a regular member; isAdmin must be set manually in DB for now
- Replit Auth used for all authentication — no passwords, sessions stored in PostgreSQL

## Product

**Members can:**
- Log runs manually (date, distance in miles, optional notes)
- Track their total miles and progress toward reward tiers
- View a dashboard with weekly/monthly stats and recent activity
- Browse the club leaderboard (this week / this month / all time)
- Request reward redemptions when they've earned enough miles

**Admins can:**
- View all members and their mile totals
- Approve or reject redemption requests
- Create, edit, and deactivate reward tiers

**Default reward tiers seeded:**
- 10 miles → Free coffee
- 25 miles → Free smoothie
- 50 miles → Espresso drink of choice
- 100 miles → Café apparel item
- 200 miles → Free drinks for a month

## User preferences

- No Strava integration — café owns all data
- Rewards are café-specific: coffee, smoothies, apparel

## Strava integration

- Members connect via OAuth at `/api/strava/connect` (redirects to Strava, callback at `/api/strava/callback`)
- After connecting, members sync runs manually from the Profile page → "Sync from Strava" button
- Synced runs have `source = 'strava'` and a `stravaActivityId` stored; re-syncing is idempotent (no duplicates)
- Admins can filter the "All Runs" view by source (All / Manual / Strava)
- Strava tokens (access + refresh) are stored on the `members` table and refreshed automatically on sync
- Required secrets: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` (already configured)

## Gotchas

- To make a user an admin, run: `UPDATE members SET is_admin = true WHERE email = 'your@email.com';` in the DB
- Always run codegen after changing `lib/api-spec/openapi.yaml`
- `totalMiles` on members table is updated inline when runs are created/deleted — do not modify it directly
- Strava redirect URI must match what's registered in the Strava app settings: `https://<your-domain>/api/strava/callback`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
