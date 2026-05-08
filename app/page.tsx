'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TopBar from '@/components/TopBar'

const MOCK_POSTS = [
  {
    post_type: 'value' as const,
    channel: 'linkedin',
    platform: 'platform-linkedin',
    badgeClass: 'badge-linkedin',
    badgeLabel: 'לינקדאין',
    typeLabel: '💡 ערך מקצועי',
    channelIcon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    text: '3 דברים שלמדתי אחרי 5 שנים בשיווק עסקים קטנים:\n\n1️⃣ הלקוחות הטובים ביותר מגיעים מהמוניטין שלך\n\n2️⃣ עקביות ניצחת תמיד את השלמות\n\n3️⃣ האנשים שיגידו "לא" הם אלה שיספרו עליך',
    copy: 'יוצרים תוכן שמביא לקוחות — לא רק לייקים.',
  },
  {
    post_type: 'trust' as const,
    channel: 'instagram',
    platform: 'platform-instagram',
    badgeClass: 'badge-instagram',
    badgeLabel: 'אינסטגרם',
    typeLabel: '🤝 בניית אמון',
    channelIcon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    text: 'לפני שנה פחדתי לבקש ₪3,000 על ייעוץ.\n\nהיום אני עובד עם 12 עסקים בו-זמנית, המחיר שלי גדל פי 3.\n\nמה השתנה?\nהפסקתי למכור. התחלתי לתת ערך.',
    copy: 'כשאתה מדבר אמת — הלקוחות הנכונים מוצאים אותך.',
  },
  {
    post_type: 'cta' as const,
    channel: 'facebook',
    platform: 'platform-facebook',
    badgeClass: 'badge-facebook',
    badgeLabel: 'פייסבוק',
    typeLabel: '🎯 קריאה לפעולה',
    channelIcon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    text: 'אם אתה יועץ, מאמן, או פרילנסר — ואתה מרגיש שהתוכן שלך לא ממצב אותך ברמה שאתה ראוי לה:\n\nיש לי מקום ל-2 לקוחות חדשים החודש.\n\nשלח לי הודעה "מוכן" בתגובה. 👇',
    copy: 'אל תחכה שהלקוחות יגיעו — לך אליהם.',
  },
]

