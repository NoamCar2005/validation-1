// supabase/functions/_shared/plan.ts

import type { BusinessProfile, MarketingPlan } from './types.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

export interface PriorPost {
  post_type: 'value' | 'trust' | 'cta'
  content: string
  copy: string
}

export const PLAN_SYSTEM_PROMPT = `You are a senior Hebrew marketing strategist with years of experience. You plan social media content for Israeli business owners.

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
- CRITICAL: 'hook', 'angle', 'key_message', and 'tone' fields must ALL be written in Hebrew — not a single English word. Any Latin text = task failure.
- Be specific to this business — no generic advice
- Keep each string concise; do NOT include literal newlines inside string values
- Output ONLY valid JSON — no explanation, no markdown, no code blocks`

const POST_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    angle: { type: 'string' },
    key_message: { type: 'string' },
    hook: { type: 'string' },
    tone: { type: 'string' },
    image_direction: { type: 'string' },
  },
  required: ['angle', 'key_message', 'hook', 'tone', 'image_direction'],
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    value_post: POST_PLAN_SCHEMA,
    trust_post: POST_PLAN_SCHEMA,
    cta_post: POST_PLAN_SCHEMA,
  },
  required: ['value_post', 'trust_post', 'cta_post'],
}

export function buildPlanUserMessage(
  businessProfile: BusinessProfile,
  priorPosts: PriorPost[],
): string {
  const base = `Business profile:\n${JSON.stringify(businessProfile)}\n\nCreate the 3-post marketing plan.`
  if (priorPosts.length === 0) return base

  return `${base}

The user has previously received the following posts (as JSON):
${JSON.stringify(priorPosts)}

Generate a marketing plan with fundamentally different angles, hooks, personal stories, and emotional tones from what is shown above. Do not repeat themes, phrasing, or examples from the prior posts. The voice should still feel like the same business owner, but the content must feel genuinely new.`
}

export async function plan(
  businessProfile: BusinessProfile,
  geminiApiKey: string,
  priorPosts: PriorPost[] = [],
): Promise<MarketingPlan> {
  const userMessage = buildPlanUserMessage(businessProfile, priorPosts)

  const body = {
    system_instruction: { parts: [{ text: PLAN_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: PLAN_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  const { text, finishReason } = await callGeminiWithRetry(geminiApiKey, body, 'plan')
  return parseJsonOutput<MarketingPlan>(text, 'plan', finishReason)
}
