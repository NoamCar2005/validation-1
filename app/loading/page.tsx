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
  const startTime = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [progress, setProgress] = useState(0)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) { router.replace('/'); return }
    if (called.current) return
    called.current = true
    startTime.current = Date.now()

    let mounted = true
    let pVal = 0

    // 150ms delay so browser paints width:0% before bar starts moving
    const startDelay = setTimeout(() => {
      if (!mounted) return
      intervalRef.current = setInterval(() => {
        pVal += (92 - pVal) * 0.03
        setProgress(Math.min(92, pVal))
      }, 400)
    }, 150)

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

        if (!res.ok || data.error) {
          const stage = data.stage ? `[stage:${data.stage}] ` : ''
          const debug = data.debug ? ` — ${data.debug}` : ''
          localStorage.setItem('generation_error', `${stage}${data.error || 'שגיאה לא ידועה'}${debug}`)
        } else {
          localStorage.setItem('generated_posts', JSON.stringify(data.posts))
        }
      } catch {
        localStorage.setItem('generation_error', 'שגיאה ביצירת התוכן. אנא נסה שוב.')
      }

      // Enforce minimum 4s display so animation is visible
      const elapsed = Date.now() - startTime.current
      const remaining = Math.max(0, 4000 - elapsed)

      finishRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setFinishing(true)
        setProgress(100)
        redirectRef.current = setTimeout(() => router.push('/results'), 1500)
      }, remaining)
    }

    generate()

    return () => {
      mounted = false
      clearTimeout(startDelay)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (finishRef.current) clearTimeout(finishRef.current)
      if (redirectRef.current) clearTimeout(redirectRef.current)
    }
  }, [router, supabase])

  return (
    <div
      className="screen-enter noise-overlay"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, var(--navy) 0%, #12152e 55%, #0a0c1e 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center', position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Exit button */}
      <div style={{ position: 'absolute', top: 16, left: 20 }}>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.replace('/auth')
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit', fontWeight: 600,
            fontSize: 12, padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
          }}
        >
          יציאה
        </button>
      </div>

      {/* Ambient background glows */}
      <div style={{
        position: 'fixed', top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,91,213,0.13) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', top: '65%', left: '40%',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,166,35,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* ── Spinner ───────────────────────────── */}
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 52 }}>
        {/* Outer pulse rings */}
        <div className="pulse-ring" style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(245,166,35,0.07)',
        }} />
        <div className="pulse-ring-delayed" style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(245,166,35,0.04)',
        }} />

        {/* Outer spinner ring */}
        <div className="spinner-ring" style={{
          position: 'absolute', top: '50%', left: '50%',
          marginTop: -40, marginLeft: -40,
          width: 80, height: 80, borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.07)',
          borderTopColor: 'var(--accent)',
          borderRightColor: 'rgba(245,166,35,0.4)',
        }} />

        {/* Inner counter-spinning ring */}
        <div className="spinner-ring2" style={{
          position: 'absolute', top: '50%', left: '50%',
          marginTop: -26, marginLeft: -26,
          width: 52, height: 52, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.05)',
          borderTopColor: 'var(--indigo)',
          borderLeftColor: 'rgba(79,91,213,0.4)',
        }} />

        {/* Centre glow dot */}
        <div className="glow-pulse" style={{
          position: 'absolute', top: '50%', left: '50%',
          marginTop: -7, marginLeft: -7,
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 12px 4px rgba(245,166,35,0.35)',
        }} />
      </div>

      {/* Headline */}
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(22px,4vw,30px)',
        fontWeight: 900, color: 'white',
        marginBottom: 18, letterSpacing: '-0.02em',
      }}>
        מייצרים את התוכן שלך...
      </h2>

      {/* Rotating messages */}
      <div style={{ marginBottom: 48, minHeight: 32 }}>
        <LoadingMessages />
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 12 }}>
        <div style={{
          height: 6, background: 'rgba(255,255,255,0.07)',
          borderRadius: 100, overflow: 'hidden',
        }}>
          <div
            style={{
              height: '100%', borderRadius: 100,
              background: 'linear-gradient(90deg, var(--indigo), var(--accent))',
              width: `${progress}%`,
              transition: finishing ? 'width 1.2s ease' : 'width 0.5s ease',
              boxShadow: progress > 5 ? '0 0 8px rgba(245,166,35,0.4)' : 'none',
            }}
          />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8,
        }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
            {Math.round(progress)}%
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
            100%
          </span>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.24)', fontSize: 13 }}>
        אנחנו בוחנים את האתר שלך לעומק — שווה לחכות ✨
      </p>
    </div>
  )
}
