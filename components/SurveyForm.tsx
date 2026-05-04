'use client'

import { useState } from 'react'
import { SurveyQuestion } from '@/lib/survey-questions'

interface Props {
  questions: SurveyQuestion[]
  answers: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function SurveyForm({ questions, answers, onChange }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentQuestion = questions[currentIndex]
  const isAnswered = answers[currentQuestion.key]?.trim()
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleNext = () => {
    if (isAnswered && currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleOptionClick = (value: string) => {
    if (currentQuestion.type === 'select-multi') {
      const current = answers[currentQuestion.key] || ''
      const values = current ? current.split('|') : []
      if (values.includes(value)) {
        const updated = values.filter((v) => v !== value).join('|')
        onChange(currentQuestion.key, updated)
      } else {
        onChange(currentQuestion.key, values.length > 0 ? `${current}|${value}` : value)
      }
    } else {
      onChange(currentQuestion.key, value)
      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          handleNext()
        }
      }, 300)
    }
  }

  const isMultiSelectAnswered = () => {
    if (currentQuestion.type !== 'select-multi') return isAnswered
    return answers[currentQuestion.key]?.split('|').filter(Boolean).length > 0
  }

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-600">
            שאלה {currentIndex + 1} מתוך {questions.length}
          </span>
          <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Block Description */}
      {currentQuestion.blockDescription && (
        <p className="text-sm text-gray-500 mb-6 text-right">
          {currentQuestion.blockDescription}
        </p>
      )}

      {/* Question */}
      <div className="mb-8">
        <label className="block text-xl font-bold text-gray-900 mb-6 text-right">
          {currentQuestion.label}
        </label>

        {/* Single Select */}
        {currentQuestion.type === 'select' && currentQuestion.options ? (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionClick(option)}
                className={`w-full px-5 py-4 text-right rounded-lg border-2 transition-all ${
                  answers[currentQuestion.key] === option
                    ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {/* Multi Select */}
        {currentQuestion.type === 'select-multi' && currentQuestion.options ? (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const values = answers[currentQuestion.key]?.split('|').filter(Boolean) || []
              const isSelected = values.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleOptionClick(option)}
                  className={`w-full px-5 py-4 text-right rounded-lg border-2 transition-all flex items-center justify-end gap-3 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                  }`}
                >
                  <span>{option}</span>
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <span className="text-white text-sm">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        {/* Radio Buttons */}
        {currentQuestion.type === 'radio' && currentQuestion.options ? (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionClick(option)}
                className={`w-full px-5 py-4 text-right rounded-lg border-2 transition-all flex items-center justify-end gap-3 ${
                  answers[currentQuestion.key] === option
                    ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
              >
                <span>{option}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    answers[currentQuestion.key] === option
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-gray-300'
                  }`}
                >
                  {answers[currentQuestion.key] === option && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {/* Text Input */}
        {currentQuestion.type === 'text' ? (
          <input
            type="text"
            value={answers[currentQuestion.key] || ''}
            onChange={(e) => onChange(currentQuestion.key, e.target.value)}
            placeholder="הקלד כאן..."
            className="w-full px-5 py-4 text-right rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
            autoFocus
          />
        ) : null}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-10">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          חזור
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isMultiSelectAnswered()}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentIndex === questions.length - 1 ? 'סיימתי' : 'הבא'}
        </button>
      </div>
    </div>
  )
}
