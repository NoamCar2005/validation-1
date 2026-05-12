import type { CopywriterOutput } from './generate-post.ts'
import type { BusinessProfile, PostType } from './types.ts'

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

export function evaluateCopyField(
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
      suggestion: `Copy is ${wordCount} words. Shorten to under 15 words—remove filler and keep the core hook.`,
    })
  }

  // Rule 3: Active Voice (check for passive constructions, heuristic)
  const passivePatterns = ['נעשה', 'הוא', 'היא', 'הם', 'הן'] // rough heuristic
  const hasPassiveIndicators = passivePatterns.some(pattern => copy.includes(pattern))
  if (hasPassiveIndicators) {
    issues.push({
      field: 'copy',
      rule: COPY_FIELD_RULES.ACTIVE_VOICE_AND_SPECIFICITY,
      severity: 'warning',
      suggestion: 'Use active voice and specific details to strengthen the hook. Avoid passive constructions.',
    })
  }

  // Rule 4: Tone Match (check if tone matches business profile)
  // Inferred tone from businessProfile should be passed; for now, assume it's handled at generation level
  // This rule is validated during regeneration prompt if copy is regenerated

  const isValid = issues.filter(i => i.severity === 'critical').length === 0

  return { isValid, issues }
}

export function evaluateContentField(
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
      suggestion: `${tooLongParagraphs.length} paragraph(s) are too long (5+ sentences). Break into shorter chunks.`,
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
      suggestion: `Content uses only ${detectedEngagement.length} engagement tactic(s). Add 2+ of: questions, specific numbers, direct address, contrast.`,
    })
  }

  // Rule 4: Logical Flow is validated during regeneration prompt when issues occur
  // No heuristic check needed here

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
      feedback += `\n- [${issue.field}] ${issue.rule}: ${issue.suggestion}`
    }
    feedback += `\n\nPlease regenerate: ${fieldsToRegenerate.join(', ')}`
  }

  return {
    isValid,
    feedback,
    fieldsToRegenerate,
    issues: allIssues,
  }
}
