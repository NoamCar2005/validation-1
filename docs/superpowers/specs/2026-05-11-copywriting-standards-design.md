
# Copywriting Standards & Agent Evaluation System Design

**Date:** 2026-05-11  
**Project:** Validation 1 (Content Generation)  
**Problem:** Generated post titles/copy are too long and lack punchy hook structure. Need systematic copywriting standards applied to all agent outputs.

---

## Goal

Build a modular copywriting evaluation system that enforces five core principles **equally**:
1. Hook strength (curiosity/benefit-driven opening)
2. Brevity & scanability (short, punchy lines)
3. Tone consistency (match business owner's voice)
4. Engagement tactics (questions, specificity, social proof)
5. Clear structure (problem→insight→value flow)

The system should be **iterative and maintainable** — copywriting rules live in one place and can be updated without touching core post generation logic.

---

## Architecture: Two-Layer System

### Current Flow
```
User Input (website URL) 
  ↓
Generate Post (via Gemini API + system prompt)
  ↓
Store in Supabase
  ↓
Display to User
```

### New Flow (Proposed)
```
User Input (website URL)
  ↓
Generate Post (via Gemini API + lightweight system prompt)
  ↓
Evaluate Against Copywriting Rubric
  ├─ If copy is weak → Regenerate copy field only
  ├─ If content lacks engagement/flow → Regenerate content field only
  └─ If both pass → Proceed
  ↓
Store in Supabase
  ↓
Display to User
```

### Key Design Decisions

**Separation of Concerns:**
- **System prompt** = Post type + structure + tone guidance (focused, lean)
- **Copywriting rubric** = Quality evaluation + self-correction logic (modular, iterable)

**Benefits:**
- Copywriting standards live in one place (`copywriting-rubric.ts`)
- Easy to update rules without touching post generation logic
- Agent self-corrects weak copy before returning to frontend
- Tone consistency applied at generation time (system prompt)
- Hook/engagement tactics applied at evaluation time (rubric)

**Agent Behavior:**
- After generating initial post, agent evaluates output against rubric
- If evaluation fails, agent receives feedback and regenerates weak field(s)
- Returns final output only after rubric passes

---

## System Prompt Refactoring

### Current Structure
Currently, system prompts include both post-type guidance AND copywriting constraints (hook rules, brevity, engagement tactics, structure patterns). This makes prompts long and conflates two concerns.

### Refactored Structure
Each system prompt (VALUE_POST, TRUST_POST, CTA_POST) will focus on:
1. **Post Purpose** — what is this post trying to accomplish?
2. **Tone & Voice** — inferred from business website copy
3. **Content Structure** — paragraph count, narrative flow
4. **Word Count Range** — 50-200 words (flexible, agent decides)
5. **Output Format** — valid JSON only

**Copywriting rules are removed from system prompts** and moved to the evaluation rubric.

### Example: Refactored VALUE_POST_SYSTEM_PROMPT

```typescript
export const VALUE_POST_SYSTEM_PROMPT = `You are an expert Hebrew social media copywriter for Israeli business owners.

This is a VALUE post — it shares useful expertise, teaches something valuable, and feels like genuine advice from the owner, not an ad.

Instructions:
- Write entirely in Hebrew (no English words)
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
}`;
```

**Changes from current:**
- Removed detailed hook/engagement/brevity rules
- Removed structure pattern names (problem→solution, etc.)
- Added flexibility on word count ("let context guide")
- Kept tone guidance (critical for consistency)

Same refactoring applies to TRUST_POST and CTA_POST prompts.

---

## Copywriting Rubric: Evaluation Rules

The rubric is a structured set of quality checks applied **after** post generation. It has two parts:

### Part A: Copy (Headline Hook) Evaluation

The `copy` field must function as a **scroll-stopping headline** that makes the reader want to click and read the full post.

**Evaluation Rules (all must pass):**

1. **Strong Opening** — Does it start with curiosity, benefit, or insight?
   - ✅ GOOD: "3 דברים שאני עשיתי בעסקי שהחליפו הכל"
   - ❌ WEAK: "הידעת שיש דרך טובה יותר לעשות עסקים?"
   - ❌ WEAK: "תעודת בחירה לטובים בתחום"

2. **Conciseness** — Is it under 15 words? (One powerful line)
   - ❌ FAIL: "אני רוצה לדבר איתך על משהו חשוב מאד שלמדתי בעסקי שלי על פני עשרות שנים"
   - ✅ PASS: "הדרך הפשוטה להכפיל את הרווח שלך" (8 words)

3. **No Weak Openers** — Avoid generic, filler-heavy phrases:
   - ❌ WEAK: "הידעת ש...", "רציתי להגיד...", "בואו נדבר על...", "הכל מתחיל כשאתה..."
   - ✅ GOOD: Direct, specific, benefit-driven

4. **Active Voice & Specificity** — Use active verbs and concrete details, not vague statements:
   - ❌ WEAK: "דברים חשובים באזור שלנו"
   - ✅ GOOD: "איך לגדול ממיליון ל-3 מיליון בשנה"

5. **Tone Match** — Does copy match the inferred business voice?
   - If business is formal/professional → copy should be professional
   - If business is casual/friendly → copy should be relatable
   - Check against business profile tone

**If any rule fails:** Agent regenerates just the `copy` field and re-evaluates.

### Part B: Content (Full Post) Evaluation

The `content` field is the full narrative — it develops the idea, tells the story, and guides the reader to a natural next step.

**Evaluation Rules (all must pass):**

