'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Post {
  post_type: 'value' | 'trust' | 'cta'
  content: string
  copy: string
  image_url?: string
  channel_recommended: 'instagram' | 'linkedin' | 'facebook'
}

interface Props {
  post: Post
  index?: number
}

const POST_TYPE_LABELS: Record<Post['post_type'], string> = {
  value: '💡 ערך מקצועי',
  trust: '🤝 בניית אמון',
  cta: '🎯 קריאה לפעולה',
}

const CHANNEL_LABELS: Record<Post['channel_recommended'], string> = {
  instagram: 'אינסטגרם',
  linkedin: 'לינקדאין',
  facebook: 'פייסבוק',
}

const IMG_GRADIENTS: Record<Post['post_type'], { gradient: string; icon: string }> = {
  value: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '💡' },
  trust: { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '🤝' },
  cta:   { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '🎯' },
}

export default function PostCard({ post, index = 0 }: Props) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const { gradient, icon } = IMG_GRADIENTS[post.post_type]

  async function handleCopy() {
    const text = `${post.content}\n\n${post.copy}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  async function handleDownload() {
    if (!post.image_url) return
    setDownloading(true)
    try {
      const res = await fetch(post.image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${post.post_type}_post.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="card-reveal"
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animationDelay: `${index * 0.13}s`,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = 'var(--shadow-card-hover)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = 'var(--shadow-card)'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Image — real if available, gradient placeholder otherwise */}
      {post.image_url ? (
        <div className="relative w-full aspect-square group">
          <Image src={post.image_url} alt="תמונה לפוסט" fill className="object-cover" unoptimized />
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="absolute bottom-2 left-2 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {downloading ? '⏳ מוריד...' : '⬇ הורד'}
          </button>
        </div>
      ) : (
        <div className="img-placeholder" style={{ background: gradient }}>
          <span style={{ fontSize: 36, opacity: 0.55, position: 'relative', zIndex: 1 }}>{icon}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
            position: 'relative', zIndex: 1,
          }}>תמונה לפוסט</span>
        </div>
      )}

      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {POST_TYPE_LABELS[post.post_type]}
          </span>
          <span
            className={`badge-${post.channel_recommended}`}
            style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}
          >
            {CHANNEL_LABELS[post.channel_recommended]}
          </span>
        </div>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
        <p style={{
          fontSize: 13, lineHeight: 1.75, color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap', marginBottom: 12,
        }}>
          {post.content}
        </p>
        <p style={{
          fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
          paddingTop: 10, borderTop: '1px solid var(--border)', marginBottom: 14,
        }}>
          {post.copy}
        </p>
      </div>

      <div style={{ padding: '0 18px 18px', marginTop: 'auto' }}>
        <button
          onClick={handleCopy}
          style={{
            width: '100%', padding: '11px', borderRadius: 12,
            fontWeight: 700, fontSize: 14,
            background: copied ? '#22c55e' : 'var(--indigo)',
            color: 'white', border: 'none', cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: copied ? '0 4px 16px rgba(34,197,94,0.3)' : 'var(--shadow-btn)',
            fontFamily: 'inherit',
          }}
        >
          {copied ? '✓ הועתק!' : 'העתק פוסט'}
        </button>
        {post.image_url && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              width: '100%', marginTop: 8, padding: '10px', borderRadius: 12,
              fontWeight: 600, fontSize: 13, background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'inherit',
              opacity: downloading ? 0.5 : 1,
            }}
          >
            {downloading ? 'מוריד...' : '⬇ הורד תמונה'}
          </button>
        )}
      </div>
    </div>
  )
}
