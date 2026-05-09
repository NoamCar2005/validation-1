import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { validatePost } from './validate-post.ts'
import type { CopywriterOutput } from './generate-post.ts'

const goodValuePost: CopywriterOutput = {
  content: 'פסקה ראשונה עם ידע מקצועי אמיתי שעוזר לקהל היעד והוא כוללת הרבה מידע מופיע והטכניקות שלנו נבדקות בשוק. זה הדבר הכי חשוב שאתה צריך לדעת בנושא זה. בעשרים שנים של ניסיון, למדתי שהעקביות היא המפתח להצלחה בעולם העסקים המודרני.\n\nפסקה שנייה שמרחיבה על הנושא ומביאה דוגמה מהחיים האמיתיים של העסק שלנו ומהתפעול היומיומי שלנו. אנחנו רואים את זה כל יום ואנחנו יודעים איך להתמודד עם זה. הלקוחות שלנו מדווחים על שיפור של עד שישים אחוז בתוך שלושה חודשים ראשונים.\n\nפסקה שלישית שסוגרת בצורה טבעית עם מסר ברור ונקי שעוזר לך להמשיך קדימה בדרך הנכונה. התחל היום והראה לעצמך מה אתה יכול להשיג עם הכלים והידע הנכונים בצידך.',
  copy: 'הוק קצר ומושך שמסכם את הפוסט',
  channel_recommended: 'instagram',
  image_prompt: 'professional photo of a business owner',
}

Deno.test('validatePost: passes a valid value post', () => {
  const result = validatePost(goodValuePost, 'value')
  assertEquals(result.valid, true)
  assertEquals(result.critique, [])
})

Deno.test('validatePost: fails when content has Latin characters', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה ראשונה עם ידע מקצועי.\n\nפסקה שנייה עם תוכן נוסף.\n\nפסקה שלישית with English text שמסיימת את הפוסט.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('אנגלית')), true)
})

Deno.test('validatePost: fails when copy has Latin characters', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    copy: 'hook in English',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
})

Deno.test('validatePost: fails value post with fewer than 3 paragraphs', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'רק פסקה אחת ארוכה מאוד שמכילה הרבה מילים אבל אין בה הפרדה לפסקאות נפרדות בכלל למרות שהיא ממש ארוכה.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('פסקאות')), true)
})

Deno.test('validatePost: cta post passes with 2 paragraphs', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה ראשונה עם הצעת ערך ברורה ומושכת לקהל היעד שלנו עם הוכחות אמיתיות מהעסק שלנו בעבודה היומיומית ויום יום. זה הפעם שלך להביא שינוי משמעותי בחיים שלך ולהשתנות לתמיד עם הידע והכלים המקצועיים שלנו שהוכחו בהצלחה גדולה בשנים האחרונות הרבות.\n\nפסקה שנייה עם קריאה לפעולה ברורה ופשוטה שמזמינה אתכם להצטרף ולהתחיל את המסע המעניין שלנו ביחד כעת בלי דיחוי וללא התחייבויות כבדות או מסוכנות. בואו נעשה זאת ביחד ובחיוך גדול.',
  }
  const result = validatePost(post, 'cta')
  assertEquals(result.valid, true)
})

Deno.test('validatePost: trust post requires 3 paragraphs', () => {
  const post: CopywriterOutput = {
    content: 'פסקה ראשונה עם סיפור אישי ומרגש שבונה קשר עם הקהל ומראה את הצד האנושי של בעל העסק שלי. וההיסטוריה שלי בעולם העסקים ובחיים האישיים שעיצבו אותי לאדם שאני היום וההווה שלי. למדתי הרבה דברים חשובים בדרך.\n\nפסקה שנייה שמרחיבה על הניסיון המקצועי ומוסיפה אמינות לסיפור האישי שסופר בפסקה הראשונה עם דוגמאות קונקרטיות מהעבודה שלי בחיים היומיומיים וההשפעה שעשיתי על הלקוחות שלי בעשרים שנים של עבודה. כל פרויקט השנה את דרך החשיבה שלי.\n\nפסקה שלישית שסוגרת בצורה חמה ואנושית ומזמינה את הקהל להמשיך את הקשר עם הכותב ולהיות חלק מהקהילה שלי שגדלה כל יום בהתלהבות ובתקווה לעתיד טוב ביחד. אני מחכה לפגוש אתכם בהדרך.',
    copy: 'מי אני ולמה אני עושה את מה שאני עושה',
    channel_recommended: 'instagram',
    image_prompt: 'warm portrait of a business owner',
  }
  const result = validatePost(post, 'trust')
  assertEquals(result.valid, true)
})

Deno.test('validatePost: fails when word count is too low for value post', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה קצרה.\n\nפסקה שנייה קצרה.\n\nפסקה שלישית קצרה מאוד.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('מילים')), true)
})

Deno.test('validatePost: fails with more than 4 emojis', () => {
  const post: CopywriterOutput = {
    ...goodValuePost,
    content: 'פסקה ראשונה עם תוכן מספיק ויותר מספיק כדי לעבור בדיקה בהצלחה כי יש הרבה מילים כאן. 🎯🚀💡✅🔥\n\nפסקה שנייה עם תוכן נוסף שמרחיב על הנושא ומוסיף ערך משמעותי לקהל היעד.\n\nפסקה שלישית שסוגרת בצורה טבעית עם מסר ברור ונקי.',
  }
  const result = validatePost(post, 'value')
  assertEquals(result.valid, false)
  assertEquals(result.critique.some(c => c.includes('אימוג')), true)
})
