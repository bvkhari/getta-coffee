-- A redemption now deletes the stamps it consumes.
--
-- The café runs on Supabase's free plan, and stamps was the only table growing
-- without a ceiling: one row per coffee, kept forever. Redeeming used to tag the
-- five oldest rows with the reward's id and leave them there, so a regular who
-- buys five hundred drinks parks five hundred rows in the database and nothing
-- ever reads four hundred and ninety five of them again.
--
-- Design note: the balance stays derived, it just has nothing left to filter.
-- stamps now holds only what a member has not yet claimed — never more than four
-- rows between free drinks — and rewards is the permanent record of the ones
-- they have. What that trades away is provenance: once a drink is claimed, there
-- is no longer any way to say which branch earned it.

-- Redeems one free drink: records the redemption and deletes the oldest stamps
-- that paid for it, so any extra stamps beyond the threshold still roll over.
create or replace function redeem_reward(p_member uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_needed int := stamps_per_reward();
  v_open   int;
  v_reward uuid;
begin
  select count(*) into v_open
    from stamps
   where member_id = p_member;

  if v_open < v_needed then
    raise exception 'not_enough_stamps' using errcode = 'P0001';
  end if;

  insert into rewards (member_id) values (p_member) returning id into v_reward;

  delete from stamps
   where id in (
     select id from stamps
      where member_id = p_member
      order by created_at
      limit v_needed
   );

  return v_reward;
end;
$$;

-- The stamps consumed by every past redemption. This is the space already spent.
delete from stamps where reward_id is not null;

-- reward_id would be null on every row from here on. Dropping it also closes a
-- hazard: it was `on delete set null`, so deleting a rewards row quietly handed
-- its five stamps back and re-granted the free drink.
drop index if exists stamps_open_idx;
alter table stamps drop column if exists reward_id;
create index if not exists stamps_member_idx on stamps (member_id, created_at);

-- add_stamp and undo_last_stamp both read reward_id. plpgsql resolves column
-- names when the statement first runs, not when the function is created, so
-- both would fail at the counter the moment the column went away.

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
  -- Keyed on the member alone: the same customer can't be stamped twice within
  -- five seconds no matter which counter they're standing at.
  select count(*) into v_recent
    from stamps
   where member_id = p_member
     and created_at > now() - interval '5 seconds';

  if v_recent > 0 then
    raise exception 'duplicate_stamp' using errcode = 'P0001';
  end if;

  insert into stamps (member_id, location) values (p_member, p_location);

  select count(*) into v_open
    from stamps
   where member_id = p_member;

  return v_open;
end;
$$;

-- Unchanged in spirit. It could never take back a stamp already consumed by a
-- redemption, and now that those rows are deleted there is nothing to exclude.
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
begin
  select id into v_id
    from stamps
   where member_id = p_member
     and created_at > now() - p_within
   order by created_at desc
   limit 1;

  if v_id is null then
    return false;
  end if;

  delete from stamps where id = v_id;
  return true;
end;
$$;
