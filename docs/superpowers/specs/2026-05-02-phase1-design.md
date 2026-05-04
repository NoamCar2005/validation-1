# Phase 1 Design — Validation 1 Content Generator

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** Full Phase 1 MVP — frontend, Supabase DB, edge function, N8N integration

---

## Overview

A Hebrew-first, RTL, fully responsive web app that takes a user's website URL + survey answers, sends them to N8N via a Supabase edge function, and displays 3 AI-generated ready-to-post marketing posts.

---

## Architecture & Data Flow

```
Screen 1 (Landing)
  → user enters website URL
  → click "צור לי תוכן עכשיו"
  → POST to Supabase: create user row with website_url
  → store user_id in localStorage
  → navigate to Screen 2

Screen 2 (Survey)
  → 5-10 questions rendered from a config array (easy to change)
  → answers stored as flexible key/value pairs
  → POST to Supabase: save survey_responses rows
  → update users.survey_completed = true
  → navigate to Screen 3

Screen 3 (Loading)
  → animated Hebrew messages cycle while waiting
  → immediately calls Supabase edge function: generate-content
  → edge function:
      1. fetches user + survey_answers from Supabase
      2. POSTs to N8N webhook with { user_id, website_url, survey_answers[] }
      3. waits synchronously for N8N response (no fixed timeout — waits until response arrives)
      4. receives { posts: [{ post_type, content, copy, image_url, channel_recommended }] }
      5. saves 3 posts to Supabase posts table
      6. returns posts array to frontend
  → navigate to Screen 4

Screen 4 (WOW)
  → displays 3 post cards with image, content, copy, channel tag
  → copy-to-clipboard button per post
  → navigate to Screen 5

Screen 5 (Waitlist)
  → email input
  → WhatsApp CTA button
  → saves email to users.email
  → updates users.whatsapp_opted_in if clicked
```

---

## Data Model

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | auto-generated |
| website_url | text | required |
| email | text, nullable | filled at Screen 5 |
| whatsapp_opted_in | boolean | default false |
| survey_completed | boolean | default false |
| created_at | timestamptz | auto |

### `survey_responses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | auto-generated |
| user_id | uuid, FK → users | |
| question_key | text | e.g. "business_type" |
| answer_text | text | human-readable answer |
| answer_value | text, nullable | machine-readable value |
| created_at | timestamptz | auto |

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | auto-generated |
| user_id | uuid, FK → users | |
| post_type | text | "value" \| "trust" \| "cta" |
| content | text | full post body in Hebrew |
| copy | text | short tagline/hook |
| image_url | text, nullable | returned by N8N |
| channel_recommended | text | "instagram" \| "linkedin" \| "facebook" |
| copied_count | int | default 0, for analytics |
| generated_at | timestamptz | auto |

---

## Edge Function: `generate-content`

**Runtime:** Deno (Supabase edge function)  
**Trigger:** HTTP POST from frontend loading screen  
**Environment variable:** `N8N_WEBHOOK_URL`

**Input:**
```json
{ "user_id": "uuid" }
```

**Behavior:**
1. Fetch `website_url` from `users` table using `user_id`
2. Fetch all `survey_responses` for `user_id`
3. POST to N8N webhook:
```json
{
  "user_id": "uuid",
  "website_url": "https://...",
  "survey_answers": [{ "key": "business_type", "value": "coach" }]
}
```
4. Wait for N8N response:
```json
{
  "posts": [
    {
      "post_type": "value",
      "content": "...",
      "copy": "...",
      "image_url": "https://...",
      "channel_recommended": "instagram"
    }
  ]
}
```
5. Insert 3 rows into `posts` table
6. Return posts array to frontend

**Error handling:** On N8N failure or malformed response, return `{ error: "שגיאה ביצירת התוכן. אנא נסה שוב." }` — frontend shows friendly Hebrew error with retry option.

**Auth:** None for Phase 1. RLS disabled on all tables.

---

## N8N Webhook

**URL:** `https://n8n.srv1241655.hstgr.cloud/webhook/8b04b7d0-7c95-49be-bed9-43802219eb2f`  
**Method:** POST  
**Configured by:** User (externally)  
**Edge function passes:** `user_id`, `website_url`, `survey_answers[]`  
**N8N returns:** 3 posts with `post_type`, `content`, `copy`, `image_url`, `channel_recommended`

---

## Frontend

**Stack:** Next.js (App Router) + Tailwind CSS  
**Language:** Hebrew-first, all UI text in Hebrew  
**Direction:** `<html dir="rtl" lang="he">` at root  
**Responsive:** Mobile, tablet, desktop  
**Design:** Elegant, clean, professional

### Pages
| Route | Screen |
|-------|--------|
| `/` | Screen 1 — Landing |
| `/survey` | Screen 2 — Survey |
| `/loading` | Screen 3 — Loading |
| `/results` | Screen 4 — WOW / Post showcase |
| `/waitlist` | Screen 5 — Waitlist + WhatsApp CTA |

### Key Components
- **`PostCard`** — image, content, copy, channel tag, copy-to-clipboard button
- **`SurveyForm`** — renders questions from a config array; swap questions without touching component code
- **`LoadingMessages`** — cycles through animated Hebrew messages:
  - "סורק את העסק שלך..."
  - "מבין את הסגנון שלך..."
  - "מזהה את נקודות החוזק שלך..."
  - "יוצר תוכן בקול שלך..."

### State Management
- `user_id` stored in `localStorage` after Screen 1 — threads through all screens
- Posts returned directly from edge function call on Screen 3, saved to `localStorage` as `generated_posts`, read on Screen 4

---

## Survey Config Pattern

Questions defined as a static config array — easy to update without touching component logic:

```ts
const SURVEY_QUESTIONS = [
  { key: "business_type", label: "מה סוג העסק שלך?", type: "select", options: ["מאמן", "יועץ", "פרילנסר", "סוכנות", "אחר"] },
  { key: "content_frequency", label: "כמה פעמים בשבוע אתה מפרסם תוכן?", type: "select", options: ["0", "1-2", "3-5", "יומי"] },
  // ... more questions
]
```

Edge function passes all answers as `[{ key, value }]` — no filtering logic needed in Phase 1.

---

## Supabase Setup

- Tables created via SQL migration using Supabase MCP
- Edge function deployed via Supabase MCP with `N8N_WEBHOOK_URL` secret
- RLS: disabled for Phase 1
- No auth required

---

## Implementation Tools

- **Supabase MCP** — create tables, deploy edge function, set secrets
- **N8N MCP** — inspect/verify webhook configuration if needed
- **Vercel** — deployment target for Next.js frontend

---

## Out of Scope (Phase 1)

- User authentication
- Post editing UI
- Image generation (N8N handles it externally)
- PostHog analytics (Phase 2)
- WhatsApp API automation (manual link for Phase 1)
- A/B testing