const STEPS = [
  { num: '1', title: 'מדביק קישור', desc: 'קישור לאתר או דף הנחיתה שלך — גם עמוד פייסבוק עובד.', time: '30 שניות' },
  { num: '2', title: 'עונה על 10 שאלות', desc: 'שאלות קצרות על העסק שלך — בלי להתאמץ. כדי שהפוסטים יצלצלו בדיוק כמוך.', time: '2 דקות' },
  { num: '3', title: 'מקבל 3 פוסטים', desc: 'ערך, אמון, וקריאה לפעולה — מוכנים לפרסום מיידי בכל הרשתות.', time: 'מיידי' },
]

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
    })
  }, [router, supabase.auth])

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

      // Check for existing user to detect URL change
      const { data: existing, error: lookupError } = await supabase
        .from('users')
        .select('id, website_url')
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
        .select('id')
        .single()

      if (dbError) throw dbError

      localStorage.setItem('user_id', data.id)
      localStorage.setItem('website_url', cleanUrl)
      router.push('/survey')
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
      <TopBar dark />

      {/* ─── Hero ───────────────────────────────── */}
      <section
        className="noise-overlay"
        style={{
          background: 'linear-gradient(160deg, var(--navy) 0%, #12142b 55%, #0e1020 100%)',
          padding: 'clamp(64px,11vw,108px) 24px clamp(72px,13vw,120px)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        {/* Ambient glows */}
        <div style={{
          position: 'absolute', top: -120, right: '15%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.09) 0%, transparent 68%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: '10%',
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,91,213,0.12) 0%, transparent 68%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 680, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Eyebrow */}
          <div className="hero-line" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.2)',
            borderRadius: 100, padding: '6px 16px', marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>
              יוצר תוכן שיווקי לעסקים ישראלים
            </span>
          </div>

          <h1 className="hero-line" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(38px, 7.5vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'white',
            marginBottom: 8,
          }}>
            תן לנו 30 שניות —
          </h1>
          <h1 className="hero-line" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(38px, 7.5vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'var(--accent)',
            marginBottom: 28,
          }}>
            נחזיר לך שבוע של תוכן
          </h1>

          <p className="hero-line" style={{
            fontSize: 'clamp(16px, 2.5vw, 19px)',
            color: 'rgba(255,255,255,0.58)',
            lineHeight: 1.75,
            maxWidth: 520,
            margin: '0 auto 16px',
          }}>
            מדביקים קישור לאתר שלך. הבינה המלאכותית מנתחת את העסק שלך
            ויוצרת <strong style={{ color: 'rgba(255,255,255,0.85)' }}>3 פוסטים מוכנים לפרסום</strong> — בסגנון שלך, בעברית.
          </p>

          {/* Stats row */}
          <div className="hero-line" style={{
            display: 'flex', justifyContent: 'center', gap: 'clamp(16px,4vw,36px)',
            marginBottom: 36,
          }}>
            {[
              { n: '340+', label: 'בעלי עסקים' },
              { n: '3', label: 'פוסטים מוכנים' },
              { n: '60 שנ׳', label: 'בממוצע' },
            ].map(({ n, label }) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 'clamp(20px,3.5vw,26px)', fontWeight: 900,
                  color: 'white', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em',
                }}>{n}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="hero-line"
            style={{
              display: 'flex', gap: 10,
              maxWidth: 600, margin: '0 auto',
              flexWrap: 'wrap',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="הדביקו כתובת אתר — למשל: yoursite.co.il"
              dir="ltr"
              disabled={loading}
              style={{
                flex: 1, minWidth: 220, padding: '17px 22px',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 16, fontSize: 15,
                color: 'white', outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.45)'
                e.target.style.background = 'rgba(255,255,255,0.12)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.18)'
                e.target.style.background = 'rgba(255,255,255,0.08)'
              }}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                background: 'var(--accent)', color: 'var(--navy)',
                fontFamily: 'inherit', fontWeight: 800, fontSize: 16,
                border: 'none', borderRadius: 16, padding: '17px 30px',
                cursor: loading || !url.trim() ? 'default' : 'pointer',
                boxShadow: 'var(--shadow-btn-accent)',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                opacity: loading || !url.trim() ? 0.45 : 1,
              }}
              onMouseEnter={e => {
                if (!loading && url.trim()) e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? '...' : 'צור לי תוכן עכשיו ⚡'}
            </button>
          </form>

          {error && (
            <p style={{ marginTop: 12, color: '#fca5a5', fontSize: 14 }}>{error}</p>
          )}

          <div className="hero-line" style={{
            marginTop: 22,
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
          }}>
            ✓ חינם לחלוטין &nbsp;·&nbsp; ✓ בלי הרשמה &nbsp;·&nbsp; ✓ 100% בעברית
          </div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────── */}
      <section style={{
        background: 'var(--warm-white)',
        padding: 'clamp(56px,9vw,88px) 24px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,60px)' }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
            }}>
              שלושה צעדים
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(26px,4.5vw,40px)',
              fontWeight: 900, color: 'var(--text-primary)',
              letterSpacing: '-0.03em', lineHeight: 1.2,
            }}>
              איך זה עובד?
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(24px,4vw,36px)',
          }}>
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  padding: 'clamp(24px,3vw,32px)',
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative',
                  overflow: 'hidden',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div style={{ position: 'absolute', top: -12, right: 20, opacity: 0.06 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 100, fontWeight: 900,
                    color: 'var(--accent)', lineHeight: 1,
                  }}>{step.num}</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    display: 'inline-block',
                    background: 'var(--accent-soft)',
                    borderRadius: 10,
                    padding: '6px 14px',
                    fontSize: 12, fontWeight: 700,
                    color: 'var(--accent)',
                    marginBottom: 16,
                  }}>
                    {step.time}
                  </div>
                  <h3 style={{
                    fontSize: 20, fontWeight: 800,
                    color: 'var(--text-primary)',
                    marginBottom: 10, letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontSize: 14, color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                  }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Results preview ────────────────────── */}
      <section style={{
        background: 'var(--body-bg)',
        padding: 'clamp(56px,9vw,88px) 24px',
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(36px,5vw,52px)' }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
            }}>
              תוצאות לדוגמה
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(26px,4.5vw,40px)',
              fontWeight: 900, color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}>
              הנה מה שמחכה לך בצד השני
            </h2>
            <p style={{
              color: 'var(--text-secondary)', fontSize: 15,
              marginTop: 12, maxWidth: 480, margin: '12px auto 0',
              lineHeight: 1.65,
            }}>
              3 פוסטים שנוצרים ספציפית לעסק שלך — ערך, אמון, וקריאה לפעולה
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 'clamp(16px,3vw,24px)',
          }}>
            {MOCK_POSTS.map((post, i) => (
              <div
                key={i}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-card)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
                  e.currentTarget.style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Platform header */}
                <div
                  className={post.platform}
                  style={{
                    padding: '10px 16px',
                    display: 'flex', alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {post.channelIcon}
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'white', opacity: 0.9 }}>
                    {post.badgeLabel}
                  </span>
                  <span style={{
                    marginRight: 'auto', fontSize: 11, fontWeight: 600,
                    color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.15)',
                    padding: '2px 8px', borderRadius: 100,
                  }}>
                    {post.typeLabel}
                  </span>
                </div>

                {/* Content */}
                <div style={{ padding: '18px 18px 0' }}>
                  <p style={{
                    fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {post.text}
                  </p>
                </div>

                {/* Copy line */}
                <div style={{
                  margin: '14px 18px 18px',
                  padding: '10px 14px',
                  background: 'var(--accent-soft)',
                  borderRadius: 10,
                  borderRight: '3px solid var(--accent)',
                }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                    {post.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 'clamp(40px,6vw,56px)' }}>
            <button
              onClick={scrollToInput}
              style={{
                display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', gap: 10,
                background: 'var(--navy)', color: 'white',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
                border: 'none', borderRadius: 16, padding: '18px 36px',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(12,14,29,0.2)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(12,14,29,0.28)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(12,14,29,0.2)'
              }}
            >
              <span>⚡</span>
              צור לי תוכן כזה עכשיו — הדבק את הקישור שלך
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 14 }}>
              חינם לחלוטין · פחות מ-60 שניות
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
