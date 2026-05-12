# Survey Improvements Design

**Date:** 2026-05-08
**Status:** Approved

## Overview

Six focused improvements to the survey flow: button behavior, block title copy, one-time survey guard (URL-aware), user deduplication, and two progress bar fixes.

---

## 1. Survey Buttons — All Question Types

**Problem:** Single-select questions auto-advance after 280ms, giving users no time to review. Multi-select/text questions already have a Continue button but no Repeat or Exit buttons on the question screen itself.

**Changes to `components/SurveyForm.tsx`:**

- Remove `setTimeout(() => advance(), 280)` from `handleOptionClick`. Selecting an option no longer auto-advances for any question type.
- Show a Continue button on **all** question types (extend the existing `isMulti` button to always render).
- Button label: "המשך →" for questions 1–9, "סיים וצור לי תוכן ⚡" on the last question.
- Continue is disabled until the question is answered (`isAnswered()` returns true).
- Add a **"← חזור"** (Repeat) button — navigates to the previous question; hidden on question 1.
- Add a **"יציאה"** (Exit) button — navigates to `/` (home); visible on all questions.

**Button layout below the answer options:**

```
[המשך → / סיים וצור לי תוכן ⚡]   ← full-width primary button
[← חזור]              [יציאה]      ← smaller secondary row (חזור hidden on Q1)
```

The topbar back button and exit button remain unchanged.

---

## 2. Block Titles

**Problem:** Current block titles expose internal product framing ("ולידציה כלכלית", "הכאב האמיתי", "על העסק שלך"). Users should not see validation-oriented language.

**Changes to `lib/survey-questions.ts`:**

| Block | Old `blockTitle` | New `blockTitle` |
|-------|-----------------|-----------------|
| 1 | "על העסק שלך" | "קצת עליך" |
| 2 | "הנוכחות הדיגיטלית שלך" | "פרסום ברשתות" |
| 3 | "הכאב האמיתי" | "אתגרי תוכן" |
| 4 | "ולידציה כלכלית" | "מה חשוב לך" |

---

## 3. One-Time Survey Guard (URL-aware)

**Problem:** A user who already completed the survey gets forced through it again on every visit. But a user who submits a *different* URL (new business) should redo the survey since the context has changed.

### Landing page (`app/page.tsx`) — submission logic

Before upserting, query for an existing user row by `auth_user_id`:

1. **No existing user** → upsert as new (no `survey_completed` override).
2. **Existing user, same URL** → upsert normally; `survey_completed` stays `true` if it was.
3. **Existing user, different URL** → upsert with `survey_completed: false` to force a new survey run.

### Survey page (`app/survey/page.tsx`) — mount check

On mount, after confirming `user_id` exists in localStorage:
- Fetch the user row from Supabase.
- If `survey_completed = true` → `router.replace('/loading')`.
- Otherwise → render survey normally.

---

## 4. User Deduplication

**Problem:** Every landing page form submission calls `.insert()`, creating a new `users` row even for returning authenticated users.

### DB migration

Add a `UNIQUE` constraint on `auth_user_id`:

```sql
ALTER TABLE users
  ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
```

### Landing page (`app/page.tsx`)

Replace `.insert()` with `.upsert(..., { onConflict: 'auth_user_id' })`. Implementation:

```ts
// 1. Check for existing user
const { data: existing } = await supabase
  .from('users')
  .select('id, website_url')
  .eq('auth_user_id', user.id)
  .maybeSingle()

const urlChanged = existing && existing.website_url !== cleanUrl

// 2. Upsert
const { data, error } = await supabase
  .from('users')
  .upsert(
    {
      auth_user_id: user.id,
      website_url: cleanUrl,
      ...(urlChanged ? { survey_completed: false } : {}),
    },
    { onConflict: 'auth_user_id' }
  )
  .select('id')
  .single()
```

---

## 5. Loading Screen Progress Bar

**Problem:** The bar "suddenly starts" (no visible ramp-up from 0) and "ends quickly" (API resolves fast, bar jumps to 100% with only 500ms before redirect).

**Changes to `app/loading/page.tsx`:**

- **Startup delay:** Start the progress interval after a 150ms delay so the browser paints `width: 0%` before the first increment.
- **Minimum display time:** Record `startTime = Date.now()` when the component mounts. After the API resolves, wait until at least 4 000ms have elapsed before redirecting.
- **Final transition:** When setting `progress(100)`, apply a longer CSS transition for that final jump. Use a `data-finishing` attribute or a separate state boolean (`finishing`) to switch the `.progress-bar-animate` transition from `0.5s` to `1.2s` for the last segment.
- **Redirect delay:** Increase from 500ms to 1 500ms after `setProgress(100)` so the bar visibly completes before navigation.

---

## 6. Survey Progress Bar

**Problem:** The topbar bar starts at 10% on the first question (`(index + 1) / total`) instead of 0%, so it never shows an empty state and the initial fill looks like it skips the start.

**Change in `components/SurveyForm.tsx`:**

```ts
// Before
const progress = ((currentIndex + 1) / questions.length) * 100

// After
const progress = (currentIndex / questions.length) * 100
```

The bar now starts at 0% on question 1 and reaches 100% when the last Continue is pressed (at which point the user is already transitioning to loading).

---

## Files Changed

| File | Change |
|------|--------|
| `lib/survey-questions.ts` | Block title copy |
| `components/SurveyForm.tsx` | Button behavior, progress formula |
| `app/survey/page.tsx` | Mount-time survey_completed check |
| `app/page.tsx` | Upsert logic with URL-change detection |
| `app/loading/page.tsx` | Progress bar startup delay + min duration |
| `app/globals.css` | Optional: `data-finishing` transition override |
| DB migration | `UNIQUE` constraint on `auth_user_id` |

---

## Out of Scope

- Editing or deleting previous survey responses when the URL changes (old rows stay, new ones are inserted on completion).
- Any changes to the results or waitlist screens.
