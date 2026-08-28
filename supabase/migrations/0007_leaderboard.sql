-- Leaderboards: all time, and by calendar month.
--
-- All time needs nothing new. 0006 already records what each redemption spent,
-- so a member's total is sum(rewards.stamps_spent) + count(stamps).
--
-- A month is the hard one. 0004 deletes the stamps a redemption consumes, and
-- those rows carried the only record of WHEN they were earned. A regular who
-- redeems twice in a month would be counted five or ten stamps short, which is
-- exactly the customer a leaderboard is meant to celebrate. rewards.redeemed_at
-- cannot stand in: the stamps it consumed were often earned in an earlier month.
--
-- So earning gets its own tally, one small row per member per month, written at
-- the moment a stamp is added and therefore never affected by the stamp later
-- being deleted. The free plan's row ceiling survives: twelve rows a year for
-- even the heaviest regular, against the unbounded stamps table 0004 removed.

create table if not exists stamp_tallies (
  member_id uuid not null references members (id) on delete cascade,
  -- First day of the month, in the shop's own timezone.
  month     date not null,
  stamps    int  not null default 0 check (stamps >= 0),
  primary key (member_id, month)
);

alter table stamp_tallies enable row level security;

create index if not exists stamp_tallies_month_idx
  on stamp_tallies (month, stamps desc);

-- The shop is in Malaysia and its day rolls over at Malaysian midnight, not
-- UTC. Stable rather than immutable: timezone rules are data, and Postgres will
-- not let an index depend on them.
create or replace function kl_month(p_at timestamptz default now())
returns date
language sql
stable
as $$
  select date_trunc('month', p_at at time zone 'Asia/Kuala_Lumpur')::date
$$;

-- Backfill from the stamps that still exist. Deliberately partial: stamps
-- already consumed by a redemption are gone, so past months under-report and
-- there is no honest way to reconstruct them. Months from here on are exact.
insert into stamp_tallies (member_id, month, stamps)
select member_id, kl_month(created_at), count(*)
  from stamps
 group by 1, 2
on conflict (member_id, month) do update set stamps = excluded.stamps;

-- add_stamp now also records the earning, so the tally is unaffected when the
-- stamp itself is later deleted by a redemption.
create or replace function add_stamp(p_member uuid, p_location text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent int;
  v_open   int;
begin
  select count(*) into v_recent
    from stamps
   where member_id = p_member
     and created_at > now() - interval '5 seconds';

  if v_recent > 0 then
    raise exception 'duplicate_stamp' using errcode = 'P0001';
  end if;

  insert into stamps (member_id, location) values (p_member, p_location);

  insert into stamp_tallies (member_id, month, stamps)
       values (p_member, kl_month(), 1)
  on conflict (member_id, month)
    do update set stamps = stamp_tallies.stamps + 1;

  select count(*) into v_open
    from stamps
   where member_id = p_member;

  return v_open;
end;
$$;

-- Undo has to take the tally back too, and from the month the stamp was
-- actually earned in -- an undo just after midnight on the 1st belongs to the
-- month that is ending, not the one starting.
create or replace function undo_last_stamp(
  p_member uuid,
  p_within interval default interval '10 minutes'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_at timestamptz;
begin
  select id, created_at into v_id, v_at
    from stamps
   where member_id = p_member
     and created_at > now() - p_within
   order by created_at desc
   limit 1;

  if v_id is null then
    return false;
  end if;

  delete from stamps where id = v_id;

  update stamp_tallies
     set stamps = greatest(stamps - 1, 0)
   where member_id = p_member
     and month = kl_month(v_at);

  return true;
end;
$$;

-- Every member's total for one scope: null p_month means all time.
--
-- Factored out so the board and a single member's standing cannot drift apart.
-- Two copies of this arithmetic would eventually disagree, and the customer who
-- noticed would be the one told they are 11th on a board they are 10th on.
create or replace function member_totals(p_month date default null)
returns table (member_id uuid, name text, joined timestamptz, stamps bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.name,
    m.created_at,
    (case
       when p_month is null then
         coalesce((select sum(r.stamps_spent) from rewards r
                    where r.member_id = m.id), 0)
         + (select count(*) from stamps s where s.member_id = m.id)
       else
         coalesce((select t.stamps from stamp_tallies t
                    where t.member_id = m.id and t.month = p_month), 0)
     end)::bigint
  from members m
$$;

-- The board itself. Ties share a position -- two customers on 40 stamps are
-- both 3rd -- and the display order breaks the tie by who joined first, so the
-- list does not reshuffle between page loads.
create or replace function leaderboard(
  p_month date default null,
  p_limit int  default 10
)
returns table (member_id uuid, name text, stamps bigint, position bigint)
language sql
stable
security definer
set search_path = public
as $$
  -- Every reference is qualified. In a LANGUAGE SQL function the RETURNS TABLE
  -- names are in scope, so a bare "stamps" is ambiguous against the output
  -- column of the same name and Postgres refuses the definition.
  select t.member_id, t.name, t.stamps,
         rank() over (order by t.stamps desc)
    from member_totals(p_month) t
   where t.stamps > 0
   order by t.stamps desc, t.joined
   limit p_limit
$$;

-- One member's standing, for the line shown when they are outside the top ten.
-- position 0 means they have collected nothing in this scope yet, which is not
-- the same as being last and should not be rendered as a rank.
create or replace function leaderboard_position(
  p_member uuid,
  p_month  date default null
)
returns table (position bigint, stamps bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select t.member_id,
           t.stamps,
           rank() over (order by t.stamps desc) as position
      from member_totals(p_month) t
     where t.stamps > 0
  )
  select
    coalesce((select r.position from ranked r where r.member_id = p_member), 0),
    coalesce((select r.stamps   from ranked r where r.member_id = p_member), 0),
    (select count(*) from ranked)
$$;
