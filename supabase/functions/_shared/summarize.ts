// supabase/functions/_shared/summarize.ts

import type { BusinessProfile, SurveyAnswer } from './types.ts'

const PRIMARY_MODEL = 'gemini-2.5-flash'
const FALLBACK_MODEL = 'gemini-2.5-flash-lite'

const modelUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export const SUMMARIZE_SYSTEM_PROMPT = `You are a business analyst. Extract structured facts from a website and survey answers.

Rules:
- Extract only facts and signals from the provided content
- Do not invent or assume anything not explicitly stated
- If a field is unclear or missing, use empty string or empty array
- Output ONLY valid JSON — no explanation, no markdown, no code blocks
- Keep all string values concise — no extra prose, no newlines inside string values`

const SUMMARIZE_SCHEMA = {
  type: 'object',
  properties: {
    business_name: { type: 'string' },
    business_type: { type: 'string' },
    niche: { type: 'string' },
    target_audience: { type: 'string' },
    core_offer: { type: 'string' },
    key_differentiators: { type: 'array', items: { type: 'string' } },
    tone_and_voice: { type: 'string' },
    notable_phrases: { type: 'array', items: { type: 'string' } },
    pain_points_addressed: { type: 'array', items: { type: 'string' } },
    survey_insights: {
      type: 'object',
      properties: {
        content_strategy: { type: 'string' },
        willingness_to_pay: { type: 'string' },
        preferred_features: { type: 'string' },
      },
      required: ['content_strategy', 'willingness_to_pay', 'preferred_features'],
    },
  },
  required: [
    'business_name', 'business_type', 'niche', 'target_audience', 'core_offer',
    'key_differentiators', 'tone_and_voice', 'notable_phrases',
    'pain_points_addressed', 'survey_insights',
  ],
}

export async function summarize(
  scrapedText: string,
  surveyAnswers: SurveyAnswer[],
  geminiApiKey: string,
): Promise<BusinessProfile> {
  const userMessage = `Website content:\n${scrapedText}\n\nSurvey answers from the business owner:\n${JSON.stringify(surveyAnswers)}\n\nExtract the business profile as JSON.`

  const body = {
    system_instruction: { parts: [{ text: SUMMARIZE_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: SUMMARIZE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  const { text, finishReason } = await callGeminiWithRetry(geminiApiKey, body, 'summarize')
  return parseJsonOutput<BusinessProfile>(text, 'summarize', finishReason)
}

const RETRYABLE = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS_PER_MODEL = 3
const RETRY_DELAYS_MS = [0, 1500, 4000]

export interface GeminiResult {
  text: string
  finishReason: string
  model: string
}

export async function callGeminiWithRetry(
  geminiApiKey: string,
  body: unknown,
  stage: string,
): Promise<GeminiResult> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL]
  let lastErr: { status: number; body: string } | null = null

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      if (RETRY_DELAYS_MS[attempt] > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]))
      }

      let res: Response
      try {
        res = await fetch(modelUrl(model), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify(body),
        })
      } catch (err) {
        console.error(`[gemini:${stage}] network error model=${model} attempt=${attempt}:`, err)
        lastErr = { status: 0, body: String(err) }
        continue
      }

      if (res.ok) {
        const data = await res.json()
        const candidate = data.candidates?.[0]
        const text = candidate?.content?.parts?.[0]?.text ?? ''
        const finishReason = candidate?.finishReason ?? 'UNKNOWN'
        const usage = data.usageMetadata
        console.log(
          `[gemini:${stage}] ok model=${model} attempt=${attempt} ` +
          `finishReason=${finishReason} chars=${text.length} ` +
          `tokens(in/out)=${usage?.promptTokenCount}/${usage?.candidatesTokenCount}`
        )
        return { text, finishReason, model }
      }

      const errorBody = await res.text()
      console.error(`[gemini:${stage}] error model=${model} attempt=${attempt} status=${res.status} body=${errorBody.slice(0, 400)}`)
      lastErr = { status: res.status, body: errorBody }

      if (!RETRYABLE.has(res.status)) {
        break
      }
    }
    console.warn(`[gemini:${stage}] exhausted ${MAX_ATTEMPTS_PER_MODEL} attempts on ${model}, falling through`)
  }

  throw new Error(
    `[stage:${stage}] Gemini API ${lastErr?.status}: ${(lastErr?.body ?? '').slice(0, 500)}`
  )
}

export function parseJsonOutput<T>(raw: string, stage: string, finishReason: string): T {
  if (finishReason === 'MAX_TOKENS') {
    throw new Error(
      `[stage:${stage}] Gemini hit MAX_TOKENS; raised limit needed. ` +
      `len=${raw.length} head="${raw.slice(0, 120)}" tail="${raw.slice(-120)}"`
    )
  }
  if (!raw || raw.trim().length === 0) {
    throw new Error(`[stage:${stage}] Gemini returned empty text. finishReason=${finishReason}`)
  }
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    const head = cleaned.slice(0, 200).replace(/\n/g, '\\n')
    const tail = cleaned.slice(-200).replace(/\n/g, '\\n')
    throw new Error(
      `[stage:${stage}] JSON parse failed: ${err instanceof Error ? err.message : String(err)}. ` +
      `finishReason=${finishReason} len=${cleaned.length} head="${head}" tail="${tail}"`
    )
  }
}
