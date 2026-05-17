'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import OutOfCreditsPanel from '@/components/OutOfCreditsPanel'

const MOCK_POSTS = [
  {
    post_type: 'value' as const,
    channel: 'linkedin',
    platform: 'platform-linkedin',
    badgeLabel: 'לינקדאין',
    typeLabel: 'ערך מקצועי',
    channelIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    platformBg: '#0A66C2',
    text: '3 טעויות שרוב הקואצ\'ים עושים בתוכן שלהם (ואני עשיתי את כולן):\n\n1. מדברים על עצמם במקום על הלקוח\n\n2. מחכים שהפוסט "יהיה מושלם" לפני שמפרסמים\n\n3. מפרסמים פעם בשבועיים ותוהים למה אין תגובות\n\nאחרי 4 שנים וקרוב ל-60 לקוחות — הבנתי שהבעיה לא היא מה לכתוב. הבעיה היא שלא כותבים בכלל.',
    copy: 'תוכן שמוכר הוא תוכן שנכתב. לא תוכן שמחכה.',
  },
  {
    post_type: 'trust' as const,
    channel: 'instagram',
    platform: 'platform-instagram',
    badgeLabel: 'אינסטגרם',
    typeLabel: 'בניית אמון',
    channelIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    platformBg: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    text: 'לפני שלוש שנים פתחתי את העסק שלי בלי שום לקוח, בלי תיק עבודות, ובלי שמישהו שמע עלי.\n\nהיה לי מחשב, חשבון אינסטגרם, ויותר ספקות ממה שאני יכולה לספור.\n\nהיום — 47 לקוחות עברו דרכי. 6 מהם כבר שלחו אלי חברים.\n\nהדבר היחיד שהשתנה? הפסקתי לחכות לרגע הנכון. התחלתי לפרסם.',
    copy: 'הרגע הנכון לא מגיע. אתה יוצר אותו.',
  },
  {
    post_type: 'cta' as const,
    channel: 'facebook',
    platform: 'platform-facebook',
    badgeLabel: 'פייסבוק',
    typeLabel: 'קריאה לפעולה',
    channelIcon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    platformBg: '#1877F2',
    text: 'אם ההכנסות שלך תקועות — רוב הסיכויים שהסיבה אחת:\n\nאנשים לא מבינים בדיוק מה אתה עושה ולמה הם צריכים דווקא אותך.\n\nזה לא עניין של מחיר. זה עניין של מסר.\n\nאני פותחת 3 מקומות לשיחת ייעוץ חינמית של 30 דקות — בשבוע הבא בלבד.\n\nכתוב לי "רוצה" בתגובות 👇',
    copy: 'עסק טוב לא מחכה ללקוחות — הוא מושך אותם.',
  },
]

const STEPS = [
  { num: '01', title: 'מדביק קישור', desc: 'קישור לאתר או לדף נחיתה שלך. משם כבר אנחנו ניקח את זה', time: '30 שניות' },
  { num: '02', title: 'עונה על שאלות', desc: 'כמה שאלות קצרות על העסק שלך - כדי שהפוסטים ישמעו בדיוק כמוך.', time: '2 דקות' },
  { num: '03', title: 'מקבל 3 וואריאציות', desc: 'ערך, יצירת אמון, וקריאה לפעולה — מוכנים לפרסום מיידי בכל הרשתות.', time: 'מיידי' },
]

const POST_META: Record<string, { label: string; icon: string; description: string; accentGradient: string }> = {
  value: { label: 'ערך מקצועי', icon: '💡', description: 'ערך שמציג אותך כמומחה', accentGradient: 'linear-gradient(135deg, #E86228 0%, #D45018 100%)' },
  trust: { label: 'בניית אמון', icon: '🤝', description: 'הסיפור שלך ולמה לבחור בך', accentGradient: 'linear-gradient(135deg, #E86228 0%, #9B3A14 100%)' },
  cta: { label: 'קריאה לפעולה', icon: '🎯', description: 'קריאה לפעולה שמביאה לקוחות', accentGradient: 'linear-gradient(135deg, #25D366 0%, #1DB954 100%)' },
}

