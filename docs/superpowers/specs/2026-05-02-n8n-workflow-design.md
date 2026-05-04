# N8N Workflow Design — Validation 1 Content Generation

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** N8N workflow that receives a webhook from the Supabase edge function and returns 3 ready-to-publish Hebrew marketing posts with images.

---

## Overview

A 4-stage pipeline: scrape → summarize → plan → generate (parallel). The main workflow orchestrates everything and responds to the Supabase edge function with 3 posts. Three isolated sub-workflows handle post generation in parallel, one per post type.

---

## Architecture

### Main Workflow

```
[Webhook Trigger]
      ↓
[DataForSEO Parse Page]     ← scrapes website_url
      ↓
[Summarize Agent]           ← Claude: structured business profile JSON
      ↓
[Plan Agent]                ← Claude: 3-post marketing plan JSON
      ↓
[Split — 3 parallel branches]
   ├── Execute Sub-Workflow: generate-value-post
   ├── Execute Sub-Workflow: generate-trust-post
   └── Execute Sub-Workflow: generate-cta-post
      ↓
[Merge Results]             ← wait for all 3
      ↓
[Respond to Webhook]        ← { posts: [...] }
```

### Sub-Workflows (identical structure, different system prompts)

```
[Sub-Workflow Trigger]
      ↓
[Copywriter Agent]          ← full Hebrew post + copy/tagline
      ↓
[Image Prompt Agent]        ← detailed English image generation prompt
      ↓
[Image API Node]            ← swappable: DALL-E / Banana / other
      ↓
[Return Output]
```

---

## Webhook Contract

### Input (from Supabase edge function)
```json
{
  "user_id": "uuid",
  "website_url": "https://example.com",
  "survey_answers": [
    { "key": "business_type", "value": "coach" },
    { "key": "content_pain_point", "value": "no time" }
  ]
}
```

### Output (returned to Supabase edge function)
```json
{
  "posts": [
    {
      "post_type": "value",
      "content": "full Hebrew post text",
      "copy": "short Hebrew hook/tagline",
      "image_url": "https://...",
      "channel_recommended": "instagram"
    },
    {
      "post_type": "trust",
      "content": "...",
      "copy": "...",
      "image_url": "https://...",
      "channel_recommended": "linkedin"
    },
    {
      "post_type": "cta",
      "content": "...",
      "copy": "...",
      "image_url": "https://...",
      "channel_recommended": "facebook"
    }
  ]
}
```

---

## Stage 1 — DataForSEO Parse Page

- **Input:** `website_url` from webhook
- **Output:** Raw scraped text/HTML from the landing page
- **Node:** DataForSEO Parse Page (already configured in N8N)

---

## Stage 2 — Summarize Agent

**Role:** Business analyst — extracts structured facts from scraped content + survey answers. Does not generate content. Does not invent.

**Input:** Scraped page text + survey_answers array

**System prompt direction:**
> "You are a business analyst. Extract only facts and signals from the website and survey answers. Do not invent anything. If something is unclear, leave the field blank. Output valid JSON only."

**Output:**
```json
{
  "business_name": "...",
  "business_type": "coach | consultant | freelancer | agency | saas | other",
  "niche": "...",
  "target_audience": "...",
  "core_offer": "...",
  "key_differentiators": ["...", "..."],
  "tone_and_voice": "formal | casual | inspirational | professional",
  "notable_phrases": ["phrases found on their site that reflect their voice"],
  "pain_points_addressed": ["...", "..."],
  "survey_insights": {
    "content_strategy": "...",
    "willingness_to_pay": "...",
    "preferred_features": "..."
  }
}
```

---

## Stage 3 — Plan Agent

**Role:** Senior Hebrew marketing strategist — decides the specific angle, hook, and visual concept for each post. Does not write the posts.

**Input:** Business profile JSON from Summarize Agent

**System prompt direction:**
> "You are a senior Hebrew marketing strategist. Given this business profile, plan 3 social media posts. Post 1 = professional value/tip from their field. Post 2 = builds trust and authority. Post 3 = soft CTA with an invitation to act. For each post, define the angle, hook, key message, tone, and a visual concept. Write in Hebrew. Be specific — no generic advice. Output valid JSON only."

