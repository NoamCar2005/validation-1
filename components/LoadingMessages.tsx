'use client'

import { useEffect, useState } from 'react'

const MESSAGES = [
  'סורקים את האתר שלך',
  'מנתחים את התחום שלך',
  'מבינים את הסגנון שלך',
  'מזהים את נקודות החוזק שלך',
  'כותבים פוסט ערך מקצועי',
  'יוצרים פוסטים בקול שלך',
  'מכינים תמונה לפוסט',
  'עוד רגע — הולך להיות טוב',
]

const Dots = () => (
  <span style={{ display: 'inline-flex', gap: 3, marginRight: 6 }}>
    {[0, 1, 2].map(d => (
      <span
        key={d}
        style={{
          width: 4, height: 4, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'inline-block',
          animation: `dotBounce 1.2s ${d * 0.18}s infinite`,
        }}
      />
    ))}
  </span>
)

export default function LoadingMessages() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 350)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position: 'relative', height: 60, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 800, fontSize: 'clamp(18px,3.5vw,22px)',
          letterSpacing: '-0.02em', color: 'white',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-16px)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        {MESSAGES[index]}
        <Dots />
      </div>
    </div>
  )
}
