# Backend Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the N8N webhook with a Supabase Edge Function pipeline that scrapes a website via Jina, summarizes it with Gemini, plans 3 Hebrew marketing posts, generates all 3 posts + images in parallel with Gemini, uploads images to Supabase Storage, writes posts to DB, and returns them — zero frontend changes required.

**Architecture:** Thin orchestrator in `generate-content/index.ts` delegates all logic to `_shared/pipeline.ts`, which calls focused single-responsibility modules: `scrape.ts`, `summarize.ts`, `plan.ts`, `generate-post.ts`, `generate-image.ts`. Posts 1–3 (copy + image each) run via `Promise.all` for parallelism. All Gemini calls use the Gemini REST API directly (no SDK — Deno/Edge runtime).

**Tech Stack:** Supabase Edge Functions (Deno), Gemini REST API (`gemini-3.0-flash` for text, `google/nano-banana-pro` for images), Jina Reader (`r.jina.ai`) for scraping, Supabase Storage for image hosting, Supabase JS client (service role) for DB writes.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/functions/_shared/types.ts` | Create | All shared TypeScript interfaces |
| `supabase/functions/_shared/scrape.ts` | Create | Jina fetch → clean markdown text |
| `supabase/functions/_shared/summarize.ts` | Create | Agent 1: text → BusinessProfile JSON |
| `supabase/functions/_shared/plan.ts` | Create | Agent 2: BusinessProfile → MarketingPlan JSON |
| `supabase/functions/_shared/generate-post.ts` | Create | Agent 3 (×3): profile + plan → post copy + image prompt |
| `supabase/functions/_shared/generate-image.ts` | Create | Agent 4 (×3): image prompt → Storage URL |
| `supabase/functions/_shared/pipeline.ts` | Create | Orchestrates all stages, writes to DB |
| `supabase/functions/generate-content/index.ts` | Rewrite | Thin HTTP handler — fetch user data, call pipeline, return response |
| `docs/BACKEND_PIPELINE.md` | Create | Full pipeline documentation |

---

## Task 1: Create Shared Types

**Files:**
- Create: `supabase/functions/_shared/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// supabase/functions/_shared/types.ts

export interface SurveyAnswer {
  key: string
  value: string
}

export interface BusinessProfile {
  business_name: string
  business_type: 'coach' | 'consultant' | 'freelancer' | 'agency' | 'saas' | 'other'
  niche: string
  target_audience: string
  core_offer: string
  key_differentiators: string[]
  tone_and_voice: 'formal' | 'casual' | 'inspirational' | 'professional'
  notable_phrases: string[]
  pain_points_addressed: string[]
  survey_insights: {
    content_strategy: string
    willingness_to_pay: string
    preferred_features: string
  }
}

export interface PostPlan {
  angle: string
  key_message: string
  hook: string         // Hebrew opening line
  tone: string
  image_direction: string
}

export interface MarketingPlan {
  value_post: PostPlan
  trust_post: PostPlan
  cta_post: PostPlan
}

export type PostType = 'value' | 'trust' | 'cta'
export type Channel = 'instagram' | 'linkedin' | 'facebook'

