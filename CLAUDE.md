# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**ContentMine** (product name in UI) is a Hebrew-language AI marketing content generator for Israeli digital business owners. Users paste a website URL, answer a short survey, and receive 3 ready-to-post Hebrew social media posts (value / trust / CTA) generated from their site content.

---

## Commands

```bash
npm run dev       # Start Next.js dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint via next lint
```

Edge functions run on Deno (Supabase), not Node. Deploy with:
```bash
supabase functions deploy generate-content
```

There is no test runner configured for the frontend. The one test file (`supabase/functions/_shared/validate-post.test.ts`) is a standalone Deno test.

---

## Architecture

### Frontend — Next.js 14 App Router

All pages are in `app/` and use the App Router. Every user-facing page is a client component (`'use client'`). Routing is sequential:

```
/auth → / (landing) → /survey → /loading → /results
```

- **`/auth`** — Supabase magic-link email auth. Session is required to access other pages; `app/page.tsx` redirects to `/auth` if no session.
- **`/`** — Landing page with URL input. On submit: upserts a `users` row, stores `user_id` in `localStorage`, navigates to `/survey`.
- **`/survey`** — Multi-block question form driven by `lib/survey-questions.ts`. Saves answers to `survey_responses` table, then navigates to `/loading`.
- **`/loading`** — Calls the `generate-content` Edge Function directly via fetch. Stores the result (`generated_posts`) or error (`generation_error`) in `localStorage`, then navigates to `/results`.
- **`/results`** — Reads posts from `localStorage`. Three-tab post viewer (value/trust/CTA) with a shared image on the left and copy button. Includes an inline waitlist form.

There is no Next.js API routes layer — the frontend calls Supabase Edge Functions directly.

### Backend — Supabase Edge Functions (Deno)

Single entry point: `supabase/functions/generate-content/index.ts`

The generation pipeline (`supabase/functions/_shared/pipeline.ts`) runs these stages in sequence:

1. **scrape** — fetches the user's website HTML and strips it to plain text
2. **summarize** — calls Gemini to extract a structured `BusinessProfile` from the scraped text + survey answers
3. **plan** — calls Gemini to produce a `MarketingPlan` (angle/hook/tone for each of the 3 post types)
4. **generate + validate** — generates all 3 posts in parallel via `generateValidatedPostCopy()`, which retries up to 3 times if the post fails quality checks (Hebrew-only, word count, paragraph count, emoji limit)
5. **humanize** — optional Gemini pass to make each post sound more natural; falls back to validated output if it fails
6. **image** — generates one image for the `value` post only; `trust` and `cta` get `null`
7. **db-insert** — writes posts to the `posts` table

**AI model:** Gemini 2.5 Flash (`gemini-2.5-flash`) with `gemini-2.5-flash-lite` as fallback. The original spec mentions Claude Sonnet, but the implementation uses Gemini via `GEMINI_API_KEY`.

All shared types are in `supabase/functions/_shared/types.ts`. The `Diagnostics` class (`_shared/diagnostics.ts`) logs structured pipeline events to Supabase for debugging.

### Database — Supabase (PostgreSQL)

Three tables (see `supabase/migrations/`):

- **`users`** — one row per auth user; stores `website_url`, `email`, `survey_completed`, `auth_user_id` (FK to Supabase auth)
- **`survey_responses`** — flexible key/value rows per question (`question_key`, `answer_text`)
- **`posts`** — generated posts with `post_type` (value/trust/cta), `content`, `copy`, `channel_recommended`, `image_url`

The `user_id` stored in `localStorage` is the `users.id` UUID (not the Supabase auth UID). The auth UID is stored in `users.auth_user_id`.

### Supabase Client Helpers

- `lib/supabase/client.ts` — browser client (uses `@supabase/ssr`)
- `lib/supabase/server.ts` — server client for RSC/middleware
- `lib/supabase/middleware.ts` — session refresh middleware

---

## Design System

All styling is done with inline `style` props — Tailwind utility classes are not used in practice despite being in the stack. CSS custom properties are defined in `app/globals.css`:

- **Colors:** `--navy` (#13100C dark bg), `--accent` (#E86228 terracotta), `--cream`/`--body-bg` (light bg), `--green` (#25D366 WhatsApp)
- **Fonts:** `--font-display` (Frank Ruhl Libre — headlines), `--font-body` (Heebo — body)
- The root `<html>` has `lang="he" dir="rtl"`. All UI text is in Hebrew.

---

## Key Constraints

- **Hebrew-only content:** The post validation in `validate-post.ts` rejects any Latin characters in `content` or `copy`. Image prompts are intentionally English (passed to the image model).
- **`localStorage` as state bus:** `user_id`, `website_url`, `generated_posts`, and `generation_error` are passed between pages via `localStorage`, not URL params or React state.
- **Waitlist WhatsApp URL:** `WHATSAPP_GROUP_URL` in `app/results/page.tsx` is a placeholder (`YOUR_GROUP_LINK`) — must be updated before launch.
- **Image generation:** Only the `value` post gets an image. The image generation model is configured in `_shared/generate-image.ts`.

---

## Environment Variables

Frontend (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Edge Function secrets (set via Supabase dashboard or CLI):
```
GEMINI_API_KEY=
SUPABASE_URL=               # auto-injected by Supabase runtime
SUPABASE_SERVICE_ROLE_KEY=  # auto-injected by Supabase runtime
```
