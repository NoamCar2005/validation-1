'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WaitlistFormProps {
  variant?: 'dark' | 'compact'
  onSuccess?: (granted: boolean, remaining: number) => void
}

export default function WaitlistForm({ variant = 'dark', onSuccess }: WaitlistFormProps) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
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

    const { data, error: rpcErr } = await supabase.rpc('join_waitlist', {
      p_name: name.trim(),
      p_email: email.trim(),
      p_phone: phone.trim(),
    })

    setLoading(false)
    if (rpcErr) {
      setError('שגיאה בהרשמה. אנא נסה שוב.')
      return
    }
    const row = Array.isArray(data) ? data[0] : data
    const granted = !!row?.granted
    const remaining = row?.generations_remaining ?? 0
    onSuccess?.(granted, remaining)
  }

  const isDark = variant === 'dark'

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { key: 'name', label: 'שם מלא', type: 'text', val: name, set: setName, ph: 'ישראל ישראלי', dir: 'rtl' },
        { key: 'email', label: 'כתובת אימייל', type: 'email', val: email, set: setEmail, ph: 'you@example.com', dir: 'ltr' },
        { key: 'phone', label: 'טלפון נייד', type: 'tel', val: phone, set: setPhone, ph: '050-0000000', dir: 'ltr' },
      ].map(field => (
        <div key={field.key}>
          <label htmlFor={`waitlist-${field.key}`} style={{
            display: 'block', fontSize: 11, fontWeight: 700,
            color: isDark ? 'rgba(255,255,255,0.4)' : 'var(--text-muted)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7,
          }}>
            {field.label}
          </label>
          <input
            id={`waitlist-${field.key}`}
            type={field.type}
            value={field.val}
            onChange={e => { field.set(e.target.value); setError('') }}
            placeholder={field.ph}
            dir={field.dir}
            required
            onFocus={() => setFocused(field.key)}
            onBlur={() => setFocused(null)}
            style={{
              width: '100%', padding: '12px 14px',
              background: isDark
                ? (focused === field.key ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)')
                : (focused === field.key ? 'white' : 'var(--body-bg)'),
              border: `1.5px solid ${focused === field.key
                ? 'rgba(232,98,40,0.5)'
                : (isDark ? 'rgba(255,255,255,0.1)' : 'var(--border)')}`,
              borderRadius: 10,
              fontFamily: 'inherit', fontSize: 14,
              color: isDark ? 'white' : 'var(--text-primary)',
              outline: 'none', transition: 'all 0.15s',
              boxSizing: 'border-box',
            }}
          />
        </div>
      ))}

      {error && (
        <p style={{
          color: '#f87171', fontSize: 13, fontWeight: 600,
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          padding: '9px 13px', borderRadius: 9, margin: 0,
        }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !name || !email || !phone}
        style={{
          marginTop: 4, padding: '14px',
          background: 'var(--accent)', color: 'var(--navy)',
          border: 'none', borderRadius: 12,
          fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
          cursor: !name || !email || !phone ? 'default' : 'pointer',
          opacity: loading || !name || !email || !phone ? 0.4 : 1,
          boxShadow: '0 6px 20px rgba(232,98,40,0.32)',
          transition: 'all 0.2s',
          letterSpacing: '-0.01em',
        }}
      >
        {loading ? 'שולח...' : '✨ הצטרף וקבל יצירה נוספת'}
      </button>
    </form>
  )
}
