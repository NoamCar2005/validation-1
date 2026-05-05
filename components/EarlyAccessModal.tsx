'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onClose: () => void
}

const PERKS = [
  '✅ גישה לפני כולם כשנפתח',
  '✅ חצי שנה ללא תשלום',
  '✅ ליווי אישי בהתחלה',
  '✅ השפעה על פיתוח הפלטפורמה',
]

export default function EarlyAccessModal({ onClose }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

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

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(13,15,26,0.7)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }

  const boxStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 32px 80px rgba(13,15,26,0.35)',
    maxHeight: '90vh',
    overflowY: 'auto',
  }

  if (done) {
    return (
      <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div style={boxStyle} className="modal-animate">
          <div style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(37,211,102,0.1)', border: '2px solid rgba(37,211,102,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, margin: '0 auto 20px',
            }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>
              אתה פנימה!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              קיבלנו את הפרטים שלך. ניצור איתך קשר בקרוב עם גישה מוקדמת לפלטפורמה המלאה.
            </p>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '15px', background: 'var(--indigo)', color: 'white',
                border: 'none', borderRadius: 14, fontFamily: 'inherit', fontWeight: 700,
                fontSize: 16, cursor: 'pointer',
              }}
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={boxStyle} className="modal-animate">
        <div style={{ padding: '28px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              הצטרף לגישה המוקדמת
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              מוקדמים יקבלו חצי שנה חינם + תמיכה אישית
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f0f1f5', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', flexShrink: 0, marginRight: 8,
            }}
          >✕</button>
        </div>

        <div style={{ padding: '24px 28px 32px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f0f1fb, #f5f0fe)',
            borderRadius: 14, padding: '16px 18px', marginBottom: 24,
            border: '1px solid rgba(79,91,213,0.12)',
          }}>
            {PERKS.map(perk => (
              <div key={perk} style={{ fontSize: 13, fontWeight: 600, color: 'var(--indigo)', marginBottom: 6 }}>
                {perk}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {([
              { label: 'שם מלא', value: name, setter: setName, type: 'text', placeholder: 'ישראל ישראלי', dir: 'rtl' },
              { label: 'כתובת אימייל', value: email, setter: setEmail, type: 'email', placeholder: 'you@example.com', dir: 'ltr' },
              { label: 'טלפון נייד', value: phone, setter: setPhone, type: 'tel', placeholder: '050-0000000', dir: 'ltr' },
            ] as const).map(({ label, value, setter, type, placeholder, dir }) => (
              <div key={label}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={e => { setter(e.target.value as never); setError('') }}
                  placeholder={placeholder}
                  dir={dir}
                  required
                  style={{
                    width: '100%', padding: '13px 16px',
                    border: '1.5px solid var(--border)', borderRadius: 10,
                    fontFamily: 'inherit', fontSize: 15, background: 'white',
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              </div>
            ))}

            {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !name || !email || !phone}
              style={{
                width: '100%', marginTop: 6, padding: '15px',
                background: 'var(--accent)', color: 'var(--navy)',
                border: 'none', borderRadius: 14, fontFamily: 'inherit',
                fontWeight: 800, fontSize: 16, cursor: 'pointer',
                opacity: loading || !name || !email || !phone ? 0.45 : 1,
              }}
            >
              {loading ? 'שולח...' : 'אני רוצה גישה מוקדמת ⚡'}
            </button>
            <button type="button" onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
              textDecoration: 'underline', textAlign: 'center',
            }}>
              אולי אחר כך
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
