# Survey Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix survey button behavior, block copy, duplicate-user creation, one-time survey guard, and both progress bars.

**Architecture:** Six independent tasks touching five files plus one DB migration. Tasks 1 and 4 are coupled (upsert needs the unique constraint). All others are fully independent and can be done in any order after Task 1.

**Tech Stack:** Next.js 14 (App Router), React, Supabase JS client, Tailwind/inline styles, TypeScript.

---

## File Map

| File | What changes |
|------|-------------|
| DB migration (Supabase) | `UNIQUE` constraint on `users.auth_user_id` |
| `lib/survey-questions.ts` | Four `blockTitle` strings |
| `components/SurveyForm.tsx` | Remove auto-advance, add Continue/Repeat/Exit buttons, fix progress formula |
| `app/page.tsx` | Replace `.insert()` with select-then-upsert + URL-change detection |
| `app/survey/page.tsx` | Mount-time `survey_completed` check → skip to `/loading` |
| `app/loading/page.tsx` | 150ms startup delay, 4s minimum, longer final transition |

---

## Task 1: DB Migration — UNIQUE constraint on `auth_user_id`

**Files:**
- DB: `ALTER TABLE users ADD CONSTRAINT ...`

- [ ] **Step 1: Apply migration via Supabase MCP**

Run this SQL against the project (use Supabase dashboard SQL editor or MCP `execute_sql`):

```sql
ALTER TABLE users
  ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
```

Expected: command completes with no error. If it fails with "duplicate key" it means there are already duplicate `auth_user_id` rows — run the dedupliation query below first, keeping the oldest row per `auth_user_id`:

```sql
DELETE FROM users
WHERE id NOT IN (
  SELECT DISTINCT ON (auth_user_id) id
  FROM users
  ORDER BY auth_user_id, created_at ASC
);
```

Then re-run the `ALTER TABLE`.

- [ ] **Step 2: Verify constraint exists**

```sql
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'users'
  AND constraint_type = 'UNIQUE';
```

Expected: result includes `users_auth_user_id_key`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add unique constraint on users.auth_user_id"
```

---

## Task 2: Block Titles — remove internal validation language

**Files:**
- Modify: `lib/survey-questions.ts`

- [ ] **Step 1: Update all four `blockTitle` values**

Open `lib/survey-questions.ts`. Make these exact replacements:

```ts
// Block 1 (keys: q1, q2, q3) — change:
blockTitle: 'על העסק שלך',
// to:
blockTitle: 'קצת עליך',

// Block 2 (keys: q4, q5, q6) — change:
blockTitle: 'הנוכחות הדיגיטלית שלך',
// to:
blockTitle: 'פרסום ברשתות',

// Block 3 (keys: q7, q8) — change:
blockTitle: 'הכאב האמיתי',
// to:
blockTitle: 'אתגרי תוכן',

// Block 4 (keys: q9, q10) — change:
blockTitle: 'ולידציה כלכלית',
// to:
blockTitle: 'מה חשוב לך',
```

There are multiple questions per block — use find-replace to catch every instance. After editing, the file should contain zero occurrences of `'על העסק שלך'`, `'הנוכחות הדיגיטלית שלך'`, `'הכאב האמיתי'`, or `'ולידציה כלכלית'`.

- [ ] **Step 2: Verify**

```bash
grep -n "blockTitle" "lib/survey-questions.ts"
```

Expected output — only these four values, each appearing the correct number of times:
```
blockTitle: 'קצת עליך',       ← 3 times (q1, q2, q3)
blockTitle: 'פרסום ברשתות',   ← 3 times (q4, q5, q6)
blockTitle: 'אתגרי תוכן',     ← 2 times (q7, q8)
blockTitle: 'מה חשוב לך',     ← 2 times (q9, q10)
```

- [ ] **Step 3: Commit**

```bash
git add lib/survey-questions.ts
git commit -m "fix: replace internal block titles with user-facing copy"
```

---

## Task 3: SurveyForm — buttons + progress bar formula

**Files:**
- Modify: `components/SurveyForm.tsx`

This task makes three changes to the same file: (a) fix progress formula, (b) remove auto-advance, (c) replace the button section.

- [ ] **Step 1: Fix progress formula**

Find this line (around line 25):
```ts
const progress = ((currentIndex + 1) / questions.length) * 100
```

Replace with:
```ts
const progress = (currentIndex / questions.length) * 100
```

Bar now starts at 0% on question 1 and reaches ~90% on the last question (100% is only hit when the user completes).

- [ ] **Step 2: Remove auto-advance from single-select**

Find `handleOptionClick` (around line 35). Remove the `setTimeout` auto-advance line. The full updated function:

```ts
function handleOptionClick(value: string) {
  if (currentQ.type === 'select-multi') {
    const current = answers[currentQ.key] || ''
    const values = current ? current.split('|') : []
    const updated = values.includes(value)
      ? values.filter(v => v !== value).join('|')
      : values.length > 0 ? `${current}|${value}` : value
    onChange(currentQ.key, updated)
  } else {
    onChange(currentQ.key, value)
    // No auto-advance — user presses Continue
  }
}
```

- [ ] **Step 3: Replace the button section**

Find and delete this block (around line 226–244 — the `{isMulti && (...)}` section):

```tsx
{/* Next button for multi/text */}
{isMulti && (
  <div style={{ marginTop: 30 }}>
    <button
      onClick={advance}
      disabled={!isAnswered()}
      ...
    >
      {currentIndex === questions.length - 1 ? 'צור לי תוכן ⚡' : 'הבא →'}
    </button>
  </div>
)}
```

Also delete the `const isMulti = ...` line above the `selectedValues` declaration.

Replace with this block (placed at the same location, before the closing `</div>` of the question area):

```tsx
{/* Action buttons — shown on all question types */}
<div style={{ marginTop: 30 }}>
  {/* Continue / Finish */}
  <button
    onClick={advance}
    disabled={!isAnswered()}
    style={{
      width: '100%', padding: '16px',
      background: 'var(--indigo)', color: 'white',
      border: 'none', borderRadius: 14, fontFamily: 'inherit',
      fontWeight: 700, fontSize: 16, cursor: 'pointer',
      boxShadow: 'var(--shadow-btn)',
      opacity: isAnswered() ? 1 : 0.45,
      transition: 'all 0.18s ease',
    }}
  >
    {currentIndex === questions.length - 1 ? 'סיים וצור לי תוכן ⚡' : 'המשך →'}
  </button>

  {/* Repeat + Exit row */}
  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
    {currentIndex > 0 && (
      <button
        onClick={() => setCurrentIndex(i => i - 1)}
        style={{
          flex: 1, padding: '11px',
          background: '#f0f1f5', border: 'none',
          color: 'var(--text-secondary)', fontFamily: 'inherit',
          fontWeight: 600, fontSize: 14, borderRadius: 12, cursor: 'pointer',
        }}
      >
        ← חזור
      </button>
    )}
    <button
      onClick={() => router.push('/')}
      style={{
        flex: 1, padding: '11px',
        background: 'transparent', border: '1px solid var(--border)',
        color: 'var(--text-muted)', fontFamily: 'inherit',
        fontWeight: 600, fontSize: 14, borderRadius: 12, cursor: 'pointer',
      }}
    >
      יציאה
    </button>
  </div>
