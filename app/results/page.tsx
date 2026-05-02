'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PostCard from '@/components/PostCard'

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

  useEffect(() => {
    const err = localStorage.getItem('generation_error')
    if (err) {
      setError(err)
      localStorage.removeItem('generation_error')
      return
    }

    const raw = localStorage.getItem('generated_posts')
    if (!raw) {
      router.replace('/')
      return
    }

    try {
      setPosts(JSON.parse(raw))
    } catch {
      router.replace('/')
    }
  }, [router])

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-2xl mb-4">😕</p>
        <h2 className="text-xl font-bold text-gray-800 mb-3">אופס, משהו השתבש</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => router.push('/loading')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          נסה שוב
        </button>
      </main>
    )
  }

  if (!posts.length) return null

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            הנה התוכן שלך מוכן לפרסום 🎯
          </h1>
          <p className="text-gray-500 text-base">
            3 פוסטים שנוצרו בדיוק בשבילך — מוכנים להעתקה
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <PostCard key={i} post={post} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => router.push('/waitlist')}
            className="px-10 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 transition-colors"
          >
            רוצה עוד תוכן? הצטרף לרשימה ←
          </button>
        </div>
      </div>
    </main>
  )
}
