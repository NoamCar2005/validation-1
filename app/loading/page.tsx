'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingMessages from '@/components/LoadingMessages'

// Stable singleton — prevents the supabase reference from changing on every
// render, which would cause the effect to re-run and kill the progress bar.
const supabase = createClient()

function ScannerVisualization({ stage }: { stage: number }) {
  const [websiteUrl, setWebsiteUrl] = useState('yoursite.co.il')
  useEffect(() => {
    const stored = localStorage.getItem('website_url')
    if (stored) setWebsiteUrl(stored)
  }, [])
  const showAnalysis = stage >= 1

  return (
    <div style={{ position: 'relative', width: 300, height: 220, zIndex: 5 }}>
      {/* Outer pulse rings */}
      <div className="pulse-ring" style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 220, height: 220, marginLeft: -110, marginTop: -110,
        borderRadius: '50%', border: '1.5px solid rgba(232,98,40,0.3)',
        pointerEvents: 'none',
      }} />
      <div className="pulse-ring-delayed" style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 220, height: 220, marginLeft: -110, marginTop: -110,
        borderRadius: '50%', border: '1.5px solid rgba(232,98,40,0.3)',
        pointerEvents: 'none',
      }} />

      {/* Mini website mockup */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 180, height: 130,
        background: 'rgba(255,255,255,0.08)',
        border: '1.5px solid rgba(255,255,255,0.18)',
        borderRadius: 12, overflow: 'hidden',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Fake browser bar */}
        <div style={{
          display: 'flex', gap: 4, padding: '6px 8px',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
            <span key={c} style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.6 }} />
          ))}
          <div style={{
            flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3,
            marginRight: 6, fontSize: 7, color: 'rgba(255,255,255,0.4)',
            padding: '0 6px', display: 'flex', alignItems: 'center', overflow: 'hidden',
          }} dir="ltr">
            {websiteUrl.replace(/^https?:\/\//, '').slice(0, 18)}
          </div>
        </div>

        {/* Fake content blocks */}
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 8, width: '70%', background: 'rgba(255,255,255,0.18)', borderRadius: 2 }} />
          <div style={{ height: 5, width: '90%', background: 'rgba(255,255,255,0.10)', borderRadius: 2 }} />
          <div style={{ height: 5, width: '85%', background: 'rgba(255,255,255,0.10)', borderRadius: 2 }} />
          <div style={{ height: 5, width: '60%', background: 'rgba(255,255,255,0.10)', borderRadius: 2 }} />
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <div style={{ flex: 1, height: 16, background: 'rgba(232,98,40,0.5)', borderRadius: 3 }} />
            <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }} />
          </div>
        </div>

        {/* Scanning beam */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          boxShadow: '0 0 12px var(--accent), 0 0 24px var(--accent)',
          animation: 'scanY 1.6s ease-in-out infinite',
          pointerEvents: 'none',
          opacity: stage < 3 ? 1 : 0,
          transition: 'opacity .5s',
        }} />

        {/* Analysis dots */}
        {showAnalysis && (
          <>
            <span style={{
              position: 'absolute', top: 28, right: 12,
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)',
              animation: 'dataPulse 1s 0.1s ease-in-out infinite',
            }} />
            <span style={{
              position: 'absolute', top: 50, right: 30,
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)',
              animation: 'dataPulse 1s 0.4s ease-in-out infinite',
            }} />
            <span style={{
              position: 'absolute', top: 70, right: 18,
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)',
              animation: 'dataPulse 1s 0.7s ease-in-out infinite',
            }} />
          </>
        )}
      </div>
    </div>
  )
}

export default function LoadingPage() {
  const router = useRouter()
  const startTime = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [progress, setProgress] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const stage = progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : 3

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) { router.replace('/'); return }

    // AbortController replaces the mounted/called pattern.
    // In React Strict Mode (dev), cleanup fires immediately and aborts the first
    // run, then the effect re-runs cleanly. In production, abort only fires when
    // the user actually navigates away (e.g. clicks exit).
    const abort = new AbortController()
    startTime.current = Date.now()

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current
      setProgress(Math.min(99, (elapsed / 90000) * 99))
    }, 400)

    async function generate() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const { data: { session } } = await supabase.auth.getSession()
        if (abort.signal.aborted) return

        const accessToken = session?.access_token
        if (!accessToken) {
          localStorage.setItem('generation_error', 'יש להתחבר מחדש')
          if (!abort.signal.aborted) router.replace('/auth')
          return
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({}),
          signal: abort.signal,
        })
        if (abort.signal.aborted) return

        const data = await res.json()
        if (!res.ok || data.error) {
          localStorage.setItem('generation_error', data.error || 'שגיאה לא ידועה')
        } else {
          localStorage.setItem('generated_posts', JSON.stringify(data.posts))
        }
      } catch {
        if (abort.signal.aborted) return
        localStorage.setItem('generation_error', 'שגיאה ביצירת התוכן. אנא נסה שוב.')
      }

      if (abort.signal.aborted) return

      if (intervalRef.current) clearInterval(intervalRef.current)
      setFinishing(true)
      setProgress(100)
      redirectRef.current = setTimeout(() => router.push('/results'), 1500)
    }

    generate()

    return () => {
      abort.abort()
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (redirectRef.current) clearTimeout(redirectRef.current)
    }
  }, [router])

  return (
    <div
      className="screen-enter noise-overlay"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, var(--navy) 0%, #1E1712 55%, #130E09 100%)',
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

      {/* Ambient glows */}
      <div style={{
        position: 'fixed', top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,98,40,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* ── Scanner visualization ── */}
      <ScannerVisualization stage={stage} />

      {/* ── Stage message + animated dots ── */}
      <div style={{ marginTop: 40, position: 'relative', zIndex: 5, maxWidth: 320, width: '100%' }}>
        <div style={{
          fontSize: 11.5, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14,
        }}>
          הבינה המלאכותית עובדת בשבילך
        </div>

        <LoadingMessages />

        {/* Progress bar */}
        <div style={{ marginTop: 28, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, var(--accent), #D45018)',
              width: `${progress}%`,
              transition: finishing ? 'width 1.2s ease' : 'width 0.5s ease',
              boxShadow: progress > 5 ? '0 0 12px var(--accent)' : 'none',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
}
