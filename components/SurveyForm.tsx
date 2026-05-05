'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SurveyQuestion } from '@/lib/survey-questions'

interface Props {
  questions: SurveyQuestion[]
  answers: Record<string, string>
  onChange: (key: string, value: string) => void
  onComplete: () => void
}

const BLOCK_COLORS: Record<string, string> = {
  '1': '#4F5BD5',
  '2': '#7C6FCD',
  '3': '#B05EC4',
  '4': '#F5A623',
}

export default function SurveyForm({ questions, answers, onChange, onComplete }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentQ = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const blockColor = BLOCK_COLORS[currentQ.block] || '#4F5BD5'

  function isAnswered(): boolean {
    const val = answers[currentQ.key]
    if (!val) return false
    if (currentQ.type === 'select-multi') return val.split('|').filter(Boolean).length > 0
    return val.trim().length > 0
  }

  function handleOptionClick(value: string) {
    if (currentQ.type === 'select-multi') {
      const current = answers[currentQ.key] || ''
      const values = current ? current.split('|') : []
      const updated = values.includes(value)
        ? values.filter(v => v !== value).join('|')
        : values.length > 0 ? `${current}|${value}` : value
      onChange(currentQ.key, updated)
    } else {
      onChange(currentQ.key, value)
      setTimeout(() => advance(), 280)
    }
  }

  function advance() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      onComplete()
    }
  }

  const isMulti = currentQ.type === 'select-multi' || currentQ.type === 'text'
  const selectedValues = answers[currentQ.key]?.split('|').filter(Boolean) ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--body-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar with progress */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--border)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button
          onClick={() => currentIndex === 0 ? router.push('/') : setCurrentIndex(i => i - 1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f0f1f5', border: 'none',
            color: 'var(--text-secondary)', fontFamily: 'inherit',
            fontWeight: 600, fontSize: 13, padding: '7px 14px',
            borderRadius: 100, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          ← {currentIndex === 0 ? 'דף הבית' : 'שאלה קודמת'}
        </button>

        <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 10, overflow: 'hidden' }}>
          <div
            className="progress-bar-animate"
            style={{
              height: '100%',
              borderRadius: 10,
              background: `linear-gradient(90deg, ${blockColor}, var(--accent))`,
              width: `${progress}%`,
            }}
          />
        </div>

        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {currentIndex + 1} / {questions.length}
        </span>

        <button
          onClick={() => router.push('/auth')}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontFamily: 'inherit',
            fontWeight: 600, fontSize: 12, padding: '6px 12px',
            borderRadius: 100, cursor: 'pointer',
          }}
        >
          יציאה
        </button>
      </div>

      {/* Question area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 580 }}>
          {/* Block badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${blockColor}18`, borderRadius: 100,
            padding: '5px 14px', marginBottom: 18,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: blockColor }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: blockColor }}>
              {currentQ.blockTitle}
            </span>
          </div>

          {/* Question label */}
          <h2 style={{
            fontSize: 'clamp(20px, 4vw, 27px)', fontWeight: 800,
            color: 'var(--text-primary)', marginBottom: 12,
            lineHeight: 1.3, letterSpacing: '-0.02em',
          }}>
            {currentQ.label}
          </h2>

          {/* Explanation */}
          {currentQ.explanation && (
            <div style={{
              background: 'white', border: '1px solid var(--border)',
              borderRadius: 12, padding: '13px 16px', marginBottom: 24,
              borderRight: `3px solid ${blockColor}`,
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(currentQ.type === 'select' || currentQ.type === 'select-multi' || currentQ.type === 'radio') &&
              currentQ.options?.map(option => {
                const isSelected = currentQ.type === 'select-multi'
                  ? selectedValues.includes(option)
                  : answers[currentQ.key] === option

                return (
                  <button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    className={`survey-option${isSelected ? ' selected' : ''}`}
                    style={{
                      width: '100%', padding: '15px 18px',
                      border: `2px solid ${isSelected ? 'var(--indigo)' : 'var(--border)'}`,
                      borderRadius: 12, textAlign: 'right',
                      background: isSelected ? 'var(--indigo)' : 'white',
                      color: isSelected ? 'white' : 'var(--text-primary)',
                      fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <span>{option}</span>
                    {(currentQ.type === 'select-multi' || currentQ.type === 'radio') && (
                      <div style={{
                        width: 20, height: 20,
                        borderRadius: currentQ.type === 'radio' ? '50%' : 6,
                        border: `2px solid ${isSelected ? 'rgba(255,255,255,0.5)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {isSelected && (
                          <div style={{
                            width: currentQ.type === 'radio' ? 8 : 10,
                            height: currentQ.type === 'radio' ? 8 : 10,
                            borderRadius: currentQ.type === 'radio' ? '50%' : 2,
                            background: 'white',
                          }} />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}

            {currentQ.type === 'text' && (
              <input
                type="text"
                value={answers[currentQ.key] || ''}
                onChange={e => onChange(currentQ.key, e.target.value)}
                placeholder="הקלד כאן..."
                autoFocus
                style={{
                  width: '100%', padding: '18px 20px',
                  border: '1.5px solid var(--border)', borderRadius: 12,
                  fontFamily: 'inherit', fontSize: 16, background: 'white',
                  color: 'var(--text-primary)', outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--border-focus)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(79,91,213,0.12)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            )}
          </div>

          {/* Next button for multi/text */}
          {isMulti && (
            <div style={{ marginTop: 30 }}>
              <button
                onClick={advance}
                disabled={!isAnswered()}
                style={{
                  width: '100%', padding: '16px', background: 'var(--indigo)', color: 'white',
                  border: 'none', borderRadius: 14, fontFamily: 'inherit',
                  fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  boxShadow: 'var(--shadow-btn)',
                  opacity: isAnswered() ? 1 : 0.45,
                  transition: 'all 0.18s ease',
                }}
              >
                {currentIndex === questions.length - 1 ? 'צור לי תוכן ⚡' : 'הבא →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
