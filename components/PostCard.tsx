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

const POST_TYPE_META: Record<Post['post_type'], { icon: string; label: string; gradient: string }> = {
  value: { icon: '💡', label: 'ערך מקצועי',   gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  trust: { icon: '🤝', label: 'בניית אמון',   gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  cta:   { icon: '🎯', label: 'קריאה לפעולה', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
}

const CHANNEL_META: Record<Post['channel_recommended'], {
  label: string
  cssClass: string
  platformClass: string
  icon: React.ReactNode
}> = {
  instagram: {
    label: 'אינסטגרם',
    cssClass: 'badge-instagram',
    platformClass: 'platform-instagram',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  linkedin: {
    label: 'לינקדאין',
    cssClass: 'badge-linkedin',
    platformClass: 'platform-linkedin',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  facebook: {
    label: 'פייסבוק',
    cssClass: 'badge-facebook',
    platformClass: 'platform-facebook',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
}

function formatPostContent(text: string): string {
  if (!text) return text
  if (text.includes('\n')) return text
  // Insert paragraph breaks after sentence-ending punctuation before the next Hebrew character
  return text.replace(/([.!?])\s+(?=[֐-׿])/g, '$1\n\n').trim()
}

export default function PostCard({ post, index = 0 }: Props) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPreviewed, setIsPreviewed] = useState(false)
  const { icon, label: typeLabel, gradient } = POST_TYPE_META[post.post_type]
  const channel = CHANNEL_META[post.channel_recommended]

  const revealClass = index === 0 ? 'card-reveal-1' : index === 1 ? 'card-reveal-2' : 'card-reveal-3'
  const isLongPost = (post.content.match(/\n/g) || []).length >= 2 || post.content.length > 180

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
      className={revealClass}
      style={{
        background: 'white',
        borderRadius: 22,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: isPreviewed ? 'visible' : 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Platform header strip */}
      <div
        className={channel.platformClass}
        style={{
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {channel.icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'white', flex: 1 }}>
          {channel.label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)',
          background: 'rgba(255,255,255,0.15)',
          padding: '2px 8px', borderRadius: 100,
        }}>
          {icon} {typeLabel}
        </span>
      </div>

      {/* Image */}
      {post.image_url ? (
        <div className="relative w-full group" style={{ aspectRatio: isPreviewed ? 'auto' : '16/9', overflow: isPreviewed ? 'visible' : 'hidden', transition: 'all 0.3s ease' }}>
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
        <div style={{ background: gradient, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 42, opacity: 0.5 }}>{icon}</span>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '20px 20px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{
          fontSize: 14.5, lineHeight: 1.9,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          margin: 0,
          overflow: (isPreviewed || isExpanded) ? 'visible' : 'hidden',
          display: (isPreviewed || isExpanded) ? 'block' : '-webkit-box',
          WebkitLineClamp: (isPreviewed || isExpanded) ? 'unset' : 3,
          WebkitBoxOrient: 'vertical',
        }}>
          {formatPostContent(post.content)}
        </p>
        {isPreviewed && post.copy && (
          <p style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            fontStyle: 'italic',
            margin: '12px 0 0',
          }}>
            {post.copy}
          </p>
        )}
        {isLongPost && !isPreviewed && (
          <button
            onClick={() => setIsExpanded(v => !v)}
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '4px 0',
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            {isExpanded ? 'הצג פחות ↑' : 'קרא עוד ↓'}
          </button>
        )}
      </div>

      {/* Buttons */}
      <div style={{ padding: '16px 20px 20px', marginTop: 'auto' }}>
        <button
          onClick={() => setIsPreviewed(p => !p)}
          style={{
            width: '100%',
            marginBottom: 8,
            padding: '10px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13,
            background: isPreviewed ? 'var(--body-bg)' : 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          {isPreviewed ? 'סגור ←' : '👁 תצוגה מקדימה'}
        </button>

        <button
          onClick={handleCopy}
          style={{
            width: '100%', marginTop: 8, padding: '12px', borderRadius: 12,
            fontWeight: 700, fontSize: 13.5,
            background: copied ? 'var(--green)' : 'var(--navy)',
            color: 'white', border: 'none', cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: copied ? '0 4px 16px rgba(37,211,102,0.3)' : '0 6px 22px rgba(12,14,29,0.18)',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              הועתק!
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {downloading ? 'מוריד...' : '⬇ הורד תמונה'}
          </button>
        )}
      </div>
    </div>
  )
}
