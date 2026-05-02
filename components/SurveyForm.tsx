'use client'

import { SurveyQuestion } from '@/lib/survey-questions'

interface Props {
  questions: SurveyQuestion[]
  answers: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function SurveyForm({ questions, answers, onChange }: Props) {
  return (
    <div className="space-y-6">
      {questions.map((q, index) => (
        <div key={q.key} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <span className="text-indigo-500 ml-2">{index + 1}.</span>
            {q.label}
            {q.required && <span className="text-red-400 mr-1">*</span>}
          </label>

          {q.type === 'select' && q.options ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {q.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(q.key, option)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors text-center ${
                    answers[q.key] === option
                      ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answers[q.key] || ''}
              onChange={(e) => onChange(q.key, e.target.value)}
              placeholder="הקלד כאן..."
              className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-right"
            />
          )}
        </div>
      ))}
    </div>
  )
}
