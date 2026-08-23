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

Three tables. Nothing stores a member's stamp balance. It is derived by counting
the stamps they are holding:

```
members   id, name, phone (unique), created_at
stamps    id, member_id, created_at, location   -- one row per unclaimed stamp
rewards   id, member_id, redeemed_at
```

Balance is `count(stamps)` for that member. Redeeming inserts a `rewards` row and
**deletes** the 5 oldest stamps that paid for it, so `stamps` only ever holds what
a member has not claimed yet. That keeps the one table that would otherwise grow
forever small enough for Supabase's free plan, and `rewards` — one short row per
free drink — is the lasting record. Extra stamps still roll over instead of
vanishing, and a mis-stamp is undone by deleting one row rather than reconciling
a number.

The trade is provenance: once a drink is claimed, nothing remembers which branch
earned it.

Two Postgres functions hold the rules, so they can't drift between callers:

- **`add_stamp(member)`**: inserts one stamp, returns the new balance. Rejects a
  second stamp within 5 seconds. That absorbs a double-tap at the counter but
  still lets you stamp someone twice if they genuinely buy two drinks a minute
  apart.
- **`redeem_reward(member)`**: refuses unless the balance covers a full card,
  then records the redemption and deletes the stamps it consumed, atomically.
- **`undo_last_stamp(member)`**: removes the newest stamp, but only within 10
  minutes. Stamping the wrong customer is the likeliest slip at a counter, so
  staff can take it back from the confirmation screen or the customer's page. It
  cannot reach a stamp that has already bought a drink, because that row is gone.

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

`/staff` and `/card` carry `noindex` page metadata, set on a layout in each
directory so nested routes inherit it. This replaced a `robots.ts` disallow:
a disallow stops a crawler fetching the page, which also stops it ever seeing a
`noindex`, so a linked URL can still surface in results with no content. The
page-level rule is the one that actually keeps them out.

## Deploying

Vercel: import the repo and add the four environment variables. Keep
`SUPABASE_SERVICE_ROLE_KEY` server-side; prefixing it `NEXT_PUBLIC_` would
publish it to every visitor.

Vercel's Hobby plan is licensed for non-commercial use, so a paying shop's live
app belongs on Pro. This deployment stays on Hobby as a deliberate, accepted
call, not an oversight.

### The `rewards.gettacoffee.com` subdomain

The cafe owns `gettacoffee.com`, whose apex serves their customer feedback
survey. The reward app takes the `rewards.` subdomain, so the two never share a
hostname: separate origin, separate cookies, and no rule sitting in front of the
survey that could take it down.

DNS for the domain is delegated to **Cloudflare** (the registrar is Squarespace,
which holds registration only — its nameservers point at Cloudflare). The whole
setup is one record there:

```
rewards   CNAME   cname.vercel-dns.com      DNS only (grey cloud)
```

Leave it **DNS-only**. Proxying Cloudflare in front of Vercel stacks two CDNs for
no benefit, and with Cloudflare's SSL mode set to Flexible it produces a redirect
loop. Add `rewards.gettacoffee.com` as a domain on the Vercel project and let
Vercel issue the certificate.

Nothing in the application code is domain-aware: no `basePath`, no
`metadataBase`, no absolute URLs. Moving the app to a different hostname needs no
code change at all.

A path on the apex (`gettacoffee.com/rewards`) was built and then abandoned. It
worked, but it required a `basePath`, a `serverActions.allowedOrigins` CSRF
exemption, cookie paths pinned to the prefix, and a permanent Cloudflare Worker
or Origin Rule proxying two apps under one hostname. It also put the reward app
and the survey on the same origin, and tripped a Next bug where a form submitted
before hydration redirects without the prefix. The subdomain removes all of it.

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
- redeeming at 6 stamps deletes the 5 oldest and rolls 1 over
- duplicate and non-numeric phone numbers are rejected
- deleting a member cascades to their stamps and rewards
- undo removes a fresh stamp and refuses one older than 10 minutes; the stamps a
  redemption took are gone, so there is nothing there for it to revive
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
