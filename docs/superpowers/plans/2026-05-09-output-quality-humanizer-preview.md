# Output Quality, Humanizer & Post Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee every generated post is full-length and human-sounding, and let users expand any post card to see the full image and text inline.

**Architecture:** A new `validate-post.ts` wraps `generatePostCopy` with a 3-attempt retry loop (rule-based checker → guided LLM retry → silent retry). A new `humanize.ts` runs a second Gemini pass to strip AI tells after validation. `pipeline.ts` chains both per post inside its existing `Promise.allSettled`. `PostCard.tsx` gets an `isPreviewed` state toggled by a new button.

**Tech Stack:** Deno (Edge Functions), Gemini API via `callGeminiWithRetry`/`parseJsonOutput` from `summarize.ts`, React + inline styles (PostCard)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/_shared/validate-post.ts` | `validatePost()` pure checker + `generateValidatedPostCopy()` retry wrapper |
| Create | `supabase/functions/_shared/humanize.ts` | `humanizePost()` LLM rewrite pass |
| Modify | `supabase/functions/_shared/pipeline.ts` | Replace `generatePostCopy` with validated + humanized chain |
| Modify | `components/PostCard.tsx` | Add `isPreviewed` state + Preview button |

---

## Task 1: `validatePost()` — pure quality checker

**Files:**
- Create: `supabase/functions/_shared/validate-post.ts`
- Create: `supabase/functions/_shared/validate-post.test.ts`

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/_shared/validate-post.test.ts`:

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { validatePost } from './validate-post.ts'
import type { CopywriterOutput } from './generate-post.ts'

const goodValuePost: CopywriterOutput = {
  content: 'פסקה ראשונה עם ידע מקצועי אמיתי שעוזר לקהל היעד.\n\nפסקה שנייה שמרחיבה על הנושא ומביאה דוגמה מהחיים האמיתיים של העסק.\n\nפסקה שלישית שסוגרת בצורה טבעית עם מסר ברור ונקי.',
  copy: 'הוק קצר ומושך שמסכם את הפוסט',
  channel_recommended: 'instagram',
  image_prompt: 'professional photo of a business owner',
}

Deno.test('validatePost: passes a valid value post', () => {
  const result = validatePost(goodValuePost, 'value')
  assertEquals(result.valid, true)
  assertEquals(result.critique, [])
})

Deno.test('validatePost: fails when content has Latin characters', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה ראשונה.\n\nפסקה שנייה.\n\nפסקה שלישית with English text.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('אנגלית')), true)
})

Deno.test('validatePost: fails when copy has Latin characters', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    copy: 'hook in English',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
})

Deno.test('validatePost: fails value post with fewer than 3 paragraphs', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'רק פסקה אחת ארוכה מאוד שמכילה הרבה מילים אבל אין בה הפרדה לפסקאות נפרדות בכלל.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('פסקאות')), true)
})

Deno.test('validatePost: cta post passes with 2 paragraphs', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה ראשונה עם הצעת ערך ברורה ומושכת לקהל היעד.\n\nפסקה שנייה עם קריאה לפעולה ברורה ופשוטה.',
  }
  const result = validatePost(post, 'cta')
  assertEquals(result.valid, true)
})

Deno.test('validatePost: fails when word count is too low for value post', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה קצרה.\n\nפסקה שנייה קצרה.\n\nפסקה שלישית קצרה מאוד.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('מילים')), true)
})

Deno.test('validatePost: fails with more than 4 emojis', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה ראשונה עם תוכן מספיק ויותר מספיק כדי לעבור בדיקה. 🎯🚀💡✅🔥\n\nפסקה שנייה עם תוכן נוסף שמרחיב על הנושא ומוסיף ערך.\n\nפסקה שלישית שסוגרת בצורה טבעית.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('אימוג')), true)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd "/Users/noamcarter/Desktop/Validation 1"
deno test --allow-net supabase/functions/_shared/validate-post.test.ts
```

Expected: error — `validate-post.ts` does not exist yet.

- [ ] **Step 3: Create `validate-post.ts` with `validatePost()` only**

Create `supabase/functions/_shared/validate-post.ts`:

```ts
import type { PostType } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'
import { generatePostCopy, SYSTEM_PROMPTS } from './generate-post.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'
import type { BusinessProfile, PostPlan } from './types.ts'

