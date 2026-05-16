import type { PostType, BusinessProfile, PostPlan } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'
import { generatePostCopy, buildPostUserMessage, SYSTEM_PROMPTS, POST_SCHEMA } from './generate-post.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

export interface ValidationResult {
  valid: boolean
  critique: string[]
}

export function validatePost(output: CopywriterOutput, postType: PostType): ValidationResult {
  const critique: string[] = []

  // Hebrew only — reject if Latin characters make up more than 5% of alphabetic characters.
  // This allows brand names and tech acronyms that are legitimately English (e.g. "AI", "SaaS")
  // while still catching posts that are substantially written in English.
  // image_prompt is intentionally excluded — it is English-language input to the image generation model.
  function latinRatio(text: string): number {
    const hebrew = (text.match(/[א-ת]/g) ?? []).length
    const latin = (text.match(/[a-zA-Z]/g) ?? []).length
    if (latin === 0) return 0
    if (hebrew === 0) return 1
    return latin / (hebrew + latin)
  }
  if (latinRatio(output.content) > 0.05 || latinRatio(output.copy) > 0.05) {
    critique.push('הפוסט מכיל יותר מדי תווים באנגלית — כתוב בעברית בלבד')
  }

  // Counts each emoji code point with Emoji_Presentation — ZWJ compound emoji (e.g. 👨‍💻) count as multiple; acceptable for LLM output
  const emojiCount = (output.content.match(/\p{Emoji_Presentation}/gu) ?? []).length
  if (emojiCount > 4) {
    critique.push(`הפוסט מכיל יותר מדי אימוג'י (${emojiCount}) — הפחת לכל היותר 4`)
  }

  // Assumes paragraphs are separated by blank lines (\n\n), as instructed in the generation prompts
  const paragraphs = output.content.replace(/\r\n/g, '\n').split('\n\n').filter(p => p.trim().length > 0)
  const minParagraphs = postType === 'cta' ? 2 : 3
  if (paragraphs.length < minParagraphs) {
    critique.push(`הפוסט חסר פסקאות — נדרשות לפחות ${minParagraphs} פסקאות מופרדות בשורה ריקה (יש ${paragraphs.length})`)
  }

  // Minimum word count
  const wordCount = output.content.trim().split(/\s+/).filter(w => w.length > 0).length
  const minWords = postType === 'cta' ? 70 : 100
  if (wordCount < minWords) {
    critique.push(`הפוסט קצר מדי — כתוב לפחות ${minWords} מילים (יש כרגע ${wordCount})`)
  }

  return { valid: critique.length === 0, critique }
}

export async function generateValidatedPostCopy(
  postType: PostType,
  businessProfile: BusinessProfile,
  postPlan: PostPlan,
  geminiApiKey: string,
): Promise<CopywriterOutput> {
  const userMessage = buildPostUserMessage(postType, businessProfile, postPlan)

  // Attempt 1: fresh generation
  let output = await generatePostCopy(postType, businessProfile, postPlan, geminiApiKey)
  let validation = validatePost(output, postType)
  if (validation.valid) return output

  // Attempt 2: guided retry — send bad output + critique back as conversation context
  const critiqueMessage = `הפוסט שכתבת נכשל בבדיקת איכות:\n${validation.critique.join('\n')}\n\nכתוב מחדש את הפוסט תוך תיקון כל הבעיות שצוינו.`
  const guidedBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPTS[postType] }] },
    contents: [
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: JSON.stringify(output) }] },
      { role: 'user', parts: [{ text: critiqueMessage }] },
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: POST_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  const { text: guidedText, finishReason: guidedReason } = await callGeminiWithRetry(geminiApiKey, guidedBody, `validate-guided:${postType}`)
  const guidedOutput = parseJsonOutput<CopywriterOutput>(guidedText, `validate-guided:${postType}`, guidedReason)
  const guidedValidation = validatePost(guidedOutput, postType)
  if (guidedValidation.valid) return guidedOutput

  // Attempt 3: silent retry — fresh call, no prior context
  const silentOutput = await generatePostCopy(postType, businessProfile, postPlan, geminiApiKey)
  const silentValidation = validatePost(silentOutput, postType)
  if (silentValidation.valid) return silentOutput

  throw new Error(
    `[stage:validate:${postType}] failed all 3 attempts. Last issues: ${silentValidation.critique.join(', ')}`
  )
}
