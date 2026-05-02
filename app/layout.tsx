import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Validation 1 — יוצר תוכן לעסקים',
  description: 'הבינה המלאכותית יוצרת תוכן שיווקי מוכן לפרסום — בסגנון שלך, בעברית.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
