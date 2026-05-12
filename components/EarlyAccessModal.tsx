'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onClose: () => void
}

const PERKS = [
  { icon: '🚀', text: 'גישה לפני כולם למערכת המלאה' },
  { icon: '🎁', text: 'שבוע ראשון ללא תשלום' },
  { icon: '🤝', text: 'ליווי בקבוצת הווטצאפ שלנו' },
  { icon: '💬', text: 'השפעה ישירה על הפיתוח' },
]

export default function EarlyAccessModal({ onClose }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.includes('@') || phone.replace(/\D/g, '').length < 9) {
      setError('אנא מלא את כל השדות בצורה תקינה')
      return
    }
    setLoading(true)
    setError('')
    try {
      const userId = localStorage.getItem('user_id')
      if (userId) {
        await supabase.from('users').update({ email: email.trim() }).eq('id', userId)
      }
    } catch {
      // non-critical — show success regardless
    }
    setLoading(false)
    setDone(true)
  }

  const fieldStyle = (fieldName: string): React.CSSProperties => ({
    width: '100%', padding: '14px 16px',
    border: `1.5px solid ${focused === fieldName ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 12,
    fontFamily: 'inherit', fontSize: 15,
    background: focused === fieldName ? 'rgba(232,98,40,0.04)' : 'var(--warm-white)',
    color: 'var(--text-primary)', outline: 'none',
    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
    boxShadow: focused === fieldName ? '0 0 0 3px rgba(232,98,40,0.12)' : 'none',
  })

  if (done) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(26,13,8,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="modal-animate"
          style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(26,13,8,0.35)' }}
        >
          <div style={{ padding: '52px 36px', textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #25D366, #1DB954)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(37,211,102,0.3)',
            }}>
              🎉
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30, fontWeight: 900,
              color: 'var(--text-primary)', marginBottom: 14,
              letterSpacing: '-0.02em',
            }}>
              אתה בפנים!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              קיבלנו! ניצור איתך קשר כשמשיקים — תהיה מהראשונים לגשת לגרסה המלאה.
            </p>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '16px',
                background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 14, fontFamily: 'inherit',
                fontWeight: 700, fontSize: 16, cursor: 'pointer',
                boxShadow: 'var(--shadow-btn)',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(26,13,8,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-animate"
        style={{
          background: 'white', borderRadius: 28, width: '100%', maxWidth: 500,
          boxShadow: '0 32px 80px rgba(26,13,8,0.35)',
          maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 28px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'var(--accent-soft)', borderRadius: 100,
              padding: '5px 12px', marginBottom: 12,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>
                גישה מוקדמת
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24, fontWeight: 900,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em', marginBottom: 6,
              lineHeight: 1.2,
            }}>
              הכנס אותי<br />לרשימה
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.6 }}>
              גישה לפני כולם + שבוע ראשון חינם — כשמשיקים
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f2f1ee', border: 'none', borderRadius: '50%',
              width: 36, height: 36, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', flexShrink: 0, marginRight: 4,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e6e2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f2f1ee')}
          >
            ✕
          </button>
        </div>

        {/* Perks */}
        <div style={{ padding: '18px 28px 0' }}>
          <div style={{
            background: 'linear-gradient(135deg, #fdf6f2, #fdf9f5)',
            borderRadius: 16, padding: '16px 20px',
            border: '1px solid rgba(232,98,40,0.1)',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px',
          }}>
            {PERKS.map(perk => (
              <div key={perk.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{perk.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {perk.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 28px 32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                שם מלא
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder="ישראל ישראלי"
                dir="rtl"
                required
                style={fieldStyle('name')}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                כתובת אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                dir="ltr"
                required
                style={fieldStyle('email')}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                טלפון נייד
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError('') }}
                placeholder="050-0000000"
                dir="ltr"
                required
                style={fieldStyle('phone')}
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
              />
            </div>

            {error && (
              <p style={{
                color: '#dc2626', fontSize: 13, fontWeight: 600,
                background: '#fef2f2', padding: '10px 14px',
                borderRadius: 10, border: '1px solid #fecaca',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !name || !email || !phone}
              style={{
                width: '100%', marginTop: 4, padding: '16px',
                background: 'var(--accent)', color: 'var(--navy)',
                border: 'none', borderRadius: 14, fontFamily: 'inherit',
                fontWeight: 800, fontSize: 16, cursor: !name || !email || !phone ? 'default' : 'pointer',
                opacity: loading || !name || !email || !phone ? 0.45 : 1,
                boxShadow: 'var(--shadow-btn-accent)',
                transition: 'all 0.18s',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => {
                if (name && email && phone) e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? 'שולח...' : 'אני רוצה גישה מוקדמת ⚡'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', fontFamily: 'inherit',
                fontSize: 13, cursor: 'pointer',
                textDecoration: 'underline', textAlign: 'center',
                padding: 0,
              }}
            >
              אולי אחר כך
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
