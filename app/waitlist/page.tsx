'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('user_id')) {
      window.location.href = '/'
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('אנא הכנס כתובת אימייל תקינה')
      return
    }

    setLoading(true)
    setError('')

    const userId = localStorage.getItem('user_id')!
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ email: email.trim() })
        .eq('id', userId)

      if (updateError) throw updateError
      setSubmitted(true)
    } catch {
      setError('אירעה שגיאה. אנא נסה שוב.')
      setLoading(false)
    }
  }

  async function handleWhatsApp() {
    const userId = localStorage.getItem('user_id')
    if (userId) {
      await supabase
        .from('users')
        .update({ whatsapp_opted_in: true })
        .eq('id', userId)
    }
    window.open('https://chat.whatsapp.com/YOUR_GROUP_LINK', '_blank')
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md mx-auto">
          <p className="text-5xl mb-6">🙌</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            אתה ברשימה!
          </h1>
          <p className="text-gray-500 text-base mb-8">
            ניצור איתך קשר כשהגרסה המלאה תעלה. בינתיים — הצטרף לקהילה שלנו בוואטסאפ לטיפים שבועיים ועדכונים ראשונים.
          </p>
          <button
            onClick={handleWhatsApp}
            className="w-full px-8 py-4 bg-green-500 text-white font-bold text-base rounded-xl shadow-md hover:bg-green-600 transition-colors mb-3"
          >
            📲 הצטרף לקבוצת הוואטסאפ
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            אולי אחר כך
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md mx-auto w-full text-center">
        <p className="text-5xl mb-6">🎉</p>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          הפוסטים שלך מוכנים!
        </h1>
        <p className="text-gray-500 text-base mb-8">
          השאר אימייל וניצור איתך קשר כשהגרסה המלאה תהיה מוכנה — עם עוד תוכן, עוד פלטפורמות, ועוד.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="האימייל שלך"
            className="w-full px-5 py-4 text-base rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right bg-white"
            dir="ltr"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full px-8 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'שומר...' : 'שמור אותי ברשימה'}
          </button>
        </form>

        <button
          onClick={() => window.location.href = '/'}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline block w-full text-center"
        >
          אולי אחר כך
        </button>
      </div>
    </main>
  )
}
