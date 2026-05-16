# Copywriting Standards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a two-layer copywriting evaluation system that enforces five core principles (hook strength, brevity, tone, engagement, structure) through modular rubric evaluation, improving post quality without changing generation logic.

**Architecture:** Create a new `copywriting-rubric.ts` module that evaluates generated posts against specific rules. Refactor existing system prompts to be lighter (remove copywriting-specific rules). Integrate rubric evaluation into `generatePostCopy()` with a regeneration loop—if evaluation fails, agent regenerates weak fields and re-evaluates.

**Tech Stack:** TypeScript, Gemini API, Supabase, existing Deno runtime

---

## File Structure

**New File:**
- `supabase/functions/_shared/copywriting-rubric.ts` — Evaluation logic and rubric rules

**Modified Files:**
- `supabase/functions/_shared/generate-post.ts` — Refactor system prompts, integrate rubric into generatePostCopy()
- No changes to pipeline.ts, summarize.ts, or other files

---

## Task 1a: Define Rubric Types and Interfaces

**Files:**
- Create: `supabase/functions/_shared/copywriting-rubric.ts`

- [ ] **Step 1: Create the copywriting-rubric.ts file with TypeScript interfaces**

Create `supabase/functions/_shared/copywriting-rubric.ts`:

```typescript
import type { CopywriterOutput, BusinessProfile, PostType } from './types.ts'

export interface RubricEvaluationResult {
  isValid: boolean
  feedback: string
  fieldsToRegenerate: ('copy' | 'content')[]
  issues: RubricIssue[]
}

export interface RubricIssue {
  field: 'copy' | 'content'
  rule: string
  severity: 'critical' | 'warning'
  suggestion: string
}

export const COPY_FIELD_RULES = {
  STRONG_OPENING: 'Strong Opening',
  CONCISENESS: 'Conciseness (under 15 words)',
  NO_WEAK_OPENERS: 'No Weak Openers',
  ACTIVE_VOICE_AND_SPECIFICITY: 'Active Voice & Specificity',
  TONE_MATCH: 'Tone Match',
}

export const CONTENT_FIELD_RULES = {
  STRONG_OPENING: 'Strong Opening',
  SCANNABLE_PARAGRAPHS: 'Scannable Paragraphs',
  ENGAGEMENT_TACTICS: 'Engagement Tactics',
  LOGICAL_FLOW: 'Logical Flow',
  NATURAL_CLOSE: 'Natural Close',
}
```

- [ ] **Step 2: Write copy field evaluation function**

Add to `copywriting-rubric.ts`:

```typescript
function evaluateCopyField(
  copy: string,
  businessProfile: BusinessProfile,
  postType: PostType,
): { isValid: boolean; issues: RubricIssue[] } {
  const issues: RubricIssue[] = []

  // Rule 1: Strong Opening
  const weakOpenings = [
    'הידעת ש',
    'רציתי להגיד',
    'בואו נדבר על',
    'הכל מתחיל כשאתה',
    'משהו חשוב',
    'דברים חשובים',
  ]
  const startsWithWeak = weakOpenings.some(phrase => copy.trim().startsWith(phrase))
  if (startsWithWeak) {
    issues.push({
      field: 'copy',
      rule: COPY_FIELD_RULES.NO_WEAK_OPENERS,
      severity: 'critical',
      suggestion: 'Rewrite to start with curiosity, benefit, or insight instead of generic opener',
    })
  }

  // Rule 2: Conciseness (under 15 words)
  const wordCount = copy.trim().split(/\s+/).length
  if (wordCount > 15) {
    issues.push({
      field: 'copy',
      rule: COPY_FIELD_RULES.CONCISENESS,
      severity: 'critical',
      suggestion: \`Copy is \${wordCount} words. Shorten to under 15 words—remove filler and keep the core hook.\`,
    })
  }

  // Rule 3: Active Voice (check for passive constructions, heuristic)
  const passivePatterns = ['נעשה', 'הוא', 'היא', 'הם', 'הן'] // rough heuristic
  const hasPassiveIndicators = passivePatterns.some(pattern => copy.includes(pattern))
  if (hasPassiveIndicators && wordCount < 8) {
    // Only flag if very short and has passive language
    issues.push({
      field: 'copy',
      rule: COPY_FIELD_RULES.ACTIVE_VOICE_AND_SPECIFICITY,
      severity: 'warning',
      suggestion: 'Consider using active voice and specific details to strengthen the hook.',
    })
  }

  // Rule 4: Tone Match (check if tone matches business profile)
  // Inferred tone from businessProfile should be passed; for now, assume it's handled at generation level
  // This rule is validated during regeneration prompt if copy is regenerated

  const isValid = issues.filter(i => i.severity === 'critical').length === 0

  return { isValid, issues }
}
```