**Output:**
```json
{
  "value_post": {
    "angle": "...",
    "key_message": "...",
    "hook": "...",
    "tone": "...",
    "image_direction": "visual concept description"
  },
  "trust_post": {
    "angle": "...",
    "key_message": "...",
    "hook": "...",
    "tone": "...",
    "image_direction": "..."
  },
  "cta_post": {
    "angle": "...",
    "key_message": "...",
    "hook": "...",
    "tone": "...",
    "image_direction": "..."
  }
}
```

---

## Stage 4 — Sub-Workflows (Parallel)

All 3 sub-workflows share the same internal structure. They differ only in their system prompts and which section of the plan they receive.

### Input to each sub-workflow
```json
{
  "business_profile": { ...summarize agent output... },
  "post_plan": { ...the specific post section from plan agent... }
}
```

### 4a — Copywriter Agent

**Role:** Writes the full, ready-to-publish Hebrew post based on the plan.

**System prompt direction (value post example):**
> "You are an expert Hebrew social media copywriter. Write a ready-to-publish LinkedIn/Instagram post based on the provided plan and business profile. The post must sound like the business owner's own voice. Include a strong hook, value, and natural close. Output JSON with: content (full post), copy (1-line tagline/hook), channel_recommended (instagram | linkedin | facebook)."

**Output:**
```json
{
  "content": "full Hebrew post, ready to publish",
  "copy": "short hook/tagline in Hebrew",
  "channel_recommended": "instagram | linkedin | facebook"
}
```

### 4b — Image Prompt Agent

**Role:** Translates the `image_direction` from the plan into a detailed, optimized English prompt for an image generation model.

**System prompt direction:**
> "You are an expert at writing image generation prompts. Given the post content and image direction, write a detailed English prompt for an AI image model. Include: subject, style, lighting, mood, composition, aspect ratio (1:1 for Instagram, 16:9 for LinkedIn). Output JSON with: image_prompt (string)."

**Output:**
```json
{
  "image_prompt": "A professional Israeli business coach speaking at a whiteboard, warm lighting, modern office, confident expression, --ar 1:1, photorealistic"
}
```

### 4c — Image API Node (Swappable)

- **Input:** `image_prompt` string
- **Output:** `image_url` string
- **Provider:** TBD — DALL-E, Banana, or other. This is the only node that changes when switching providers.
- **Fallback:** If image generation fails, return `image_url: null`. The post is still valid; the frontend handles null gracefully.

### Sub-Workflow Final Output
```json
{
  "post_type": "value | trust | cta",
  "content": "...",
  "copy": "...",
  "image_url": "https://... | null",
  "channel_recommended": "instagram | linkedin | facebook"
}
```

---

## Error Handling

| Failure Point | Behavior |
|---|---|
| DataForSEO fails to scrape | Return error: `{ "error": "לא הצלחנו לסרוק את האתר שלך" }` |
| Summarize Agent fails | Retry once, then return generic error |
| Plan Agent fails | Retry once, then return generic error |
| Any sub-workflow fails | Retry once, then return error |
| Image API fails | Return `image_url: null`, post still included |
| Timeout (>55s total) | Return error — Supabase edge function has 60s limit |

---

## Timing Budget

| Stage | Estimated Time |
|---|---|
| DataForSEO scrape | 2-5s |
| Summarize Agent | 3-6s |
| Plan Agent | 4-8s |
| 3 sub-workflows (parallel) | 10-20s |
| Overhead/merge | 1-2s |
| **Total** | **~20-40s** |

Within the 55s budget.

---

## Compatibility

This workflow is a drop-in fit for the existing Supabase edge function (`generate-content`). The edge function already:
- POSTs `{ user_id, website_url, survey_answers }` to the N8N webhook
- Expects `{ posts: [...] }` with exactly 3 posts in return
- Validates and saves posts to the `posts` table in Supabase

No frontend or edge function changes required.

---

## N8N Workflow Names

| Workflow | Type | Trigger |
|---|---|---|
| `content-generation-main` | Main | HTTP Webhook |
| `generate-value-post` | Sub-workflow | Called by main |
| `generate-trust-post` | Sub-workflow | Called by main |
| `generate-cta-post` | Sub-workflow | Called by main |

---

**Last Updated:** 2026-05-02  
**Approved by:** User (brainstorming session)
