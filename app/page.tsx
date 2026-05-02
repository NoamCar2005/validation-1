'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    let cleanUrl = url.trim()
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }

    try {
      new URL(cleanUrl)
    } catch {
      setError('אנא הכנס כתובת אתר תקינה')
      return
    }

    setLoading(true)
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .insert({ website_url: cleanUrl })
        .select('id')
        .single()

      if (dbError) throw dbError

      localStorage.setItem('user_id', data.id)
      localStorage.setItem('website_url', cleanUrl)
      router.push('/survey')
    } catch (err) {
      setError('אירעה שגיאה. אנא נסה שוב.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl mx-auto text-center">

        {/* Hero */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          תן לנו 30 שניות —<br />
          <span className="text-indigo-600">נחזיר לך שבוע של תוכן</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
          מדביקים קישור לאתר שלך. הבינה המלאכותית מנתחת את העסק שלך<br className="hidden md:block" />
          ויוצרת 3 פוסטים מוכנים לפרסום — בסגנון שלך, בעברית.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="הכנס את כתובת האתר / דף הנחיתה שלך"
            className="flex-1 px-5 py-4 text-base rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right bg-white"
            disabled={loading}
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-8 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? 'שומר...' : 'צור לי תוכן עכשיו'}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-red-500 text-sm">{error}</p>
        )}

        {/* Social proof */}
        <p className="mt-8 text-gray-400 text-sm">
          כבר עשרות בעלי עסקים קיבלו תוכן מוכן ✓
        </p>

        {/* Mock post examples */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
          {[
            { type: 'ערך', color: 'bg-blue-50 border-blue-200', text: '3 דברים שכל מאמן צריך לדעת לפני שפותח עמוד עסקי...' },
            { type: 'אמון', color: 'bg-purple-50 border-purple-200', text: 'לפני 2 שנים פחדתי לבקש תשלום על הייעוץ שלי. היום אני עוזר ל-40 לקוחות...' },
            { type: 'קריאה לפעולה', color: 'bg-green-50 border-green-200', text: 'אם אתה יועץ ורוצה להכפיל את הלקוחות שלך — יש לי מקום ל-3 נוספים החודש.' },
          ].map((post) => (
            <div key={post.type} className={`${post.color} border rounded-xl p-4 text-sm text-gray-700`}>
              <span className="text-xs font-semibold text-gray-400 block mb-2">{post.type}</span>
              {post.text}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
