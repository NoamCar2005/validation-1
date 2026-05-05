'use client'

import { useEffect, useState } from 'react'

const MESSAGES = [
  'סורק את האתר שלך...',
  'מנתח את תחום הפעילות שלך...',
  'מבין את הסגנון והקול שלך...',
  'מזהה את נקודות החוזק שלך...',
  'בונה אסטרטגיית תוכן מותאמת...',
  'יוצר פוסטים בקול שלך...',
  'מכין תמונות לכל פוסט...',
  'מוסיף לוגיקה שיווקית...',
  'עוד קצת... זה שווה את ההמתנה ✨',
]

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
    <p
      className="msg-fade"
      style={{
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--accent)',
        minHeight: 28,
        opacity: visible ? 1 : 0,
      }}
    >
      {MESSAGES[index]}
    </p>
  )
}
