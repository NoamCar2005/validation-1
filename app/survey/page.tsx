'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SURVEY_QUESTIONS } from '@/lib/survey-questions'
import SurveyForm from '@/components/SurveyForm'

export default function SurveyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('user_id')) {
      router.replace('/')
    }
  }, [router])

  const requiredAnswered = SURVEY_QUESTIONS
    .filter((q) => q.required)
    .every((q) => answers[q.key]?.trim())

  async function handleSubmit() {
    if (!requiredAnswered) return

    setLoading(true)
    setError('')

    const userId = localStorage.getItem('user_id')!
    const rows = Object.entries(answers).map(([key, value]) => ({
      user_id: userId,
      question_key: key,
      answer_text: value,
    }))

    try {
      const { error: insertError } = await supabase
        .from('survey_responses')
        .insert(rows)

      if (insertError) throw insertError

      await supabase
        .from('users')
        .update({ survey_completed: true })
        .eq('id', userId)

      router.push('/loading')
    } catch (err) {
      setError('אירעה שגיאה בשמירת התשובות. אנא נסה שוב.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-12" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            נכיר אותך קצת יותר 👋
          </h1>
          <p className="text-gray-500 text-base">
            כדי שנוכל לייצר תוכן שמתאים בדיוק לעסק שלך
          </p>
        </div>

        <div>
          <SurveyForm
            questions={SURVEY_QUESTIONS}
            answers={answers}
            onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
          />

          {error && <p className="mt-4 text-red-500 text-sm text-center">{error}</p>}

          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!requiredAnswered || loading}
              className="w-full px-10 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'שומר...' : 'צור לי תוכן עכשיו ←'}
            </button>
            <p className="mt-3 text-xs text-gray-400">
              {SURVEY_QUESTIONS.filter((q) => q.required && answers[q.key]?.trim()).length} / {SURVEY_QUESTIONS.filter((q) => q.required).length} שאלות חובה ענית
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
