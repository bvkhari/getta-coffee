-- Ties go to whoever got there first.
--
-- 0007 let two members on 40 stamps share 3rd place, and only ordered them for
-- display. The shop wants a strict ladder instead: equal totals are broken by
-- who reached that total first, so the customer who has been sitting on 40 since
-- Tuesday ranks above the one who arrived at 40 on Friday.
--
-- "When did they reach their current total" is the moment of their most recent
-- stamp. Nothing recorded that: 0004 deletes the stamps a redemption consumes,
-- taking their timestamps with them, and 0007's tally counts a month's earning
-- without saying when in the month it happened. So the tally gains the one
-- column that answers it, written at stamp time like the count beside it and
-- equally untouched by the stamp later being deleted.

alter table stamp_tallies
  add column if not exists last_stamp_at timestamptz;

-- Backfill carries the same caveat as 0007's: it can only see stamps that still
-- exist, so a member whose newest stamp was already eaten by a redemption has
-- nothing here until their next one.
update stamp_tallies t
   set last_stamp_at = s.at
  from (
    select member_id, kl_month(created_at) as month, max(created_at) as at
      from stamps
     group by 1, 2
  ) s
 where s.member_id = t.member_id
   and s.month = t.month
   and t.last_stamp_at is null;

-- Stamping now records when, not just how many.
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

  insert into stamp_tallies (member_id, month, stamps, last_stamp_at)
       values (p_member, kl_month(), 1, now())
  on conflict (member_id, month)
    do update set stamps        = stamp_tallies.stamps + 1,
                  last_stamp_at = now();

  select count(*) into v_open
    from stamps
   where member_id = p_member;

  return v_open;
end;
$$;

-- Undoing a stamp has to hand back the timestamp too, or a mis-stamp would keep
-- pushing that member down the ladder after it was taken back. The stamp row is
-- gone by then, so the month's remaining stamps are asked instead -- exact,
-- because an undo can only ever reach a stamp that is still there. Null when it
-- was that month's only stamp, which is right: nothing was earned.
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
     set stamps        = greatest(stamps - 1, 0),
         last_stamp_at = (
           select max(s.created_at)
             from stamps s
            where s.member_id = p_member
              and kl_month(s.created_at) = kl_month(v_at)
         )
   where member_id = p_member
     and month = kl_month(v_at);

  return true;
end;
$$;

-- The three functions are recreated together because member_totals gains a
-- column, which Postgres will not do through create or replace, and the other
-- two read it.
drop function if exists leaderboard(date, int);
drop function if exists leaderboard_position(uuid, date);
drop function if exists member_totals(date);

-- Every member's total for one scope, and when they arrived at it.
--
-- All time reads the newest tally rather than the newest open stamp: the two
-- agree while a member is holding stamps, and only the tally still knows the
-- answer for someone a redemption has just emptied out. Where neither can say --
-- a member whose last stamp was consumed before this migration existed -- the
-- redemption that ate it is the closest honest bound, and joining is the floor.
create or replace function member_totals(p_month date default null)
returns table (member_id uuid, name text, reached timestamptz, stamps bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.name,
    (case
       when p_month is null then
         coalesce(
           (select max(t.last_stamp_at) from stamp_tallies t
             where t.member_id = m.id),
           (select max(r.redeemed_at) from rewards r
             where r.member_id = m.id),
           m.created_at)
       else
         coalesce(
           (select t.last_stamp_at from stamp_tallies t
             where t.member_id = m.id and t.month = p_month),
           m.created_at)
     end),
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
 where not m.hide_from_board
$$;

-- The board itself. row_number, not rank: every member holds a place of their
-- own, and equal totals are separated by who reached that total first. The id
-- is the last resort, so two stamps in the same millisecond still produce one
-- fixed order instead of a list that reshuffles between page loads.
create or replace function leaderboard(
  p_month date default null,
  p_limit int  default 10
)
-- Named "standing" because "position" is reserved: it is the built-in
-- position(substring in string), and Postgres rejects it here unquoted.
returns table (member_id uuid, name text, stamps bigint, standing bigint)
language sql
stable
security definer
set search_path = public
as $$
  -- Every reference is qualified. In a LANGUAGE SQL function the RETURNS TABLE
  -- names are in scope, so a bare "stamps" is ambiguous against the output
  -- column of the same name and Postgres refuses the definition.
  select t.member_id, t.name, t.stamps,
         row_number() over (
           order by t.stamps desc, t.reached, t.member_id)
    from member_totals(p_month) t
   where t.stamps > 0
   order by t.stamps desc, t.reached, t.member_id
   limit p_limit
$$;

-- One member's standing, for the line shown when they are outside the top ten.
-- Ordered identically to the board above, so the number a member is told about
-- themselves is the number they would see if they climbed into the list.
create or replace function leaderboard_position(
  p_member uuid,
  p_month  date default null
)
returns table (standing bigint, stamps bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select t.member_id,
           t.stamps,
           row_number() over (
             order by t.stamps desc, t.reached, t.member_id) as standing
      from member_totals(p_month) t
     where t.stamps > 0
  )
  select
    coalesce((select r.standing from ranked r where r.member_id = p_member), 0),
    coalesce((select r.stamps   from ranked r where r.member_id = p_member), 0),
    (select count(*) from ranked)
$$;
