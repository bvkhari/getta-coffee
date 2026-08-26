-- Throttle for the staff gate.
--
-- /staff is on the public internet and one shared passcode opens it, so without
-- a limit the passcode is only as strong as the time it takes to try every
-- value. Counting in the app's memory doesn't work: Vercel runs the app as
-- serverless instances that start cold and scale out, and each new instance
-- brings a fresh counter with it. The count has to live where every instance
-- can see it, and the database is already that place.

create table if not exists unlock_attempts (
  ip    text primary key,
  tries int not null default 0,
  since timestamptz not null default now()
);

alter table unlock_attempts enable row level security;

-- Records one attempt and answers whether this address is over its limit.
--
-- ponytail: a fixed window, not a sliding one, so an address timed across a
-- boundary gets up to 2× p_max in quick succession. That is still four orders
-- of magnitude short of a keyspace, and a sliding window costs a row per
-- attempt. Revisit only if the limit itself needs to be tight.
create or replace function note_unlock_attempt(
  p_ip     text,
  p_max    int default 10,
  p_window interval default interval '15 minutes'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tries int;
begin
  -- Attempts age out, and an attacker rotating addresses would otherwise leave
  -- a row behind for each one. The table is tiny, so this is cheap every call.
  delete from unlock_attempts where since < now() - interval '1 day';

  insert into unlock_attempts (ip, tries, since)
       values (p_ip, 1, now())
  on conflict (ip) do update
     set tries = case
                   when unlock_attempts.since < now() - p_window then 1
                   else unlock_attempts.tries + 1
                 end,
         since = case
                   when unlock_attempts.since < now() - p_window then now()
                   else unlock_attempts.since
                 end
  returning tries into v_tries;

  return v_tries > p_max;
end;
$$;