export interface ValidationResult {
  valid: boolean
  critique: string[]
}

export function validatePost(output: CopywriterOutput, postType: PostType): ValidationResult {
  const critique: string[] = []

  // Hebrew only
  if (/[a-zA-Z]/.test(output.content) || /[a-zA-Z]/.test(output.copy)) {
    critique.push('הפוסט מכיל תווים באנגלית — כתוב בעברית בלבד')
  }

  // Excessive emojis (>4)
  const emojiCount = (output.content.match(/\p{Emoji_Presentation}/gu) ?? []).length
  if (emojiCount > 4) {
    critique.push(`הפוסט מכיל יותר מדי אימוג'י (${emojiCount}) — הפחת לכל היותר 4`)
  }

  // Minimum paragraphs
  const paragraphs = output.content.split('\n\n').filter(p => p.trim().length > 0)
  const minParagraphs = postType === 'cta' ? 2 : 3
  if (paragraphs.length < minParagraphs) {
    critique.push(`הפוסט חסר פסקאות — נדרשות לפחות ${minParagraphs} פסקאות מופרדות בשורה ריקה (יש ${paragraphs.length})`)
  }

  // Minimum word count
  const wordCount = output.content.trim().split(/\s+/).filter(w => w.length > 0).length
  const minWords = postType === 'cta' ? 70 : 100
  if (wordCount < minWords) {
    critique.push(`הפוסט קצר מדי — כתוב לפחות ${minWords} מילים (יש כרגע ${wordCount})`)
  }

  return { valid: critique.length === 0, critique }
}
```

Note: `generateValidatedPostCopy` will be added in Task 2. Leave `SYSTEM_PROMPTS` import commented out for now — it will be needed in Task 2. For now just import `generatePostCopy`.

Actually, update the import line to only what's needed for Task 1:

```ts
import type { PostType } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'
```

(Remove the unused imports — add them back in Task 2.)

- [ ] **Step 4: Run tests to verify they pass**

```bash
deno test --allow-net supabase/functions/_shared/validate-post.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/validate-post.ts supabase/functions/_shared/validate-post.test.ts
git commit -m "feat: add validatePost quality checker with tests"
```

---

## Task 2: `generateValidatedPostCopy()` — retry wrapper

**Files:**
- Modify: `supabase/functions/_shared/validate-post.ts`

Note: `SYSTEM_PROMPTS` needs to be exported from `generate-post.ts`. Check if it's already exported — if not, add `export` to the `const SYSTEM_PROMPTS` declaration in `generate-post.ts`.

- [ ] **Step 1: Export `SYSTEM_PROMPTS` from `generate-post.ts`**

In `supabase/functions/_shared/generate-post.ts` line 86, change:

```ts
const SYSTEM_PROMPTS: Record<PostType, string> = {
```

to:

```ts
export const SYSTEM_PROMPTS: Record<PostType, string> = {
```

Also add `export` to the `POST_SCHEMA` constant (line 92) — it's needed for the guided retry body:

```ts
export const POST_SCHEMA = {
```

- [ ] **Step 2: Add `generateValidatedPostCopy()` to `validate-post.ts`**

Replace the two import lines at the top of `validate-post.ts` with the full imports, then append the function after `validatePost`:

```ts
import type { PostType, BusinessProfile, PostPlan } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'
import { generatePostCopy, SYSTEM_PROMPTS, POST_SCHEMA } from './generate-post.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'
```

Then append after `validatePost`:

```ts
export async function generateValidatedPostCopy(
  postType: PostType,
  businessProfile: BusinessProfile,
  postPlan: PostPlan,
  geminiApiKey: string,
): Promise<CopywriterOutput> {
  const userMessage = `Business profile:\n${JSON.stringify(businessProfile)}\n\nPost plan:\n${JSON.stringify(postPlan)}\n\nWrite the ${postType} post.`

  // Attempt 1: fresh generation
  let output = await generatePostCopy(postType, businessProfile, postPlan, geminiApiKey)
  let validation = validatePost(output, postType)
  if (validation.valid) return output

  // Attempt 2: guided retry — send bad output + critique back as conversation context
  const critiqueMessage = `הפוסט שכתבת נכשל בבדיקת איכות:\n${validation.critique.join('\n')}\n\nכתוב מחדש את הפוסט תוך תיקון כל הבעיות שצוינו.`
  const guidedBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPTS[postType] }] },
    contents: [
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: JSON.stringify(output) }] },
      { role: 'user', parts: [{ text: critiqueMessage }] },
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: POST_SCHEMA,
    },
  }
  const { text: guidedText, finishReason: guidedReason } = await callGeminiWithRetry(geminiApiKey, guidedBody, `validate-guided:${postType}`)
  const guidedOutput = parseJsonOutput<CopywriterOutput>(guidedText, `validate-guided:${postType}`, guidedReason)
  const guidedValidation = validatePost(guidedOutput, postType)
  if (guidedValidation.valid) return guidedOutput

  // Attempt 3: silent retry — fresh call, no prior context
  const silentOutput = await generatePostCopy(postType, businessProfile, postPlan, geminiApiKey)
  const silentValidation = validatePost(silentOutput, postType)
  if (silentValidation.valid) return silentOutput

  throw new Error(
    `[stage:validate:${postType}] failed all 3 attempts. Last issues: ${silentValidation.critique.join(', ')}`
  )
}
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
deno test --allow-net supabase/functions/_shared/validate-post.test.ts
```

Expected: all 7 tests PASS (tests only cover `validatePost`, not the async wrapper).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/validate-post.ts supabase/functions/_shared/generate-post.ts
git commit -m "feat: add generateValidatedPostCopy with 3-attempt retry"
```

