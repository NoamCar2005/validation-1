'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  dark?: boolean
  onBack?: () => void
  backLabel?: string
}

export default function TopBar({ dark = true, onBack, backLabel = 'חזור' }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  const glassStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: dark ? 'rgba(13,15,26,0.88)' : 'rgba(247,246,242,0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: dark
      ? '1px solid rgba(255,255,255,0.07)'
      : '1px solid var(--border)',
  }

  const backBtnStyle: React.CSSProperties = dark
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.75)',
        fontFamily: 'inherit',
        fontWeight: 600,
        fontSize: 13,
        padding: '7px 14px',
        borderRadius: 100,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }
    : {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: '#f0f1f5',
        border: 'none',
        color: 'var(--text-secondary)',
        fontFamily: 'inherit',
        fontWeight: 600,
        fontSize: 13,
        padding: '7px 14px',
        borderRadius: 100,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }

  const logoutBtnStyle: React.CSSProperties = dark
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(255,255,255,0.45)',
        fontFamily: 'inherit',
        fontWeight: 600,
        fontSize: 12,
        padding: '6px 12px',
        borderRadius: 100,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }
    : {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
        fontFamily: 'inherit',
        fontWeight: 600,
        fontSize: 12,
        padding: '6px 12px',
        borderRadius: 100,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }

  return (
    <div style={glassStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onBack && (
          <button onClick={onBack} style={backBtnStyle}>
            ← {backLabel}
          </button>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontWeight: 800,
        fontSize: 14,
        color: dark ? 'rgba(255,255,255,0.85)' : 'var(--text-primary)',
      }}>
        <span>✍️</span> ContentMine
      </div>

      <button onClick={handleLogout} style={logoutBtnStyle}>
        יציאה
      </button>
    </div>
  )
}
