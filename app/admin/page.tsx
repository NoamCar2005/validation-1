'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'noambusiness0405@gmail.com'

interface UserRow {
  id: string
  email: string | null
  website_url: string
  generations_remaining: number
  waitlist_joined: boolean
  post_count: number
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [authorized, setAuthorized] = useState<null | boolean>(null)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [setValues, setSetValues] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return }
      if (user.email !== ADMIN_EMAIL) { router.replace('/'); return }
      setAuthorized(true)
    })
  }, [router, supabase])

  const search = useCallback(async (q: string) => {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_search_users', { query: q })
    setLoading(false)
    if (error) {
      console.error(error)
      return
    }
    setRows((data ?? []) as UserRow[])
  }, [supabase])

  useEffect(() => {
    if (!authorized) return
    const t = setTimeout(() => search(query), 200)
    return () => clearTimeout(t)
  }, [query, authorized, search])

  async function applyCredits(userId: string, newAmount: number) {
    if (newAmount < 0) return
    const { data, error } = await supabase.rpc('admin_set_credits', {
      target_user_id: userId,
      new_amount: newAmount,
    })
    if (error) {
      alert(`שגיאה: ${error.message}`)
      return
    }
    setRows(prev => prev.map(r =>
      r.id === userId ? { ...r, generations_remaining: data as number } : r
    ))
  }

  if (authorized === null) return null
  if (!authorized) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--body-bg)', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 28, letterSpacing: '-0.02em', marginBottom: 24,
          color: 'var(--text-primary)',
        }}>
          ContentMine Admin
        </h1>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חפש לפי אימייל או כתובת אתר..."
          style={{
            width: '100%', padding: '12px 16px', fontSize: 15,
            border: '1.5px solid var(--border)', borderRadius: 12,
            background: 'white', color: 'var(--text-primary)',
            fontFamily: 'inherit', marginBottom: 20, outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {loading && <p style={{ color: 'var(--text-muted)' }}>טוען...</p>}
        {!loading && rows.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>אין תוצאות</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(r => (
            <div key={r.id} style={{
              background: 'white', border: '1px solid var(--border)',
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>
                  {r.email ?? '(no email)'}
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(r.created_at).toLocaleDateString('he-IL')}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'monospace' }} dir="ltr">
                {r.website_url}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 12 }}>
                <span>credits: <strong>{r.generations_remaining}</strong></span>
                <span>waitlist: <strong>{r.waitlist_joined ? '✓' : '–'}</strong></span>
                <span>posts: <strong>{Number(r.post_count)}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => applyCredits(r.id, r.generations_remaining - 1)}
                  disabled={r.generations_remaining <= 0}
                  style={btnStyle}
                >−1</button>
                <button
                  onClick={() => applyCredits(r.id, r.generations_remaining + 1)}
                  style={btnStyle}
                >+1</button>
                <input
                  type="number" min={0}
                  value={setValues[r.id] ?? ''}
                  onChange={e => setSetValues(s => ({ ...s, [r.id]: e.target.value }))}
                  placeholder="set"
                  style={{
                    width: 70, padding: '6px 8px', fontSize: 13,
                    border: '1px solid var(--border)', borderRadius: 8,
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => {
                    const v = parseInt(setValues[r.id] ?? '', 10)
                    if (Number.isFinite(v) && v >= 0) applyCredits(r.id, v)
                  }}
                  style={btnStyle}
                >apply</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'var(--navy)', color: 'white',
  border: 'none', borderRadius: 8,
  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
}
