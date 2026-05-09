import type { PostType, BusinessProfile, PostPlan } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'
import { generatePostCopy, SYSTEM_PROMPTS, POST_SCHEMA } from './generate-post.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

export interface ValidationResult {
  valid: boolean
  critique: string[]
}

export function validatePost(output: CopywriterOutput, postType: PostType): ValidationResult {
  const critique: string[] = []

  // Hebrew only — check for Latin characters in both content and copy
  // image_prompt is intentionally excluded — it is English-language input to the image generation model
  if (/[a-zA-Z]/.test(output.content) || /[a-zA-Z]/.test(output.copy)) {
    critique.push('הפוסט מכיל תווים באנגלית — כתוב בעברית בלבד')
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
  const userMessage = `Business profile:\n${JSON.stringify(businessProfile)}\n\nPost plan:\n${JSON.stringify(postPlan)}\n\nWrite the ${postType} post.`

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
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: POST_SCHEMA,
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
