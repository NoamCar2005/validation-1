'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import PostCard from '@/components/PostCard'
import EarlyAccessModal from '@/components/EarlyAccessModal'

interface Post {
  post_type: 'value' | 'trust' | 'cta'
  content: string
  copy: string
  image_url?: string
  channel_recommended: 'instagram' | 'linkedin' | 'facebook'
}

export default function ResultsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [showModal, setShowModal] = useState(false)

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

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>😕</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
          אופס, משהו השתבש
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28 }}>{error}</p>
        <button
          onClick={() => router.push('/loading')}
          style={{
            padding: '14px 32px', background: 'var(--indigo)', color: 'white',
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
    <div className="screen-enter" style={{ minHeight: '100vh', background: 'var(--body-bg)' }}>
      <TopBar dark onBack={() => router.push('/survey')} backLabel="חזור לסקר" />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, #1a1c35 100%)',
        padding: 'clamp(40px, 7vw, 70px) 24px clamp(50px, 8vw, 80px)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 'clamp(36px, 7vw, 52px)', marginBottom: 12 }}>🎯</div>
          <h1 style={{
            fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 900,
            color: 'white', letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.15,
          }}>
            הנה התוכן שלך מוכן לפרסום
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
            3 פוסטים שנוצרו בדיוק בשבילך — כולל תמונות, טקסט, ופסקת נעילה
          </p>
        </div>
      </div>

      {/* Post cards */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) 24px 0' }}>
        {revealed && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {posts.map((post, i) => (
              <PostCard key={i} post={post} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp section */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '40px 24px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
          borderRadius: 24, padding: 'clamp(28px, 5vw, 44px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: 18, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div style={{ fontSize: 44 }}>📲</div>
          <div>
            <h3 style={{
              fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 900,
              color: 'white', marginBottom: 10, letterSpacing: '-0.02em',
            }}>
              הצטרף לקהילת ContentMine בוואטסאפ
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
              טיפים שבועיים לתוכן שיווקי, עדכונים ראשונים על הפלטפורמה, ושיחות עם בעלי עסקים כמוך — כולם יחד.
            </p>
          </div>
          <a
            href="https://chat.whatsapp.com/YOUR_GROUP_LINK"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#25D366', color: 'white',
              borderRadius: 14, padding: '14px 28px', textDecoration: 'none',
              fontFamily: 'inherit', fontWeight: 800, fontSize: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            הצטרף לקבוצה עכשיו
          </a>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            +340 בעלי עסקים כבר שם • ניתן לעזוב בכל עת
          </p>
        </div>
      </div>

      {/* Early access CTA */}
      <div style={{ textAlign: 'center', padding: 'clamp(40px, 7vw, 60px) 24px clamp(50px, 8vw, 80px)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
          אהבת את התוצאות? זו רק ההתחלה.
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--accent)', color: 'var(--navy)',
            fontFamily: 'inherit', fontWeight: 800, fontSize: 17,
            border: 'none', borderRadius: 'var(--radius-md)', padding: '18px 40px',
            cursor: 'pointer', boxShadow: 'var(--shadow-btn-accent)', transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent-hover)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--accent)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          הצטרף לגישה המוקדמת →
        </button>
      </div>

      {showModal && <EarlyAccessModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
