'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Jwugzbe2lLSLSDTLkboAH6?mode=gi_t'

type PostType = 'value' | 'trust' | 'cta'
type Channel = 'instagram' | 'linkedin' | 'facebook'

interface Post {
  post_type: PostType
  content: string
  copy: string
  image_url?: string | null
  channel_recommended: Channel
}

const TAB_META: Record<PostType, { label: string; icon: string; shortLabel: string; description: string }> = {
  value: { label: 'ערך מקצועי', icon: '💡', shortLabel: 'ערכי', description: 'ידע שמצב אותך כמומחה' },
  trust: { label: 'בניית אמון', icon: '🤝', shortLabel: 'אמון', description: 'הסיפור שלך ומדוע לבחור בך' },
  cta: { label: 'קריאה לפעולה', icon: '🎯', shortLabel: 'CTA', description: 'קריאה שמביאה לקוחות' },
}

const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: 'אינסטגרם',
  linkedin: 'לינקדאין',
  facebook: 'פייסבוק',
}

function formatPostContent(text: string): string {
  if (!text) return ''
  if (text.includes('\n')) return text
  return text.replace(/([.!?])\s+(?=[֐-׿])/g, '$1\n\n').trim()
}

export default function ResultsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [selectedTab, setSelectedTab] = useState<PostType>('value')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [wlName, setWlName] = useState('')
  const [wlEmail, setWlEmail] = useState('')
  const [wlPhone, setWlPhone] = useState('')
  const [wlLoading, setWlLoading] = useState(false)
  const [wlDone, setWlDone] = useState(false)
  const [wlError, setWlError] = useState('')
  const [wlFocused, setWlFocused] = useState<string | null>(null)

  useEffect(() => {
    const err = localStorage.getItem('generation_error')
    if (err) {
      setError(err)
      localStorage.removeItem('generation_error')
      return
    }

    const raw = localStorage.getItem('generated_posts')
    if (!raw) { router.replace('/'); return }

    try {
      setPosts(JSON.parse(raw))
      setTimeout(() => setRevealed(true), 120)
    } catch {
      router.replace('/')
    }
  }, [router])

  useEffect(() => { setCopied(false) }, [selectedTab])

  const sharedImageUrl = posts.find(p => p.post_type === 'value')?.image_url ?? null
  const activePost = posts.find(p => p.post_type === selectedTab)

  async function handleCopy() {
    if (!activePost) return
    try {
      await navigator.clipboard.writeText(`${activePost.content}\n\n${activePost.copy}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  async function handleDownloadImage() {
    if (!sharedImageUrl) return
    setDownloading(true)
    try {
      const res = await fetch(sharedImageUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contentmine-post.jpg'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wlName.trim() || !wlEmail.includes('@') || wlPhone.replace(/\D/g, '').length < 9) {
      setWlError('אנא מלא את כל השדות בצורה תקינה')
      return
    }
    setWlLoading(true)
    setWlError('')
    try {
      const userId = localStorage.getItem('user_id')
      if (userId) {
        await supabase.from('users').update({ email: wlEmail.trim() }).eq('id', userId)
      }
    } catch {
      // non-critical
    }
    setWlLoading(false)
    setWlDone(true)
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
        background: 'var(--body-bg)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(220,38,38,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 20,
        }}>😕</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24, fontWeight: 900,
          color: 'var(--text-primary)', marginBottom: 12,
        }}>
          אופס, משהו השתבש
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28, maxWidth: 400 }}>
          {error}
        </p>
        <button
          onClick={() => router.push('/loading')}
          style={{
            padding: '14px 32px', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 14, fontFamily: 'inherit',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: 'var(--shadow-btn)',
          }}
        >
          נסה שוב
        </button>
      </div>
    )
  }

  if (!posts.length) return null

  return (
    <div className="screen-enter" style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Compact App Bar ──────────────────────────── */}
      <div style={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 3vw, 36px)',
        background: 'var(--navy)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Back */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
            borderRadius: 9, padding: '7px 13px',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.11)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
          }}
        >
          ← אתר אחר
        </button>

        {/* Center: title + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(37,211,102,0.1)',
            border: '1px solid rgba(37,211,102,0.2)',
            color: '#3DDC84',
            borderRadius: 100, padding: '4px 10px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
            animation: 'pop 0.5s',
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              background: 'var(--green)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#1A0D08" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            {posts.length} פוסטים מוכנים
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17, fontWeight: 900,
            color: 'white', margin: 0, letterSpacing: '-0.02em',
          }}>
            התוכן שלך מוכן לפרסום
          </h1>
        </div>

        {/* WhatsApp CTA */}
        <a
          href="#waitlist"
          onClick={e => {
            e.preventDefault()
            document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #25D366 0%, #1aad54 100%)',
            color: 'white',
            fontFamily: 'inherit', fontWeight: 800, fontSize: 13,
            border: 'none', borderRadius: 9, padding: '8px 16px',
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
            transition: 'all 0.15s', textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 22px rgba(37,211,102,0.55)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,0.4)'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          הצטרף לקהילה
        </a>
      </div>

      {/* ── Main Split ──────────────────────────────── */}
      {revealed && activePost && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          position: 'relative',
        }}>

          {/* ── LEFT: Full-bleed image ───────────────── */}
          <div style={{
            position: 'relative',
            background: 'linear-gradient(160deg, #160E0A 0%, var(--navy) 100%)',
            overflow: 'hidden',
          }}>
            {sharedImageUrl ? (
              <Image
                src={sharedImageUrl}
                alt="תמונה לפוסט"
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
              }}>
                <div style={{ fontSize: 80, opacity: 0.08, filter: 'grayscale(1)' }}>🖼️</div>
                <p style={{
                  color: 'rgba(255,255,255,0.18)', fontSize: 12,
                  fontWeight: 600, letterSpacing: '0.08em', margin: 0,
                }}>
                  תמונה תיווצר בקרוב
                </p>
              </div>
            )}
            {/* depth vignette at bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
              background: 'linear-gradient(transparent, rgba(10,12,25,0.45))',
              pointerEvents: 'none',
            }} />

            {/* Download button */}
            {sharedImageUrl && (
              <button
                onClick={handleDownloadImage}
                disabled={downloading}
                style={{
                  position: 'absolute', bottom: 20, left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'rgba(19,16,12,0.72)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(232,98,40,0.35)',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                  borderRadius: 100, padding: '9px 18px',
                  cursor: downloading ? 'default' : 'pointer',
                  opacity: downloading ? 0.6 : 1,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
                onMouseEnter={e => {
                  if (!downloading) {
                    e.currentTarget.style.background = 'var(--accent)'
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }
                }}
                onMouseLeave={e => {
                  if (!downloading) {
                    e.currentTarget.style.background = 'rgba(19,16,12,0.72)'
                    e.currentTarget.style.borderColor = 'rgba(232,98,40,0.35)'
                  }
                }}
              >
                {downloading ? (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spinnerAnim 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    מוריד...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    הורד תמונה
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── RIGHT: Tabs + Content ────────────────── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: 'white',
            overflow: 'hidden',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            position: 'relative',
          }}>

            {/* Tab bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              background: 'var(--warm-white)',
            }}>
              {(['value', 'trust', 'cta'] as PostType[]).map((tab, i) => {
                const meta = TAB_META[tab]
                const isActive = selectedTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    style={{
                      flex: 1,
                      padding: '16px 8px 14px',
                      background: isActive ? 'white' : 'transparent',
                      border: 'none',
                      borderBottom: isActive ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                      borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                      marginBottom: '-1px',
                      fontFamily: 'inherit',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 12,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(232,98,40,0.04)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }
                    }}
                  >
                    <span style={{
                      fontSize: 20,
                      transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      display: 'block',
                    }}>
                      {meta.icon}
                    </span>
                    <span style={{ lineHeight: 1.2, textAlign: 'center' }}>
                      {meta.label}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        fontWeight: 400, lineHeight: 1.2, textAlign: 'center',
                        maxWidth: 120,
                      }}>
                        {meta.description}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Post content — scrollable, re-animates on tab change */}
            <div
              key={selectedTab}
              style={{
                flex: 1, overflowY: 'auto',
                padding: 'clamp(20px, 3.5vw, 36px) clamp(20px, 4vw, 40px)',
                animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
              }}
            >
              {/* Channel pill */}
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: 'var(--accent-soft)',
                  color: '#C04818',
                  borderRadius: 100, padding: '4px 11px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                }}>
                  {CHANNEL_LABEL[activePost.channel_recommended]}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  · מומלץ לפרסום
                </span>
              </div>

              {/* Post text */}
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(14px, 1.4vw, 16px)',
                lineHeight: 2.05,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontWeight: 400,
                letterSpacing: '0.005em',
              }}>
                {formatPostContent(activePost.content)}
              </p>

              {/* Tagline block */}
              {activePost.copy && (
                <div style={{
                  marginTop: 24,
                  padding: '14px 18px',
                  background: 'var(--accent-soft)',
                  borderRadius: 12,
                  borderRight: '3px solid var(--accent)',
                }}>
                  <span style={{
                    display: 'block',
                    fontSize: 9, fontWeight: 700, color: 'var(--accent)',
                    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    כותרת הפוסט
                  </span>
                  <p style={{
                    margin: 0, fontSize: 14, lineHeight: 1.7,
                    color: 'var(--text-primary)', fontStyle: 'italic', fontWeight: 600,
                  }}>
                    {activePost.copy}
                  </p>
                </div>
              )}
            </div>

            {/* Copy button — pinned footer */}
            <div style={{
              padding: '16px clamp(20px, 4vw, 40px)',
              borderTop: '1px solid var(--border)',
              background: 'var(--warm-white)',
              flexShrink: 0,
            }}>
              <button
                onClick={handleCopy}
                style={{
                  width: '100%', padding: '14px 20px',
                  borderRadius: 12,
                  background: copied
                    ? 'linear-gradient(135deg, #25D366 0%, #1aad54 100%)'
                    : 'linear-gradient(135deg, var(--accent) 0%, #C84F18 100%)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  boxShadow: copied
                    ? '0 8px 26px rgba(37,211,102,0.32)'
                    : '0 8px 26px rgba(232,98,40,0.28)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  if (!copied) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 14px 36px rgba(232,98,40,0.42)'
                  }
                }}
                onMouseLeave={e => {
                  if (!copied) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 8px 26px rgba(232,98,40,0.28)'
                  }
                }}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    הועתק בהצלחה!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    העתק פוסט
                  </>
                )}
              </button>
            </div>

            {/* Gradient fade on right side */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 60%, white 100%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Scroll hint — centered at bottom */}
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <style>{`
              @keyframes scrollBounce {
                0%, 100% { transform: translateY(0); opacity: 1; }
                50% { transform: translateY(-8px); opacity: 0.7; }
              }
            `}</style>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              animation: 'scrollBounce 2.4s ease-in-out infinite',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                גלול
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Waitlist Section ─────────────────────────── */}
      <section id="waitlist" style={{
        background: 'linear-gradient(165deg, #130E09 0%, var(--navy) 60%, #1A1410 100%)',
        padding: 'clamp(64px, 8vw, 96px) clamp(24px, 6vw, 80px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* ambient glow */}
        <div style={{
          position: 'absolute', top: -80, right: '15%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,211,102,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: '10%',
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,98,40,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(37,211,102,0.1)',
              border: '1px solid rgba(37,211,102,0.18)',
              color: '#3DDC84',
              borderRadius: 100, padding: '6px 16px',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              marginBottom: 22, animation: 'fadeUp 0.5s both',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              קהילת ContentMine
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(30px, 4.5vw, 48px)',
              fontWeight: 900, color: 'white',
              letterSpacing: '-0.03em', lineHeight: 1.12,
              marginBottom: 16, animation: 'fadeUp 0.5s 0.1s both',
            }}>
              רוצה שזה יקרה<br />
              <span style={{ color: 'var(--accent)' }}>כל שבוע - אוטומטית?</span>
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.48)',
              fontSize: 16, lineHeight: 1.75,
              maxWidth: 520, margin: '0 auto',
              animation: 'fadeUp 0.5s 0.18s both',
            }}>
              הצטרף לקהילה של בעלי עסקים שמפרסמים בקביעות — בלי לשבת לכתוב, בלי להתאמץ, בלי להמציא את הגלגל כל שבוע.
            </p>
          </div>

          {/* Two columns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(32px, 5vw, 64px)',
            alignItems: 'start',
          }}>

            {/* LEFT: Benefits + WhatsApp CTA */}
            <div style={{ animation: 'fadeUp 0.5s 0.25s both' }}>
              <p style={{
                fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: 20,
              }}>
                מה מקבלים בקהילה
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
                {[
                  { icon: '📅', label: 'תוכן שבועי מוכן לפרסום' },
                  { icon: '🚀', label: 'גישה ראשונה לפיצ׳רים חדשים' },
                  { icon: '💬', label: 'קהילת בעלי עסקים ישראלים' },
                  { icon: '🎁', label: 'שבוע ראשון בגרסה המלאה — חינם' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {item.icon}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: 15, fontWeight: 500, lineHeight: 1.4 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'linear-gradient(135deg, #25D366 0%, #1aad54 100%)',
                  color: 'white', borderRadius: 14, padding: '17px 24px',
                  fontFamily: 'inherit', fontWeight: 800, fontSize: 16,
                  textDecoration: 'none',
                  boxShadow: '0 10px 32px rgba(37,211,102,0.38)',
                  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 16px 44px rgba(37,211,102,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 10px 32px rgba(37,211,102,0.38)'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                הצטרף לקהילה — חינם לגמרי
              </a>

              <p style={{
                color: 'rgba(255,255,255,0.22)', fontSize: 12,
                textAlign: 'center', marginTop: 12,
              }}>
                חינמי לחלוטין · ללא התחייבות
              </p>
            </div>

            {/* RIGHT: Waitlist form */}
            <div style={{ animation: 'fadeUp 0.5s 0.32s both' }}>
              {wlDone ? (
                <div style={{
                  background: 'rgba(37,211,102,0.06)',
                  border: '1px solid rgba(37,211,102,0.2)',
                  borderRadius: 20, padding: '44px 32px',
                  textAlign: 'center',
                  animation: 'fadeUp 0.4s both',
                }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #25D366, #1DB954)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 30, margin: '0 auto 20px',
                    boxShadow: '0 10px 28px rgba(37,211,102,0.35)',
                  }}>
                    🎉
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 24, fontWeight: 900, color: 'white',
                    letterSpacing: '-0.02em', marginBottom: 12,
                  }}>
                    אתה בפנים!
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    ניצור איתך קשר בקרוב עם גישה מוקדמת למערכת המלאה.
                  </p>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 20, padding: 'clamp(24px, 4vw, 36px)',
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20, fontWeight: 800, color: 'white',
                    letterSpacing: '-0.02em', marginBottom: 8,
                  }}>
                    שמור לי מקום ברשימה
                  </h3>
                  <p style={{
                    color: 'rgba(255,255,255,0.38)', fontSize: 13, lineHeight: 1.55, marginBottom: 24,
                  }}>
                    הודעה ראשונה כשמשיקים + שבוע חינם כשמתחילים
                  </p>

                  <form onSubmit={handleWaitlistSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { key: 'name', label: 'שם מלא', type: 'text', val: wlName, set: setWlName, ph: 'ישראל ישראלי', dir: 'rtl' },
                      { key: 'email', label: 'כתובת אימייל', type: 'email', val: wlEmail, set: setWlEmail, ph: 'you@example.com', dir: 'ltr' },
                      { key: 'phone', label: 'טלפון נייד', type: 'tel', val: wlPhone, set: setWlPhone, ph: '050-0000000', dir: 'ltr' },
                    ].map(field => (
                      <div key={field.key}>
                        <label style={{
                          display: 'block', fontSize: 11, fontWeight: 700,
                          color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em',
                          textTransform: 'uppercase', marginBottom: 7,
                        }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          value={field.val}
                          onChange={e => { field.set(e.target.value); setWlError('') }}
                          placeholder={field.ph}
                          dir={field.dir}
                          required
                          style={{
                            width: '100%', padding: '12px 14px',
                            background: wlFocused === field.key
                              ? 'rgba(255,255,255,0.09)'
                              : 'rgba(255,255,255,0.05)',
                            border: `1.5px solid ${wlFocused === field.key
                              ? 'rgba(232,98,40,0.5)'
                              : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 10,
                            fontFamily: 'inherit', fontSize: 14,
                            color: 'white', outline: 'none',
                            transition: 'all 0.15s',
                            boxSizing: 'border-box',
                          }}
                          onFocus={() => setWlFocused(field.key)}
                          onBlur={() => setWlFocused(null)}
                        />
                      </div>
                    ))}

                    {wlError && (
                      <p style={{
                        color: '#f87171', fontSize: 13, fontWeight: 600,
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.2)',
                        padding: '9px 13px', borderRadius: 9, margin: 0,
                      }}>
                        {wlError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={wlLoading || !wlName || !wlEmail || !wlPhone}
                      style={{
                        marginTop: 4, padding: '14px',
                        background: 'var(--accent)', color: 'var(--navy)',
                        border: 'none', borderRadius: 12,
                        fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
                        cursor: !wlName || !wlEmail || !wlPhone ? 'default' : 'pointer',
                        opacity: wlLoading || !wlName || !wlEmail || !wlPhone ? 0.4 : 1,
                        boxShadow: '0 6px 20px rgba(232,98,40,0.32)',
                        transition: 'all 0.2s',
                        letterSpacing: '-0.01em',
                      }}
                      onMouseEnter={e => {
                        if (wlName && wlEmail && wlPhone)
                          e.currentTarget.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      {wlLoading ? 'שולח...' : 'אני רוצה גישה מוקדמת ⚡'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