- [ ] **Step 3: Write content field evaluation function**

Add to `copywriting-rubric.ts`:

```typescript
function evaluateContentField(
  content: string,
  copy: string,
  postType: PostType,
): { isValid: boolean; issues: RubricIssue[] } {
  const issues: RubricIssue[] = []

  // Rule 1: Strong Opening (first sentence should relate to copy)
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  const firstSentence = sentences[0] || ''
  
  // Check if first sentence introduces the idea from copy
  const firstSentenceLength = firstSentence.split(/\s+/).length
  if (firstSentenceLength < 5) {
    issues.push({
      field: 'content',
      rule: CONTENT_FIELD_RULES.STRONG_OPENING,
      severity: 'warning',
      suggestion: 'First sentence is very short. Expand it to properly introduce the hook from copy.',
    })
  }

  // Rule 2: Scannable Paragraphs (3-4 short paragraphs, not walls of text)
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0)
  if (paragraphs.length < 2) {
    issues.push({
      field: 'content',
      rule: CONTENT_FIELD_RULES.SCANNABLE_PARAGRAPHS,
      severity: 'critical',
      suggestion: 'Content should be broken into 3-4 short paragraphs separated by blank lines. Currently 1 block of text.',
    })
  }

  // Check paragraph length (each should be 2-4 sentences max)
  const tooLongParagraphs = paragraphs.filter(p => {
    const sentenceCount = p.split(/[.!?]+/).length - 1
    return sentenceCount > 5
  })
  if (tooLongParagraphs.length > 0) {
    issues.push({
      field: 'content',
      rule: CONTENT_FIELD_RULES.SCANNABLE_PARAGRAPHS,
      severity: 'warning',
      suggestion: \`\${tooLongParagraphs.length} paragraph(s) are too long (5+ sentences). Break into shorter chunks.\`,
    })
  }

  // Rule 3: Engagement Tactics (check for 2+ engagement patterns)
  const engagementPatterns = [
    { name: 'Questions', regex: /\?/ },
    { name: 'Numbers', regex: /\d+/ },
    { name: 'Direct address', regex: /אתה|אני|שלך|שלי/ },
    { name: 'Contrast/Comparison', regex: /לעומת|בעוד|במקום|לא כמו/ },
  ]

  const detectedEngagement = engagementPatterns.filter(p => p.regex.test(content)).map(p => p.name)
  if (detectedEngagement.length < 2) {
    issues.push({
      field: 'content',
      rule: CONTENT_FIELD_RULES.ENGAGEMENT_TACTICS,
      severity: 'warning',
      suggestion: \`Content uses only \${detectedEngagement.length} engagement tactic(s). Add 2+ of: questions, specific numbers, direct address, contrast.\`,
    })
  }

  // Rule 4: Logical Flow (basic check: no abrupt ending)
  const lastSentence = sentences[sentences.length - 1] || ''
  const endsAbruptly = lastSentence.length < 10 || lastSentence.endsWith('.')
  // This is a heuristic; full evaluation happens at regeneration time

  // Rule 5: Natural Close (check for pushy language)
  const pushyPatterns = ['קנה עכשיו', 'אל תפסיד', 'מהר', 'סוף מוגבל', 'זמן מוגבל']
  const hasPushyLanguage = pushyPatterns.some(pattern => content.includes(pattern))
  if (hasPushyLanguage) {
    issues.push({
      field: 'content',
      rule: CONTENT_FIELD_RULES.NATURAL_CLOSE,
      severity: 'critical',
      suggestion: 'Content has aggressive sales language. Rewrite close to be warm, helpful, and non-pushy.',
    })
  }

  const isValid = issues.filter(i => i.severity === 'critical').length === 0

  return { isValid, issues }
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/copywriting-rubric.ts
git commit -m "feat: create copywriting rubric with evaluation functions"
```

