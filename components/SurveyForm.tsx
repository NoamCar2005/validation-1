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

const BLOCK_COLORS: Record<string, { main: string; soft: string }> = {
  '1': { main: '#4F5BD5', soft: 'rgba(79,91,213,0.1)' },
  '2': { main: '#7C6FCD', soft: 'rgba(124,111,205,0.1)' },
  '3': { main: '#B05EC4', soft: 'rgba(176,94,196,0.1)' },
  '4': { main: '#F5A623', soft: 'rgba(245,166,35,0.12)' },
}

export default function SurveyForm({ questions, answers, onChange, onComplete }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentQ = questions[currentIndex]
  // Starts at 0% on question 1
  const progress = (currentIndex / questions.length) * 100
  const { main: blockColor, soft: blockSoft } = BLOCK_COLORS[currentQ.block] || BLOCK_COLORS['1']

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
      // No auto-advance — user presses Continue
    }
  }

  function advance() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      onComplete()
    }
  }

  const selectedValues = answers[currentQ.key]?.split('|').filter(Boolean) ?? []
  const isLast = currentIndex === questions.length - 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--body-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky topbar ───────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'white',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 8px rgba(12,14,29,0.05)',
      }}>
        {/* Coloured progress stripe */}
        <div style={{ height: 3, background: 'var(--border)', overflow: 'hidden' }}>
          <div
            className="progress-bar-animate"
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${blockColor}, var(--accent))`,
              width: `${progress}%`,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
          {/* Back */}
          <button
            onClick={() => currentIndex === 0 ? router.push('/') : setCurrentIndex(i => i - 1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#f2f1ee', border: 'none',
              color: 'var(--text-secondary)', fontFamily: 'inherit',
              fontWeight: 600, fontSize: 13, padding: '7px 14px',
              borderRadius: 100, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e6e2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f2f1ee')}
          >
            ← {currentIndex === 0 ? 'דף הבית' : 'חזור'}
          </button>

          {/* Progress dots */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {questions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 100,
                  background: i <= currentIndex ? blockColor : 'var(--border)',
                  transition: 'all 0.3s ease',
                  opacity: i > currentIndex ? 0.5 : 1,
                }}
              />
            ))}
          </div>

          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* ── Question ────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(32px,6vw,56px) 24px clamp(48px,8vw,80px)',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* Block badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: blockSoft,
            borderRadius: 100, padding: '6px 14px', marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: blockColor }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: blockColor, letterSpacing: '0.03em' }}>
              {currentQ.blockTitle}
            </span>
          </div>

          {/* Question label */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(22px,4.5vw,30px)',
            fontWeight: 900,
            color: 'var(--text-primary)',
            marginBottom: 12,
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
          }}>
            {currentQ.label}
          </h2>

          {/* Explanation */}
          {currentQ.explanation && (
            <div style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 12, padding: '13px 16px', marginBottom: 28,
              borderRight: `3px solid ${blockColor}`,
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {currentQ.explanation}
              </p>
            </div>
          )}
          {!currentQ.explanation && <div style={{ marginBottom: 28 }} />}

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
                      width: '100%', padding: '16px 20px',
                      border: `2px solid ${isSelected ? blockColor : 'var(--border)'}`,
                      borderRadius: 14, textAlign: 'right',
                      background: isSelected ? blockColor : 'white',
                      color: isSelected ? 'white' : 'var(--text-primary)',
                      fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      boxShadow: isSelected ? `0 4px 16px ${blockSoft}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{option}</span>
                    {(currentQ.type === 'select-multi' || currentQ.type === 'radio') && (
                      <div style={{
                        width: 22, height: 22,
                        borderRadius: currentQ.type === 'radio' ? '50%' : 6,
                        border: `2px solid ${isSelected ? 'rgba(255,255,255,0.45)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(255,255,255,0.22)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'all 0.15s',
                      }}>
                        {isSelected && (
                          <div style={{
                            width: currentQ.type === 'radio' ? 9 : 11,
                            height: currentQ.type === 'radio' ? 9 : 11,
                            borderRadius: currentQ.type === 'radio' ? '50%' : 3,
                            background: 'white',
                          }} />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}

            {currentQ.type === 'text' && (
              <textarea
                value={answers[currentQ.key] || ''}
                onChange={e => onChange(currentQ.key, e.target.value)}
                placeholder="הקלד כאן..."
                rows={4}
                autoFocus
                style={{
                  width: '100%', padding: '18px 20px',
                  border: '1.5px solid var(--border)', borderRadius: 14,
                  fontFamily: 'inherit', fontSize: 15,
                  background: 'white', color: 'var(--text-primary)',
                  outline: 'none', resize: 'vertical', lineHeight: 1.7,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = blockColor
                  e.target.style.boxShadow = `0 0 0 3px ${blockSoft}`
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            )}
          </div>

          {/* ── Action buttons (all question types) ── */}
          <div style={{ marginTop: 30 }}>
            {/* Continue / Finish */}
            <button
              onClick={advance}
              disabled={!isAnswered()}
              style={{
                width: '100%', padding: '17px',
                background: isLast ? 'var(--accent)' : blockColor,
                color: isLast ? 'var(--navy)' : 'white',
                border: 'none', borderRadius: 14, fontFamily: 'inherit',
                fontWeight: 800, fontSize: 16,
                cursor: isAnswered() ? 'pointer' : 'not-allowed',
                boxShadow: isLast ? 'var(--shadow-btn-accent)' : 'var(--shadow-btn)',
                opacity: isAnswered() ? 1 : 0.4,
                transition: 'all 0.18s ease',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => {
                if (isAnswered()) e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {isLast ? 'סיים וצור לי תוכן ⚡' : 'המשך →'}
            </button>

            {/* Back + Exit row */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {currentIndex > 0 && (
                <button
                  onClick={() => setCurrentIndex(i => i - 1)}
                  style={{
                    flex: 1, padding: '11px',
                    background: '#f0f1f5', border: 'none',
                    color: 'var(--text-secondary)', fontFamily: 'inherit',
                    fontWeight: 600, fontSize: 14, borderRadius: 12, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e8e6e2')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f0f1f5')}
                >
                  ← חזור
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                style={{
                  flex: 1, padding: '11px',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontFamily: 'inherit',
                  fontWeight: 600, fontSize: 14, borderRadius: 12, cursor: 'pointer',
                  maxWidth: currentIndex > 0 ? '50%' : '100%',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--text-muted)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                יציאה
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
