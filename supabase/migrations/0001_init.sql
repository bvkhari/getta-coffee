-- Getta Coffee rewards: members, stamps, redemptions.
--
-- Design note: a member's stamp balance is never stored as a mutable counter.
-- It is derived as the number of stamps not yet consumed by a redemption, so
-- the whole history stays auditable and a mis-stamp can be undone by deleting
-- one row rather than reconciling a count.

create extension if not exists pgcrypto;

create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 80),
  phone      text not null unique check (phone ~ '^[0-9]{7,15}$'),
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members (id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create table if not exists stamps (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- null while the stamp still counts toward the next free drink
  reward_id  uuid references rewards (id) on delete set null
);

create index if not exists stamps_open_idx
  on stamps (member_id, created_at)
  where reward_id is null;

create index if not exists rewards_member_idx on rewards (member_id, redeemed_at desc);

-- The service role is the only client; the anon key is never shipped to the
-- browser. RLS on with no policies means a leaked anon key reads nothing.
alter table members enable row level security;
alter table stamps  enable row level security;
alter table rewards enable row level security;

-- Stamps needed for one free drink. Changing this changes the whole program,
-- so it lives in one place.
create or replace function stamps_per_reward() returns int
  language sql immutable as $$ select 5 $$;

-- Adds one stamp and returns the member's new open balance.
-- The 5-second guard absorbs a double-tap on the staff button; it is short
-- enough that a customer legitimately buying two drinks can still be stamped
-- twice a few seconds apart.
create or replace function add_stamp(p_member uuid)
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

  insert into stamps (member_id) values (p_member);

  select count(*) into v_open
    from stamps
   where member_id = p_member and reward_id is null;

  return v_open;
end;
$$;

-- Redeems one free drink: records the redemption and consumes the oldest
-- open stamps, so any extra stamps beyond the threshold roll over.
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
   where member_id = p_member and reward_id is null;

  if v_open < v_needed then
    raise exception 'not_enough_stamps' using errcode = 'P0001';
  end if;

  insert into rewards (member_id) values (p_member) returning id into v_reward;

  update stamps
     set reward_id = v_reward
   where id in (
     select id from stamps
      where member_id = p_member and reward_id is null
      order by created_at
      limit v_needed
   );

  return v_reward;
end;
$$;