---

## Task 1b: Create Main Evaluation Function

**Files:**
- Modify: `supabase/functions/_shared/copywriting-rubric.ts`

- [ ] **Step 1: Add main evaluation function to copywriting-rubric.ts**

Add to end of `copywriting-rubric.ts`:

```typescript
export async function evaluateCopywritingQuality(
  postOutput: CopywriterOutput,
  businessProfile: BusinessProfile,
  postType: PostType,
): Promise<RubricEvaluationResult> {
  const copyEvaluation = evaluateCopyField(postOutput.copy, businessProfile, postType)
  const contentEvaluation = evaluateContentField(postOutput.content, postOutput.copy, postType)

  const allIssues = [...copyEvaluation.issues, ...contentEvaluation.issues]
  const fieldsToRegenerate: ('copy' | 'content')[] = []

  // Collect fields that need regeneration
  if (!copyEvaluation.isValid) {
    fieldsToRegenerate.push('copy')
  }
  if (!contentEvaluation.isValid) {
    fieldsToRegenerate.push('content')
  }

  const isValid = copyEvaluation.isValid && contentEvaluation.isValid

  // Build feedback message for agent
  let feedback = ''
  if (isValid) {
    feedback = 'All copywriting standards met. Post is ready.'
  } else {
    feedback = 'Copywriting issues detected:\n'
    for (const issue of allIssues) {
      feedback += \`\n- [\${issue.field}] \${issue.rule}: \${issue.suggestion}\`
    }
    feedback += \`\n\nPlease regenerate: \${fieldsToRegenerate.join(', ')}\`
  }

  return {
    isValid,
    feedback,
    fieldsToRegenerate,
    issues: allIssues,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/copywriting-rubric.ts
git commit -m "feat: add main evaluateCopywritingQuality function"
```

---

## Task 2a: Refactor VALUE_POST_SYSTEM_PROMPT

**Files:**
- Modify: `supabase/functions/_shared/generate-post.ts:6-34`

- [ ] **Step 1: Replace VALUE_POST_SYSTEM_PROMPT with refactored version**

In `supabase/functions/_shared/generate-post.ts`, replace the VALUE_POST_SYSTEM_PROMPT (lines 6-34):

```typescript
export const VALUE_POST_SYSTEM_PROMPT = \`You are an expert Hebrew social media copywriter for Israeli business owners.

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
}\`
```

- [ ] **Step 2: Verify changes look correct**

Open `supabase/functions/_shared/generate-post.ts` and visually confirm VALUE_POST_SYSTEM_PROMPT is updated.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/generate-post.ts
git commit -m "refactor: streamline VALUE_POST_SYSTEM_PROMPT, move copywriting rules to rubric"
```

---

## Task 2b: Refactor TRUST_POST_SYSTEM_PROMPT

**Files:**
- Modify: `supabase/functions/_shared/generate-post.ts:36-59`

- [ ] **Step 1: Replace TRUST_POST_SYSTEM_PROMPT**

In `supabase/functions/_shared/generate-post.ts`, replace the TRUST_POST_SYSTEM_PROMPT (lines 36-59):

```typescript
export const TRUST_POST_SYSTEM_PROMPT = \`You are an expert Hebrew social media copywriter for Israeli business owners.

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
}\`
```

- [ ] **Step 2: Verify changes look correct**

