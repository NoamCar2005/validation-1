import type { PostType } from './types.ts'
import type { CopywriterOutput } from './generate-post.ts'
import { callGeminiWithRetry, parseJsonOutput } from './summarize.ts'

const HUMANIZE_SYSTEM_PROMPT = `אתה קופירייטר ישראלי מנוסה. תקבל פוסט שנכתב על ידי AI ותכתוב אותו מחדש כך שיישמע כאילו אדם אמיתי כתב אותו — לא AI.

כללים:
- הסר סימנים מובהקים של AI: רשימות ממוספרות מוגזמות, וי (✅), כותרות, תבניות נוקשות
- נקודות תבליט מותרות אם הן משרתות את התוכן — לא כמבנה ברירת מחדל
- הסר פתיחות וסיומות גנריות: "בעולם של היום", "חשוב לזכור", "לסיכום", "אין ספק ש", "ברור ש"
- כתוב בפסקאות רציפות וטבעיות — מופרדות בשורה ריקה
- שמור על אותו מסר, הוק, הצעה וקריאה לפעולה — שנה רק את אופן ההעברה
- שמור על הטון המתאים לסוג הפוסט
- עברית בלבד — ללא תווים לטיניים
- שמור על אורך דומה למקור
- פלט JSON בלבד: { "content": "", "copy": "" }`

const HUMANIZE_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    copy: { type: 'string' },
  },
  required: ['content', 'copy'],
}

const TONE_HINTS: Record<PostType, string> = {
  value: 'תובנה מקצועית — ידע שמציב את הכותב כמומחה בתחומו',
  trust: 'אישי וחם — סיפור אמיתי שבונה קשר ואמון',
  cta: 'ישיר וידידותי — הזמנה לפעולה שמרגישה טבעית ולא דוחפת',
}

export async function humanizePost(
  post: CopywriterOutput,
  postType: PostType,
  geminiApiKey: string,
): Promise<CopywriterOutput> {
  const userMessage = `טון הפוסט: ${TONE_HINTS[postType]}\n\nפוסט לעיבוד:\n${JSON.stringify({ content: post.content, copy: post.copy })}\n\nכתוב מחדש כפוסט אנושי.`

  const body = {
    system_instruction: { parts: [{ text: HUMANIZE_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: HUMANIZE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  const { text, finishReason } = await callGeminiWithRetry(geminiApiKey, body, `humanize:${postType}`)
  const result = parseJsonOutput<{ content: string; copy: string }>(text, `humanize:${postType}`, finishReason)

  return {
    ...post,
    content: result.content,
    copy: result.copy,
  }
}