export interface GeneratedPost {
  post_type: PostType
  content: string               // Full Hebrew post text, ready to publish
  copy: string                  // Short hook/tagline in Hebrew
  channel_recommended: Channel
  image_prompt: string          // English prompt for image generation
  image_url: string | null      // Supabase Storage public URL or null if image failed
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/types.ts
git commit -m "feat: add shared types for content generation pipeline"
```

---

## Task 2: Build the Scraper

**Files:**
- Create: `supabase/functions/_shared/scrape.ts`

Jina Reader wraps any URL and returns clean markdown. No API key needed for basic use. URL format: `https://r.jina.ai/{target_url}`.

- [ ] **Step 1: Create scrape.ts**

```typescript
// supabase/functions/_shared/scrape.ts

const JINA_BASE = 'https://r.jina.ai/'
const TIMEOUT_MS = 15_000

export async function scrape(websiteUrl: string): Promise<string> {
  const jinaUrl = JINA_BASE + websiteUrl

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(jinaUrl, {
      headers: { Accept: 'text/markdown', 'X-No-Cache': 'true' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Jina returned ${res.status}`)
    const text = await res.text()
    if (!text || text.trim().length < 100) {
      throw new Error('Scraped content too short — site may be empty or blocked')
    }
    // Trim to ~8000 chars to stay within Gemini context without wasting tokens
    return text.slice(0, 8000)
  } finally {
    clearTimeout(timer)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/scrape.ts
git commit -m "feat: add Jina scraper module"
```

---

## Task 3: Build the Summarize Agent (Agent 1)

**Files:**
- Create: `supabase/functions/_shared/summarize.ts`

This calls the Gemini text API directly via `fetch`. The Gemini REST endpoint for `gemini-3.0-flash` is:
`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key={API_KEY}`

- [ ] **Step 1: Create summarize.ts**

```typescript
// supabase/functions/_shared/summarize.ts

import type { BusinessProfile, SurveyAnswer } from './types.ts'

const TEXT_MODEL = 'gemini-3.0-flash'
const GEMINI_TEXT_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${key}`

export const SUMMARIZE_SYSTEM_PROMPT = `You are a business analyst. Extract structured facts from a website and survey answers.

Rules:
- Extract only facts and signals from the provided content
- Do not invent or assume anything not explicitly stated
- If a field is unclear or missing, use empty string or empty array
- Output ONLY valid JSON — no explanation, no markdown, no code blocks

Output this exact JSON structure:
{
  "business_name": "",
  "business_type": "coach | consultant | freelancer | agency | saas | other",
  "niche": "",
  "target_audience": "",
  "core_offer": "",
  "key_differentiators": [],
  "tone_and_voice": "formal | casual | inspirational | professional",
  "notable_phrases": [],
  "pain_points_addressed": [],
  "survey_insights": {
    "content_strategy": "",
    "willingness_to_pay": "",
    "preferred_features": ""
  }
}`

export async function summarize(
  scrapedText: string,
  surveyAnswers: SurveyAnswer[],
  geminiApiKey: string,
): Promise<BusinessProfile> {
  const userMessage = `Website content:\n${scrapedText}\n\nSurvey answers from the business owner:\n${JSON.stringify(surveyAnswers)}\n\nExtract the business profile as JSON.`

  const body = {
    system_instruction: { parts: [{ text: SUMMARIZE_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  }

  const res = await callGeminiWithRetry(GEMINI_TEXT_URL(geminiApiKey), body)
  return parseJsonOutput<BusinessProfile>(res)
}

async function callGeminiWithRetry(url: string, body: unknown): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 1000))
    else throw new Error(`Gemini text API returned ${res.status}`)
  }
  throw new Error('Gemini retry exhausted')
}

function parseJsonOutput<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as T
}

export { callGeminiWithRetry, parseJsonOutput }
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/summarize.ts
git commit -m "feat: add Summarize Agent (Agent 1) — website text to business profile"
```

---

## Task 4: Build the Plan Agent (Agent 2)

**Files:**
- Create: `supabase/functions/_shared/plan.ts`

- [ ] **Step 1: Create plan.ts**

```typescript
// supabase/functions/_shared/plan.ts

import type { BusinessProfile, MarketingPlan } from './types.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

const TEXT_MODEL = 'gemini-3.0-flash'
const GEMINI_TEXT_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${key}`

export const PLAN_SYSTEM_PROMPT = `You are a senior Hebrew marketing strategist. You plan social media content for Israeli business owners.

You will receive a structured business profile. Plan exactly 3 social media posts:
- Post 1 (value_post): A professional tip or insight from the owner's field. Teaches something useful.
- Post 2 (trust_post): Builds trust and authority. Explains who the owner is and why they're credible.
- Post 3 (cta_post): A soft call to action. An invitation — not pushy. Offers value with a gentle next step.

For EACH post, define:
- angle: The specific perspective or story angle to take
- key_message: The single most important thing the reader should take away
- hook: The opening line that stops the scroll (in Hebrew)
- tone: One word — e.g. professional, warm, direct, inspiring
- image_direction: A description of the visual that would accompany this post

Rules:
- Be specific to this business — no generic advice
- Write hooks in Hebrew
- Output ONLY valid JSON — no explanation, no markdown, no code blocks

Output this exact JSON structure:
{
  "value_post": { "angle": "", "key_message": "", "hook": "", "tone": "", "image_direction": "" },
  "trust_post": { "angle": "", "key_message": "", "hook": "", "tone": "", "image_direction": "" },
  "cta_post":   { "angle": "", "key_message": "", "hook": "", "tone": "", "image_direction": "" }
}`

export async function plan(
  businessProfile: BusinessProfile,
  geminiApiKey: string,
): Promise<MarketingPlan> {
  const userMessage = `Business profile:\n${JSON.stringify(businessProfile)}\n\nCreate the 3-post marketing plan.`

  const body = {
    system_instruction: { parts: [{ text: PLAN_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  }

  const res = await callGeminiWithRetry(GEMINI_TEXT_URL(geminiApiKey), body)
  return parseJsonOutput<MarketingPlan>(res)
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/plan.ts
git commit -m "feat: add Plan Agent (Agent 2) — business profile to 3-post marketing plan"
```

---

## Task 5: Build the Copywriter Agent (Agent 3)

**Files:**
- Create: `supabase/functions/_shared/generate-post.ts`

This module runs ×3 in parallel. It takes a `PostType` and selects the right system prompt. It outputs the full post copy plus an image prompt (used by Agent 4).

- [ ] **Step 1: Create generate-post.ts**

```typescript
// supabase/functions/_shared/generate-post.ts

import type { BusinessProfile, PostPlan, PostType, Channel, GeneratedPost } from './types.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

const TEXT_MODEL = 'gemini-3.0-flash'
const GEMINI_TEXT_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent?key=${key}`

export const VALUE_POST_SYSTEM_PROMPT = `You are an expert Hebrew social media copywriter for Israeli business owners.

This is a VALUE post — it teaches something useful from the owner's expertise. It should feel like genuine advice from the owner, not an ad.

Rules:
- Write entirely in Hebrew
- Match the tone and voice from the business profile
- Use the hook from the post plan as the opening line
- The post should be 100-200 words
- End with a natural, non-pushy close
- Decide the best channel: instagram (casual, visual, shorter), linkedin (professional, story-driven), facebook (warm, community-feel)
- Also write an English image generation prompt for the visual
- Output ONLY valid JSON — no explanation, no markdown, no code blocks

Output this exact JSON structure:
{
  "content": "",
  "copy": "",
  "channel_recommended": "instagram | linkedin | facebook",
  "image_prompt": ""
}

Where:
- content = full post text in Hebrew, ready to publish
- copy = a 1-line hook/tagline in Hebrew
- channel_recommended = best platform for this post
- image_prompt = detailed English prompt for an AI image model (subject, style, lighting, mood, composition)`

export const TRUST_POST_SYSTEM_PROMPT = `You are an expert Hebrew social media copywriter for Israeli business owners.

This is a TRUST post — it builds credibility and connection. It explains who the owner is, their story, their experience, and why people trust them. It should feel personal and genuine, not boastful.

Rules:
- Write entirely in Hebrew
- Match the tone and voice from the business profile
- Use the hook from the post plan as the opening line
- The post should be 100-200 words
- Include a personal story element or specific achievement
- End with a warm, human close
- Decide the best channel: instagram (personal, story-driven), linkedin (professional credibility), facebook (community, warmth)
- Also write an English image generation prompt for the visual
- Output ONLY valid JSON — no explanation, no markdown, no code blocks

Output this exact JSON structure:
{
  "content": "",
  "copy": "",
  "channel_recommended": "instagram | linkedin | facebook",
  "image_prompt": ""
}`

export const CTA_POST_SYSTEM_PROMPT = `You are an expert Hebrew social media copywriter for Israeli business owners.

This is a CTA post — a soft call to action. It invites the reader to take a next step without being pushy or salesy. It should feel helpful and natural, like a friend recommending something good.

Rules:
- Write entirely in Hebrew
- Match the tone and voice from the business profile
- Use the hook from the post plan as the opening line
- The post should be 80-150 words (shorter and punchier)
- The CTA should offer clear value: "join", "schedule a call", "download", "DM me" etc.
- Never use aggressive sales language
- Decide the best channel: instagram (short, visual CTA), linkedin (professional invitation), facebook (warm community CTA)
- Also write an English image generation prompt for the visual
- Output ONLY valid JSON — no explanation, no markdown, no code blocks

Output this exact JSON structure:
{
  "content": "",
  "copy": "",
  "channel_recommended": "instagram | linkedin | facebook",
  "image_prompt": ""
}`

const SYSTEM_PROMPTS: Record<PostType, string> = {
  value: VALUE_POST_SYSTEM_PROMPT,
  trust: TRUST_POST_SYSTEM_PROMPT,
  cta: CTA_POST_SYSTEM_PROMPT,
}

interface CopywriterOutput {
  content: string
  copy: string
  channel_recommended: Channel
  image_prompt: string
}

export async function generatePostCopy(
  postType: PostType,
  businessProfile: BusinessProfile,
  postPlan: PostPlan,
  geminiApiKey: string,
): Promise<CopywriterOutput> {
  const systemPrompt = SYSTEM_PROMPTS[postType]
  const userMessage = `Business profile:\n${JSON.stringify(businessProfile)}\n\nPost plan:\n${JSON.stringify(postPlan)}\n\nWrite the ${postType} post.`

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
  }

  const res = await callGeminiWithRetry(GEMINI_TEXT_URL(geminiApiKey), body)
  return parseJsonOutput<CopywriterOutput>(res)
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/generate-post.ts
git commit -m "feat: add Copywriter Agent (Agent 3) — generates Hebrew post copy and image prompt"
```

---

## Task 6: Build the Image Generation Agent (Agent 4)

**Files:**
- Create: `supabase/functions/_shared/generate-image.ts`

Uses `google/nano-banana-pro` model. Gemini image generation returns base64-encoded image bytes. We decode them and upload to Supabase Storage, then return the public URL.

The Gemini image generation endpoint is:
`https://generativelanguage.googleapis.com/v1beta/models/google/nano-banana-pro:generateContent?key={API_KEY}`

- [ ] **Step 1: Create generate-image.ts**

```typescript
// supabase/functions/_shared/generate-image.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { PostType, Channel } from './types.ts'

export const IMAGE_MODEL = 'google/nano-banana-pro'
const GEMINI_IMAGE_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${key}`

const ASPECT_RATIO: Record<Channel, string> = {
  instagram: '1:1',
  linkedin: '16:9',
  facebook: '4:3',
}

export function buildImagePrompt(
  imageDirection: string,
  channel: Channel,
): string {
  const ratio = ASPECT_RATIO[channel]
  return `${imageDirection}. Professional social media image for ${channel}, aspect ratio ${ratio}. High quality, authentic, not stock-photo generic. Suitable for an Israeli business owner's social media post.`
}

export async function generateImage(
  imagePrompt: string,
  postType: PostType,
  channel: Channel,
  userId: string,
  geminiApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
): Promise<string | null> {
  try {
    const prompt = buildImagePrompt(imagePrompt, channel)

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], aspectRatio: ASPECT_RATIO[channel] },
    }

    const res = await fetch(GEMINI_IMAGE_URL(geminiApiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error(`Image API returned ${res.status} for ${postType}`)
      return null
    }

    const data = await res.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData?.mimeType?.startsWith('image/')
    )
    if (!imagePart?.inlineData?.data) {
      console.error(`No image data in response for ${postType}`)
      return null
    }

    // Decode base64 → Uint8Array
    const base64 = imagePart.inlineData.data
    const mimeType: string = imagePart.inlineData.mimeType
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    // Upload to Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const storagePath = `${userId}/${postType}.png`
    const { error: uploadError } = await supabase.storage
      .from('Validation')
      .upload(storagePath, bytes, { contentType: mimeType, upsert: true })

    if (uploadError) {
      console.error(`Storage upload failed for ${postType}:`, uploadError.message)
      return null
    }

    return `${supabaseUrl}/storage/v1/object/public/Validation/${storagePath}`
  } catch (err) {
    console.error(`generateImage failed for ${postType}:`, err)
    return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/generate-image.ts
git commit -m "feat: add Image Generation Agent (Agent 4) — Gemini image to Supabase Storage"
```

---

## Task 7: Build the Pipeline Orchestrator

**Files:**
- Create: `supabase/functions/_shared/pipeline.ts`

This is the only file that writes to the Supabase `posts` table. It runs stages 1–3 sequentially, then all 3 posts in parallel via `Promise.all`.

- [ ] **Step 1: Create pipeline.ts**

```typescript
// supabase/functions/_shared/pipeline.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { SurveyAnswer, GeneratedPost, PostType } from './types.ts'
import { scrape } from './scrape.ts'
import { summarize } from './summarize.ts'
import { plan } from './plan.ts'
import { generatePostCopy } from './generate-post.ts'
import { generateImage } from './generate-image.ts'

interface PipelineResult {
  posts: Omit<GeneratedPost, 'image_prompt'>[]
}

export async function runPipeline(
  websiteUrl: string,
  surveyAnswers: SurveyAnswer[],
  userId: string,
  geminiApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
): Promise<PipelineResult> {
  // Stage 1: Scrape
  const scrapedText = await scrape(websiteUrl)

  // Stage 2: Summarize
  const businessProfile = await summarize(scrapedText, surveyAnswers, geminiApiKey)

  // Stage 3: Plan
  const marketingPlan = await plan(businessProfile, geminiApiKey)

  // Stage 4: Generate all 3 posts in parallel
  const postTypes: PostType[] = ['value', 'trust', 'cta']
  const postPlans = {
    value: marketingPlan.value_post,
    trust: marketingPlan.trust_post,
    cta: marketingPlan.cta_post,
  }

  const results = await Promise.allSettled(
    postTypes.map(async (postType) => {
      const copy = await generatePostCopy(postType, businessProfile, postPlans[postType], geminiApiKey)
      const imageUrl = await generateImage(
        copy.image_prompt,
        postType,
        copy.channel_recommended,
        userId,
        geminiApiKey,
        supabaseUrl,
        supabaseServiceKey,
      )
      const post: GeneratedPost = {
        post_type: postType,
        content: copy.content,
        copy: copy.copy,
        channel_recommended: copy.channel_recommended,
        image_prompt: copy.image_prompt,
        image_url: imageUrl,
      }
      return post
    })
  )

  // Collect successful posts
  const posts: GeneratedPost[] = results
    .filter((r): r is PromiseFulfilledResult<GeneratedPost> => r.status === 'fulfilled')
    .map(r => r.value)

  if (posts.length < 2) {
    throw new Error('שגיאה ביצירת התוכן. אנא נסה שוב.')
  }

  // Stage 5: Write to DB
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const rows = posts.map(p => ({
    user_id: userId,
    post_type: p.post_type,
    content: p.content,
    copy: p.copy,
    channel_recommended: p.channel_recommended,
    image_url: p.image_url,
  }))

  const { error: insertError } = await supabase.from('posts').insert(rows)
  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)

  // Return posts without the internal image_prompt field
  return {
    posts: posts.map(({ image_prompt: _ip, ...rest }) => rest),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/pipeline.ts
git commit -m "feat: add pipeline orchestrator — sequential scrape/summarize/plan then parallel post generation"
```

---

## Task 8: Rewrite the Edge Function Entry Point

**Files:**
- Modify: `supabase/functions/generate-content/index.ts`

Replace the N8N forwarding logic with a call to `runPipeline`. The response shape is identical to what the frontend already expects.

- [ ] **Step 1: Rewrite index.ts**

```typescript
// supabase/functions/generate-content/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runPipeline } from '../_shared/pipeline.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id נדרש' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, website_url')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'משתמש לא נמצא' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch survey answers
    const { data: surveyRows } = await supabase
      .from('survey_responses')
      .select('question_key, answer_text')
      .eq('user_id', user_id)

    const surveyAnswers = (surveyRows ?? []).map(r => ({
      key: r.question_key,
      value: r.answer_text,
    }))

    // Run pipeline
    const { posts } = await runPipeline(
      user.website_url,
      surveyAnswers,
      user_id,
      geminiApiKey,
      supabaseUrl,
      supabaseServiceKey,
    )

    return new Response(
      JSON.stringify({ posts }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת התוכן. אנא נסה שוב.'
    const isHebrew = /[֐-׿]/.test(message)
    console.error('generate-content error:', err)
    return new Response(
      JSON.stringify({ error: isHebrew ? message : 'שגיאה ביצירת התוכן. אנא נסה שוב.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/generate-content/index.ts
git commit -m "feat: rewrite generate-content edge function — replaces N8N with in-app Gemini pipeline"
```

---

## Task 9: Set GEMINI_API_KEY Secret & Deploy

- [ ] **Step 1: Set the Gemini API key secret**

Go to [aistudio.google.com](https://aistudio.google.com) → Get API key → copy it, then run:

```bash
cd "/Users/noamcarter/Desktop/Validation 1"
npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_KEY --project-ref aslqxpoqajxbvkogklan
```

Expected output: `Finished supabase secrets set`

- [ ] **Step 2: Verify the Supabase Storage bucket exists**

Open Supabase Dashboard → Storage → check that a bucket named exactly `Validation` exists and is set to **Public**. If it doesn't exist:
1. Click "New bucket"
2. Name: `Validation`
3. Toggle "Public bucket" to ON
4. Click "Save"

- [ ] **Step 3: Deploy the edge function**

```bash
cd "/Users/noamcarter/Desktop/Validation 1"
npx supabase functions deploy generate-content --project-ref aslqxpoqajxbvkogklan
```

Expected output: `Deployed Function generate-content`

- [ ] **Step 4: Smoke test with curl**

Replace `YOUR_USER_ID` with a real user ID from the `users` table (check Supabase Dashboard → Table Editor → users), and `YOUR_ANON_KEY` with the value of `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`:

```bash
curl -X POST https://aslqxpoqajxbvkogklan.supabase.co/functions/v1/generate-content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"user_id": "YOUR_USER_ID"}'
```

Expected: JSON response with `{ "posts": [...] }` containing 2–3 posts, each with `post_type`, `content` (Hebrew text), `copy`, `channel_recommended`, `image_url`.

---

## Task 10: Write the Documentation

**Files:**
- Create: `docs/BACKEND_PIPELINE.md`

- [ ] **Step 1: Create docs/BACKEND_PIPELINE.md**

```markdown
# Backend Pipeline — Content Generation

## Overview

The content generation pipeline replaces the original N8N workflow. It runs entirely inside a Supabase Edge Function (`generate-content`) and uses the Gemini API for all AI steps.

## Flow

```
User submits URL (frontend)
  └─ Survey completed (frontend)
       └─ POST /functions/v1/generate-content { user_id }
            │
            ├─ Fetch user.website_url + survey_answers from DB
            │
            ├─ Stage 1: Scrape (Jina Reader)
            │    r.jina.ai/{website_url} → clean markdown text
            │
            ├─ Stage 2: Summarize Agent (gemini-3.0-flash)
            │    markdown + survey → BusinessProfile JSON
            │
            ├─ Stage 3: Plan Agent (gemini-3.0-flash)
            │    BusinessProfile → MarketingPlan JSON (3 post plans)
            │
            ├─ Stage 4: Generate Posts (parallel, ×3)
            │    ├─ Copywriter Agent (gemini-3.0-flash) → Hebrew post + image prompt
            │    └─ Image Agent (google/nano-banana-pro) → PNG → Supabase Storage
            │
            ├─ Stage 5: Insert 3 posts to `posts` table
            │
            └─ Return { posts: [...] } to frontend
```

## File Map

| File | Responsibility |
|---|---|
| `supabase/functions/generate-content/index.ts` | HTTP handler. Reads user/survey from DB, calls pipeline, returns response. |
| `supabase/functions/_shared/pipeline.ts` | Orchestrates all stages. **Only file that writes to `posts` table.** |
| `supabase/functions/_shared/scrape.ts` | Fetches website via Jina Reader. Returns markdown text. |
| `supabase/functions/_shared/summarize.ts` | Agent 1. Converts scraped text + survey answers → `BusinessProfile` JSON. |
| `supabase/functions/_shared/plan.ts` | Agent 2. Converts `BusinessProfile` → `MarketingPlan` (3 post plans). |
| `supabase/functions/_shared/generate-post.ts` | Agent 3. Converts profile + post plan → Hebrew post copy + image prompt. Runs ×3 in parallel. |
| `supabase/functions/_shared/generate-image.ts` | Agent 4. Converts image prompt → PNG → uploads to Supabase Storage → returns public URL. Runs ×3 in parallel. |
| `supabase/functions/_shared/types.ts` | All shared TypeScript interfaces. |

## Where to Change System Prompts

| Agent | File | Constant Name |
|---|---|---|
| Summarize Agent | `_shared/summarize.ts` | `SUMMARIZE_SYSTEM_PROMPT` |
| Plan Agent | `_shared/plan.ts` | `PLAN_SYSTEM_PROMPT` |
| Copywriter (Value post) | `_shared/generate-post.ts` | `VALUE_POST_SYSTEM_PROMPT` |
| Copywriter (Trust post) | `_shared/generate-post.ts` | `TRUST_POST_SYSTEM_PROMPT` |
| Copywriter (CTA post) | `_shared/generate-post.ts` | `CTA_POST_SYSTEM_PROMPT` |
| Image Agent | `_shared/generate-image.ts` | `buildImagePrompt()` function |

## Models Used

| Model | Used For | Where Configured |
|---|---|---|
| `gemini-3.0-flash` | All text agents (summarize, plan, copywrite) | `TEXT_MODEL` constant in each `_shared/*.ts` file |
| `google/nano-banana-pro` | Image generation | `IMAGE_MODEL` constant in `_shared/generate-image.ts` |

To swap a model: change the relevant constant and redeploy.

## Database Tables

| Table | Written By | What's Stored |
|---|---|---|
| `users` | Frontend (landing page) | `id`, `website_url`, `auth_user_id`, `survey_completed` |
| `survey_responses` | Frontend (survey page) | One row per question: `user_id`, `question_key`, `answer_text` |
| `posts` | `_shared/pipeline.ts` | `user_id`, `post_type`, `content`, `copy`, `image_url`, `channel_recommended` |

## Storage

**Bucket:** `Validation` (public)
**Path:** `{user_id}/{post_type}.png`
**Public URL:** `https://aslqxpoqajxbvkogklan.supabase.co/storage/v1/object/public/Validation/{user_id}/{post_type}.png`

## Environment Variables

| Variable | Required By | How to Set |
|---|---|---|
| `GEMINI_API_KEY` | All `_shared/*.ts` agents | `npx supabase secrets set GEMINI_API_KEY=...` |
| `SUPABASE_URL` | Auto-injected | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected | — |

## Error Handling

| Stage | Failure Behaviour |
|---|---|
| Scrape fails | Returns 422 + `"לא הצלחנו לסרוק את האתר שלך"` |
| Summarize fails | Retries once, then returns 500 |
| Plan fails | Retries once, then returns 500 |
| One post copy fails | That post is skipped; other 2 succeed |
| Image generation fails | `image_url: null`; post still saves |
| < 2 posts generated | Returns 500 + `"שגיאה ביצירת התוכן. אנא נסה שוב."` |

## How to Swap the Image Model

1. Open `supabase/functions/_shared/generate-image.ts`
2. Change `IMAGE_MODEL` constant at the top
3. If the new model has a different request format, update the `body` object in `generateImage()`
4. If the new model returns images differently, update the `imagePart` extraction logic
5. Redeploy: `npx supabase functions deploy generate-content --project-ref aslqxpoqajxbvkogklan`

## Frontend

Zero frontend changes were made. The loading page (`app/loading/page.tsx`) calls the same edge function URL and reads the same `{ posts: [...] }` response shape as before.
```

- [ ] **Step 2: Commit**

```bash
git add docs/BACKEND_PIPELINE.md
git commit -m "docs: add BACKEND_PIPELINE.md — full pipeline documentation"
```

---

## Task 11: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/noamcarter/Desktop/Validation 1"
npm run dev
```

Open `http://localhost:3000` in the browser.

- [ ] **Step 2: Run the full flow**

1. Enter a real Israeli business website URL (e.g. a coach or consultant)
2. Complete all survey questions
3. Watch the loading screen (expect 30–50s)
4. Verify 3 post cards appear on the results screen with Hebrew content
5. Check each card has: Hebrew `content`, a `copy` line, a `channel_recommended` badge, and an image (or graceful fallback if image is null)
6. Click "העתק פוסט" on each card — verify clipboard copy works

- [ ] **Step 3: Verify posts in Supabase DB**

Open Supabase Dashboard → Table Editor → `posts`. Confirm 3 new rows exist for the test user with populated `content`, `copy`, `channel_recommended`, and `image_url`.

- [ ] **Step 4: Commit verification**

```bash
git add -A
git commit -m "feat: complete in-app Gemini pipeline — N8N fully replaced"
```
