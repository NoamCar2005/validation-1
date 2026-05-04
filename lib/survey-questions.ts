export type QuestionType = 'select' | 'select-multi' | 'text' | 'radio'

export interface SurveyQuestion {
  key: string
  label: string
  type: QuestionType
  options?: string[]
  required: boolean
  block: string
  blockDescription?: string
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // בלוק 1 — על העסק
  {
    key: 'q1_business_type',
    label: 'באיזה תחום העסק שלך?',
    type: 'select',
    options: ['שירות מקצועי', 'פרילנסר', 'סוכנות שיווק', 'SaaS', 'אי-קומרס', 'אחר'],
    required: true,
    block: '1',
    blockDescription: 'כדי שהפוסטים יהיו מדויקים לך',
  },
  {
    key: 'q2_ideal_customer',
    label: 'מי הלקוח האידיאלי שלך?',
    type: 'text',
    required: true,
    block: '1',
  },
  {
    key: 'q3_main_message',
    label: 'מה המסר הכי חשוב שאתה רוצה להעביר ללקוחות?',
    type: 'text',
    required: true,
    block: '1',
  },

  // בלוק 2 — על התוכן הנוכחי
  {
    key: 'q4_active_platforms',
    label: 'באיזה פלטפורמות אתה פעיל?',
    type: 'select-multi',
    options: ['אינסטגרם', 'לינקדאין', 'פייסבוק', 'יוטיוב', 'וואטסאפ', 'לא פעיל'],
    required: true,
    block: '2',
    blockDescription: 'כדי שנבין מאיפה להתחיל',
  },
  {
    key: 'q5_posting_frequency',
    label: 'כמה פעמים בשבוע אתה מפרסם בממוצע?',
    type: 'radio',
    options: ['כמעט אף פעם', 'פעם בשבוע', '2-3 פעמים', 'כל יום'],
    required: true,
    block: '2',
  },
  {
    key: 'q6_time_spent',
    label: 'כמה זמן אתה מוציא על תוכן שיווקי בשבוע?',
    type: 'radio',
    options: ['פחות משעה', '1-3 שעות', '3-6 שעות', 'יותר מ-6 שעות'],
    required: true,
    block: '2',
  },

  // בלוק 3 — הכאב האמיתי (MOM Test)
  {
    key: 'q7_blocking_factors',
    label: 'מה הכי עוצר אותך מלפרסם בקביעות?',
    type: 'select-multi',
    options: ['אין זמן', 'לא יודע מה לכתוב', 'לא מרגיש שזה מספיק טוב', 'לא רואה תוצאות', 'אחר'],
    required: true,
    block: '3',
  },
  {
    key: 'q8_post_effectiveness',
    label: 'האם הפוסטים שלך מצליחים להשיג את התוצאות שאתה רוצה?',
    type: 'radio',
    options: ['כן תמיד', 'לפעמים', 'כמעט אף פעם', 'לא עוקב'],
    required: true,
    block: '3',
  },

  // בלוק 4 — ולידציה כלכלית
  {
    key: 'q9_current_spending',
    label: 'כמה כסף אתה מוציא היום על כלי שיווק / תוכן בחודש?',
    type: 'radio',
    options: ['כלום', 'עד ₪200', '₪200-500', 'מעל ₪500'],
    required: true,
    block: '4',
  },
  {
    key: 'q10_content_priority',
    label: 'מה הכי חשוב לך שהתוכן השיווקי שלך יעשה?',
    type: 'select',
    options: ['ימשוך לקוחות חדשים', 'יבנה אמון ומוניטין', 'יחסוך לי זמן', 'יגרום לי להיראות מקצועי / אחר'],
    required: true,
    block: '4',
  },
]
