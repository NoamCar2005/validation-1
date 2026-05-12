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

const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function SurveyForm({ questions, answers, onChange, onComplete }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const currentQ = questions[currentIndex]
  const progress = (currentIndex + 1) / questions.length * 100

  function isAcherSelected(): boolean {
    const val = answers[currentQ.key] || ''
    if (currentQ.type === 'select-multi') return val.split('|').includes('אחר')
    return val === 'אחר'
  }

  function isAnswered(): boolean {
    const val = answers[currentQ.key]
    if (!val) return false
    if (currentQ.type === 'select-multi') {
      const vals = val.split('|').filter(Boolean)
      if (vals.length === 0) return false
      if (vals.includes('אחר') && !otherText[currentQ.key]?.trim()) return false
      return true
    }
    if (val === 'אחר') return !!otherText[currentQ.key]?.trim()
    return val.trim().length > 0
  }

  function handleOptionClick(value: string) {
    if (currentQ.type === 'select-multi') {
      const current = answers[currentQ.key] || ''
      const values = current ? current.split('|') : []
      if (values.includes(value)) {
        onChange(currentQ.key, values.filter(v => v !== value).join('|'))
        if (value === 'אחר') setOtherText(prev => { const n = { ...prev }; delete n[currentQ.key]; return n })
      } else {
        onChange(currentQ.key, values.length > 0 ? `${current}|${value}` : value)
      }
    } else {
      if (value !== 'אחר') setOtherText(prev => { const n = { ...prev }; delete n[currentQ.key]; return n })
      onChange(currentQ.key, value)
      // No auto-advance — user presses Continue
    }
  }

  function advance() {
    if (isAcherSelected()) {
      const text = otherText[currentQ.key]?.trim() || ''
      if (text) {
        if (currentQ.type === 'select-multi') {
          const updated = (answers[currentQ.key] || '').split('|').filter(Boolean).map(v => v === 'אחר' ? text : v).join('|')
          onChange(currentQ.key, updated)
        } else {
          onChange(currentQ.key, text)
        }
      }
    }
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

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 10px' }}>
          <button
            onClick={() => currentIndex === 0 ? router.push('/') : setCurrentIndex(i => i - 1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
              padding: 4, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← {currentIndex === 0 ? 'דף הבית' : 'חזרה'}
          </button>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent)' }}>{currentIndex + 1}</span>
            {' '}/{' '}{questions.length}
          </div>
        </div>

        {/* Amber progress stripe */}
        <div style={{ height: 4, background: 'var(--border)' }}>
          <div
            className="progress-bar-animate"
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent), #D45018)',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>
      </div>

      {/* ── Question area ── */}
      <div style={{
        flex: 1, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(32px,6vw,48px) 24px clamp(48px,8vw,80px)',
      }}>
        <div
          key={currentIndex}
          style={{
            width: '100%', maxWidth: 560,
            animation: 'slideInRTL 0.45s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* "שאלה N" label */}
          <div style={{
            fontSize: 12, fontWeight: 700, color: 'var(--accent)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            שאלה {currentIndex + 1}
          </div>

          {/* Question text */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(22px,3.4vw,30px)',
            lineHeight: 1.25,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
            marginBottom: 10,
          }}>
            {currentQ.label}
          </h2>

          {/* Explanation */}
          {currentQ.explanation && (
            <p style={{
              fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6,
              marginBottom: 28,
            }}>
              {currentQ.explanation}
            </p>
          )}
          {!currentQ.explanation && <div style={{ marginBottom: 28 }} />}

          {/* ── Select / Radio options (column of cards) ── */}
          {(currentQ.type === 'select' || currentQ.type === 'radio') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentQ.options?.map(option => {
                const isSelected = answers[currentQ.key] === option
                return (
                  <button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    style={{
                      textAlign: 'right', padding: '16px 18px',
                      background: isSelected ? 'var(--navy)' : 'white',
                      color: isSelected ? 'white' : 'var(--text-primary)',
                      border: `1.5px solid ${isSelected ? 'var(--navy)' : 'var(--border)'}`,
                      borderRadius: 14, fontSize: 15, fontWeight: 600,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.18s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.transform = 'translateX(-4px)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }
                    }}
                  >
                    <span>{option}</span>
                    {isSelected && (
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--accent)', color: 'var(--navy)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        animation: 'pop 0.35s',
                      }}>
                        <CheckIcon size={12} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* "אחר" free-text input for select/radio */}
          {(currentQ.type === 'select' || currentQ.type === 'radio') && isAcherSelected() && (
            <input
              type="text"
              value={otherText[currentQ.key] || ''}
              onChange={e => setOtherText(prev => ({ ...prev, [currentQ.key]: e.target.value }))}
              placeholder="ספר/י בחופשיות..."
              autoFocus
              style={{
                width: '100%', padding: '16px 18px', marginTop: 10,
                background: 'white', border: '1.5px solid var(--accent)',
                borderRadius: 14, fontSize: 15, outline: 'none',
                color: 'var(--text-primary)', lineHeight: 1.6,
                fontFamily: 'inherit', boxSizing: 'border-box',
                boxShadow: '0 0 0 4px rgba(232,98,40,0.12)',
              }}
            />
          )}

          {/* ── Multi-select options (pills) ── */}
          {currentQ.type === 'select-multi' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {currentQ.options?.map(option => {
                const isSelected = selectedValues.includes(option)
                return (
                  <button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    style={{
                      padding: '12px 18px',
                      background: isSelected ? 'var(--navy)' : 'white',
                      color: isSelected ? 'white' : 'var(--text-primary)',
                      border: `1.5px solid ${isSelected ? 'var(--navy)' : 'var(--border)'}`,
                      borderRadius: 100, fontSize: 14, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.18s',
                    }}
                  >
                    {isSelected && (
                      <span style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'var(--accent)', color: 'var(--navy)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <CheckIcon size={9} />
                      </span>
                    )}
                    {option}
                  </button>
                )
              })}
            </div>
          )}

          {/* "אחר" free-text input for select-multi */}
          {currentQ.type === 'select-multi' && isAcherSelected() && (
            <input
              type="text"
              value={otherText[currentQ.key] || ''}
              onChange={e => setOtherText(prev => ({ ...prev, [currentQ.key]: e.target.value }))}
              placeholder="ספר/י בחופשיות..."
              autoFocus
              style={{
                width: '100%', padding: '14px 18px', marginTop: 6,
                background: 'white', border: '1.5px solid var(--accent)',
                borderRadius: 14, fontSize: 15, outline: 'none',
                color: 'var(--text-primary)', lineHeight: 1.6,
                fontFamily: 'inherit', boxSizing: 'border-box',
                boxShadow: '0 0 0 4px rgba(232,98,40,0.12)',
              }}
            />
          )}

          {/* ── Text input ── */}
          {currentQ.type === 'text' && (
            <textarea
              value={answers[currentQ.key] || ''}
              onChange={e => onChange(currentQ.key, e.target.value)}
              placeholder="הקלד כאן..."
              rows={4}
              autoFocus
              style={{
                width: '100%', padding: '16px 18px',
                background: 'white', border: '1.5px solid var(--border)',
                borderRadius: 14, fontSize: 16,
                color: 'var(--text-primary)',
                resize: 'vertical', lineHeight: 1.6,
                fontFamily: 'inherit',
                transition: 'all 0.18s',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--accent)'
                e.target.style.boxShadow = '0 0 0 4px rgba(232,98,40,0.12)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.boxShadow = 'none'
              }}
            />
          )}

          {/* ── Action buttons ── */}
          <div style={{ marginTop: 28 }}>
            <button
              onClick={advance}
              disabled={!isAnswered()}
              style={{
                width: '100%', padding: '16px 22px',
                background: isAnswered() ? 'var(--navy)' : 'rgba(12,14,29,0.15)',
                color: isAnswered() ? 'white' : 'rgba(12,14,29,0.4)',
                border: 'none', borderRadius: 14, fontFamily: 'inherit',
                fontWeight: 800, fontSize: 15.5,
                cursor: isAnswered() ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: isAnswered() ? '0 6px 22px rgba(12,14,29,0.18)' : 'none',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => {
                if (isAnswered()) e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {isLast ? 'יוצרים תוכן ✨' : 'המשך →'}
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