</div>
```

- [ ] **Step 4: Verify no compile errors**

```bash
cd "/Users/noamcarter/Desktop/Validation 1" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add components/SurveyForm.tsx
git commit -m "feat: add Continue/Repeat/Exit buttons, remove auto-advance, fix progress formula"
```

---

## Task 4: Landing Page — upsert + URL-change detection

**Files:**
- Modify: `app/page.tsx` (the `handleSubmit` function, lines ~57–90)

Depends on Task 1 (unique constraint must exist before upsert works).

- [ ] **Step 1: Replace `handleSubmit` body after URL validation**

Find this block inside `handleSubmit` (after the `try { new URL(cleanUrl) } catch` block):

```ts
setLoading(true)
try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.replace('/auth'); return }

  const { data, error: dbError } = await supabase
    .from('users')
    .insert({ website_url: cleanUrl, auth_user_id: user.id })
    .select('id')
    .single()

  if (dbError) throw dbError

  localStorage.setItem('user_id', data.id)
  localStorage.setItem('website_url', cleanUrl)
  router.push('/survey')
} catch {
  setError('אירעה שגיאה. אנא נסה שוב.')
  setLoading(false)
}
```

Replace with:

```ts
setLoading(true)
try {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.replace('/auth'); return }

  // Check for existing user to detect URL change
  const { data: existing } = await supabase
    .from('users')
    .select('id, website_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const urlChanged = !!existing && existing.website_url !== cleanUrl

  const { data, error: dbError } = await supabase
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

  if (dbError) throw dbError

  localStorage.setItem('user_id', data.id)
  localStorage.setItem('website_url', cleanUrl)
  router.push('/survey')
} catch {
  setError('אירעה שגיאה. אנא נסה שוב.')
  setLoading(false)
}
```

- [ ] **Step 2: Verify no compile errors**

```bash
cd "/Users/noamcarter/Desktop/Validation 1" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 3: Smoke test returning user**

1. Start dev server: `npm run dev`
2. Log in and submit URL A → survey fills → completes → posts generate.
3. Go back to home, submit URL A again.
4. Check Supabase `users` table: still only **one** row for this `auth_user_id`. `survey_completed` is still `true`.
5. Submit URL B (different URL).
6. Check table: same row, `website_url` updated to B, `survey_completed` is now `false`.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: upsert users on auth_user_id, reset survey_completed on URL change"
```

---

## Task 5: Survey Page — one-time survey guard

**Files:**
- Modify: `app/survey/page.tsx`

- [ ] **Step 1: Replace the mount-time redirect effect**

Find the existing `useEffect` (around line 18):

```ts
useEffect(() => {
  if (!localStorage.getItem('user_id')) router.replace('/')
}, [router])
```

Replace with:

```ts
useEffect(() => {
  const userId = localStorage.getItem('user_id')
  if (!userId) { router.replace('/'); return }

  supabase
    .from('users')
    .select('survey_completed')
    .eq('id', userId)
    .single()
    .then(({ data }) => {
      if (data?.survey_completed) router.replace('/loading')
    })
}, [router, supabase])
```

- [ ] **Step 2: Verify no compile errors**

```bash
cd "/Users/noamcarter/Desktop/Validation 1" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 3: Smoke test**

