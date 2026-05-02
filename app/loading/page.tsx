'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import LoadingMessages from '@/components/LoadingMessages'

export default function LoadingPage() {
  const router = useRouter()
  const called = useRef(false)

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      router.replace('/')
      return
    }
    if (called.current) return
    called.current = true

    async function generate() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        const res = await fetch(
          `${supabaseUrl}/functions/v1/generate-content`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({ user_id: userId }),
          }
        )

        const data = await res.json()

        if (!res.ok || data.error) {
          localStorage.setItem('generation_error', data.error || 'שגיאה לא ידועה')
          router.push('/results')
          return
        }

        localStorage.setItem('generated_posts', JSON.stringify(data.posts))
        router.push('/results')
      } catch {
        localStorage.setItem('generation_error', 'שגיאה ביצירת התוכן. אנא נסה שוב.')
        router.push('/results')
      }
    }

    generate()
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-10">
          מייצרים את התוכן שלך...
        </h2>
        <LoadingMessages />
        <p className="mt-10 text-sm text-gray-400">
          זה לוקח כ-30 שניות. כדאי להישאר 😊
        </p>
      </div>
    </main>
  )
}
