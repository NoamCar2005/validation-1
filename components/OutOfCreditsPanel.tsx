'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WaitlistForm from './WaitlistForm'

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Jwugzbe2lLSLSDTLkboAH6?mode=gi_t'

interface OutOfCreditsPanelProps {
  alreadyJoined: boolean
}

export default function OutOfCreditsPanel({ alreadyJoined }: OutOfCreditsPanelProps) {
  const router = useRouter()
  const [doneGranted, setDoneGranted] = useState<null | boolean>(null)

  if (doneGranted !== null) {
    return (
      <div style={{
        maxWidth: 520, margin: '0 auto',
        background: 'rgba(37,211,102,0.06)',
        border: '1px solid rgba(37,211,102,0.2)',
        borderRadius: 20, padding: '40px 28px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
          color: 'white', marginBottom: 10,
        }}>
          {doneGranted ? 'יצירה נוספת מחכה לך!' : 'נרשמת בהצלחה'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          {doneGranted
            ? 'הוספנו לך יצירת פוסט נוספת — לחץ עכשיו כדי ליצור פוסט חדש על העסק שלך.'
            : 'כבר נרשמת קודם. ניצור איתך קשר כשהגרסה המלאה תושק.'}
        </p>
        {doneGranted ? (
          <button
            onClick={() => router.push('/loading')}
            style={{
              padding: '14px 32px', background: 'var(--accent)', color: 'var(--navy)',
              border: 'none', borderRadius: 14, fontFamily: 'inherit',
              fontWeight: 800, fontSize: 16, cursor: 'pointer',
              boxShadow: '0 8px 26px rgba(232,98,40,0.32)',
            }}
          >
            צור פוסט חדש עכשיו ⚡
          </button>
        ) : null}
      </div>
    )
  }

  if (alreadyJoined) {
    return (
      <div style={{
        maxWidth: 520, margin: '0 auto',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20, padding: '40px 28px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✨</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
          color: 'white', marginBottom: 10,
        }}>
          ניצלת את כל היצירות שלך
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          בקרוב נשיק את הגרסה המלאה — תהיה הראשון לדעת.
        </p>
        <a
          href={WHATSAPP_GROUP_URL}
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-block', padding: '14px 32px',
            background: 'linear-gradient(135deg, #25D366 0%, #1aad54 100%)',
            color: 'white', borderRadius: 14, textDecoration: 'none',
            fontFamily: 'inherit', fontWeight: 800, fontSize: 16,
            boxShadow: '0 10px 32px rgba(37,211,102,0.38)',
          }}
        >
          הצטרף לקהילה
        </a>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 520, margin: '0 auto',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 20, padding: '32px 28px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎁</div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900,
          color: 'white', marginBottom: 8, letterSpacing: '-0.02em',
        }}>
          ניצלת את היצירה החינמית שלך
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          הצטרף לרשימת ההמתנה ונוסיף לך יצירת פוסט נוספת — מיידית.
        </p>
      </div>
      <WaitlistForm
        variant="dark"
        onSuccess={(granted) => setDoneGranted(granted)}
      />
    </div>
  )
}
