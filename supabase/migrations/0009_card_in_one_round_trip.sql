-- A member and their card in one round trip.
--
-- This exists because the card stopped being cached. It used to sit in Next's
-- data cache under a per-member tag, cleared by add_stamp, undo_last_stamp and
-- redeem_reward. That works on one server and does not survive Vercel: the
-- barista's stamp invalidates the tag on whichever instance handled the POST,
-- while the customer's phone reloads against a different instance still holding
-- its own copy. Worse, Next's unstable_cache answers an expired entry with the
-- STALE value and refreshes behind the response, so even the instance that did
-- eventually time out served the old count one more time first. The customer
-- stood at the counter reloading and watching nothing change.
--
-- A stamp card is the wrong thing to cache. It is two small counts, read a
-- handful of times a day per member, and it has to be right at the exact moment
-- someone is standing there looking at it. So the cache is gone and the reads
-- go to Postgres every time. This function is what pays for that: the card page
-- used to make three sequential round trips (find the member, count the stamps,
-- sum the rewards) and now makes one.
--
-- p_visits is how much history the caller wants. The customer's card shows none
-- and passes 0; the counter screen lists five. Fetching every stamp a regular
-- has ever collected in order to render the number 3 was the other half of the
-- cost.

create or replace function card_for_member(p_member uuid, p_visits int default 0)
returns table (
  id           uuid,
  name         text,
  phone        text,
  created_at   timestamptz,
  -- Stamps counting toward the next drink. 0004 deletes the ones a redemption
  -- consumes, so this table only ever holds unclaimed stamps.
  open_stamps  bigint,
  -- What past redemptions consumed. Their stamp rows are gone; this is the only
  -- record of them, and open + spent is the lifetime total.
  spent_stamps bigint,
  redeemed     bigint,
  visits       jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  -- Every column is qualified. In a LANGUAGE SQL function the RETURNS TABLE
  -- names above are in scope, so a bare "created_at" is ambiguous against the
  -- output column of the same name and Postgres refuses the definition.
  select
    m.id,
    m.name,
    m.phone,
    m.created_at,
    (select count(*) from stamps s where s.member_id = m.id),
    coalesce((select sum(r.stamps_spent) from rewards r
               where r.member_id = m.id), 0)::bigint,
    (select count(*) from rewards r where r.member_id = m.id),
    -- '[]' rather than null when there is no history to send, or when the
    -- caller asked for none: the client maps this straight onto an array.
    coalesce((
      select jsonb_agg(v order by v.at desc)
        from (
          select s.created_at as at, s.location
            from stamps s
           where s.member_id = m.id
           order by s.created_at desc
           limit greatest(p_visits, 0)
        ) v
    ), '[]'::jsonb)
  from members m
 where m.id = p_member
$$;
