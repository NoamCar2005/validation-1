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

  async function handleCopy() {
    const text = `${post.content}\n\n${post.copy}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
      {/* Image */}
      {post.image_url && (
        <div className="relative w-full aspect-square">
          <Image
            src={post.image_url}
            alt="תמונה לפוסט"
            fill
            className="object-cover"
          />
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

        {/* Copy button */}
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
      </div>
    </div>
  )
}
