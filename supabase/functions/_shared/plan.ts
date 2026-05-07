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
