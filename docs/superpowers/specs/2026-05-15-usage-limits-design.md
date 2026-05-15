# Usage Limits & Waitlist-Granted Credits — Design

**Date:** 2026-05-15
**Status:** Approved, ready for implementation planning
**Author:** Claude (brainstormed with Noam)

## Problem

ContentMine is a validation product. Today every signed-in user can trigger the
generation pipeline an unbounded number of times. Each run consumes Gemini API
quota for scraping → summary → planning → 3 post generations → humanization →
1 image. With unlimited usage, a handful of users can rack up significant API
spend before we have any signal about whether the product is worth building.

We want to cap usage per user, but in a way that doubles as a growth lever: a
user who wants more output is invited to join the waitlist, which both gives us
a lead and grants them a second generation.

## Goals

1. Each user receives exactly **1 generation** at signup.
2. Joining the waitlist grants **+1 generation**, exactly once per user.
3. The admin (Noam) can grant additional credits to any user without writing
   SQL.
4. A second generation must produce **meaningfully different** content from
   the first — same URL + same survey would otherwise yield near-identical
   output.
5. UI communicates the value of the waitlist signup ("get another generation")
   at the moment of friction.
6. Removing now-redundant UI ("← אתר אחר" back button) and skipping the
   survey on subsequent generations.

## Non-Goals

- Per-time-window quotas (daily/monthly). Pure lifetime counter only.
- Payment/upgrade flow. This is validation, not monetization.
- A real audit log of credit changes (the `posts` table already records every
  successful generation with a timestamp).
- Anonymous abuse prevention (Supabase auth is required, magic-link gated).

## Data Model

One migration: `supabase/migrations/20260515000000_add_usage_limits.sql`.

```sql
alter table users
  add column generations_remaining int not null default 1,
  add column waitlist_joined boolean not null default false,
  add column waitlist_name text,
  add column waitlist_phone text;

create index users_email_lower_idx on users (lower(email));
```

- `generations_remaining`: lifetime counter. Server-side decrement on each
  successful generation start. Refunded on pipeline error after decrement.
- `waitlist_joined`: idempotency guard for the +1 grant.
- `waitlist_name`, `waitlist_phone`: capture form data that today is collected
  by the UI but discarded (only `email` is currently saved to `users`).
- The email index speeds up admin lookups.

**Existing users:** `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT 1`
atomically populates all existing rows with the value 1. No separate backfill
statement needed.

## Backend — Edge Function Changes

File: `supabase/functions/generate-content/index.ts` (and shared pipeline).

### 1. Resolve internal user ID from JWT

Before the pipeline runs, look up the `users` row via `auth_user_id` (from
the verified JWT). Store the resulting `users.id` for the rest of the
request.

### 2. Atomic credit check + decrement (pre-flight)

```sql
update users
set generations_remaining = generations_remaining - 1
where id = $1 and generations_remaining > 0
returning generations_remaining;
```

If the update returns 0 rows → respond `402 { error: 'no_credits' }`. The
single statement is the atomicity boundary; two parallel tabs cannot both
pass.

### 3. Refund on pipeline failure

Any unhandled error after the successful decrement triggers:

```sql
update users
set generations_remaining = generations_remaining + 1
where id = $1;
```

A user whose generation crashed gets their credit back. Wrap the pipeline
call in a try/catch around this refund.

### 4. Variation: feed prior posts into the planner

Before `plan` stage, fetch:

```ts
const { data: priorPosts } = await supabase
  .from('posts')
  .select('post_type, content, copy')
  .eq('user_id', userId)
  .order('generated_at', { ascending: true })
```

If `priorPosts.length > 0`, append to the planner system/user prompt:

```
The user has previously received the following posts:
---
[VALUE] {content + copy}
[TRUST] {content + copy}
[CTA]   {content + copy}
---
Generate a marketing plan with fundamentally different angles, hooks, personal
stories, and emotional tones. Do not repeat themes, phrasing, or examples from
the prior posts.
```

A shortened version of the same instruction is also threaded into the
post-generation prompt as a backstop (the planner output already changed,
but the per-post generator should know not to drift back to familiar
phrasing).

## Frontend — User Flow Changes

### Skip survey on subsequent generations

[app/page.tsx:515](../../app/page.tsx) — after URL is saved and the `users`
row is upserted, branch on `users.survey_completed`:

- `false` → `router.push('/survey')` (current behavior, new users only)
- `true`  → `router.push('/loading')` (skip the survey entirely)

This applies to **all** entry paths into the funnel, including the "create
new post" CTA shown after waitlist signup.

### Out-of-credits state on `/`

In [app/page.tsx](../../app/page.tsx), the landing form submit handler also
reads `generations_remaining`. Three cases on submit:

| State | Action |
| --- | --- |
| `remaining > 0`, survey not done | route to `/survey` (existing) |
| `remaining > 0`, survey done | route to `/loading` (new) |
| `remaining = 0`, `waitlist_joined = false` | swap hero form for inline waitlist panel |
| `remaining = 0`, `waitlist_joined = true` | swap hero form for "you're out, sit tight" panel + WhatsApp CTA |

The inline waitlist panel reuses the same name/email/phone form fields
already present on `/results`. On success it shows a success card with one
big CTA "צור פוסט חדש עכשיו" that routes to `/loading`.

