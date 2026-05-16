'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CheckIcon = ({ size = 42 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function WaitlistPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('user_id')) router.replace('/')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('אנא הכנס כתובת אימייל תקינה')
      return
    }
    setLoading(true)
    setError('')
    const userId = localStorage.getItem('user_id')!
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ email: email.trim() })
        .eq('id', userId)
      if (updateError) throw updateError
      setSubmitted(true)
    } catch {
      setError('אירעה שגיאה. אנא נסה שוב.')
      setLoading(false)
    }
  }

  async function handleWhatsApp() {
    const userId = localStorage.getItem('user_id')
    if (userId) {
      await supabase.from('users').update({ whatsapp_opted_in: true }).eq('id', userId)
    }
    window.open('https://chat.whatsapp.com/YOUR_GROUP_LINK', '_blank')
  }

  if (submitted) {
    return (
      <div
        className="screen-enter"
        style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--body-bg)', padding: '52px 24px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,211,102,0.08), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 420, position: 'relative' }}>
          {/* Big green check with pulse rings */}
          <div style={{ position: 'relative', marginBottom: 32, display: 'inline-block' }}>
            <div style={{
              width: 92, height: 92, borderRadius: '50%',
              background: 'var(--green)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 16px 48px rgba(37,211,102,0.45)',
              animation: 'pop .5s cubic-bezier(.16,1,.3,1)',
            }}>
              <CheckIcon size={42} />
            </div>
            <div style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              border: '2px solid rgba(37,211,102,0.3)',
            }} className="pulse-ring" />
            <div style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              border: '2px solid rgba(37,211,102,0.3)',
            }} className="pulse-ring-delayed" />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(28px,4vw,40px)', letterSpacing: '-0.03em',
            color: 'var(--text-primary)', margin: '0 0 12px',
            animation: 'fadeUp .6s .15s both',
          }}>
            אתה ברשימה!
          </h1>
          <p style={{
            fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65,
            maxWidth: 380, margin: '0 auto 32px',
            animation: 'fadeUp .6s .25s both',
          }}>
            כשהגרסה המלאה תעלה — תהיה מהראשונים לדעת. בינתיים, יש לנו קהילה של 340+ בעלי עסקים שמשתפים תוכן והשראה כל שבוע.
          </p>

          <div style={{ width: '100%', animation: 'fadeUp .6s .35s both' }}>
            <button
              onClick={handleWhatsApp}
              style={{
                width: '100%', padding: '15px 20px',
                background: 'var(--green)', color: 'white',
                border: 'none', borderRadius: 14, fontFamily: 'inherit',
                fontWeight: 800, fontSize: 15, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 8px 28px rgba(37,211,102,0.35)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--green-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--green)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.45L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.668 5.475z" />
              </svg>
              הצטרף לקהילת הוואטסאפ
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                marginTop: 16, background: 'none', border: 'none',
                color: 'var(--text-muted)', fontFamily: 'inherit',
                fontSize: 13, cursor: 'pointer', fontWeight: 600,
                display: 'block', width: '100%', textAlign: 'center', padding: 8,
              }}
            >
              ← צור 3 פוסטים נוספים
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="screen-enter"
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--body-bg)', padding: '40px 24px', textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Navigation */}
      <div style={{ position: 'absolute', top: 16, display: 'flex', gap: 10, left: 20 }}>
        <button
          onClick={() => router.push('/results')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f0f1f5', border: 'none',
            color: 'var(--text-secondary)', fontFamily: 'inherit',
            fontWeight: 600, fontSize: 13, padding: '7px 14px',
            borderRadius: 100, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e8e6e2'}
          onMouseLeave={e => e.currentTarget.style.background = '#f0f1f5'}
        >
          ← חזור לתוצאות
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace('/auth') }}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontFamily: 'inherit', fontWeight: 600,
            fontSize: 12, padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
          }}
        >
          יציאה
        </button>
      </div>

      <div style={{ maxWidth: 440, width: '100%' }}>
        {/* Subtle party icon with design style */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(232,98,40,0.1)', border: '2px solid rgba(232,98,40,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 22px',
          animation: 'pop .5s cubic-bezier(.16,1,.3,1)',
        }}>🎉</div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 'clamp(26px,5vw,36px)', letterSpacing: '-0.02em',
          color: 'var(--text-primary)', marginBottom: 12,
          animation: 'fadeUp .6s .1s both',
        }}>
          הפוסטים שלך מוכנים!
        </h1>
        <p style={{
          color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 28,
          animation: 'fadeUp .6s .2s both',
        }}>
          השאר אימייל — ותהיה מהראשונים לגשת לגרסה המלאה. תוכן שבועי אוטומטי, בסגנון שלך, בלי מאמץ.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeUp .6s .3s both' }}
        >
          {/* Contained email input matching the design's pill-container style */}
          <div style={{
            display: 'flex', gap: 6,
            background: 'white', border: '1.5px solid var(--border)',
            borderRadius: 14, padding: 5,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="האימייל שלך"
              dir="ltr"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                padding: '12px 14px', fontSize: 15,
                color: 'var(--text-primary)', fontFamily: 'inherit',
                outline: 'none', minWidth: 0,
              }}
              onFocus={e => {
                const parent = e.target.parentElement!
                parent.style.borderColor = 'var(--navy)'
                parent.style.boxShadow = '0 0 0 3px rgba(26,13,8,0.08)'
              }}
              onBlur={e => {
                const parent = e.target.parentElement!
                parent.style.borderColor = 'var(--border)'
                parent.style.boxShadow = 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                background: !loading && email.trim() ? 'var(--navy)' : 'rgba(26,13,8,0.15)',
                color: !loading && email.trim() ? 'white' : 'rgba(26,13,8,0.4)',
                border: 'none', borderRadius: 10, padding: '0 20px',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                cursor: !loading && email.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >
              {loading ? 'שומר...' : 'שמור אותי ⚡'}
            </button>
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>
          )}
        </form>

        <button
          onClick={() => router.push('/results')}
          style={{
            marginTop: 16, background: 'none', border: 'none',
            color: 'var(--text-muted)', fontFamily: 'inherit',
            fontSize: 13, cursor: 'pointer', fontWeight: 600,
            display: 'block', width: '100%', textAlign: 'center', padding: 8,
          }}
        >
          אולי אחר כך
        </button>
      </div>
    </div>
  )
}
