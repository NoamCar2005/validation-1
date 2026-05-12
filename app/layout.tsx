import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContentMine — יוצר תוכן לעסקים',
  description: 'הבינה המלאכותית יוצרת תוכן שיווקי מוכן לפרסום — בסגנון שלך, בעברית.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700;900&family=Heebo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