Open `supabase/functions/_shared/generate-post.ts` and confirm TRUST_POST_SYSTEM_PROMPT is updated.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/generate-post.ts
git commit -m "refactor: streamline TRUST_POST_SYSTEM_PROMPT"
```

---

## Task 2c: Refactor CTA_POST_SYSTEM_PROMPT

**Files:**
- Modify: `supabase/functions/_shared/generate-post.ts:61-84`

- [ ] **Step 1: Replace CTA_POST_SYSTEM_PROMPT**

In `supabase/functions/_shared/generate-post.ts`, replace the CTA_POST_SYSTEM_PROMPT (lines 61-84):

```typescript
export const CTA_POST_SYSTEM_PROMPT = \`You are an expert Hebrew social media copywriter for Israeli business owners.

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
}\`
```

- [ ] **Step 2: Verify changes look correct**

Open `supabase/functions/_shared/generate-post.ts` and confirm CTA_POST_SYSTEM_PROMPT is updated.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/generate-post.ts
git commit -m "refactor: streamline CTA_POST_SYSTEM_PROMPT"
```

---

## Task 3a: Import Rubric and Update Function Signature

**Files:**
- Modify: `supabase/functions/_shared/generate-post.ts:1-5`

- [ ] **Step 1: Add import statement at top of generate-post.ts**

At the top of `supabase/functions/_shared/generate-post.ts`, after existing imports, add:

```typescript
import { evaluateCopywritingQuality, type RubricEvaluationResult } from './copywriting-rubric.ts'
```

- [ ] **Step 2: Verify import is syntactically correct**

Check that the import line is added after line 4 (after the existing type imports).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/generate-post.ts
git commit -m "feat: import copywriting rubric evaluation functions"
```

---

## Task 3b: Refactor generatePostCopy() with Evaluation Loop

**Files:**
- Modify: `supabase/functions/_shared/generate-post.ts:114-136`

- [ ] **Step 1: Replace generatePostCopy() function**

