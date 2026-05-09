# Single Image + Tabbed Results — Design Spec

**Date:** 2026-05-09
**Status:** Approved
**Goal:** Reduce API cost by generating 1 image instead of 3, while preserving full content value by keeping all 3 post types (value, trust, CTA) as text. Frontend shifts from a 3-card grid to a shared image + tabbed text interface.

---

## Motivation

Image generation (gemini-3-pro-image-preview) costs $0.134–$0.24 per image. At 3 posts per user that's $0.40–$0.72 in image costs alone. Text calls (gemini-2.5-flash) cost ~$0.005–$0.009 total per user — effectively free. Reducing to 1 image drops per-user cost to ~$0.14–$0.25 (~67% savings) while keeping all 3 post texts, which drive most of the product value.

---

## Architecture

### Approach: Option A — Minimal pipeline change + tabbed UI

- Keep the plan stage producing all 3 post plans (value, trust, cta)
- Keep generating copy for all 3 post types
- Only call `generateImage` for the `value` post
- Trust and CTA posts stored to DB with `image_url: null`
- Frontend replaces the 3-card grid with a shared image header + 3 tabs

---

## Backend — `pipeline.ts`

**File:** `supabase/functions/_shared/pipeline.ts`

**Change:** Inside the `Promise.allSettled` loop, make image generation conditional on post type:

```ts
const imageUrl = postType === 'value'
  ? await generateImage(copy.image_prompt, postType, copy.channel_recommended, userId, geminiApiKey, supabaseUrl, supabaseServiceKey, diag)
  : null
```

**Success threshold:** Change the failure guard from `posts.length < 2` to `posts.length < 3`. With only 1 image and 3 required text posts, a partial result is not acceptable — we need all 3 or the UX breaks.

**DB impact:** Posts table unchanged. Value post has `image_url` populated; trust and CTA posts have `image_url: null`. No schema migration needed.

**Compatibility with quality plan (2026-05-09-output-quality-humanizer-preview):**
Tasks 1–4 of that plan (validatePost, generateValidatedPostCopy, humanizePost, pipeline wiring) are all text-only and slot in before the image call — no conflicts. Task 5 (PostCard preview button) is superseded by this design and can be skipped.

---

## Frontend — `app/results/page.tsx`

**File:** `app/results/page.tsx`

### Data shape

Posts are read from `localStorage('generated_posts')` as before. The value post's `image_url` is extracted as the shared image:

```ts
const valuePost = posts.find(p => p.post_type === 'value')
const sharedImageUrl = valuePost?.image_url ?? null
```

A `selectedTab` state (default: `'value'`) controls which post's text is shown. The existing `revealed` state (120ms delay fade-in) is retained and applied to the image + tab panel instead of the card grid.

### Layout

**1. Header** — unchanged dark gradient with headline and action buttons.

**2. Shared image section** — rendered below the header, full-width within a `maxWidth: 720` centered container. Aspect ratio 16/9. If `sharedImageUrl` is null, render a neutral placeholder (subtle gradient or pattern, no error message). No channel-specific cropping.

**3. Tabs row** — three pill buttons inside the same centered container:
- Labels: `ערכי` (value), `אמון` (trust), `CTA` (cta)
- Active tab: filled with `var(--navy)`, white text
- Inactive: bordered, `var(--text-secondary)`, transparent background
- RTL layout, gap between pills

**4. Tab content panel** — below the tabs, shows the currently selected post:
- **Channel badge** — small pill (e.g. "Instagram") in the top corner
- **Content** — full post text, no truncation, `white-space: pre-wrap` to preserve paragraph breaks
- **Copy tagline** — `post.copy` shown as italic subtitle below content, separated by a thin border
- **Copy button** — full-width, copies `post.content` to clipboard, same style as current copy button

**5. Value prop strip** — retained below the tab panel (currently lists 3 icons for the 3 post types).

**6. Sticky CTA bar** — unchanged.

**7. EarlyAccessModal** — unchanged.

### Component impact

`PostCard` is no longer rendered on the results page. It can remain in the codebase (no deletion required) but is effectively unused after this change.

---

## Error handling

- If `image_url` is null (image generation failed or was skipped for non-value posts), the image section renders a graceful placeholder — no error state, no broken image tag.
- If fewer than 3 posts are returned, the results page redirects to `/` (existing behavior via `if (!posts.length) return null` and the localStorage check).

---

## Out of scope

- Changing which image model is used (stays on `gemini-3-pro-image-preview`)
- Changing the plan stage (still plans all 3 post types including unused image_direction for trust/cta)
- Any DB schema changes
- Merging plan + copy generation calls (text cost is negligible)
- PostCard preview button (Task 5 of quality plan — superseded, can be skipped)
