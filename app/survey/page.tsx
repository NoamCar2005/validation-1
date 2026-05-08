'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SURVEY_QUESTIONS } from '@/lib/survey-questions'
import SurveyForm from '@/components/SurveyForm'

export default function SurveyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) { router.replace('/'); return }

    supabase
      .from('users')
      .select('survey_completed')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.survey_completed) router.replace('/loading')
      })
  }, [router, supabase])

  async function handleComplete() {
    const requiredAnswered = SURVEY_QUESTIONS
      .filter(q => q.required)
      .every(q => answers[q.key]?.trim())

    if (!requiredAnswered) return

    setSubmitting(true)
    setError('')

    const userId = localStorage.getItem('user_id')!
    const rows = Object.entries(answers).map(([key, value]) => ({
      user_id: userId,
      question_key: key,
      answer_text: value,
    }))

    try {
      const { error: insertError } = await supabase.from('survey_responses').insert(rows)
      if (insertError) throw insertError

      await supabase.from('users').update({ survey_completed: true }).eq('id', userId)
      router.push('/loading')
    } catch {
      setError('אירעה שגיאה בשמירת התשובות. אנא נסה שוב.')
      setSubmitting(false)
    }
  }

  return (
    <>
      {error && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#dc2626', color: 'white', borderRadius: 12,
          padding: '12px 20px', fontSize: 14, fontWeight: 600, zIndex: 9999,
          boxShadow: '0 8px 24px rgba(220,38,38,0.3)',
        }}>
          {error}
        </div>
      )}
      <SurveyForm
        questions={SURVEY_QUESTIONS}
        answers={answers}
        onChange={(key, value) => setAnswers(prev => ({ ...prev, [key]: value }))}
        onComplete={submitting ? () => {} : handleComplete}
      />
    </>
  )
}
