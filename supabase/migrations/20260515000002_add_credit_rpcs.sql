-- Atomic decrement: returns the new remaining value, or null if the user
-- had 0 credits (no row updated).
create or replace function consume_generation_credit(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  result int;
begin
  update users
  set generations_remaining = generations_remaining - 1
  where id = p_user_id and generations_remaining > 0
  returning generations_remaining into result;
  return result; -- null when no row matched (0 credits)
end;
$$;

-- Refund a previously-consumed credit (called on pipeline failure).
create or replace function refund_generation_credit(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  result int;
begin
  update users
  set generations_remaining = generations_remaining + 1
  where id = p_user_id
  returning generations_remaining into result;
  return result;
end;
$$;

grant execute on function consume_generation_credit(uuid) to service_role;
grant execute on function refund_generation_credit(uuid) to service_role;
