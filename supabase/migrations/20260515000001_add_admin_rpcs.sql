-- supabase/migrations/20260515000001_add_admin_rpcs.sql

-- Admin email check helper. Uses Postgres GUC `app.admin_email` if set,
-- otherwise falls back to the hardcoded default. To override:
--   alter database postgres set app.admin_email = 'someone@example.com';
create or replace function is_admin_caller()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'email'),
    ''
  ) = coalesce(
    current_setting('app.admin_email', true),
    'noambusiness0405@gmail.com'
  );
$$;

create or replace function admin_search_users(query text)
returns table (
  id uuid,
  email text,
  website_url text,
  generations_remaining int,
  waitlist_joined boolean,
  post_count bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin_caller() then
    raise exception 'forbidden';
  end if;
  return query
    select u.id, u.email, u.website_url, u.generations_remaining,
           u.waitlist_joined,
           (select count(*) from posts p where p.user_id = u.id),
           u.created_at
    from users u
    where (query is null or query = '')
       or lower(coalesce(u.email, '')) like '%' || lower(query) || '%'
       or lower(coalesce(u.website_url, '')) like '%' || lower(query) || '%'
    order by u.created_at desc
    limit 50;
end;
$$;

create or replace function admin_set_credits(target_user_id uuid, new_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  result int;
begin
  if not is_admin_caller() then
    raise exception 'forbidden';
  end if;
  if new_amount < 0 then
    raise exception 'amount must be non-negative';
  end if;
  update users set generations_remaining = new_amount
  where id = target_user_id
  returning generations_remaining into result;
  if result is null then
    raise exception 'user not found';
  end if;
  return result;
end;
$$;

grant execute on function admin_search_users(text) to authenticated;
grant execute on function admin_set_credits(uuid, int) to authenticated;