1. Complete the survey as user X (survey_completed = true in DB).
2. Navigate directly to `/survey`.
3. Expected: immediately redirected to `/loading` without seeing any questions.

- [ ] **Step 4: Commit**

```bash
git add app/survey/page.tsx
git commit -m "feat: skip survey if already completed for current URL"
```

---

## Task 6: Loading Screen — smooth progress bar

**Files:**
- Modify: `app/loading/page.tsx`

- [ ] **Step 1: Add new refs and state at the top of the component**

Find these lines at the top of `LoadingPage` (around line 13–15):

```ts
const called = useRef(false)
const [progress, setProgress] = useState(0)
```

Replace with:

```ts
const called = useRef(false)
const startTime = useRef(0)
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
const [progress, setProgress] = useState(0)
const [finishing, setFinishing] = useState(false)
```

- [ ] **Step 2: Replace the entire `useEffect` body**

Find the `useEffect` starting at line 16. Replace its entire body (everything inside the callback, including the `generate` function and the `return`) with:

```ts
const userId = localStorage.getItem('user_id')
if (!userId) { router.replace('/'); return }
if (called.current) return
called.current = true
startTime.current = Date.now()

let pVal = 0

// 150ms delay so the browser paints width:0% before the bar starts moving
const startDelay = setTimeout(() => {
  intervalRef.current = setInterval(() => {
    pVal += (92 - pVal) * 0.03
    setProgress(Math.min(92, pVal))
  }, 400)
}, 150)

async function generate() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token ?? supabaseAnonKey

    const res = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ user_id: userId }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      const stage = data.stage ? `[stage:${data.stage}] ` : ''
      const debug = data.debug ? ` — ${data.debug}` : ''
      localStorage.setItem('generation_error', `${stage}${data.error || 'שגיאה לא ידועה'}${debug}`)
    } else {
      localStorage.setItem('generated_posts', JSON.stringify(data.posts))
    }
  } catch {
    localStorage.setItem('generation_error', 'שגיאה ביצירת התוכן. אנא נסה שוב.')
  }

  // Enforce minimum 4s display so the animation is visible
  const elapsed = Date.now() - startTime.current
  const remaining = Math.max(0, 4000 - elapsed)

  setTimeout(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setFinishing(true)
    setProgress(100)
    setTimeout(() => router.push('/results'), 1500)
  }, remaining)
}

generate()

return () => {
  clearTimeout(startDelay)
  if (intervalRef.current) clearInterval(intervalRef.current)
}
```

- [ ] **Step 3: Update the progress bar div**

Find the progress bar inner div (around line 159–163):

```tsx
<div
  className="progress-bar-animate"
  style={{
    height: '100%', borderRadius: 4,
    background: 'linear-gradient(90deg, var(--indigo), var(--accent))',
    width: `${progress}%`,
  }}
/>
```

Replace with (transition is now inline so `finishing` can widen it for the final jump):

```tsx
<div
  style={{
    height: '100%', borderRadius: 4,
    background: 'linear-gradient(90deg, var(--indigo), var(--accent))',
    width: `${progress}%`,
    transition: finishing ? 'width 1.2s ease' : 'width 0.5s ease',
  }}
/>
```

- [ ] **Step 4: Verify no compile errors**

```bash
cd "/Users/noamcarter/Desktop/Validation 1" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no output.

- [ ] **Step 5: Smoke test**

1. Navigate to `/loading` (after completing the survey).
2. The bar should visibly start at 0, grow slowly over several seconds, then jump smoothly to 100% before navigating to results.
3. Even if the API resolves in under 4 seconds, the loading screen should stay visible for at least 4 seconds total.

- [ ] **Step 6: Commit**

```bash
git add app/loading/page.tsx
git commit -m "fix: smooth loading bar — 150ms startup delay, 4s minimum, 1.5s final transition"
```

---

## Self-Review Checklist (completed inline)

- **Spec § 1 (buttons):** Task 3 removes auto-advance, adds Continue/Repeat/Exit. ✓
- **Spec § 2 (block titles):** Task 2 covers all 4 blocks, 10 questions total. ✓
- **Spec § 3 (survey guard):** Task 5 checks `survey_completed` on mount; Task 4 resets it on URL change. ✓
- **Spec § 4 (deduplication):** Task 1 adds constraint; Task 4 uses upsert. ✓
- **Spec § 5 (loading bar):** Task 6 adds startup delay, 4s min, longer final transition. ✓
- **Spec § 6 (survey bar formula):** Task 3 changes formula to `currentIndex / total`. ✓
- **No placeholders:** All steps include complete code. ✓
- **Type consistency:** `intervalRef` typed as `ReturnType<typeof setInterval>` matches usage. ✓
