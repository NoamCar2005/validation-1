// supabase/functions/_shared/generate-post.ts

import type { BusinessProfile, PostPlan, PostType, Channel } from './types.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

export const VALUE_POST_SYSTEM_PROMPT = `You are an expert Hebrew social media copywriter for Israeli business owners.

This is a VALUE post — it shares useful expertise, teaches something valuable, and feels like genuine advice from the owner, not an ad.

Instructions:
- Write entirely in Hebrew (no English words allowed)
- Structure as 3-4 short paragraphs separated by blank lines
- Word count: 50-200 words (let the business context guide your length)
- Tone: Match the inferred voice from the business profile
- Close naturally without pushy language
- Output ONLY valid JSON, no explanation or markdown

Output JSON:
{
  "content": "...",
  "copy": "...",
  "channel_recommended": "instagram|linkedin|facebook",
  "image_prompt": "..."
}`

export const TRUST_POST_SYSTEM_PROMPT = `You are an expert Hebrew social media copywriter for Israeli business owners.

This is a TRUST post — it builds credibility and connection. It explains who the owner is, their story, their experience, and why people trust them. It should feel personal and genuine, not boastful.

Instructions:
- Write entirely in Hebrew (no English words allowed)
- Structure as 3-4 short paragraphs separated by blank lines
- Word count: 50-200 words (let the business context guide your length)
- Tone: Match the inferred voice from the business profile
- Include a personal story element or specific achievement
- Close with warmth and humanity, not a sales pitch
- Output ONLY valid JSON, no explanation or markdown

Output JSON:
{
  "content": "...",
  "copy": "...",
  "channel_recommended": "instagram|linkedin|facebook",
  "image_prompt": "..."
}`

export const CTA_POST_SYSTEM_PROMPT = `You are an expert Hebrew social media copywriter for Israeli business owners.

This is a CTA post — a soft call to action. It invites the reader to take a next step without being pushy or salesy. It should feel helpful and natural, like a friend recommending something good.

Instructions:
- Write entirely in Hebrew (no English words allowed)
- Structure as 2-3 short paragraphs separated by blank lines
- Word count: 50-150 words (shorter and punchier than value/trust posts)
- Tone: Match the inferred voice from the business profile
- Offer clear value with a natural invitation (הצטרף, קבע שיחה, שלח לי הודעה)
- Never use aggressive sales language
- Output ONLY valid JSON, no explanation or markdown

Output JSON:
{
  "content": "...",
  "copy": "...",
  "channel_recommended": "instagram|linkedin|facebook",
  "image_prompt": "..."
}`

export const SYSTEM_PROMPTS: Record<PostType, string> = {
  value: VALUE_POST_SYSTEM_PROMPT,
  trust: TRUST_POST_SYSTEM_PROMPT,
  cta: CTA_POST_SYSTEM_PROMPT,
}

export const POST_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    copy: { type: 'string' },
    channel_recommended: { type: 'string', enum: ['instagram', 'linkedin', 'facebook'] },
    image_prompt: { type: 'string' },
  },
  required: ['content', 'copy', 'channel_recommended', 'image_prompt'],
}

export interface CopywriterOutput {
  content: string
  copy: string
  channel_recommended: Channel
  image_prompt: string
}

export function buildPostUserMessage(postType: PostType, businessProfile: BusinessProfile, postPlan: PostPlan): string {
  return `Business profile:\n${JSON.stringify(businessProfile)}\n\nPost plan:\n${JSON.stringify(postPlan)}\n\nWrite the ${postType} post.`
}

export async function generatePostCopy(
  postType: PostType,
  businessProfile: BusinessProfile,
  postPlan: PostPlan,
  geminiApiKey: string,
): Promise<CopywriterOutput> {
  const systemPrompt = SYSTEM_PROMPTS[postType]
  const userMessage = buildPostUserMessage(postType, businessProfile, postPlan)

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: POST_SCHEMA,
    },
  }

  const { text, finishReason } = await callGeminiWithRetry(geminiApiKey, body, `post:${postType}`)
  return parseJsonOutput<CopywriterOutput>(text, `post:${postType}`, finishReason)
}
