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

const POST_TYPE_LABELS: Record<Post['post_type'], string> = {
  value: '💡 ערך מקצועי',
  trust: '🤝 בניית אמון',
  cta: '🎯 קריאה לפעולה',
}

const CHANNEL_COLORS: Record<Post['channel_recommended'], string> = {
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-blue-100 text-blue-700',
  facebook: 'bg-indigo-100 text-indigo-700',
}

const CHANNEL_LABELS: Record<Post['channel_recommended'], string> = {
  instagram: 'אינסטגרם',
  linkedin: 'לינקדאין',
  facebook: 'פייסבוק',
}

interface Props {
  post: Post
}

export default function PostCard({ post }: Props) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function handleCopy() {
    const text = `${post.content}\n\n${post.copy}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
      {/* Image */}
      {post.image_url && (
        <div className="relative w-full aspect-square group">
          <Image
            src={post.image_url}
            alt="תמונה לפוסט"
            fill
            className="object-cover"
            unoptimized
          />
          {/* Download overlay button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="absolute bottom-2 left-2 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {downloading ? (
              '⏳ מוריד...'
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                הורד תמונה
              </>
            )}
          </button>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">
            {POST_TYPE_LABELS[post.post_type]}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${CHANNEL_COLORS[post.channel_recommended]}`}>
            {CHANNEL_LABELS[post.channel_recommended]}
          </span>
        </div>

        {/* Content */}
        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap flex-1 mb-4">
          {post.content}
        </p>

        {/* Copy/tagline */}
        <p className="text-xs text-gray-400 italic mb-4 border-t pt-3">
          {post.copy}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copied ? '✓ הועתק!' : 'העתק פוסט'}
          </button>

          {post.image_url && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {downloading ? 'מוריד...' : 'הורד תמונה'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
