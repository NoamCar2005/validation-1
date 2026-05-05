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
    blockTitle: 'על העסק שלך',
    blockDescription: 'כדי שהפוסטים יהיו מדויקים לך',
    explanation: "סוג העסק קובע את הטון, הז'אנר, ומי מקבל את ההחלטות מנגד. פרילנסר מדבר אחרת מ-SaaS — וכך גם התוכן שלו.",
  },
  {
    key: 'q2_ideal_customer',
    label: 'מי הלקוח האידיאלי שלך?',
    type: 'text',
    required: true,
    block: '1',
    blockTitle: 'על העסק שלך',
    explanation: 'ככל שתתאר את הלקוח בצורה ממוקדת יותר — גיל, תפקיד, כאב — כך התוכן יפגע בדיוק. "בעלי עסקים" זה רחב מדי. "מאמנים עסקיים בתחילת דרכם שרוצים לקוחות ראשונים" זה כבר משהו.',
  },
  {
    key: 'q3_main_message',
    label: 'מה המסר הכי חשוב שאתה רוצה להעביר ללקוחות?',
    type: 'text',
    required: true,
    block: '1',
    blockTitle: 'על העסק שלך',
    explanation: 'זה ה-"למה אני?" שלך. מה שגורם ללקוח לבחור בך ולא במתחרים. אם אין לך תשובה ברורה — נמצא אותה יחד דרך הפוסטים.',
  },
  {
    key: 'q4_active_platforms',
    label: 'באיזה פלטפורמות אתה פעיל?',
    type: 'select-multi',
    options: ['אינסטגרם', 'לינקדאין', 'פייסבוק', 'יוטיוב', 'וואטסאפ', 'לא פעיל'],
    required: true,
    block: '2',
    blockTitle: 'הנוכחות הדיגיטלית שלך',
    blockDescription: 'כדי שנבין מאיפה להתחיל',
    explanation: 'כל פלטפורמה דורשת שפה שונה. פוסט לינקדאין נראה אחרת מפוסט אינסטגרם — באורך, בטון, ובפורמט התמונה. ניצור תוכן שמתאים בדיוק לאן שאתה נמצא.',
  },
  {
    key: 'q5_posting_frequency',
    label: 'כמה פעמים בשבוע אתה מפרסם בממוצע?',
    type: 'radio',
    options: ['כמעט אף פעם', 'פעם בשבוע', '2-3 פעמים', 'כל יום'],
    required: true,
    block: '2',
    blockTitle: 'הנוכחות הדיגיטלית שלך',
    explanation: 'לא שואלים כדי לשפוט — שואלים כדי להבין מה "הרבה" בשבילך. מי שמפרסם פעם בשבוע צריך תוכן שונה ממי שמפרסם כל יום.',
  },
  {
    key: 'q6_time_spent',
    label: 'כמה זמן אתה מוציא על תוכן שיווקי בשבוע?',
    type: 'radio',
    options: ['פחות משעה', '1-3 שעות', '3-6 שעות', 'יותר מ-6 שעות'],
    required: true,
    block: '2',
    blockTitle: 'הנוכחות הדיגיטלית שלך',
    explanation: 'זמן הוא המשאב הכי יקר שלך. נדע כמה להקל עליך — ונראה לך בדיוק כמה שעות אנחנו חוסכים לך כל שבוע.',
  },
  {
    key: 'q7_blocking_factors',
    label: 'מה הכי עוצר אותך מלפרסם בקביעות?',
    type: 'select-multi',
    options: ['אין זמן', 'לא יודע מה לכתוב', 'לא מרגיש שזה מספיק טוב', 'לא רואה תוצאות', 'אחר'],
    required: true,
    block: '3',
    blockTitle: 'הכאב האמיתי',
    explanation: 'רוב בעלי העסקים עוצרים באותו מקום בדיוק. זה לא חוסר מוטיבציה — זה חוסר מערכת. ניצור עבורך את המערכת שתסיר את החסם הזה פעם אחת ולתמיד.',
  },
  {
    key: 'q8_post_effectiveness',
    label: 'האם הפוסטים שלך מצליחים להשיג את התוצאות שאתה רוצה?',
    type: 'radio',
    options: ['כן תמיד', 'לפעמים', 'כמעט אף פעם', 'לא עוקב'],
    required: true,
    block: '3',
    blockTitle: 'הכאב האמיתי',
    explanation: 'מעניין אותנו לא רק האם אתה מפרסם — אלא האם זה עובד. פוסטים שלא מניבים תוצאות הם בזבוז זמן. אנחנו נוודא שכל פוסט עובד בשבילך.',
  },
  {
    key: 'q9_current_spending',
    label: 'כמה כסף אתה מוציא היום על כלי שיווק / תוכן בחודש?',
    type: 'radio',
    options: ['כלום', 'עד ₪200', '₪200-500', 'מעל ₪500'],
    required: true,
    block: '4',
    blockTitle: 'ולידציה כלכלית',
    explanation: 'לא כדי לדעת מה תשלם לנו — כדי להבין מה השוק הנוכחי שלך. אם כבר משקיע בכלי שיווק, כנראה שאתה מבין את הערך. אם לא — נראה לך מדוע זה משתלם.',
  },
  {
    key: 'q10_content_priority',
    label: 'מה הכי חשוב לך שהתוכן השיווקי שלך יעשה?',
    type: 'select',
    options: ['ימשוך לקוחות חדשים', 'יבנה אמון ומוניטין', 'יחסוך לי זמן', 'יגרום לי להיראות מקצועי'],
    required: true,
    block: '4',
    blockTitle: 'ולידציה כלכלית',
    explanation: 'יש הבדל עצום בין "אני רוצה לייד" לבין "אני רוצה שאנשים יבינו מה אני עושה". התשובה שלך תקבע את כיוון הפוסטים שנייצר — ישירות למטרה שלך.',
  },
]
