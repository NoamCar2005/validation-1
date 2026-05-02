export type QuestionType = 'select' | 'text'

export interface SurveyQuestion {
  key: string
  label: string
  type: QuestionType
  options?: string[]
  required: boolean
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'business_type',
    label: 'מה סוג העסק שלך?',
    type: 'select',
    options: ['מאמן / מנטור', 'יועץ עסקי', 'פרילנסר', 'סוכנות', 'SaaS / טכנולוגיה', 'אחר'],
    required: true,
  },
  {
    key: 'target_audience',
    label: 'מי הלקוח האידיאלי שלך?',
    type: 'text',
    required: true,
  },
  {
    key: 'main_service',
    label: 'מה השירות / המוצר העיקרי שלך?',
    type: 'text',
    required: true,
  },
  {
    key: 'content_frequency',
    label: 'כמה פעמים בשבוע אתה מפרסם תוכן?',
    type: 'select',
    options: ['בכלל לא', 'פעם בשבוע', '2-3 פעמים', 'כמעט כל יום'],
    required: true,
  },
  {
    key: 'content_pain',
    label: 'מה הכי קשה לך בייצור תוכן?',
    type: 'select',
    options: ['חוסר זמן', 'לא יודע מה לכתוב', 'קושי לנסח', 'עקביות', 'הכל'],
    required: true,
  },
  {
    key: 'main_platform',
    label: 'באיזה פלטפורמה אתה הכי פעיל?',
    type: 'select',
    options: ['אינסטגרם', 'לינקדאין', 'פייסבוק', 'טיקטוק', 'מספר פלטפורמות'],
    required: true,
  },
  {
    key: 'tone_preference',
    label: 'איך היית מתאר את הסגנון שלך?',
    type: 'select',
    options: ['מקצועי ורציני', 'חם ואישי', 'הומוריסטי', 'מעורר השראה', 'ישיר ועניני'],
    required: true,
  },
]
