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

export async function callGeminiWithRetry(url: string, body: unknown): Promise<string> {
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

export function parseJsonOutput<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as T
}