---

## Task 3: `humanize.ts` — LLM humanization pass

**Files:**
- Create: `supabase/functions/_shared/humanize.ts`

- [ ] **Step 1: Create `humanize.ts`**

```ts
import type { PostType } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

const HUMANIZE_SYSTEM_PROMPT = `אתה קופירייטר ישראלי מנוסה. תקבל פוסט שנכתב על ידי AI ותכתוב אותו מחדש כך שיישמע כאילו אדם אמיתי כתב אותו — לא AI.

כללים:
- הסר סימנים מובהקים של AI: רשימות ממוספרות מוגזמות, וי (✅), כותרות, תבניות נוקשות
- נקודות תבליט מותרות אם הן משרתות את התוכן — לא כמבנה ברירת מחדל
- הסר פתיחות וסיומות גנריות: "בעולם של היום", "חשוב לזכור", "לסיכום", "אין ספק ש", "ברור ש"
- כתוב בפסקאות רציפות וטבעיות — מופרדות בשורה ריקה
- שמור על אותו מסר, הוק, הצעה וקריאה לפעולה — שנה רק את אופן ההעברה
- שמור על הטון המתאים לסוג הפוסט
- עברית בלבד — ללא תווים לטיניים
- שמור על אורך דומה למקור
- פלט ONLY JSON תקין: { "content": "", "copy": "" }`

const HUMANIZE_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    copy: { type: 'string' },
  },
  required: ['content', 'copy'],
}

const TONE_HINTS: Record<PostType, string> = {
  value: 'תובנה מקצועית — ידע שמציב את הכותב כמומחה בתחומו',
  trust: 'אישי וחם — סיפור אמיתי שבונה קשר ואמון',
  cta: 'ישיר וידידותי — הזמנה לפעולה שמרגישה טבעית ולא דוחפת',
}

export async function humanizePost(
  post: CopywriterOutput,
  postType: PostType,
  geminiApiKey: string,
): Promise<CopywriterOutput> {
  const userMessage = `טון הפוסט: ${TONE_HINTS[postType]}\n\nפוסט לעיבוד:\n${JSON.stringify({ content: post.content, copy: post.copy })}\n\nכתוב מחדש כפוסט אנושי.`

  const body = {
    system_instruction: { parts: [{ text: HUMANIZE_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: HUMANIZE_SCHEMA,
    },
  }

  const { text, finishReason } = await callGeminiWithRetry(geminiApiKey, body, `humanize:${postType}`)
  const result = parseJsonOutput<{ content: string; copy: string }>(text, `humanize:${postType}`, finishReason)

  return {
    ...post,
    content: result.content,
    copy: result.copy,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/humanize.ts
git commit -m "feat: add humanizePost LLM rewrite pass"
```

---

