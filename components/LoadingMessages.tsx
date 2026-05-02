'use client'

import { useEffect, useState } from 'react'

const MESSAGES = [
  'סורק את העסק שלך...',
  'מבין את הסגנון שלך...',
  'מזהה את נקודות החוזק שלך...',
  'יוצר תוכן בקול שלך...',
  'מכין פוסטים מוכנים לפרסום...',
  'עוד רגע קט...',
]

export default function LoadingMessages() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-center">
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
      <p
        className={`text-xl font-semibold text-gray-700 transition-opacity duration-400 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {MESSAGES[index]}
      </p>
    </div>
  )
}