const CHANNEL_LABEL_MAP: Record<string, string> = {
  instagram: 'אינסטגרם',
  linkedin: 'לינקדאין',
  facebook: 'פייסבוק',
}

function ResultsShowcaseSection({ scrollToInput }: { scrollToInput: () => void }) {
  const [selectedTab, setSelectedTab] = useState<'value' | 'trust' | 'cta'>('value')
  const [copied, setCopied] = useState(false)

  const activePost = MOCK_POSTS.find(p => p.post_type === selectedTab)

  function handleCopy() {
    if (!activePost) return
    try {
      navigator.clipboard.writeText(`${activePost.text}\n\n${activePost.copy}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <section style={{
      background: 'var(--body-bg)',
      padding: 'clamp(56px,9vw,88px) 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(48px,7vw,64px)' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8,
          }}>
            תוצאות לדוגמה
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(26px,4.5vw,40px)',
            fontWeight: 900, color: 'var(--text-primary)',
            letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>
            הנה מה שמחכה לך<br />בצד השני
          </h2>
        </div>

        {/* Split layout - Image + Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          borderRadius: 28,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          background: 'white',
          marginBottom: 'clamp(40px,6vw,56px)',
          minHeight: 500,
        }}>

          {/* LEFT: Branded generated-image mock */}
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            borderLeft: '1px solid var(--border)',
            minHeight: 500,
          }}>
            {/* Background */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(145deg, #1E100C 0%, #2A0E18 45%, #160A24 100%)',
            }} />
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 240, height: 240, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,98,40,0.28) 0%, transparent 70%)',
            }} />
            <div style={{
              position: 'absolute', bottom: -80, left: -80,
              width: 300, height: 300, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,98,40,0.14) 0%, transparent 70%)',
            }} />
            {/* Grid lines */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Content */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '36px 32px',
              gap: 0,
            }}>
              {/* Avatar / profile circle */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent) 0%, #e8951a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, marginBottom: 16,
                boxShadow: '0 8px 28px rgba(232,98,40,0.45)',
                border: '3px solid rgba(255,255,255,0.15)',
              }}>
                👩‍💼
              </div>

              {/* Name + title */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22, fontWeight: 900,
                  color: 'white', letterSpacing: '-0.02em',
                  marginBottom: 4,
                }}>
                  מיכל שפירא
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '0.04em',
                }}>
                  ייעוץ עסקי ומנטורינג לעצמאים
                </div>
              </div>

              {/* Quote card */}
              <div style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16, padding: '18px 20px',
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
                marginBottom: 20,
                maxWidth: 260,
              }}>
                <div style={{
                  fontSize: 13, lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: 500,
                }}>
                  "3 טעויות שרוב הקואצ'ים עושים בתוכן שלהם"
                </div>
              </div>

              {/* Stats row */}
              <div style={{
                display: 'flex', gap: 20,
                marginBottom: 24,
              }}>
                {[['47', 'לקוחות'], ['4', 'שנות ניסיון'], ['6', 'הפניות']].map(([n, l]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 20, fontWeight: 900,
                      color: 'var(--accent)',
                    }}>{n}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* ContentMine watermark */}
              <div style={{
                position: 'absolute', bottom: 16,
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 100, padding: '4px 12px',
              }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em' }}>
                  ✦ נוצר על ידי ContentMine
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Tabs + Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
          }}>

            {/* Tab bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              background: 'var(--warm-white)',
            }}>
              {(['value', 'trust', 'cta'] as const).map((tab, i) => {
                const isActive = selectedTab === tab
                const meta = POST_META[tab]
                return (
                  <button
                    key={tab}
                    onClick={() => { setSelectedTab(tab); setCopied(false) }}
                    style={{
                      flex: 1,
                      padding: '16px 8px 14px',
                      background: isActive ? 'white' : 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                      borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                      marginBottom: '-1px',
                      fontFamily: 'inherit',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 12,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(232,98,40,0.04)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }
                    }}
                  >
                    <span style={{
                      fontSize: 20,
                      transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      display: 'block',
                    }}>
                      {meta.icon}
                    </span>
                    <span style={{ lineHeight: 1.2, textAlign: 'center' }}>
                      {meta.label}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        fontWeight: 400, lineHeight: 1.2, textAlign: 'center',
                        maxWidth: 120,
                      }}>
                        {meta.description}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Post content — scrollable */}
            {activePost && (
              <div
                key={selectedTab}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 'clamp(24px, 3.5vw, 36px) clamp(20px, 4vw, 40px)',
                  animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Channel pill */}
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: 'var(--accent-soft)',
                    color: '#C04818',
                    borderRadius: 100, padding: '4px 11px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                  }}>
                    {CHANNEL_LABEL_MAP[activePost.channel]}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    · מומלץ לפרסום
                  </span>
                </div>

                {/* Post text */}
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(14px, 1.2vw, 16px)',
                  lineHeight: 1.85,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  margin: '0 0 24px 0',
                  fontWeight: 400,
                  letterSpacing: '0.005em',
                }}>
                  {activePost.text}
                </p>

                {/* Copy tagline */}
                {activePost.copy && (
                  <div style={{
                    padding: '16px 18px',
                    background: 'var(--accent-soft)',
                    borderRadius: 14,
                    borderRight: '3px solid var(--accent)',
                  }}>
                    <span style={{
                      display: 'block',
                      fontSize: 9, fontWeight: 700, color: 'var(--accent)',
                      letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
                    }}>
                      כותרת הפוסט
                    </span>
                    <p style={{
                      margin: 0, fontSize: 14, lineHeight: 1.6,
                      color: 'var(--text-primary)', fontStyle: 'italic', fontWeight: 600,
                    }}>
                      "{activePost.copy}"
                    </p>
                  </div>
                )}

                <div style={{ flex: 1 }} />

                {/* Copy button — sticky footer */}
                <button
                  onClick={handleCopy}
                  style={{
                    marginTop: 20, padding: '14px 20px',
                    borderRadius: 12,
                    background: copied
                      ? 'var(--green)'
                      : 'linear-gradient(135deg, var(--navy) 0%, #241810 100%)',
                    color: 'white', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    boxShadow: copied
                      ? '0 8px 26px rgba(37,211,102,0.32)'
                      : '0 8px 26px rgba(26,13,8,0.22)',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={e => {
                    if (!copied) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 14px 36px rgba(26,13,8,0.3)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!copied) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 8px 26px rgba(26,13,8,0.22)'
                    }
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      הועתק בהצלחה!
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      העתק פוסט
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={scrollToInput}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'var(--navy)', color: 'white',
              fontFamily: 'inherit', fontWeight: 800, fontSize: 'clamp(14px,1.1vw,16px)',
              border: 'none', borderRadius: 16, padding: '18px 36px',
              cursor: 'pointer',
              boxShadow: '0 6px 22px rgba(26,13,8,0.22)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 10px 32px rgba(26,13,8,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 6px 22px rgba(26,13,8,0.22)'
            }}
          >
            ⚡ צור לי תוכן — בחינם
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(12px,1vw,13px)', marginTop: 14 }}>
            חינם לחלוטין · פחות מ-60 שניות
          </p>
        </div>
      </div>
    </section>
  )
}

function UnderlineSwoop() {
  return (
    <svg
      style={{ position: 'absolute', bottom: -8, left: 0, right: 0, width: '100%', height: 14, overflow: 'visible' }}
      viewBox="0 0 200 14" preserveAspectRatio="none"
    >
      <path
        d="M2 9 Q50 -2, 100 7 T 198 5"
        fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
        style={{ strokeDasharray: 220, strokeDashoffset: 220, animation: 'lineGrow 1s .6s cubic-bezier(.16,1,.3,1) forwards' }}
      />
    </svg>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [outOfCredits, setOutOfCredits] = useState<null | { alreadyJoined: boolean }>(null)
  const [remainingDisplay, setRemainingDisplay] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
    })
  }, [router, supabase.auth])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('generations_remaining')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (data) setRemainingDisplay(data.generations_remaining ?? 0)
    })
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    let cleanUrl = url.trim()
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    try {
      new URL(cleanUrl)
    } catch {
      setError('אנא הכנס כתובת אתר תקינה')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth'); return }

      const { data: existing, error: lookupError } = await supabase
        .from('users')
        .select('id, website_url, survey_completed, generations_remaining, waitlist_joined')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (lookupError) console.warn('user lookup failed', lookupError)

      const urlChanged = !!existing && existing.website_url !== cleanUrl

      const { data, error: dbError } = await supabase
        .from('users')
        .upsert(
          {
            auth_user_id: user.id,
            website_url: cleanUrl,
            ...(urlChanged ? { survey_completed: false } : {}),
          },
          { onConflict: 'auth_user_id' }
        )
        .select('id, survey_completed, generations_remaining, waitlist_joined')
        .single()

      if (dbError) throw dbError

      localStorage.setItem('user_id', data.id)
      localStorage.setItem('website_url', cleanUrl)

      // Out-of-credits: show inline panel, do not route forward.
      if ((data.generations_remaining ?? 0) <= 0) {
        setOutOfCredits({ alreadyJoined: !!data.waitlist_joined })
        return
      }

      // Has credit + survey already filled in → skip survey.
      const effectiveSurveyDone = urlChanged ? false : !!data.survey_completed
      router.push(effectiveSurveyDone ? '/loading' : '/survey')
    } catch {
      setError('אירעה שגיאה. אנא נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  function scrollToInput() {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => inputRef.current?.focus(), 400)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ─── Hero + Header (dark) ───────────────── */}
      <section
        className="noise-overlay"
        style={{
          background: 'linear-gradient(160deg, var(--navy) 0%, #1E1712 55%, #140E0A 100%)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Ambient glows */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,98,40,0.18), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,98,40,0.10), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ── Inline header ── */}
        <div style={{
          position: 'relative', zIndex: 5,
          padding: '18px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--accent)', color: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900,
            }}>✦</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
              letterSpacing: '-0.02em', color: 'white',
            }}>ContentFlow</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {remainingDisplay !== null && (
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                color: remainingDisplay > 0 ? '#3DDC84' : 'rgba(255,255,255,0.4)',
                background: remainingDisplay > 0
                  ? 'rgba(37,211,102,0.1)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${remainingDisplay > 0 ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 100, padding: '4px 11px',
              }}>
                {remainingDisplay > 0 ? `${remainingDisplay} יצירה זמינה` : 'אין יצירות'}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="glow-pulse" style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--green)', display: 'inline-block',
              }} />
              עשרות פוסטים נוצרו השבוע
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.45)', fontFamily: 'inherit',
                fontWeight: 600, fontSize: 12, padding: '6px 12px',
                borderRadius: 100, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
              }}
            >
              יציאה
            </button>
          </div>
        </div>

        {/* ── Hero content ── */}
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 720, margin: '0 auto', textAlign: 'center',
          padding: 'clamp(36px,7vw,80px) 24px clamp(28px,5vw,48px)',
        }}>
          {/* Eyebrow badge */}
          <div className="hero-line" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(232,98,40,0.12)', border: '1px solid rgba(232,98,40,0.25)',
            borderRadius: 100, padding: '7px 14px', marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em' }}>
              3 וואריאציות בעברית — ב-2 דקות
            </span>
          </div>

          {/* H1 with underline swoop */}
          <h1 className="hero-line" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 8vw, 72px)',
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.035em',
            color: 'white', marginBottom: 28,
          }}>
            תן לנו 2 דקות.<br />
            <span style={{ color: 'var(--accent)', position: 'relative', display: 'inline-block' }}>
              נחזיר לך שבוע
              <UnderlineSwoop />
            </span><br />
            של תוכן.
          </h1>

          <p className="hero-line" style={{
            fontSize: 'clamp(15px,2vw,18px)',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, maxWidth: 480,
            margin: '0 auto 36px',
          }}>
            מדביקים קישור לאתר שלך. המערכת שלנו קוראת את העסק ויוצרת 3 וואריאציות פוסט מוכנות לפרסום — בסגנון שלך, בעברית, בלי לכתוב אף מילה.
          </p>

          {/* Contained input (design style) or out-of-credits panel */}
          {outOfCredits ? (
            <OutOfCreditsPanel alreadyJoined={outOfCredits.alreadyJoined} />
          ) : (
            <>
              <form onSubmit={handleSubmit} className="hero-line" style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', flexWrap: 'wrap',
                  maxWidth: 560, margin: '0 auto',
                  background: focused ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
                  border: focused ? '1.5px solid var(--accent)' : '1.5px solid rgba(255,255,255,0.14)',
                  borderRadius: 18, padding: 6,
                  boxShadow: focused ? '0 0 0 4px rgba(232,98,40,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{
                    flex: '1 1 220px', minWidth: 200,
                    display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, whiteSpace: 'nowrap' }}>https://</span>
                    <input
                      ref={inputRef}
                      type="text" value={url}
                      onChange={e => setUrl(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="yoursite.co.il"
                      dir="ltr"
                      disabled={loading}
                      style={{
                        flex: 1, border: 'none', background: 'transparent',
                        color: 'white', fontSize: 16,
                        padding: '14px 0', minWidth: 0,
                        fontFamily: 'inherit', fontWeight: 500,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !url.trim()}
                    style={{
                      background: !loading && url.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                      color: !loading && url.trim() ? 'var(--navy)' : 'rgba(255,255,255,0.4)',
                      border: 'none', borderRadius: 14,
                      padding: '14px 22px',
                      fontWeight: 800, fontSize: 15,
                      whiteSpace: 'nowrap', fontFamily: 'inherit',
                      boxShadow: !loading && url.trim() ? 'var(--shadow-btn-accent)' : 'none',
                      transition: 'all .25s', cursor: 'pointer',
                    }}
                  >
                    {loading ? '...' : 'צור לי 3 וואריאציות עכשיו ⚡'}
                  </button>
                </div>
              </form>

              {error && (
                <p style={{ marginBottom: 12, color: '#fca5a5', fontSize: 14 }}>{error}</p>
              )}

              <div className="hero-line" style={{
                fontSize: 12.5, color: 'rgba(255,255,255,0.4)',
                display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 18,
              }}>
                <span>✓ חינם לחלוטין</span>
                <span>✓ מוכן תוך 2 דקות</span>
                <span>✓ 100% עברית</span>
              </div>
            </>
          )}
        </div>

        {/* Stats strip */}
        <div style={{ position: 'relative', zIndex: 5, padding: '0 24px 48px' }}>
          <div style={{
            maxWidth: 720, margin: '0 auto',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: 22,
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
          }}>
            {[
              { n: '2 דק׳', l: 'מקישור לפוסט מוכן' },
              { n: '3', l: 'וואריאציות פוסט לפרסום מיידי' },
              { n: '0', l: 'ניסיון כתיבה נדרש' },
            ].map(s => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: 'clamp(22px,3vw,28px)', color: 'white', letterSpacing: '-0.02em',
                }}>{s.n}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works (dark) ────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #1A1410 0%, #130E09 100%)',
        padding: 'clamp(56px,9vw,88px) 24px',
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(36px,5vw,52px)' }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8,
            }}>
              איך זה עובד
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(26px,4.5vw,38px)',
              fontWeight: 800, color: 'white',
              letterSpacing: '-0.03em', lineHeight: 1.2,
            }}>
              שלושה צעדים פשוטים, פחות מ-3 דקות
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}>
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`fade-up-${i + 1}`}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18, padding: 20,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: -14, left: 14,
                  fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: 72, color: 'rgba(232,98,40,0.08)',
                  lineHeight: 1, pointerEvents: 'none',
                }}>
                  {step.num}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(232,98,40,0.14)', color: 'var(--accent)',
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 11, fontWeight: 700, marginBottom: 12,
                  }}>
                    {step.time}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800,
                    color: 'white', marginBottom: 6, letterSpacing: '-0.02em',
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Results preview (cream) ────────────── */}
      <ResultsShowcaseSection scrollToInput={scrollToInput} />
    </div>
  )
}
