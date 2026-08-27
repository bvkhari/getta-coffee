-- Lifetime stamps, without keeping the stamps.
--
-- 0004 deletes the stamps a redemption consumes, and that is what keeps the
-- free plan's row count bounded. The shop still wants to know how many stamps a
-- customer has collected in total, and that does not need the rows back: every
-- redemption consumes exactly the threshold, and rewards already keeps one
-- permanent row per redemption. So the total is
--
--     sum(rewards.stamps_spent) + count(stamps)
--
-- Design note: this records what each redemption actually spent, rather than
-- adding a lifetime counter to members. 0001's rule still holds — no stored
-- mutable count that can drift away from the rows it claims to describe — and
-- recording the number survives the threshold changing later. A formula that
-- multiplied by today's stamps_per_reward() would not: moving 5 to 8 would
-- silently rewrite every total the shop had already been shown.
--
-- What this does not bring back is provenance. 0004 traded away which branch
-- earned a consumed stamp, and no backfill can invent it. Totals are exact;
-- per-branch history only starts from stamps that are still open.

alter table rewards add column if not exists stamps_spent int;

-- Exact, not an estimate: redeem_reward has consumed stamps_per_reward() stamps
-- on every redemption there has ever been, so the count each past reward spent
-- is known even though the rows are gone.
update rewards set stamps_spent = stamps_per_reward() where stamps_spent is null;

alter table rewards alter column stamps_spent set not null;

alter table rewards drop constraint if exists rewards_stamps_spent_positive;
alter table rewards add constraint rewards_stamps_spent_positive
  check (stamps_spent > 0);

-- Unchanged except that the reward now records what it cost. The delete below
-- is still the point of 0004: stamps holds only what has not been claimed.
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

  insert into rewards (member_id, stamps_spent)
       values (p_member, v_needed)
    returning id into v_reward;

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
