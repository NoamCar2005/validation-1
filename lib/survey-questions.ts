export type QuestionType = 'select' | 'select-multi' | 'text' | 'radio'

export interface SurveyQuestion {
  key: string
  label: string
  type: QuestionType
  options?: string[]
  required: boolean
  block: string
  blockTitle: string
  blockDescription?: string
  explanation: string
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'q1_business_type',
    label: 'באיזה תחום העסק שלך?',
    type: 'select',
    options: ['שירות מקצועי', 'פרילנסר', 'סוכנות שיווק', 'SaaS', 'אי-קומרס', 'אחר'],
    required: true,
    block: '1',
    blockTitle: 'קצת עליך',
    blockDescription: 'כדי שהפוסטים יהיו מדויקים לך',
    explanation: "כל סוג עסק מדבר אחרת לקהל שלו, כך גם התוכן שלו.",
  },
  {
    key: 'q2_ideal_customer',
    label: 'מי הלקוח האידיאלי שלך?',
    type: 'text',
    required: true,
    block: '1',
    blockTitle: 'קצת עליך',
    explanation: 'ככך שתתאר את הלקוח בצורה ממוקדת יותר, כך התוכן יהיה ממוקד יותר ויפגע בידיוק.',
  },
  {
    key: 'q3_main_message',
    label: 'מה המסר הכי חשוב שאתה רוצה להעביר ללקוחות?',
    type: 'text',
    required: true,
    block: '1',
    blockTitle: 'קצת עליך',
    explanation: 'זה ה-"למה אני?" שלך. מה שגורם ללקוח לבחור בך ולא במתחרים.',
  },
  {
    key: 'q4_active_platforms',
    label: 'באיזה פלטפורמות אתה פעיל?',
    type: 'select-multi',
    options: ['אינסטגרם', 'לינקדאין', 'פייסבוק', 'יוטיוב', 'וואטסאפ', 'לא פעיל'],
    required: true,
    block: '2',
    blockTitle: 'פרסום ברשתות',
    blockDescription: 'כדי שנבין מאיפה להתחיל',
    explanation: 'כל פלטפורמה דורשת שפה שונה. ניצור תוכן שמתאים בדיוק לאן שאתה נמצא.',
  },
  {
    key: 'q5_posting_frequency',
    label: 'כמה פעמים בשבוע אתה מפרסם בממוצע?',
    type: 'radio',
    options: ['כמעט אף פעם', 'פעם בשבוע', '2-3 פעמים', 'כל יום'],
    required: true,
    block: '2',
    blockTitle: 'פרסום ברשתות',
    explanation: 'לא שואלים כדי לשפוט - שואלים כדי להבין מה "הרבה" בשבילך. מי שמפרסם פעם בשבוע צריך תוכן שונה ממי שמפרסם כל יום.',
  },
  {
    key: 'q6_time_spent',
    label: 'כמה זמן אתה מוציא על תוכן שיווקי בשבוע?',
    type: 'radio',
    options: ['פחות משעה', '1-3 שעות', '3-6 שעות', 'יותר מ-6 שעות'],
    required: true,
    block: '2',
    blockTitle: 'פרסום ברשתות',
    explanation: 'זמן הוא המשאב הכי יקר שלך. נדע כמה להקל עליך - ונראה לך בדיוק כמה שעות אנחנו חוסכים לך כל שבוע.',
  },
  {
    key: 'q7_blocking_factors',
    label: 'מה הכי עוצר אותך מלפרסם בקביעות?',
    type: 'select-multi',
    options: ['אין זמן', 'לא יודע מה לכתוב', 'לא מרגיש שזה מספיק טוב', 'לא רואה תוצאות', 'אחר'],
    required: true,
    block: '3',
    blockTitle: 'אתגרי תוכן',
    explanation: 'רוב בעלי עסקים נתקעים באותו המקום. זה לא חוסר מוטיבציה, זאת חוסר עקביות. ככה נבין איזה פוסט העסק שלך צריך.',
  },
  {
    key: 'q8_post_effectiveness',
    label: 'האם הפוסטים שלך מצליחים להשיג את התוצאות שאתה רוצה?',
    type: 'radio',
    options: ['כן תמיד', 'לפעמים', 'כמעט אף פעם', 'לא עוקב'],
    required: true,
    block: '3',
    blockTitle: 'אתגרי תוכן',
    explanation: 'חשוב לנו לדעת לא רק כמה אתה מפרסם, אלא גם אם התוכן עובד. פוסטים שלא מניבים כלום הם בזבוז זמן.',
  },
  {
    key: 'q9_current_spending',
    label: 'כמה כסף אתה מוציא היום על כלי שיווק / תוכן בחודש?',
    type: 'radio',
    options: ['כלום', 'עד ₪200', '₪200-500', 'מעל ₪500'],
    required: true,
    block: '4',
    blockTitle: 'מה חשוב לך',
    explanation: 'כדי שנדע איזה סוג של פוסטים ליצור בשבילך כדי להשלים את השיווק שלך.',
  },
  {
    key: 'q10_content_priority',
    label: 'מה הכי חשוב לך שהתוכן השיווקי שלך יעשה?',
    type: 'select',
    options: ['ימשוך לקוחות חדשים', 'יבנה אמון ומוניטין', 'יחסוך לי זמן', 'יגרום לי להיראות מקצועי'],
    required: true,
    block: '4',
    blockTitle: 'מה חשוב לך',
    explanation: 'יש הבדל עצום בין איך שיוצרים פוסטים למטרות השונות. התשובה שלך תקבע איזה כיוון פוסטים נייצר בשבילך.',
  },
]
