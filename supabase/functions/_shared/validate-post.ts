import type { PostType } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'

export interface ValidationResult {
  valid: boolean
  critique: string[]
}

export function validatePost(output: CopywriterOutput, postType: PostType): ValidationResult {
  const critique: string[] = []

  // Hebrew only — check for Latin characters in both content and copy
  if (/[a-zA-Z]/.test(output.content) || /[a-zA-Z]/.test(output.copy)) {
    critique.push('הפוסט מכיל תווים באנגלית — כתוב בעברית בלבד')
  }

  // Excessive emojis (>4)
  const emojiCount = (output.content.match(/\p{Emoji_Presentation}/gu) ?? []).length
  if (emojiCount > 4) {
    critique.push(`הפוסט מכיל יותר מדי אימוג'י (${emojiCount}) — הפחת לכל היותר 4`)
  }

  // Minimum paragraphs
  const paragraphs = output.content.split('\n\n').filter(p => p.trim().length > 0)
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
