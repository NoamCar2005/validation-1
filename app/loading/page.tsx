'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingMessages from '@/components/LoadingMessages'

export default function LoadingPage() {
  const router = useRouter()
  const supabase = createClient()
  const called = useRef(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) { router.replace('/'); return }
    if (called.current) return
    called.current = true

    // Slow asymptotic progress bar — never promises a time
    let pVal = 0
    const progInterval = setInterval(() => {
      pVal += (92 - pVal) * 0.03
      setProgress(Math.min(92, pVal))
    }, 400)

    async function generate() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token ?? supabaseAnonKey

        const res = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ user_id: userId }),
        })

        const data = await res.json()
        clearInterval(progInterval)
        setProgress(100)

        if (!res.ok || data.error) {
          localStorage.setItem('generation_error', data.error || 'שגיאה לא ידועה')
        } else {
          localStorage.setItem('generated_posts', JSON.stringify(data.posts))
        }
        setTimeout(() => router.push('/results'), 500)
      } catch {
        clearInterval(progInterval)
        localStorage.setItem('generation_error', 'שגיאה ביצירת התוכן. אנא נסה שוב.')
        setTimeout(() => router.push('/results'), 500)
      }
    }

    generate()
    return () => clearInterval(progInterval)
  }, [router, supabase])

  return (
    <div
      className="screen-enter"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(155deg, var(--navy) 0%, #14162b 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center', position: 'relative',
      }}
    >
      {/* Logout */}
      <div style={{ position: 'absolute', top: 16, left: 20 }}>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.replace('/auth')
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.45)', fontFamily: 'inherit', fontWeight: 600,
            fontSize: 12, padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
          }}
        >
          יציאה
        </button>
      </div>

      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,91,213,0.15) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Spinner with pulse rings */}
      <div style={{ position: 'relative', marginBottom: 48 }}>
        <div
          className="pulse-ring"
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 90, height: 90, borderRadius: '50%',
            background: 'rgba(245,166,35,0.08)',
          }}
        />
        <div
          className="pulse-ring-delayed"
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 90, height: 90, borderRadius: '50%',
            background: 'rgba(245,166,35,0.04)',
          }}
        />
        <div
          className="spinner-ring"
          style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '3px solid rgba(245,166,35,0.15)',
            borderTopColor: 'var(--accent)',
          }}
        />
        <div
          className="glow-pulse"
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--accent)',
          }}
        />
      </div>

      <h2 style={{
        fontSize: 26, fontWeight: 800, color: 'white',
        marginBottom: 16, letterSpacing: '-0.02em',
      }}>
        מייצרים את התוכן שלך...
      </h2>

      <div style={{ marginBottom: 44 }}>
        <LoadingMessages />
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 360, marginBottom: 24 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            className="progress-bar-animate"
            style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, var(--indigo), var(--accent))',
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
        אנחנו בוחנים את האתר שלך לעומק — שווה לחכות ✨
      </p>
    </div>
  )
}
