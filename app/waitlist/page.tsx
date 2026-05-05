'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  const btnLogoutStyle: React.CSSProperties = {
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-muted)', fontFamily: 'inherit', fontWeight: 600,
    fontSize: 12, padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
  }

  if (submitted) {
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
        <div style={{ position: 'absolute', top: 16, left: 20 }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/auth') }}
            style={btnLogoutStyle}
          >
            יציאה
          </button>
        </div>

        <div style={{ maxWidth: 460 }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'rgba(37,211,102,0.1)', border: '2px solid rgba(37,211,102,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, margin: '0 auto 22px',
          }}>🙌</div>
          <h1 style={{
            fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900,
            color: 'var(--text-primary)', marginBottom: 14, letterSpacing: '-0.02em',
          }}>
            אתה ברשימה!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
            ניצור איתך קשר כשהגרסה המלאה תעלה. בינתיים — הצטרף לקהילה שלנו בוואטסאפ לטיפים שבועיים ועדכונים ראשונים.
          </p>
          <button
            onClick={handleWhatsApp}
            style={{
              width: '100%', padding: '16px 24px',
              background: 'var(--green)', color: 'white',
              borderRadius: 14, fontFamily: 'inherit', fontWeight: 800, fontSize: 16,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(37,211,102,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.18s ease', marginBottom: 12,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--green-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--green)')}
          >
            <span style={{ fontSize: 20 }}>📲</span>
            הצטרף לקבוצת הוואטסאפ
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            אולי אחר כך
          </button>
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
      <div style={{ position: 'absolute', top: 16, display: 'flex', gap: 10, left: 20 }}>
        <button
          onClick={() => router.push('/results')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f0f1f5', border: 'none',
            color: 'var(--text-secondary)', fontFamily: 'inherit',
            fontWeight: 600, fontSize: 13, padding: '7px 14px',
            borderRadius: 100, cursor: 'pointer',
          }}
        >
          ← חזור לתוצאות
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace('/auth') }}
          style={btnLogoutStyle}
        >
          יציאה
        </button>
      </div>

      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ fontSize: 50, marginBottom: 18 }}>🎉</div>
        <h1 style={{
          fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900,
          color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em',
        }}>
          הפוסטים שלך מוכנים!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
          השאר אימייל וניצור איתך קשר כשהגרסה המלאה תהיה מוכנה — עם עוד תוכן, עוד פלטפורמות, ועוד.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="האימייל שלך"
            dir="ltr"
            style={{
              width: '100%', padding: '15px 18px',
              border: '1.5px solid var(--border)', borderRadius: 10,
              fontFamily: 'inherit', fontSize: 15, background: 'white',
              color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--border-focus)'
              e.target.style.boxShadow = '0 0 0 3px rgba(79,91,213,0.12)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          />
          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            style={{
              width: '100%', padding: '15px',
              background: 'var(--indigo)', color: 'white',
              border: 'none', borderRadius: 14, fontFamily: 'inherit',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
              boxShadow: 'var(--shadow-btn)', transition: 'all 0.18s ease',
              opacity: loading || !email.trim() ? 0.45 : 1,
            }}
          >
            {loading ? 'שומר...' : 'שמור אותי ברשימה ←'}
          </button>
        </form>

        <button
          onClick={() => router.push('/results')}
          style={{
            marginTop: 18, background: 'none', border: 'none',
            color: 'var(--text-muted)', fontFamily: 'inherit',
            fontSize: 14, cursor: 'pointer', textDecoration: 'underline',
            display: 'block', width: '100%', textAlign: 'center',
          }}
        >
          אולי אחר כך
        </button>
      </div>
    </div>
  )
}