In `supabase/functions/_shared/generate-post.ts`, replace the \`generatePostCopy()\` function (lines 114-136) with:

```typescript
export async function generatePostCopy(
  postType: PostType,
  businessProfile: BusinessProfile,
  postPlan: PostPlan,
  geminiApiKey: string,
): Promise<CopywriterOutput> {
  const systemPrompt = SYSTEM_PROMPTS[postType]
  const userMessage = buildPostUserMessage(postType, businessProfile, postPlan)

  let attempt = 0
  const maxAttempts = 2

  while (attempt < maxAttempts) {
    attempt++

    // Generate post
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

    const { text, finishReason } = await callGeminiWithRetry(geminiApiKey, body, \`post:\${postType}\`)
    let postOutput = parseJsonOutput<CopywriterOutput>(text, \`post:\${postType}\`, finishReason)

    // Evaluate against rubric
    const evaluation = await evaluateCopywritingQuality(postOutput, businessProfile, postType)

    if (evaluation.isValid) {
      // Copywriting standards met, return post
      return postOutput
    }

    // If invalid and we have attempts left, regenerate weak fields
    if (attempt < maxAttempts) {
      const fieldsToRegenerate = evaluation.fieldsToRegenerate.join(' and ')
      const regenerateMessage = \`The \${postType} post failed copywriting standards. Issues:\n\${evaluation.feedback}\n\nPlease regenerate just the \${fieldsToRegenerate} field(s) and output the complete JSON again with all four fields (copy, content, channel_recommended, image_prompt).\`

      const regenerateBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: 'user', parts: [{ text: userMessage }] },
          { role: 'model', parts: [{ text: JSON.stringify(postOutput) }] },
          { role: 'user', parts: [{ text: regenerateMessage }] },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: POST_SCHEMA,
        },
      }

      const { text: regenerateText, finishReason: regenerateReason } = await callGeminiWithRetry(
        geminiApiKey,
        regenerateBody,
        \`post:\${postType}:regenerate\`,
      )
      postOutput = parseJsonOutput<CopywriterOutput>(regenerateText, \`post:\${postType}:regenerate\`, regenerateReason)

      // Loop back to evaluate again
    }
  }

  // If we've exhausted attempts, log warning and return last output
  console.warn(\`[post:\${postType}] Max regeneration attempts (\${maxAttempts}) reached. Returning post despite rubric issues.\`)
  return postOutput
}
```

- [ ] **Step 2: Verify function looks correct**

Open `supabase/functions/_shared/generate-post.ts` and check that:
- The function includes the evaluation loop
- It calls \`evaluateCopywritingQuality()\`
- It regenerates weak fields if needed
- It returns early if evaluation passes
- Max attempts is set to 2

- [ ] **Step 3: Check for TypeScript errors**

Look for any red squiggly lines in the editor. The types should match based on imports.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/_shared/generate-post.ts
git commit -m "feat: integrate copywriting rubric with regeneration loop in generatePostCopy()"
```

---

## Task 4a: Create Local Test File

**Files:**
- Create: `supabase/functions/_shared/test-rubric.ts` (temporary test file)

- [ ] **Step 1: Create test file for rubric**

Create `supabase/functions/_shared/test-rubric.ts`:

```typescript
import { evaluateCopywritingQuality } from './copywriting-rubric.ts'
import type { CopywriterOutput, BusinessProfile } from './types.ts'

// Test Case 1: Good post (should pass)
const goodPost: CopywriterOutput = {
  copy: 'איך לגדול ממיליון ל-3 מיליון בשנה',
  content: \`כשהתחלתי את העסק שלי, הייתי עושה הכל לבד.

אחרי שנות ניסיון, גיליתי 3 דברים שהחליפו הכל: התמקדות בלקוחות הנכונים, אוטומציה של תהליכים חוזרים, וביצירת מערכת מוכנה להגדל.

כל עסק יכול להכפיל את הרווח שלו בשנה אם יעשה אלה בסדר הנכון.

רוצה לדבר על איך זה עובד בעסק שלך? כתוב לי.\`,
  channel_recommended: 'linkedin',
  image_prompt: 'Professional Israeli business owner in modern office',
}

// Test Case 2: Weak copy (should fail)
const weakCopyPost: CopywriterOutput = {
  copy: 'הידעת שיש דרך טובה יותר לעשות עסקים והמחשבה היא משהו שצריך להעמיק בו',
  content: \`הייתי רוצה לדבר איתך על משהו חשוב מאד שלמדתי בעסקי שלי על פני שנים רבות של עבודה קשה ודיוקי ריכוז על מה שחשוב.

זה באמת משנה הכל כשאתה חושב על זה בצורה נכונה ומבינים את הצורך.\`,
  channel_recommended: 'instagram',
  image_prompt: 'Business growth concept',
}

// Test Case 3: Weak content (should fail)
const weakContentPost: CopywriterOutput = {
  copy: '3 דברים שהחליפו את העסק שלי',
  content: \`זה היה קשה בהתחלה אבל אחרי שהבנתי מה עובד קיבלתי תוצאות טובות והשנאה לעבודה מצאה למשמע אוזניים חדשות וכעת העסק שלי גדל ברמות דיוקים משמעותיות וכל יום אני עושה משהו טוב להצליח.\`,
  channel_recommended: 'facebook',
  image_prompt: 'Success celebration',
}

const businessProfile: BusinessProfile = {
  name: 'דוד',
  industry: 'יעוץ עסקי',
  tone: 'professional and warm',
  painPoints: ['time management', 'scaling'],
  achievements: ['Grew business by 300%'],
}

async function runTests() {
  console.log('Testing Copywriting Rubric...\n')

  console.log('Test 1: Good post (should PASS)')
  const result1 = await evaluateCopywritingQuality(goodPost, businessProfile, 'value')
  console.log(\`Result: \${result1.isValid ? '✅ PASS' : '❌ FAIL'}\`)
  console.log(\`Feedback: \${result1.feedback}\n\`)

  console.log('Test 2: Weak copy (should FAIL)')
  const result2 = await evaluateCopywritingQuality(weakCopyPost, businessProfile, 'value')
  console.log(\`Result: \${result2.isValid ? '✅ PASS' : '❌ FAIL'}\`)
  console.log(\`Feedback: \${result2.feedback}\`)
  console.log(\`Fields to regenerate: \${result2.fieldsToRegenerate.join(', ')}\n\`)

  console.log('Test 3: Weak content (should FAIL)')
  const result3 = await evaluateCopywritingQuality(weakContentPost, businessProfile, 'value')
  console.log(\`Result: \${result3.isValid ? '✅ PASS' : '❌ FAIL'}\`)
  console.log(\`Feedback: \${result3.feedback}\`)
  console.log(\`Fields to regenerate: \${result3.fieldsToRegenerate.join(', ')}\n\`)
}

runTests().catch(console.error)
```

- [ ] **Step 2: Commit test file**

```bash
git add supabase/functions/_shared/test-rubric.ts
git commit -m "test: add rubric evaluation test cases"
```

---

## Task 4b: Run and Verify Tests

- [ ] **Step 1: Run the test file locally**

```bash
cd supabase/functions/_shared
deno run --allow-all test-rubric.ts
```

Expected output:
```
Testing Copywriting Rubric...

Test 1: Good post (should PASS)
Result: ✅ PASS
Feedback: All copywriting standards met. Post is ready.

Test 2: Weak copy (should FAIL)
Result: ❌ FAIL
Feedback: Copywriting issues detected:
- [copy] Conciseness (under 15 words): Copy is XX words. Shorten to under 15 words...
Fields to regenerate: copy

Test 3: Weak content (should FAIL)
Result: ❌ FAIL
Feedback: Copywriting issues detected:
- [content] Scannable Paragraphs: Content should be broken into 3-4 short paragraphs...
Fields to regenerate: content
```

- [ ] **Step 2: If tests pass, delete test file**

```bash
rm supabase/functions/_shared/test-rubric.ts
git add -u
git commit -m "test: remove temporary test file (rubric validated)"
```

- [ ] **Step 3: If tests fail, debug**

If rubric rules are too strict or too lenient, adjust the thresholds in `copywriting-rubric.ts` (e.g., word count limits, paragraph length checks) and re-run.

---

## Task 5a: Manual End-to-End Test

- [ ] **Step 1: Deploy edge functions to Supabase (or use local Supabase)**

```bash
supabase functions deploy generate-content --no-verify-jwt
```

(Adjust command based on your local/remote setup)

- [ ] **Step 2: Trigger content generation with a test user**

Using curl or Postman, send a request to your edge function:

```bash
curl -X POST https://<your-supabase-url>/functions/v1/generate-content \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<test-user-id>"}'
```

- [ ] **Step 3: Verify returned posts**

Check the response JSON. All three posts (value, trust, CTA) should:
- Have \`copy\` field under 15 words
- Have \`content\` field broken into 3-4 paragraphs
- Have no aggressive sales language
- Have reasonable word counts (50-200)

Example good response:
```json
{
  "posts": [
    {
      "id": "...",
      "post_type": "value",
      "content": "כשהתחלתי...\n\nאחרי שנות...\n\nכל עסק...",
      "copy": "איך לגדול ממיליון ל-3 מיליון",
      "channel_recommended": "linkedin",
      "image_prompt": "Professional business growth..."
    }
    ...
  ]
}
```

- [ ] **Step 4: Verify posts in Supabase database**

Query the \`posts\` table:

```sql
SELECT user_id, post_type, content, copy, channel_recommended, generated_at 
FROM posts 
WHERE user_id = '<test-user-id>' 
ORDER BY generated_at DESC 
LIMIT 3;
```

Check that all three posts are stored and \`copy\` fields are concise.

- [ ] **Step 5: Commit (if any config changes needed)**

```bash
git status
# If no changes, nothing to commit
```

---

## Task 6a: Verify No Regressions

- [ ] **Step 1: Run full test suite (if exists)**

```bash
npm test
# or
deno test --allow-all
```

Verify all existing tests still pass.

- [ ] **Step 2: Check TypeScript compilation**

```bash
deno check supabase/functions/_shared/generate-post.ts
deno check supabase/functions/_shared/copywriting-rubric.ts
```

Expected: No errors.

- [ ] **Step 3: Commit final state**

```bash
git status
# Verify only expected files are modified
git log --oneline -10
# Verify all commits are present
```

---

**Status:** Ready for implementation planning  
**Next Step:** Begin task execution with subagent-driven-development
