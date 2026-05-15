-- supabase/migrations/20260515000000_add_usage_limits.sql

alter table users
  add column generations_remaining int not null default 1,
  add column waitlist_joined boolean not null default false,
  add column waitlist_name text,
  add column waitlist_phone text;

create index if not exists users_email_lower_idx on users (lower(email));

-- Idempotent waitlist signup. Grants +1 generation only on the first call.
-- Returns granted=true iff this call was the first; remaining is the new value.
create or replace function join_waitlist(
  p_name text,
  p_email text,
  p_phone text
)
returns table (granted boolean, generations_remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_was_joined boolean;
  v_remaining int;
begin
  select id, waitlist_joined into v_user_id, v_was_joined
  from users where auth_user_id = auth.uid();

  if v_user_id is null then
    raise exception 'user not found';
  end if;

  update users
  set waitlist_joined = true,
      waitlist_name = p_name,
      waitlist_phone = p_phone,
      email = p_email,
      generations_remaining = users.generations_remaining
        + case when users.waitlist_joined then 0 else 1 end
  where id = v_user_id
  returning users.generations_remaining into v_remaining;

  return query select (not coalesce(v_was_joined, false)), v_remaining;
end;
$$;

grant execute on function join_waitlist(text, text, text) to authenticated;