## Task 4: Wire validation + humanization into `pipeline.ts`

**Files:**
- Modify: `supabase/functions/_shared/pipeline.ts`

- [ ] **Step 1: Update imports at the top of `pipeline.ts`**

Replace:

```ts
import { generatePostCopy } from './generate-post.ts'
```

With:

```ts
import { generateValidatedPostCopy } from './validate-post.ts'
import { humanizePost } from './humanize.ts'
```

(Keep the other imports unchanged.)

- [ ] **Step 2: Replace the per-post generation call inside `Promise.allSettled`**

Find this block in `pipeline.ts` (around line 63):

```ts
postTypes.map(async (postType) => {
  const copy = await generatePostCopy(postType, businessProfile, postPlans[postType], geminiApiKey)
  diag.log(`copy:${postType}`, 'info', `copy ok channel=${copy.channel_recommended} image_prompt_len=${copy.image_prompt?.length ?? 0}`)
  const imageUrl = await generateImage(
```

Replace with:

```ts
postTypes.map(async (postType) => {
  const validated = await generateValidatedPostCopy(postType, businessProfile, postPlans[postType], geminiApiKey)
  diag.log(`copy:${postType}`, 'info', `validated ok channel=${validated.channel_recommended} image_prompt_len=${validated.image_prompt?.length ?? 0}`)

  let copy: typeof validated
  try {
    copy = await humanizePost(validated, postType, geminiApiKey)
    diag.log(`humanize:${postType}`, 'info', 'humanized ok')
  } catch (err) {
    diag.log(`humanize:${postType}`, 'warn', 'humanize failed, using validated output', { error: err instanceof Error ? err.message : String(err) })
    copy = validated
  }

  const imageUrl = await generateImage(
```

- [ ] **Step 3: Deploy the edge function and do a smoke test**

```bash
npx supabase functions deploy generate-content
```

Then trigger a real generation through the app (submit a URL on the landing page) and verify in the Supabase logs that:
- `copy:value`, `copy:trust`, `copy:cta` log entries appear with "validated ok"
- `humanize:value`, `humanize:trust`, `humanize:cta` log entries appear with "humanized ok"
- All 3 posts appear on the results page with full Hebrew content

To view logs:
```bash
npx supabase functions logs generate-content --scroll
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/pipeline.ts
git commit -m "feat: wire validation and humanization into pipeline"
```

---

## Task 5: Post Preview — inline expand in `PostCard.tsx`

**Files:**
- Modify: `components/PostCard.tsx`

- [ ] **Step 1: Add `isPreviewed` state**

In `components/PostCard.tsx`, find the existing state declarations (around line 71):

```ts
const [copied, setCopied] = useState(false)
const [downloading, setDownloading] = useState(false)
const [isExpanded, setIsExpanded] = useState(false)
```

Add one line after `isExpanded`:

```ts
const [copied, setCopied] = useState(false)
const [downloading, setDownloading] = useState(false)
const [isExpanded, setIsExpanded] = useState(false)
const [isPreviewed, setIsPreviewed] = useState(false)
```

- [ ] **Step 2: Make the outer card container handle preview overflow**

Find the outer `<div` with `className={revealClass}` (around line 104). Its current style has `overflow: 'hidden'`. Change it to:

```tsx
<div
  className={revealClass}
  style={{
    background: 'white',
    borderRadius: 20,
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-card)',
    display: 'flex',
    flexDirection: 'column',
    overflow: isPreviewed ? 'visible' : 'hidden',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  }}
```

- [ ] **Step 3: Make the image expand when previewed**

Find the image container `<div` with `aspectRatio: '16/9'` (around line 149):

```tsx
<div className="relative w-full group" style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
```

Change to:

```tsx
<div className="relative w-full group" style={{ aspectRatio: isPreviewed ? 'auto' : '16/9', overflow: isPreviewed ? 'visible' : 'hidden', transition: 'all 0.3s ease' }}>
```

- [ ] **Step 4: Make the text content respect preview mode**

Find the `<p` element that renders post content (around line 167). Its style has:

```tsx
overflow: isExpanded ? 'visible' : 'hidden',
display: isExpanded ? 'block' : '-webkit-box',
WebkitLineClamp: isExpanded ? 'unset' : 3,
```

Replace those three lines with:

```tsx
overflow: (isPreviewed || isExpanded) ? 'visible' : 'hidden',
display: (isPreviewed || isExpanded) ? 'block' : '-webkit-box',
WebkitLineClamp: (isPreviewed || isExpanded) ? 'unset' : 3,
```

- [ ] **Step 5: Show the `copy` tagline when previewed**

Find the closing `</p>` of the content paragraph. After it, add:

```tsx
{isPreviewed && post.copy && (
  <p style={{
    fontSize: 13,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid var(--border)',
    fontStyle: 'italic',
    margin: '12px 0 0',
  }}>
    {post.copy}
  </p>
)}
```

- [ ] **Step 6: Hide the "read more / read less" toggle when previewed**

Find the `{isLongPost && (` block (around line 179). Wrap it to suppress in preview mode:

```tsx
{isLongPost && !isPreviewed && (
  isExpanded ? (
    <button
      onClick={() => setIsExpanded(false)}
      // ... (keep existing style unchanged)
    >
      ← קרא פחות
    </button>
  ) : (
    <button
      onClick={() => setIsExpanded(true)}
      // ... (keep existing style unchanged)
    >
      קרא עוד →
    </button>
  )
)}
```

- [ ] **Step 7: Add the Preview button above the copy button**

Find the `{/* Buttons */}` section (around line 221). The section starts with:

```tsx
<div style={{ padding: '16px 20px 20px', marginTop: 'auto' }}>
  <button
    onClick={handleCopy}
```

Add the Preview button **before** the copy button:

```tsx
<div style={{ padding: '16px 20px 20px', marginTop: 'auto' }}>
  <button
    onClick={() => setIsPreviewed(p => !p)}
    style={{
      width: '100%',
      marginBottom: 8,
      padding: '10px',
      borderRadius: 12,
      fontWeight: 600,
      fontSize: 13,
      background: isPreviewed ? 'var(--body-bg)' : 'transparent',
      border: '1px solid var(--border)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      fontFamily: 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
  >
    {isPreviewed ? 'סגור ←' : '👁 תצוגה מקדימה'}
  </button>

  <button
    onClick={handleCopy}
    // ... (keep existing copy button unchanged)
```

- [ ] **Step 8: Start the dev server and verify the preview feature**

```bash
npm run dev
```

Open `http://localhost:3000/results` (you'll need posts in localStorage — copy a real session's localStorage or mock with the dev flow).

Check:
- "תצוגה מקדימה" button appears on each card
- Clicking it expands the image (no aspect ratio crop) and shows full text + italic copy tagline
- The button label changes to "סגור ←"
- Clicking "סגור ←" collapses back to card state
- Copy button still works
- Download button still works
- "Read more / read less" is hidden during preview, restored on close

- [ ] **Step 9: Commit**

```bash
git add components/PostCard.tsx
git commit -m "feat: add inline post preview with full image and text"
```

---

## Self-Review

**Spec coverage:**
- ✅ Output validation (rule-based checker with 6 rules) — Task 1
- ✅ Guided retry (critique sent back to Gemini as conversation context) — Task 2
- ✅ Silent retry (3rd attempt) — Task 2
- ✅ Humanizer (separate module, LLM rewrite, Hebrew-only system prompt) — Task 3
- ✅ Bullet points allowed sparingly (humanizer prompt says so) — Task 3
- ✅ Pipeline wiring (validate → humanize → image, per-post parallel) — Task 4
- ✅ Humanizer fallback to validated output on failure — Task 4
- ✅ Preview button added to PostCard — Task 5
- ✅ Full image expansion (aspectRatio: auto) — Task 5
- ✅ Full text shown (no line-clamp) + copy tagline — Task 5
- ✅ "read more" hidden during preview — Task 5

**Type consistency:**
- `generateValidatedPostCopy` returns `CopywriterOutput` — same type as `generatePostCopy` ✅
- `humanizePost` takes `CopywriterOutput`, returns `CopywriterOutput` ✅
- `pipeline.ts` uses `validated` / `copy` — both `CopywriterOutput`, consistent with existing `post` object construction ✅
- `validatePost` returns `ValidationResult` with `valid: boolean` and `critique: string[]` — used consistently in Task 2 ✅

**No placeholders:** All steps have concrete code. ✅
