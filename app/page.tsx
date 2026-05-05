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
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '💡',
    label: '💡 ערך מקצועי',
    badgeClass: 'badge-linkedin',
    badgeLabel: 'לינקדאין',
    text: '3 דברים שלמדתי אחרי 5 שנים בשיווק עסקים קטנים:\n\n1️⃣ הלקוחות הטובים ביותר מגיעים מהמוניטין שלך\n\n2️⃣ עקביות ניצחת תמיד את השלמות\n\n3️⃣ האנשים שיגידו "לא" הם אלה שיספרו עליך',
  },
  {
    post_type: 'trust' as const,
    channel: 'instagram',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: '🤝',
    label: '🤝 בניית אמון',
    badgeClass: 'badge-instagram',
    badgeLabel: 'אינסטגרם',
    text: 'לפני שנה פחדתי לבקש ₪3,000 על ייעוץ.\n\nהיום אני עובד עם 12 עסקים בו-זמנית, המחיר שלי גדל פי 3.\n\nמה השתנה? הפסקתי למכור. התחלתי לתת ערך.',
  },
  {
    post_type: 'cta' as const,
    channel: 'facebook',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: '🎯',
    label: '🎯 קריאה לפעולה',
    badgeClass: 'badge-facebook',
    badgeLabel: 'פייסבוק',
    text: 'אם אתה יועץ, מאמן, או פרילנסר — ואתה מרגיש שהתוכן שלך לא ממצב אותך ברמה שאתה ראוי לה:\n\nיש לי מקום ל-2 לקוחות חדשים החודש.',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const heroRef = useRef<HTMLElement>(null)
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

      const { data, error: dbError } = await supabase
        .from('users')
        .insert({ website_url: cleanUrl, auth_user_id: user.id })
        .select('id')
        .single()

      if (dbError) throw dbError

      localStorage.setItem('user_id', data.id)
      localStorage.setItem('website_url', cleanUrl)
      router.push('/survey')
    } catch {
      setError('אירעה שגיאה. אנא נסה שוב.')
      setLoading(false)
    }
  }

  function scrollToHero() {
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="screen-enter" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar dark />

      {/* Hero */}
      <section
        ref={heroRef}
        style={{
          background: 'linear-gradient(155deg, var(--navy) 0%, #1a1c35 60%, #12142a 100%)',
          padding: 'clamp(60px, 10vw, 96px) 24px clamp(70px, 12vw, 110px)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        {/* Glow orb */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,91,213,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 700, textAlign: 'center', position: 'relative' }}>
          <h1 className="hero-line" style={{
            fontSize: 'clamp(34px, 7vw, 64px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em', color: 'white', marginBottom: 8,
          }}>
            תן לנו 30 שניות —
          </h1>
          <h1 className="hero-line" style={{
            fontSize: 'clamp(34px, 7vw, 64px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em',
            color: 'var(--accent)', marginBottom: 24,
          }}>
            נחזיר לך שבוע של תוכן
          </h1>
          <p className="hero-line" style={{
            fontSize: 'clamp(16px, 2.5vw, 19px)',
            color: 'rgba(255,255,255,0.6)', lineHeight: 1.7,
            maxWidth: 540, margin: '0 auto 40px',
          }}>
            מדביקים קישור לאתר שלך. הבינה המלאכותית מנתחת את העסק שלך
            ויוצרת 3 פוסטים מוכנים לפרסום — בסגנון שלך, בעברית.
          </p>

          <form
            onSubmit={handleSubmit}
            className="hero-line"
            style={{ display: 'flex', gap: 10, maxWidth: 600, margin: '0 auto', flexWrap: 'wrap' }}
          >
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="הדביקו כתובת אתר — למשל: yoursite.co.il"
              dir="ltr"
              disabled={loading}
              style={{
                flex: 1, minWidth: 200, padding: '16px 20px',
                background: 'rgba(255,255,255,0.1)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 14, fontSize: 15, color: 'white', outline: 'none',
                fontFamily: 'inherit', transition: 'border-color 0.15s ease',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--accent)', color: 'var(--navy)',
                fontFamily: 'inherit', fontWeight: 800, fontSize: 16,
                border: 'none', borderRadius: 14, padding: '16px 28px', cursor: 'pointer',
                boxShadow: 'var(--shadow-btn-accent)', transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                opacity: loading || !url.trim() ? 0.45 : 1,
              }}
            >
              {loading ? '...' : 'צור לי תוכן עכשיו ⚡'}
            </button>
          </form>

          {error && (
            <p style={{ marginTop: 12, color: '#fca5a5', fontSize: 14 }}>{error}</p>
          )}

          <div className="hero-line" style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              כבר <strong style={{ color: 'rgba(255,255,255,0.8)' }}>340+</strong> בעלי עסקים קיבלו תוכן מוכן ✓
            </span>
          </div>
        </div>
      </section>

      {/* Preview section */}
      <section style={{
        background: 'var(--body-bg)',
        padding: 'clamp(50px, 8vw, 80px) 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ maxWidth: 960, width: '100%' }}>
          <p style={{
            textAlign: 'center', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: 12,
          }}>דוגמה לתוצאות</p>
          <h2 style={{
            textAlign: 'center',
            fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 40,
          }}>
            הנה מה שמחכה לך בצד השני
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {MOCK_POSTS.map((post, i) => (
              <div
                key={i}
                style={{
                  background: 'white', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
                  overflow: 'hidden', opacity: 0.9,
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = 'var(--shadow-card-hover)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = 'var(--shadow-card)'
                  el.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  width: '100%', aspectRatio: '4/3',
                  background: post.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, opacity: 0.85,
                }}>
                  {post.icon}
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {post.label}
                    </span>
                    <span className={post.badgeClass} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                      {post.badgeLabel}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12, lineHeight: 1.7, color: 'var(--text-primary)',
                    display: '-webkit-box', WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {post.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button
              onClick={scrollToHero}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--indigo)', color: 'white',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
                border: 'none', borderRadius: 'var(--radius-md)', padding: '16px 32px',
                cursor: 'pointer', boxShadow: 'var(--shadow-btn)', transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--indigo-hover)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--indigo)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              צור לי תוכן כזה עכשיו — הדבק את הקישור שלך ↑
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
