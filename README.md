# World Cup Predictor

This is the real application codebase for the World Cup Predictor MVP.

## Current implementation status

The project currently includes:

- Next.js App Router foundation
- public and authenticated route groups
- English and Spanish message directories
- Supabase SSR browser/server/middleware foundations
- middleware-based route protection for authenticated routes
- email and Google authentication entry flows
- group creation, join-by-identifier, and invite join flows
- predictions save flow and group rankings flow
- manual match result sync for owners when service-role access is configured
- profile and account deletion request lifecycle with one-month retention

## Required environment variables

Create a local `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ACCOUNT_PURGE_CRON_SECRET=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for the current app foundation.
- `SUPABASE_SERVICE_ROLE_KEY` is required for owner-driven results sync and retention-based account purge, and must never be exposed to the client.
- `ACCOUNT_PURGE_CRON_SECRET` protects the purge endpoint and should be a long random secret.

## Supabase migration setup

You have two valid ways to apply the schema.

### Option A: Fastest path with the Supabase dashboard

Run the SQL files in `supabase/migrations` in timestamp order inside the SQL editor:

1. `20260424100500_epic3_groups.sql`
2. `20260424132000_epic4_predictions.sql`
3. `20260424154000_epic5_rankings.sql`
4. `20260427124500_epic2_epic6_completion.sql`

### Option B: Repeatable CLI path

If you want local CLI control, first link this repo to your Supabase project and then push the migrations.

Typical flow:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This repository does not currently include a checked-in `supabase/config.toml`, so the dashboard path is usually the fastest unblock.

## Getting started

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Retention purge endpoint

When a user requests account deletion, access is revoked immediately and the request is retained for one month.

After the retention window passes, you can purge due accounts through:

- `POST /api/account/purge`

Required header:

```bash
x-account-purge-secret: <ACCOUNT_PURGE_CRON_SECRET>
```

Example local call:

```bash
curl -X POST http://localhost:3000/api/account/purge \
  -H "x-account-purge-secret: <ACCOUNT_PURGE_CRON_SECRET>"
```

This route requires both `SUPABASE_SERVICE_ROLE_KEY` and `ACCOUNT_PURGE_CRON_SECRET`.

## Route structure

- `/`
  - public landing page
- `/sign-in`
  - public auth entry
- `/dashboard`
  - protected route
- `/groups`
  - protected route
- `/create-group`
  - protected route
- `/join-group`
  - protected route
- `/profile`
  - protected route
- `/invite/[inviteCode]`
  - public invite preview route

## Route protection behavior

Middleware checks authenticated routes and redirects unauthenticated users to `/sign-in`.

If an account has a pending deletion request, middleware revokes the session and routes the user back to `/sign-in` with a retention notice.

## MVP validation checklist

After the migrations and environment variables are set, validate the app with this sequence:

1. Create an account with email or Google.
2. Create a group and confirm you land on the created state.
3. Join a second account into that group using either `group_id` or the invite route.
4. Save predictions for open matches.
5. Open rankings and confirm leaderboard data loads.
6. If `SUPABASE_SERVICE_ROLE_KEY` is set, run owner sync and verify rankings refresh.
7. Request account deletion and confirm the session is revoked immediately.
8. Trigger `POST /api/account/purge` after the retention date when you are ready to finalize removals.
