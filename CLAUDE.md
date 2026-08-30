# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Next dev server on :3000 (also the `getta` config in .claude/launch.json)
npm run build      # Production build
npm run typecheck  # tsc --noEmit — the only checking gate; there is no linter and no test suite
```

Database changes are SQL files in `supabase/migrations/`, applied with `supabase db push`
(the project is already linked). There is no ORM and no generated types step:
`src/shared/database.types.ts` is hand-written and must be edited by hand to match a new migration.

## Architecture

Next.js 16 App Router, React 19, Supabase Postgres, plain CSS. Two apps in one deployment:
the customer card (`/`, `/card`, cream) and the counter screen (`/staff`, espresso-dark).

**Every query runs server-side.** `src/shared/supabase.ts` is the only client, built with the
service role key, and it is imported only from server components and `"use server"` actions.
No Supabase key of any kind reaches the browser; RLS is on with no policies so a leaked anon
key reads nothing. Do not add a browser-side client.

**Balances are never stored.** A member's stamp count is `count(stamps)` for that member.
Redeeming inserts a `rewards` row and *deletes* the stamps it consumed, so `stamps` only holds
unclaimed ones. Lifetime totals come from `sum(rewards.stamps_spent) + count(stamps)`. Any new
feature that wants a number should derive it the same way rather than adding a counter column.

**The rules live in Postgres functions**, not in TypeScript, so they cannot drift between callers:
`add_stamp` (rejects a repeat within 5s), `redeem_reward` (refuses below a full card, deletes
atomically), `undo_last_stamp` (10-minute window), `stamps_per_reward()` (returns 5),
`note_unlock_attempt` (staff-gate throttle, counted in the database because Vercel's serverless
instances each start with a cold in-memory counter). `STAMPS_PER_REWARD` in
`src/shared/members.ts` mirrors `stamps_per_reward()` — change both together.

**Layout.** `src/app/` is routes only; `src/features/<area>/` holds the components and server
actions for membership, staff, and PWA; `src/shared/` holds everything both apps use
(`members.ts`, `session.ts`, `supabase.ts`, `leaderboard.ts`, `ui/`). Import via `@/…`.

**Caching.** *A balance is never cached.* `loadCard` goes to Postgres on every read, through the
`card_for_member` function that returns the member, both counts and the requested slice of history
in one round trip. It used to be an `unstable_cache` tagged `card:<id>` and cleared by the three
balance-changing writes, which is correct on one server and wrong on Vercel — the tag is cleared on
whichever instance handled the barista's POST, while the customer's phone reloads against another
one; and `unstable_cache` answers an expired entry with the stale value and refreshes behind the
response, so the stale count outlived its own timer too. Do not reintroduce a cache here. Migration
0009's header has the full account.

What is still cached is what can afford to be stale: `listLocations` under the `locations` tag, and
the leaderboard on a 30s timer rather than a tag — any stamp changes every ranking, so tagging it
would mean every stamp busting every customer's entry.

**Sessions** are HMAC-signed httpOnly cookies (`src/shared/session.ts`), no Supabase Auth.
Members are identified by phone number alone, on purpose — no password, no OTP. The staff cookie
carries the location picked at unlock (`staff:<place>`), scoped to `/staff`, 12 hours, so stamps
get tagged without a barista choosing per customer. A member cookie is always resolved against
the database rather than trusted, because a cookie can outlive the row it names.

**Locations** are rows the café edits from `/staff/locations`, but a stamp stores the location's
*name*, not a foreign key — a stamp is a historical fact that must keep reading "Ipoh" after that
branch closes.

**Styling** is one file, `src/styles/globals.css`, ported from `mockup/getta-rewards.html` (the
standalone signed-off prototype, kept as the design reference). Tokens live in `:root`; the dark
counter theme is `.shell.dark`. No CSS modules, no Tailwind, no component libraries.
`/staff` and `/card` carry `noindex` on a layout in each directory — a `robots.txt` disallow does
not work here, since a crawler that never fetches the page never sees the `noindex`.

Read the header comment on each migration before changing schema; they carry the reasoning for
decisions that look odd from the code alone. The README covers setup, the security model, the
`rewards.gettacoffee.com` DNS setup, and what has been verified against the live database.

## Branches

`main` is production. **The leaderboard feature lives on `staging`** (`src/shared/leaderboard.ts`,
`src/app/card/leaderboard/page.tsx`, `supabase/migrations/0007_leaderboard.sql`) and is not on
`main` yet — check out `staging` before continuing that work.
