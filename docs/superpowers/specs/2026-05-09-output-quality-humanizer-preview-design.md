# Design: Output Quality, Humanizer & Post Preview

**Date:** 2026-05-09  
**Status:** Approved  
**Scope:** Three improvements to the post generation pipeline and results UI

---

## Problem

1. Generated posts occasionally fail quality standards — too short (2 sentences), AI-structured formatting, or Latin characters bleeding through despite prompt instructions.
2. Posts sound like AI wrote them — structured lists, generic openers, unnatural phrasing — not like a real copywriter.
3. The results page has no way to view a full post (image + full text) without the 3-line truncation.

---

## Architecture Overview

**Current pipeline:**
```
scrape → summarize → plan → generatePostCopy ×3 → generateImage ×3 → DB
```

**New pipeline:**
```
scrape → summarize → plan → [generatePostCopy + validate + retry] ×3 → humanize ×3 → generateImage ×3 → DB
```

**New files:**
- `supabase/functions/_shared/validate-post.ts` — wraps `generatePostCopy` with validation + retry logic
- `supabase/functions/_shared/humanize.ts` — LLM rewrite pass for human-sounding output

**Changed files:**
- `supabase/functions/_shared/pipeline.ts` — calls `generateValidatedPostCopy` + `humanizePost` instead of raw `generatePostCopy`
- `components/PostCard.tsx` — adds preview state + button

---

## Feature 1: Output Validation + Retry

### Module: `validate-post.ts`

Exports: `generateValidatedPostCopy(postType, businessProfile, postPlan, geminiApiKey): Promise<CopywriterOutput>`

This wraps `generatePostCopy` with up to 3 total attempts.

### Validation Rules

Checked after each generation attempt:

| Rule | Check | Applies to |
|------|-------|------------|
| Hebrew only | `/[a-zA-Z]/.test(content \| copy)` → fail | all |
| No excessive emojis | emoji count > 4 → fail | all |
| Minimum paragraphs | `content.split('\n\n').length >= 3` | value, trust |
| Minimum paragraphs | `content.split('\n\n').length >= 2` | cta |
| Minimum words | word count >= 100 | value, trust |
| Minimum words | word count >= 70 | cta |

Note: Bullet points are allowed when they genuinely fit the copy. The validator does not enforce a hard "no bullets" rule.

### Retry Flow

```
Attempt 1: generatePostCopy()
  → pass validation → return ✓
  → fail → build critique string

Attempt 2: guided retry
  Send original bad output + critique back to Gemini:
  "הפוסט הבא נכשל בבדיקת איכות: [critique reasons].
   כתוב מחדש את הפוסט תוך תיקון הבעיות שצוינו."
  → pass validation → return ✓
  → fail →

Attempt 3: silent retry
  Fresh call, no prior context, same prompt as Attempt 1
  → pass validation → return ✓
  → fail → throw (pipeline catches per-post)
```

On throw, pipeline falls back to existing behavior: if at least 2/3 posts succeed, continue.

### Critique String Format

Built from which rules failed:
- Latin chars: "הפוסט מכיל תווים באנגלית — כתוב בעברית בלבד"
- Too short: "הפוסט קצר מדי — כתוב לפחות X מילים ב-Y פסקאות"
- Too few paragraphs: "הפוסט חסר פסקאות — הוסף שורות ריקות בין פסקאות"
- Too many emojis: "הפוסט מכיל יותר מדי אימוג'י — הפחת"

---

## Feature 2: Humanizer

### Module: `humanize.ts`

Exports: `humanizePost(post: CopywriterOutput, postType: PostType, geminiApiKey: string): Promise<CopywriterOutput>`

**What it touches:** Only `content` and `copy`. `channel_recommended` and `image_prompt` pass through unchanged.

### System Prompt

```
You are an experienced Israeli copywriter. You will receive an AI-generated social media post and rewrite it so it sounds like a real human wrote it — not AI.

Rules:
- Remove AI-style structural tells: excessive numbered lists, checkmarks (✅), headers, rigid templates
- Bullet points are allowed only when they genuinely serve the content — not as a default structure
- Remove generic AI openers and closers: "בעולם של היום", "חשוב לזכור", "לסיכום", "אין ספק ש"
- Write in flowing, natural prose — paragraphs separated by blank lines
- Preserve the exact message, hook, offer, and call to action — only rewrite the delivery
- Match the original post's tone (value = professional insight, trust = personal/warm, cta = direct and friendly)
- Hebrew only — no Latin characters
- Keep the same approximate length
- Output ONLY valid JSON: { "content": "", "copy": "" }
```

**Temperature:** 0.7 (controlled rewriting, not open creativity)

**Called from `pipeline.ts`** within each post's parallel branch: validate → humanize → generateImage run sequentially per post, while all 3 posts still run in parallel via `Promise.allSettled`.

If humanization fails for a post, fall back to the validated (pre-humanized) output — don't drop the post.

---

## Feature 3: Post Preview (Inline Expand)

### Changes to `PostCard.tsx`

**New state:** `isPreviewed: boolean` — independent from existing `isExpanded`

**New "Preview" button** in the footer, above the copy button (preview is secondary to copy):
- Default label: `👁 תצוגה מקדימה`  
- When active: `סגור ←`
- Clicking toggles `isPreviewed`

**When `isPreviewed = true`:**
- **Image:** Aspect ratio constraint removed (`aspectRatio: 'auto'`) — full image height visible
- **Text:** No `-webkit-line-clamp`, no "read more" toggle — full `content` shown, followed by `copy` tagline below (visually separated, slightly muted style)
- **Card:** `overflow: visible`, smooth transition via `transition: all 0.3s ease`

**`isExpanded` / `isLongPost`** remain unchanged — they control the existing "read more" inline toggle, which is separate from preview mode.

---

## Pipeline Integration Summary

In `pipeline.ts`, replace the per-post call:

```ts
// Before
const copy = await generatePostCopy(postType, businessProfile, postPlans[postType], geminiApiKey)

// After
const copy = await generateValidatedPostCopy(postType, businessProfile, postPlans[postType], geminiApiKey)
const humanizedCopy = await humanizePost(copy, postType, geminiApiKey)
```

Then use `humanizedCopy` everywhere `copy` was used (content, copy fields into the post object).

Image generation proceeds as before using `humanizedCopy.image_prompt` (unchanged by humanizer).

---

## Error Handling

| Stage | Failure mode | Behavior |
|-------|-------------|----------|
| Validation exhausted (3 attempts) | throw | Pipeline catches, marks post as failed |
| Humanizer call fails | catch + fallback | Use validated (non-humanized) output |
| <2 posts succeed | throw | Pipeline surfaces error to user |

---

## Out of Scope

- A/B testing different humanizer prompts
- User-facing "regenerate this post" button
- Per-post quality score display
- Editing posts in the UI
