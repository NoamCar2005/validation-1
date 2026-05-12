// Temporary test file — delete after verifying rubric behavior
import { evaluateCopywritingQuality } from './copywriting-rubric.ts'
import type { CopywriterOutput } from './generate-post.ts'
import type { BusinessProfile } from './types.ts'

const businessProfile: BusinessProfile = {
  business_name: 'עסק ייעוץ לדוד',
  business_type: 'consultant',
  niche: 'ייעוץ עסקי לעצמאים',
  target_audience: 'בעלי עסקים קטנים',
  core_offer: 'ייעוץ לגדילה ורווחיות',
  key_differentiators: ['ניסיון של 10 שנים', 'גישה אישית'],
  tone_and_voice: 'professional',
  notable_phrases: [],
  pain_points_addressed: ['ניהול זמן', 'גדילה'],
  survey_insights: {
    content_strategy: 'none',
    willingness_to_pay: 'yes',
    preferred_features: 'automation',
  },
}

// Test 1: Good post — should PASS
const goodPost: CopywriterOutput = {
  copy: 'איך לגדול ממיליון ל-3 מיליון בשנה',
  content: `כשהתחלתי את העסק שלי, הייתי עושה הכל לבד.

אחרי שנות ניסיון, גיליתי 3 דברים שהחליפו הכל: התמקדות בלקוחות הנכונים, אוטומציה של תהליכים חוזרים, וביצירת מערכת מוכנה להגדל.

כל עסק יכול להכפיל את הרווח שלו בשנה אם יעשה אלה בסדר הנכון.

רוצה לדבר על איך זה עובד בעסק שלך? כתוב לי.`,
  channel_recommended: 'linkedin',
  image_prompt: 'Professional Israeli business owner in modern office',
}

// Test 2: Weak copy (starts with weak opener) — copy should FAIL
const weakCopyPost: CopywriterOutput = {
  copy: 'הידעת שיש דרך טובה יותר לעשות עסקים והמחשבה שלך על זה חשובה',
  content: `הייתי רוצה לדבר איתך על משהו חשוב.

זה באמת משנה הכל כשאתה חושב על זה בצורה נכונה ומבינים את הצורך.`,
  channel_recommended: 'instagram',
  image_prompt: 'Business growth concept',
}

// Test 3: Weak content (single block, no paragraphs) — content should FAIL
const weakContentPost: CopywriterOutput = {
  copy: '3 דברים שהחליפו את העסק שלי',
  content: `זה היה קשה בהתחלה אבל אחרי שהבנתי מה עובד קיבלתי תוצאות טובות וכעת העסק שלי גדל ברמות משמעותיות וכל יום אני עושה משהו טוב להצליח בשוק.`,
  channel_recommended: 'facebook',
  image_prompt: 'Success celebration',
}

async function runTests() {
  console.log('Testing Copywriting Rubric...\n')

  console.log('Test 1: Good post (expected: PASS)')
  const r1 = await evaluateCopywritingQuality(goodPost, businessProfile, 'value')
  console.log(`Result: ${r1.isValid ? '✅ PASS' : '❌ FAIL'}`)
  if (!r1.isValid) console.log(`Feedback: ${r1.feedback}`)
  console.log()

  console.log('Test 2: Weak copy opener (expected: FAIL on copy)')
  const r2 = await evaluateCopywritingQuality(weakCopyPost, businessProfile, 'value')
  console.log(`Result: ${r2.isValid ? '✅ PASS' : '❌ FAIL (expected)'}`)
  console.log(`Fields to regenerate: ${r2.fieldsToRegenerate.join(', ') || 'none'}`)
  console.log(`Feedback:\n${r2.feedback}`)
  console.log()

  console.log('Test 3: Weak content (single block, no paragraphs) (expected: FAIL on content)')
  const r3 = await evaluateCopywritingQuality(weakContentPost, businessProfile, 'value')
  console.log(`Result: ${r3.isValid ? '✅ PASS' : '❌ FAIL (expected)'}`)
  console.log(`Fields to regenerate: ${r3.fieldsToRegenerate.join(', ') || 'none'}`)
  console.log(`Feedback:\n${r3.feedback}`)
  console.log()

  const test1Pass = r1.isValid === true
  const test2Pass = r2.isValid === false && r2.fieldsToRegenerate.includes('copy')
  const test3Pass = r3.isValid === false && r3.fieldsToRegenerate.includes('content')

  console.log('--- Summary ---')
  console.log(`Test 1 (good post passes):      ${test1Pass ? '✅' : '❌'}`)
  console.log(`Test 2 (weak copy flagged):     ${test2Pass ? '✅' : '❌'}`)
  console.log(`Test 3 (weak content flagged):  ${test3Pass ? '✅' : '❌'}`)

  if (!test1Pass || !test2Pass || !test3Pass) {
    console.error('\nSome tests failed. Review rubric logic.')
    Deno.exit(1)
  }
  console.log('\nAll tests passed!')
}

runTests().catch(console.error)
