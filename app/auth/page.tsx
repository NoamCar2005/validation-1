'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setEmail('')
        setPassword('')
        setError('בדוק את הדוא"ל שלך להשלמת ההרשמה')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה. אנא נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'כישלון כניסה דרך Google')
      setGoogleLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '15px 18px',
    border: '1.5px solid var(--border)', borderRadius: 10,
    fontFamily: 'inherit', fontSize: 15, background: 'white',
    color: 'var(--text-primary)', outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }

  return (
    <div
      className="screen-enter"
      style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, var(--navy) 0%, #1a1c35 100%)',
        padding: '40px 20px',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.07)', borderRadius: 16,
          padding: '10px 20px', border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 26,
        }}>
          <span style={{ fontSize: 22 }}>✍️</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>ContentMine</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, color: 'white', marginBottom: 8 }}>
          התחל ליצור תוכן
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
          התחבר כדי לקבל את הפוסטים שלך
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'white', borderRadius: 24, padding: '32px 28px',
        boxShadow: '0 24px 64px rgba(13,15,26,0.3)',
      }}>
        {/* Google */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: '14px 20px', background: 'white',
            border: '1.5px solid var(--border)', borderRadius: 12,
            fontWeight: 600, fontSize: 15, color: 'var(--text-primary)',
            cursor: 'pointer', transition: 'background 0.15s ease', marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontFamily: 'inherit',
            opacity: googleLoading || loading ? 0.6 : 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9f9fb')}
          onMouseLeave={e => (e.currentTarget.style.background = 'white')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? 'מתחבר...' : 'המשך עם Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>או</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 20,
          background: '#f3f4f8', borderRadius: 10, padding: 4,
        }}>
          {(['כניסה', 'הרשמה'] as const).map((label, i) => {
            const active = isSignUp === (i === 1)
            return (
              <button
                key={label}
                onClick={() => setIsSignUp(i === 1)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8,
                  fontWeight: 700, fontSize: 14,
                  background: active ? 'white' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease', fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="האימייל שלך"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            dir="ltr"
            required
            style={inputStyle}
            onFocus={e => {
              e.target.style.borderColor = 'var(--border-focus)'
              e.target.style.boxShadow = '0 0 0 3px rgba(232,98,40,0.12)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <input
            type="password"
            placeholder="הסיסמה שלך"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            dir="ltr"
            required
            style={inputStyle}
            onFocus={e => {
              e.target.style.borderColor = 'var(--border-focus)'
              e.target.style.boxShadow = '0 0 0 3px rgba(232,98,40,0.12)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          />

          {error && (
            <div style={{
              padding: '12px 16px', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 10,
            }}>
              <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading || !email || !password}
            style={{
              width: '100%', padding: '15px', marginTop: 4,
              background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 14, fontFamily: 'inherit',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
              boxShadow: 'var(--shadow-btn)', transition: 'all 0.18s ease',
              opacity: loading || googleLoading || !email || !password ? 0.45 : 1,
            }}
          >
            {loading ? 'מתחבר...' : isSignUp ? 'הרשם' : 'כנס'}
          </button>
        </form>
      </div>

      <p style={{ marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
        בלחיצה על &quot;כנס&quot; אתה מסכים לתנאי השימוש ומדיניות הפרטיות
      </p>
    </div>
  )
}
