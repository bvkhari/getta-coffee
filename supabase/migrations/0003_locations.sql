-- Where a stamp was earned.
--
-- The café runs three branches and takes a pop-up stand to events, so "when"
-- alone doesn't say much: the owner can't tell a Muar regular from an Ipoh one,
-- or whether an event weekend paid for itself.
--
-- Design note: a stamp stores the location's *name*, not a foreign key. A stamp
-- is a historical fact — "this was earned at Ipoh" — and it has to keep reading
-- Ipoh after that branch closes or gets renamed. Copying the name at stamp time
-- gives that for free and keeps every read a single-table query.

create table if not exists locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (length(trim(name)) between 1 and 40),
  -- false when a branch closes: gone from the picker, its stamps keep their name
  active     boolean not null default true,
  -- a pop-up stand asks for the event name on top of the place
  asks_event boolean not null default false,
  created_at timestamptz not null default now()
);

-- Same as every other table: the service role is the only client, so RLS on
-- with no policies means a leaked anon key reads nothing.
alter table locations enable row level security;

insert into locations (name, asks_event) values
  ('Pagoh',  false),
  ('Muar',   false),
  ('Ipoh',   false),
  ('Pop-up', true)
on conflict (name) do nothing;

-- Null on every row predating this migration, which is honest: nobody knows
-- where those stamps were taken.
alter table stamps add column if not exists location text;

-- add_stamp gains the location. Dropped rather than replaced, because adding an
-- argument would leave two overloads behind and PostgREST could not tell them
-- apart.
drop function if exists add_stamp(uuid);

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
   where member_id = p_member and reward_id is null;

  return v_open;
end;
$$;