1. **Strong Opening** — Does the first sentence align with and expand on the copy hook?
   - ❌ WEAK: Restates copy verbatim or opens with unrelated content
   - ✅ GOOD: Copy says "3 דברים שהחליפו הכל" → Content opens "כשהתחלתי את העסק שלי, הייתי עושה הכל לבד..."

2. **Scannable Paragraphs** — Is content broken into short, readable chunks?
   - ❌ WEAK: One solid wall of text
   - ✅ GOOD: 3-4 short paragraphs with clear logical breaks
   - Check: Each paragraph should be 2-4 sentences max

3. **Engagement Tactics** — Does content use 2+ of the following (where natural)?
   - Questions that make reader think
   - Specific numbers/data points (not vague claims)
   - Social proof (what others learned, achieved)
   - Relatability (acknowledgment of reader struggle)
   - Unexpected insight (subverts reader expectation)
   - Action/contrast (before/after, this vs. that)
   - ❌ WEAK: Purely informative, no engagement hooks
   - ✅ GOOD: Mixes teaching with engagement

4. **Logical Flow** — Does content follow clear structure (problem→insight→value)?
   - ❌ WEAK: Ideas jump around or feel disconnected
   - ✅ GOOD: Reader can follow the thinking
   - For VALUE posts: Problem/pain → Solution/insight → How to apply
   - For TRUST posts: Challenge/story → What I learned → Why you can trust me
   - For CTA posts: Pain/opportunity → Why it matters → Clear invitation to next step

5. **Natural Close** — Does post end with a non-pushy next step?
   - ❌ WEAK: Aggressive sales language ("קנה עכשיו!", "אל תפסיד את ההזדמנות!")
   - ❌ WEAK: Abrupt ending with no invitation
   - ✅ GOOD: Natural, helpful close ("כתוב לי ונדבר", "האם זה כמו שאתה מרגיש?", "בואו נדבר על איך זה עובד אצלך")

**If 2+ rules fail:** Agent regenerates just the `content` field and re-evaluates.  
**If 1 rule fails:** Agent can attempt to fix or regenerate, your call in implementation.

---

## Implementation Structure

### File Changes

**New file: `supabase/functions/_shared/copywriting-rubric.ts`**
- Export function `evaluateCopywritingQuality(postOutput: CopywriterOutput, businessProfile: BusinessProfile, postType: PostType): { isValid: boolean; feedback: string; fieldsToRegenerate: ('copy' | 'content')[] }`
- Implements evaluation rules from rubric above
- Returns feedback + list of fields to regenerate

**Modified file: `supabase/functions/_shared/generate-post.ts`**
- Import copywriting rubric
- Modify `generatePostCopy()` to include evaluation + regeneration loop
- If rubric fails, regenerate weak field(s) and re-evaluate
- Only return post after rubric passes (with max 2 regeneration attempts)

**Modified file: `supabase/functions/_shared/pipeline.ts`** (if needed)
- No changes to high-level orchestration, unless regeneration loop needs coordination

**Modified files: System prompts in `generate-post.ts`**
- Refactor VALUE_POST_SYSTEM_PROMPT, TRUST_POST_SYSTEM_PROMPT, CTA_POST_SYSTEM_PROMPT
- Remove copywriting-specific rules, keep post-type guidance + tone

---

## Tone & Voice Integration

**Current assumption:** Business tone/voice is inferred from website copy during the scrape/plan phase and passed to post generation.

**With this design:** Tone guidance stays in the system prompt (lightweight instruction to "match the tone"), and the rubric evaluates tone consistency in the copy field.

**If tone inference becomes weak:** This design allows updating just the tone-matching rule in the rubric without touching generation logic.

---

## Success Criteria

1. ✅ Generated `copy` fields are punchy, under 15 words, and curiosity/benefit-driven
2. ✅ Generated `content` is scannable, engaging, and logically structured
3. ✅ Tone consistency across all three post types (value, trust, CTA)
4. ✅ System prompts are lighter and easier to maintain
5. ✅ Copywriting rules live in one place and can be updated independently
6. ✅ Manual review shows "better copy" — more professional, more engaging, less generic

---

## Known Unknowns / Future Iterations

- **Hebrew-specific tactics:** The rubric could be enhanced with Hebrew-language power words or idioms if specific patterns emerge
- **Platform-specific copy:** Currently rubric is platform-agnostic. Could add Instagram/LinkedIn/Facebook-specific rules if needed
- **Regeneration limit:** Currently designed for max 2 regeneration attempts. May need tuning based on actual behavior
- **Evaluation speed:** Evaluation adds a second LLM call. Monitor if this impacts generation speed vs. quality gain trade-off

---

## Scope & Constraints

- **In scope:** Copywriting quality for all three post types (value, trust, CTA)
- **Not in scope:** Image generation, post scheduling, multi-language support
- **Language:** Hebrew only (all rules written for Hebrew social media norms)
- **Tone:** Inferred from existing business copy (not asked explicitly)
- **Flexibility:** Word count 50-200 range, agent decides based on context

---

## Questions Resolved

1. **Character limits:** Flexible (50-200) based on context, agent decides ✅
2. **Copywriting principles:** All five weighted equally (hook, brevity, tone, engagement, structure) ✅
3. **Tone application:** Consistent across all post types, post type drives structure ✅
4. **Copy vs. content:** Copy = headline hook, content = full narrative ✅
5. **Measurement:** Qualitative review + better system foundation ✅

---

**Status:** Ready for implementation planning  
**Next Step:** Invoke writing-plans skill to create detailed task breakdown
