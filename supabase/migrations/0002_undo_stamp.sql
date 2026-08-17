-- Undo for a mis-stamp.
--
-- A barista stamping the wrong customer is the most likely slip at a counter,
-- and until now there was no way back without database access. Deleting the row
-- is the whole fix, because the balance is derived rather than stored.
--
-- Bounded to a time window so this stays a correction for a slip that just
-- happened, and can't be used to quietly claw back stamps from days ago.

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
     and reward_id is null
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
