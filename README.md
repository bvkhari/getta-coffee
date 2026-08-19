# Getta Coffee Rewards

Collect 5 receipts, get 1 free drink. Replaces the Google Apps Script version,
which was locked to a `script.google.com/macros/s/…` URL that no custom domain
can point at.

- **Customer**: join, then check your stamp card by phone number and show an
  earned drink at the counter.
- **Staff**: one shared passcode unlocks a counter screen for looking up a phone
  number, adding a stamp, and redeeming a free drink.

Next.js 16 (App Router) · React 19 · Supabase Postgres · plain CSS.

## Design

The visual system is ported from [`mockup/getta-rewards.html`](mockup/getta-rewards.html),
a standalone clickable prototype with fake data. It stays in the repo as the
design reference. Open it straight in a browser; there is nothing to build.

Customer screens are cream. The staff screen is espresso-dark, so whoever is
behind the counter can tell the two apart at a glance, and it holds up under
glare.

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

Three tables. Nothing stores a member's stamp balance. It is derived as the
number of stamps not yet consumed by a redemption:

```
members   id, name, phone (unique), created_at
stamps    id, member_id, created_at, reward_id  -- reward_id null = still counting
rewards   id, member_id, redeemed_at
```

Balance is `count(stamps where reward_id is null)`. Redeeming inserts a `rewards`
row and stamps the 5 oldest open rows with its id. Extra stamps therefore roll
over instead of vanishing, and a mis-stamp is undone by deleting one row rather
than reconciling a number.

Two Postgres functions hold the rules, so they can't drift between callers:

- **`add_stamp(member)`**: inserts one stamp, returns the new balance. Rejects a
  second stamp within 5 seconds. That absorbs a double-tap at the counter but
  still lets you stamp someone twice if they genuinely buy two drinks a minute
  apart.
- **`redeem_reward(member)`**: refuses unless the balance covers a full card,
  then records the redemption and consumes the stamps atomically.
- **`undo_last_stamp(member)`**: removes the newest open stamp, but only within
  10 minutes and never one already consumed by a redemption. Stamping the wrong
  customer is the likeliest slip at a counter, so staff can take it back from
  the confirmation screen or the customer's page.

`stamps_per_reward()` returns 5. Change the program in that one function and
`STAMPS_PER_REWARD` in [`src/shared/members.ts`](src/shared/members.ts).

## Security model

Every query runs in a server component or server action, so **no Supabase key of
any kind reaches the browser.** RLS is enabled on all three tables with no
policies: the service role bypasses it, and a leaked anon key would read
nothing.

Members are identified by phone number alone. No password, no SMS code. That
matches the old Apps Script app and keeps logins free and frictionless. It also
means anyone who knows a member's phone number can see that member's name and
stamp count, which was an accepted tradeoff for a 5-stamp coffee card. Add SMS
OTP via Supabase Auth if real value is ever attached to an account.

Joining never signs anyone into an existing account. If the number is taken,
the form says so and offers to open that card as a separate, deliberate step.
An earlier version signed the visitor straight in, which threw away the name
they typed and — on a single mistyped digit — put them inside a stranger's card
with nothing to indicate it.

Staff share one passcode, compared in constant time and held in an HMAC-signed
httpOnly cookie scoped to `/staff` for 12 hours. No stamp is attributable to an
individual barista. If you need that, add staff accounts and a `staff_id` column
on `stamps`.

`/staff` and `/card` are excluded from robots.

## Deploying

Vercel: import the repo, add the four environment variables, add the domain.
Keep `SUPABASE_SERVICE_ROLE_KEY` server-side; prefixing it `NEXT_PUBLIC_` would
publish it to every visitor.

Vercel's Hobby plan is licensed for non-commercial use, so a paying shop's live
app belongs on Pro.

## Migrating from the Apps Script version

The old member list lives in the Google Sheet behind the script. Export it to
CSV and insert into `members` (name, digits-only phone), then insert one `stamps`
row per stamp each member currently holds. Keep the old deployment live until the
new domain is verified.

## Verified

Both flows have been walked against the live Supabase project: join → staff
lookup → `+1 STAMP` → reward → `REDEEM FREE DRINK`, checking the database after
each step. Also confirmed directly against Postgres:

- balance starts at 0 and increments
- a second stamp within 5 seconds is rejected and the balance is unchanged
- redeeming below a full card is refused
- redeeming at 6 stamps consumes the 5 oldest and rolls 1 over
- duplicate and non-numeric phone numbers are rejected
- deleting a member cascades to their stamps and rewards
- undo removes a fresh stamp, refuses one older than 10 minutes, and cannot
  revive a stamp already consumed by a redemption
- a signed cookie naming a member who no longer exists lands on the join screen
  instead of looping between `/` and `/card`

Every text colour meets WCAG AA for its size, checked by calculation rather than
by eye. Redeeming needs two taps, because it sits where `+1 STAMP` normally does
and cannot be undone.

## Not built yet

- **Member verification codes.** The 4-digit step from the mockup's login flow
  was dropped on purpose, since members are identified by phone number alone.
- **Staff attribution.** Stamps record when they were added and nothing about who
  added them. See the security model above.
