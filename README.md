# Getta Coffee Rewards

Collect 5 receipts, get 1 free drink. Replaces the Google Apps Script version,
which was locked to a `script.google.com/macros/s/…` URL that no custom domain
can point at.

- **Customer** — join, see your stamp card by phone number, view an earned drink.
- **Staff** — one shared passcode unlocks a counter screen: look up a phone
  number, add a stamp, redeem a free drink.

Next.js 16 (App Router) · React 19 · Supabase Postgres · plain CSS.

## Design

The visual system is ported from [`mockup/getta-rewards.html`](mockup/getta-rewards.html),
a standalone clickable prototype with fake data. It stays in the repo as the
design reference — open it directly in a browser, no build needed.

Customer screens are cream; the staff screen is espresso-dark, so the mode is
obvious at a glance behind a counter and holds up under glare.

## Setup

### 1. Supabase

Create a project, then apply the schema:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
into the dashboard SQL editor.

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where it comes from |
| --- | --- |
| `SUPABASE_URL` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (service role, server-only) |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `STAFF_PASSCODE` | Whatever the shop will type at the counter |

### 3. Run

```bash
npm install
npm run dev
```

Customer at `/`, staff at `/staff`.

## How the data works

Three tables. A member's stamp balance is **never** a stored counter — it is
derived as the number of stamps not yet consumed by a redemption:

```
members   id, name, phone (unique), created_at
stamps    id, member_id, created_at, reward_id  -- reward_id null = still counting
rewards   id, member_id, redeemed_at
```

Balance is `count(stamps where reward_id is null)`. Redeeming inserts a `rewards`
row and stamps the 5 oldest open rows with its id, so extra stamps roll over
instead of being lost, and a mis-stamp is undone by deleting one row rather than
reconciling a number.

Two Postgres functions hold the rules, so they can't drift between callers:

- `add_stamp(member)` — inserts one stamp, returns the new balance. Rejects a
  second stamp within 5 seconds, which absorbs a double-tap at the counter
  without blocking a customer who genuinely buys two drinks a minute apart.
- `redeem_reward(member)` — refuses unless the balance covers a full card, then
  records the redemption and consumes the stamps atomically.

`stamps_per_reward()` returns 5. Change the program in that one function and
`STAMPS_PER_REWARD` in [`lib/members.ts`](lib/members.ts).

## Security model

- Every query runs in a server component or server action. **No Supabase key of
  any kind reaches the browser.**
- RLS is enabled on all three tables with no policies. The service role bypasses
  it; a leaked anon key would read nothing.
- **Members are identified by phone number alone** — no password, no SMS code.
  This matches the old Apps Script app and keeps logins free and frictionless.
  It also means someone who knows a member's phone number can see that member's
  stamp count and name. That was an explicit tradeoff for a 5-stamp coffee card.
  If real value is ever attached to an account, add SMS OTP via Supabase Auth.
- Staff share one passcode, compared in constant time, held in an HMAC-signed
  httpOnly cookie scoped to `/staff` for 12 hours. Stamps are therefore not
  attributable to an individual barista. Add staff accounts and a `staff_id` on
  `stamps` if you need that.
- `/staff` and `/card` are excluded from robots.

## Deploying

Vercel: import the repo, add the four environment variables, add the domain.
`SUPABASE_SERVICE_ROLE_KEY` must be a server-side variable — never prefix it
`NEXT_PUBLIC_`.

## Migrating from the Apps Script version

The old member list lives in the Google Sheet behind the script. Export it to
CSV and insert into `members` (name, digits-only phone), then insert one `stamps`
row per stamp each member currently holds. Keep the old deployment live until the
new domain is verified.

## Verified

Both flows have been walked against the live Supabase project: join → staff
lookup → `+1 STAMP` → reward → `REDEEM FREE DRINK`, with the database checked
after each step. Also confirmed directly against Postgres:

- balance starts at 0 and increments
- a second stamp within 5 seconds is rejected and the balance is unchanged
- redeeming below a full card is refused
- redeeming at 6 stamps consumes the 5 oldest and rolls 1 over
- duplicate and non-numeric phone numbers are rejected
- deleting a member cascades to their stamps and rewards

## Not built yet

- The 4-digit code step shown in the mockup's login flow. Deliberately dropped,
  since members are identified by phone number alone.
- Staff attribution. Every stamp records *when*, not *who* — see the security
  note above.