### Credit indicator

A small badge in the `/` header reads "1 יצירה זמינה" or "0 יצירות".
Lightweight visual signal; reads the same `generations_remaining` value the
form handler uses.

### `/results` changes

[app/results/page.tsx](../../app/results/page.tsx):

1. **Remove the "← אתר אחר" back button** (lines 191–212).
2. **Waitlist form copy**: replace the subtitle "הודעה ראשונה כשמשיקים +
   שבוע חינם" with "הצטרף ותקבל יצירת פוסט נוספת — מיידית 🎁".
3. **Benefits list** (around line 686): add a top bullet "🎁 יצירת פוסט
   נוספת — מיד כשתצטרף".
4. **`handleWaitlistSubmit`** calls a new `join_waitlist` RPC (defined
   below) that handles the atomic update + idempotent grant server-side.
5. **Success state** (`wlDone`) gains a CTA button: "צור פוסט חדש עכשיו"
   → `/loading`.

### `join_waitlist` RPC

Defined in `20260515000000_add_usage_limits.sql` (same migration as the
schema change). Used by both `/` and `/results` forms. Runs the atomic
update server-side to avoid a TOCTOU race between two concurrent submits:

```sql
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
      generations_remaining = generations_remaining
        + case when waitlist_joined then 0 else 1 end
  where id = v_user_id
  returning generations_remaining into v_remaining;

  return query select (not v_was_joined), v_remaining;
end;
$$;

grant execute on function join_waitlist(text, text, text) to authenticated;
```

The function returns `granted = true` only on the first call, so the
frontend can show a different success message for "you got +1 credit"
vs. "we updated your info."

## Admin Page

New route: `app/admin/page.tsx` (client component).

### Auth gate

```ts
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'noambusiness0405@gmail.com'
const { data: { user } } = await supabase.auth.getUser()
if (user?.email !== ADMIN_EMAIL) router.replace('/auth')
```

This is a soft client-side gate. The real privilege check lives at the DB
level via the RPC functions below.

### Backend RPCs

Migration: `supabase/migrations/20260515000001_add_admin_rpcs.sql`.

```sql
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
  if (auth.jwt() ->> 'email') is null or
     (auth.jwt() ->> 'email') <> coalesce(
       current_setting('app.admin_email', true),
       'noambusiness0405@gmail.com'
     ) then
    raise exception 'forbidden';
  end if;
  return query
    select u.id, u.email, u.website_url, u.generations_remaining,
           u.waitlist_joined,
           (select count(*) from posts p where p.user_id = u.id),
           u.created_at
    from users u
    where (query is null or query = '')
       or lower(u.email) like '%' || lower(query) || '%'
       or lower(u.website_url) like '%' || lower(query) || '%'
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
  if (auth.jwt() ->> 'email') is null or
     (auth.jwt() ->> 'email') <> coalesce(
       current_setting('app.admin_email', true),
       'noambusiness0405@gmail.com'
     ) then
    raise exception 'forbidden';
  end if;
  if new_amount < 0 then
    raise exception 'amount must be non-negative';
  end if;
  update users set generations_remaining = new_amount
  where id = target_user_id
  returning generations_remaining into result;
  return result;
end;
$$;

grant execute on function admin_search_users(text) to authenticated;
grant execute on function admin_set_credits(uuid, int) to authenticated;
```

The admin email allowlist is the JWT claim check inside each function.
`current_setting('app.admin_email', true)` allows overriding via Supabase
project config; falls back to the hardcoded default.

### UI

Single-screen layout (functional, not polished):

- Search box → calls `admin_search_users(query)` on enter / debounced typing.
- For each result row, show: email, website, current credits, waitlist
  status, post count, joined date.
- Each row has three buttons: `−1`, `+1`, and a number input with `set`.
- On click, call `admin_set_credits(user_id, new_amount)` and refresh the
  row's displayed credits with the return value.

## Files Touched

**New:**
- `supabase/migrations/20260515000000_add_usage_limits.sql`
- `supabase/migrations/20260515000001_add_admin_rpcs.sql`
- `app/admin/page.tsx`

**Modified:**
- `supabase/functions/generate-content/index.ts` — credit check, decrement,
  refund, prior-posts fetch
- `supabase/functions/_shared/pipeline.ts` — accept prior posts param,
  thread into planner + generator prompts
- `app/page.tsx` — survey-skip routing, out-of-credits panel, credit badge,
  shared waitlist signup logic
- `app/results/page.tsx` — remove back button, update waitlist copy,
  benefits list, success CTA, idempotent waitlist SQL

## Open Questions / Risks

- **`current_setting('app.admin_email')`** requires a `ALTER DATABASE …
  SET app.admin_email = '…'` to override. If we never set it, we fall back
  to the hardcoded default — fine for v1. If admin ownership ever needs to
  change, we update the function or set the GUC.
- **Existing users in the DB** all get `generations_remaining = 1` from the
  default. None of them have used a credit yet under the new system, which
  is correct (the old system didn't track credits).
- **Race on refund vs admin set**: extremely unlikely (admin tab + active
  generation crashing within the same second). Not worth a lock.

## Approval

- Data model: approved
- Generation flow & variation: approved
- UI changes (out-of-credits panel, /results edits, credit badge): approved
- Admin page (RPC approach, env-var admin email): approved
