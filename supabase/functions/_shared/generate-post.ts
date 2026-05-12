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

Rules:
- CRITICAL: 'content' AND 'copy' fields must contain ONLY Hebrew text — not a single Latin character is allowed. Any English word = task failure.
- Write entirely in Hebrew
- Match the tone and voice from the business profile
- Use the hook from the post plan as the opening line
- The post should be 100-200 words
- Structure 'content' as 3-4 short paragraphs separated by \\n\\n (blank lines between paragraphs). Never write one solid block of text.
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
- CRITICAL: 'content' AND 'copy' fields must contain ONLY Hebrew text — not a single Latin character is allowed. Any English word = task failure.
- Write entirely in Hebrew
- Match the tone and voice from the business profile
- Use the hook from the post plan as the opening line
- The post should be 80-150 words (shorter and punchier)
- Structure 'content' as 2-3 short paragraphs separated by \\n\\n (blank lines between paragraphs). Never write one solid block of text.
- The CTA should offer clear value: "הצטרף", "קבע שיחה", "שלח לי הודעה" etc. (always in Hebrew)
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
