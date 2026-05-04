# Phase 1 Implementation Plan — Validation 1 Content Generator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hebrew-first RTL Next.js app with 5 screens that takes a website URL + survey answers, sends them through a Supabase edge function to N8N, and returns 3 AI-generated Hebrew marketing posts.

**Architecture:** Frontend (Next.js App Router) stores `user_id` in localStorage and passes through screens. A single Supabase edge function (`generate-content`) acts as a thin proxy — it reads user + survey data from Supabase, POSTs to N8N webhook, awaits the response, saves 3 posts to Supabase, and returns them to the frontend. N8N does all AI work externally.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, TypeScript, Supabase (PostgreSQL + edge functions via Deno), N8N webhook

---

## File Map

```
/Users/noamcarter/Desktop/Validation 1/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                          (already exists — add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
├── app/
│   ├── layout.tsx                      (root layout — dir="rtl" lang="he", global styles)
│   ├── globals.css                     (Tailwind base styles)
│   ├── page.tsx                        (Screen 1 — Landing)
│   ├── survey/
│   │   └── page.tsx                    (Screen 2 — Survey)
│   ├── loading/
│   │   └── page.tsx                    (Screen 3 — Loading + edge function trigger)
│   ├── results/
│   │   └── page.tsx                    (Screen 4 — WOW / Post showcase)
│   └── waitlist/
│       └── page.tsx                    (Screen 5 — Waitlist + WhatsApp CTA)
├── components/
│   ├── PostCard.tsx                    (post image, content, copy, channel tag, clipboard button)
│   ├── SurveyForm.tsx                  (renders questions from config array)
│   └── LoadingMessages.tsx             (animated cycling Hebrew messages)
├── lib/
│   ├── supabase.ts                     (Supabase browser client)
│   └── survey-questions.ts            (SURVEY_QUESTIONS config array)
└── supabase/
    ├── migrations/
    │   └── 20260502000000_init.sql     (users, posts, survey_responses tables)
    └── functions/
        └── generate-content/
            └── index.ts               (Deno edge function)
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `app/globals.css`

- [ ] **Step 1: Scaffold Next.js project**

Run from `/Users/noamcarter/Desktop/Validation 1/`:
```bash
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*" --yes
```
Expected: Next.js project files created in current directory.

- [ ] **Step 2: Verify project runs**

```bash
npm run dev
```
Expected: Server starts at http://localhost:3000. No errors.

- [ ] **Step 3: Install Supabase client**

```bash
npm install @supabase/supabase-js
```
Expected: Package installed, package.json updated.

- [ ] **Step 4: Commit**

```bash
git init
git add package.json package-lock.json next.config.ts tailwind.config.ts tsconfig.json
git commit -m "feat: initialize Next.js project with Tailwind and Supabase client"
```

---

## Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/20260502000000_init.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/20260502000000_init.sql` with this content:

```sql
-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  website_url text not null,
  email text,
  whatsapp_opted_in boolean not null default false,
  survey_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Survey responses table (flexible key/value — easy to add/remove questions)
create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question_key text not null,
  answer_text text not null,
  answer_value text,
  created_at timestamptz not null default now()
);

-- Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  post_type text not null check (post_type in ('value', 'trust', 'cta')),
  content text not null,
  copy text not null,
  image_url text,
  channel_recommended text not null check (channel_recommended in ('instagram', 'linkedin', 'facebook')),
  copied_count int not null default 0,
  generated_at timestamptz not null default now()
);

-- Indexes for common lookups
create index if not exists survey_responses_user_id_idx on survey_responses(user_id);
create index if not exists posts_user_id_idx on posts(user_id);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with:
- `name`: `init`
- `query`: the full SQL above

Expected: Tables created successfully in the Supabase project `aslqxpoqajxbvkogklan`.

- [ ] **Step 3: Verify tables exist via Supabase MCP**

Use `list_tables` to confirm `users`, `posts`, `survey_responses` all appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260502000000_init.sql
git commit -m "feat: add Supabase schema for users, posts, survey_responses"
```

---

## Task 3: Supabase Client + Survey Config

**Files:**
- Create: `lib/supabase.ts`
- Create: `lib/survey-questions.ts`
- Modify: `.env.local`

- [ ] **Step 1: Get Supabase project URL via MCP**

Use Supabase MCP `get_project_url` tool.
Expected: Returns a URL like `https://aslqxpoqajxbvkogklan.supabase.co`

- [ ] **Step 2: Add env vars to .env.local**

Add these two lines to the existing `.env.local` file (keep existing lines):
```
NEXT_PUBLIC_SUPABASE_URL=https://aslqxpoqajxbvkogklan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbHF4cG9xYWp4YnZrb2drbGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDczNzIsImV4cCI6MjA5MzI4MzM3Mn0.h6YgYldsxboqNIAcRf49MPs2Dlc-OeOQCGmRbXd4v3Q
```

- [ ] **Step 3: Create Supabase browser client**

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Create survey questions config**

Create `lib/survey-questions.ts`:
```typescript
export type QuestionType = 'select' | 'text'

export interface SurveyQuestion {
  key: string
  label: string
  type: QuestionType
  options?: string[]
  required: boolean
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'business_type',
    label: 'מה סוג העסק שלך?',
    type: 'select',
    options: ['מאמן / מנטור', 'יועץ עסקי', 'פרילנסר', 'סוכנות', 'SaaS / טכנולוגיה', 'אחר'],
    required: true,
  },
  {
    key: 'target_audience',
    label: 'מי הלקוח האידיאלי שלך?',
    type: 'text',
    required: true,
  },
  {
    key: 'main_service',
    label: 'מה השירות / המוצר העיקרי שלך?',
    type: 'text',
    required: true,
  },
  {
    key: 'content_frequency',
    label: 'כמה פעמים בשבוע אתה מפרסם תוכן?',
    type: 'select',
    options: ['בכלל לא', 'פעם בשבוע', '2-3 פעמים', 'כמעט כל יום'],
    required: true,
  },
  {
    key: 'content_pain',
    label: 'מה הכי קשה לך בייצור תוכן?',
    type: 'select',
    options: ['חוסר זמן', 'לא יודע מה לכתוב', 'קושי לנסח', 'עקביות', 'הכל'],
    required: true,
  },
  {
    key: 'main_platform',
    label: 'באיזה פלטפורמה אתה הכי פעיל?',
    type: 'select',
    options: ['אינסטגרם', 'לינקדאין', 'פייסבוק', 'טיקטוק', 'מספר פלטפורמות'],
    required: true,
  },
  {
    key: 'tone_preference',
    label: 'איך היית מתאר את הסגנון שלך?',
    type: 'select',
    options: ['מקצועי ורציני', 'חם ואישי', 'הומוריסטי', 'מעורר השראה', 'ישיר ועניני'],
    required: true,
  },
]
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts lib/survey-questions.ts .env.local
git commit -m "feat: add Supabase client and survey questions config"
```

---

## Task 4: Root Layout (RTL + Hebrew)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update globals.css**

Replace the contents of `app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');

body {
  font-family: 'Heebo', sans-serif;
  background-color: #f8f9fc;
  color: #1a1a2e;
}
```

- [ ] **Step 2: Update root layout**

Replace the contents of `app/layout.tsx` with:
```typescript
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
```

- [ ] **Step 3: Verify RTL renders**

Run `npm run dev`, open http://localhost:3000. Check browser dev tools — `<html>` tag should have `dir="rtl"` and `lang="he"`.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: set up RTL Hebrew root layout with Heebo font"
```

---

## Task 5: Screen 1 — Landing Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement landing page**

Replace the contents of `app/page.tsx` with:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    let cleanUrl = url.trim()
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }

    try {
      new URL(cleanUrl)
    } catch {
      setError('אנא הכנס כתובת אתר תקינה')
      return
    }

    setLoading(true)
    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .insert({ website_url: cleanUrl })
        .select('id')
        .single()

      if (dbError) throw dbError

      localStorage.setItem('user_id', data.id)
      localStorage.setItem('website_url', cleanUrl)
      router.push('/survey')
    } catch (err) {
      setError('אירעה שגיאה. אנא נסה שוב.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl mx-auto text-center">

        {/* Hero */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          תן לנו 30 שניות —<br />
          <span className="text-indigo-600">נחזיר לך שבוע של תוכן</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
          מדביקים קישור לאתר שלך. הבינה המלאכותית מנתחת את העסק שלך<br className="hidden md:block" />
          ויוצרת 3 פוסטים מוכנים לפרסום — בסגנון שלך, בעברית.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 justify-center">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="הכנס את כתובת האתר / דף הנחיתה שלך"
            className="flex-1 px-5 py-4 text-base rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right bg-white"
            disabled={loading}
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-8 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? 'שומר...' : 'צור לי תוכן עכשיו'}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-red-500 text-sm">{error}</p>
        )}

        {/* Social proof */}
        <p className="mt-8 text-gray-400 text-sm">
          כבר עשרות בעלי עסקים קיבלו תוכן מוכן ✓
        </p>

        {/* Mock post examples */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
          {[
            { type: 'ערך', color: 'bg-blue-50 border-blue-200', text: '3 דברים שכל מאמן צריך לדעת לפני שפותח עמוד עסקי...' },
            { type: 'אמון', color: 'bg-purple-50 border-purple-200', text: 'לפני 2 שנים פחדתי לבקש תשלום על הייעוץ שלי. היום אני עוזר ל-40 לקוחות...' },
            { type: 'קריאה לפעולה', color: 'bg-green-50 border-green-200', text: 'אם אתה יועץ ורוצה להכפיל את הלקוחות שלך — יש לי מקום ל-3 נוספים החודש.' },
          ].map((post) => (
            <div key={post.type} className={`${post.color} border rounded-xl p-4 text-sm text-gray-700`}>
              <span className="text-xs font-semibold text-gray-400 block mb-2">{post.type}</span>
              {post.text}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify form works**

Run `npm run dev`. Open http://localhost:3000. Enter a URL, click the button. Confirm:
- URL without https:// gets it prepended
- Invalid URL shows error message in Hebrew
- Valid URL creates a user row in Supabase and navigates to `/survey`

Check Supabase MCP `execute_sql` with `SELECT * FROM users ORDER BY created_at DESC LIMIT 5;` to confirm the row was inserted.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: build Screen 1 landing page with URL input and Supabase user creation"
```

---

## Task 6: SurveyForm Component + Screen 2

**Files:**
- Create: `components/SurveyForm.tsx`
- Create: `app/survey/page.tsx`

- [ ] **Step 1: Create SurveyForm component**

Create `components/SurveyForm.tsx`:
```typescript
'use client'

import { SurveyQuestion } from '@/lib/survey-questions'

interface Props {
  questions: SurveyQuestion[]
  answers: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function SurveyForm({ questions, answers, onChange }: Props) {
  return (
    <div className="space-y-6">
      {questions.map((q, index) => (
        <div key={q.key} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <span className="text-indigo-500 ml-2">{index + 1}.</span>
            {q.label}
            {q.required && <span className="text-red-400 mr-1">*</span>}
          </label>

          {q.type === 'select' && q.options ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {q.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(q.key, option)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors text-center ${
                    answers[q.key] === option
                      ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answers[q.key] || ''}
              onChange={(e) => onChange(q.key, e.target.value)}
              placeholder="הקלד כאן..."
              className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-right"
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create survey page**

Create `app/survey/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SURVEY_QUESTIONS } from '@/lib/survey-questions'
import SurveyForm from '@/components/SurveyForm'

export default function SurveyPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('user_id')) {
      router.replace('/')
    }
  }, [router])

  const requiredAnswered = SURVEY_QUESTIONS
    .filter((q) => q.required)
    .every((q) => answers[q.key]?.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!requiredAnswered) return

    setLoading(true)
    setError('')

    const userId = localStorage.getItem('user_id')!
    const rows = Object.entries(answers).map(([key, value]) => ({
      user_id: userId,
      question_key: key,
      answer_text: value,
    }))

    try {
      const { error: insertError } = await supabase
        .from('survey_responses')
        .insert(rows)

      if (insertError) throw insertError

      await supabase
        .from('users')
        .update({ survey_completed: true })
        .eq('id', userId)

      router.push('/loading')
    } catch (err) {
      setError('אירעה שגיאה בשמירת התשובות. אנא נסה שוב.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
            נכיר אותך קצת יותר 👋
          </h1>
          <p className="text-gray-500 text-base">
            כדי שנוכל לייצר תוכן שמתאים בדיוק לעסק שלך
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <SurveyForm
            questions={SURVEY_QUESTIONS}
            answers={answers}
            onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
          />

          {error && <p className="mt-4 text-red-500 text-sm text-center">{error}</p>}

          <div className="mt-8 text-center">
            <button
              type="submit"
              disabled={!requiredAnswered || loading}
              className="px-10 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'שומר...' : 'צור לי תוכן עכשיו ←'}
            </button>
            <p className="mt-3 text-xs text-gray-400">
              {SURVEY_QUESTIONS.filter((q) => q.required && answers[q.key]).length} / {SURVEY_QUESTIONS.filter((q) => q.required).length} שאלות חובה ענית
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify survey flow**

Run `npm run dev`. Go through Screen 1, then arrive at `/survey`. Confirm:
- Questions render correctly in RTL
- Select options highlight on click
- Text inputs accept Hebrew typing
- Submit button stays disabled until all required questions answered
- Submitting saves rows to `survey_responses` (verify via `SELECT * FROM survey_responses;` via Supabase MCP)
- Navigates to `/loading` after success

- [ ] **Step 4: Commit**

```bash
git add components/SurveyForm.tsx app/survey/page.tsx
git commit -m "feat: build Screen 2 survey with flexible key/value question config"
```

---

## Task 7: Supabase Edge Function — `generate-content`

**Files:**
- Create: `supabase/functions/generate-content/index.ts`

- [ ] **Step 1: Create edge function**

Create `supabase/functions/generate-content/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id נדרש' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, website_url')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'משתמש לא נמצא' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch survey answers
    const { data: surveyRows } = await supabase
      .from('survey_responses')
      .select('question_key, answer_text')
      .eq('user_id', user_id)

    const survey_answers = (surveyRows ?? []).map((r) => ({
      key: r.question_key,
      value: r.answer_text,
    }))

    // Call N8N webhook — wait synchronously
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        website_url: user.website_url,
        survey_answers,
      }),
    })

    if (!n8nResponse.ok) {
      throw new Error(`N8N returned ${n8nResponse.status}`)
    }

    const n8nData = await n8nResponse.json()

    if (!n8nData.posts || !Array.isArray(n8nData.posts) || n8nData.posts.length !== 3) {
      throw new Error('N8N response format invalid')
    }

    // Save posts to Supabase
    const postsToInsert = n8nData.posts.map((p: {
      post_type: string
      content: string
      copy: string
      image_url?: string
      channel_recommended: string
    }) => ({
      user_id,
      post_type: p.post_type,
      content: p.content,
      copy: p.copy,
      image_url: p.image_url ?? null,
      channel_recommended: p.channel_recommended,
    }))

    const { error: insertError } = await supabase
      .from('posts')
      .insert(postsToInsert)

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ posts: n8nData.posts }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('generate-content error:', err)
    return new Response(
      JSON.stringify({ error: 'שגיאה ביצירת התוכן. אנא נסה שוב.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Deploy edge function via Supabase MCP**

Use the Supabase MCP `deploy_edge_function` tool with:
- `name`: `generate-content`
- `files`: `[{ name: "index.ts", content: "<contents of supabase/functions/generate-content/index.ts>" }]`

Expected: Function deployed successfully.

- [ ] **Step 3: Set N8N_WEBHOOK_URL secret via Supabase MCP**

The `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by Supabase at runtime. Only `N8N_WEBHOOK_URL` needs to be set manually.

Use Supabase MCP to execute SQL that sets the secret, or use the `deploy_edge_function` with secrets parameter if available. If not available via MCP, note that the user must set this in the Supabase dashboard under Edge Functions → generate-content → Secrets:
- Key: `N8N_WEBHOOK_URL`
- Value: `https://n8n.srv1241655.hstgr.cloud/webhook/8b04b7d0-7c95-49be-bed9-43802219eb2f`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-content/index.ts
git commit -m "feat: deploy Supabase edge function generate-content as N8N proxy"
```

---

## Task 8: LoadingMessages Component + Screen 3

**Files:**
- Create: `components/LoadingMessages.tsx`
- Create: `app/loading/page.tsx`

- [ ] **Step 1: Create LoadingMessages component**

Create `components/LoadingMessages.tsx`:
```typescript
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
```

- [ ] **Step 2: Create loading page**

Create `app/loading/page.tsx`:
```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import LoadingMessages from '@/components/LoadingMessages'

export default function LoadingPage() {
  const router = useRouter()
  const called = useRef(false)

  useEffect(() => {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      router.replace('/')
      return
    }
    if (called.current) return
    called.current = true

    async function generate() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

        const res = await fetch(
          `${supabaseUrl}/functions/v1/generate-content`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({ user_id: userId }),
          }
        )

        const data = await res.json()

        if (!res.ok || data.error) {
          localStorage.setItem('generation_error', data.error || 'שגיאה לא ידועה')
          router.push('/results')
          return
        }

        localStorage.setItem('generated_posts', JSON.stringify(data.posts))
        router.push('/results')
      } catch {
        localStorage.setItem('generation_error', 'שגיאה ביצירת התוכן. אנא נסה שוב.')
        router.push('/results')
      }
    }

    generate()
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-10">
          מייצרים את התוכן שלך...
        </h2>
        <LoadingMessages />
        <p className="mt-10 text-sm text-gray-400">
          זה לוקח כ-30 שניות. כדאי להישאר 😊
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify loading screen**

Run `npm run dev`. Go through Screens 1 and 2, arrive at `/loading`. Confirm:
- Animated spinner appears
- Messages cycle with fade animation
- Edge function is called (check browser network tab — POST to `/functions/v1/generate-content`)
- Navigation to `/results` happens after response (even on error)

- [ ] **Step 4: Commit**

```bash
git add components/LoadingMessages.tsx app/loading/page.tsx
git commit -m "feat: build Screen 3 loading page with animated messages and edge function call"
```

---

## Task 9: PostCard Component + Screen 4 (WOW)

**Files:**
- Create: `components/PostCard.tsx`
- Create: `app/results/page.tsx`

- [ ] **Step 1: Create PostCard component**

Create `components/PostCard.tsx`:
```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Post {
  post_type: 'value' | 'trust' | 'cta'
  content: string
  copy: string
  image_url?: string
  channel_recommended: 'instagram' | 'linkedin' | 'facebook'
}

const POST_TYPE_LABELS: Record<Post['post_type'], string> = {
  value: '💡 ערך מקצועי',
  trust: '🤝 בניית אמון',
  cta: '🎯 קריאה לפעולה',
}

const CHANNEL_COLORS: Record<Post['channel_recommended'], string> = {
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-blue-100 text-blue-700',
  facebook: 'bg-indigo-100 text-indigo-700',
}

const CHANNEL_LABELS: Record<Post['channel_recommended'], string> = {
  instagram: 'אינסטגרם',
  linkedin: 'לינקדאין',
  facebook: 'פייסבוק',
}

interface Props {
  post: Post
}

export default function PostCard({ post }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = `${post.content}\n\n${post.copy}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
      {/* Image */}
      {post.image_url && (
        <div className="relative w-full aspect-square">
          <Image
            src={post.image_url}
            alt="תמונה לפוסט"
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">
            {POST_TYPE_LABELS[post.post_type]}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${CHANNEL_COLORS[post.channel_recommended]}`}>
            {CHANNEL_LABELS[post.channel_recommended]}
          </span>
        </div>

        {/* Content */}
        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap flex-1 mb-4">
          {post.content}
        </p>

        {/* Copy/tagline */}
        <p className="text-xs text-gray-400 italic mb-4 border-t pt-3">
          {post.copy}
        </p>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied ? '✓ הועתק!' : 'העתק פוסט'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create results page**

Create `app/results/page.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PostCard from '@/components/PostCard'

interface Post {
  post_type: 'value' | 'trust' | 'cta'
  content: string
  copy: string
  image_url?: string
  channel_recommended: 'instagram' | 'linkedin' | 'facebook'
}

export default function ResultsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const err = localStorage.getItem('generation_error')
    if (err) {
      setError(err)
      localStorage.removeItem('generation_error')
      return
    }

    const raw = localStorage.getItem('generated_posts')
    if (!raw) {
      router.replace('/')
      return
    }

    try {
      setPosts(JSON.parse(raw))
    } catch {
      router.replace('/')
    }
  }, [router])

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-2xl mb-4">😕</p>
        <h2 className="text-xl font-bold text-gray-800 mb-3">אופס, משהו השתבש</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => router.push('/loading')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          נסה שוב
        </button>
      </main>
    )
  }

  if (!posts.length) return null

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            הנה התוכן שלך מוכן לפרסום 🎯
          </h1>
          <p className="text-gray-500 text-base">
            3 פוסטים שנוצרו בדיוק בשבילך — מוכנים להעתקה
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <PostCard key={i} post={post} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => router.push('/waitlist')}
            className="px-10 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 transition-colors"
          >
            רוצה עוד תוכן? הצטרף לרשימה ←
          </button>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Update next.config.ts to allow external images**

Modify `next.config.ts` to allow any hostname for images (since N8N may return various image CDN URLs):
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 4: Verify results page**

With mock data in localStorage: open browser console and run:
```javascript
localStorage.setItem('generated_posts', JSON.stringify([
  { post_type: 'value', content: 'תוכן לדוגמה 1', copy: 'קפשן לדוגמה', image_url: null, channel_recommended: 'instagram' },
  { post_type: 'trust', content: 'תוכן לדוגמה 2', copy: 'קפשן לדוגמה', image_url: null, channel_recommended: 'linkedin' },
  { post_type: 'cta', content: 'תוכן לדוגמה 3', copy: 'קפשן לדוגמה', image_url: null, channel_recommended: 'facebook' }
]))
```
Navigate to `/results`. Confirm:
- 3 PostCards render with correct labels and channel colors
- "העתק פוסט" button copies content + copy to clipboard
- Button shows "✓ הועתק!" for 2 seconds after click
- "הצטרף לרשימה" button navigates to `/waitlist`

- [ ] **Step 5: Commit**

```bash
git add components/PostCard.tsx app/results/page.tsx next.config.ts
git commit -m "feat: build Screen 4 WOW results page with PostCard and clipboard copy"
```

---

## Task 10: Screen 5 — Waitlist

**Files:**
- Create: `app/waitlist/page.tsx`

- [ ] **Step 1: Create waitlist page**

Create `app/waitlist/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('user_id')) {
      window.location.href = '/'
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setError('אנא הכנס כתובת אימייל תקינה')
      return
    }

    setLoading(true)
    setError('')

    const userId = localStorage.getItem('user_id')!
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ email: email.trim() })
        .eq('id', userId)

      if (updateError) throw updateError
      setSubmitted(true)
    } catch {
      setError('אירעה שגיאה. אנא נסה שוב.')
      setLoading(false)
    }
  }

  async function handleWhatsApp() {
    const userId = localStorage.getItem('user_id')
    if (userId) {
      await supabase
        .from('users')
        .update({ whatsapp_opted_in: true })
        .eq('id', userId)
    }
    window.open('https://chat.whatsapp.com/YOUR_GROUP_LINK', '_blank')
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md mx-auto">
          <p className="text-5xl mb-6">🙌</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            אתה ברשימה!
          </h1>
          <p className="text-gray-500 text-base mb-8">
            ניצור איתך קשר כשהגרסה המלאה תעלה. בינתיים — הצטרף לקהילה שלנו בוואטסאפ לטיפים שבועיים ועדכונים ראשונים.
          </p>
          <button
            onClick={handleWhatsApp}
            className="w-full px-8 py-4 bg-green-500 text-white font-bold text-base rounded-xl shadow-md hover:bg-green-600 transition-colors mb-3"
          >
            📲 הצטרף לקבוצת הוואטסאפ
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            אולי אחר כך
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md mx-auto w-full text-center">
        <p className="text-5xl mb-6">🎉</p>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          הפוסטים שלך מוכנים!
        </h1>
        <p className="text-gray-500 text-base mb-8">
          השאר אימייל וניצור איתך קשר כשהגרסה המלאה תהיה מוכנה — עם עוד תוכן, עוד פלטפורמות, ועוד.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="האימייל שלך"
            className="w-full px-5 py-4 text-base rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right bg-white"
            dir="ltr"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full px-8 py-4 bg-indigo-600 text-white font-bold text-base rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'שומר...' : 'שמור אותי ברשימה'}
          </button>
        </form>

        <button
          onClick={() => window.location.href = '/'}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline block w-full text-center"
        >
          אולי אחר כך
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify waitlist page**

Navigate to `/waitlist`. Confirm:
- Email input renders and validates
- After submit, confirmation screen appears with WhatsApp CTA
- `users.email` updated in Supabase (verify via `SELECT email, whatsapp_opted_in FROM users;`)
- WhatsApp button opens new tab (URL placeholder — user must update with real group link)

- [ ] **Step 3: Commit**

```bash
git add app/waitlist/page.tsx
git commit -m "feat: build Screen 5 waitlist with email signup and WhatsApp CTA"
```

---

## Task 11: End-to-End Test + Vercel Deployment

**Files:**
- Modify: `.env.local` (add Vercel env vars if needed)

- [ ] **Step 1: Full end-to-end walkthrough**

Run `npm run dev`. Go through the complete flow:
1. Enter a real website URL on `/`
2. Answer all survey questions on `/survey`
3. Watch loading animation on `/loading`
4. Confirm 3 posts appear on `/results`
5. Click "העתק פוסט" on each — confirm clipboard works
6. Click through to `/waitlist`, enter email, confirm submission

Check Supabase tables via MCP `execute_sql`:
```sql
SELECT u.id, u.website_url, u.email, u.survey_completed,
       COUNT(DISTINCT sr.id) AS survey_answers,
       COUNT(DISTINCT p.id) AS posts_generated
FROM users u
LEFT JOIN survey_responses sr ON sr.user_id = u.id
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id
ORDER BY u.created_at DESC
LIMIT 5;
```
Expected: Each user row shows 7 survey answers and 3 posts.

- [ ] **Step 2: Build check**

```bash
npm run build
```
Expected: Build completes with no errors. Note any warnings.

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel --yes
```
Follow prompts. Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Expected: Deployment URL returned (e.g., `https://validation-1-xxx.vercel.app`)

- [ ] **Step 4: Verify production deployment**

Open the Vercel URL. Run through the full flow once more on production. Confirm:
- RTL layout renders correctly on mobile
- Edge function is reachable
- Posts are generated and displayed
- Waitlist email saves successfully

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Phase 1 MVP — all 5 screens, edge function, Supabase integration"
```

---

## Notes for Implementation

- **WhatsApp group link:** Placeholder `https://chat.whatsapp.com/YOUR_GROUP_LINK` in `app/waitlist/page.tsx` must be replaced with the real group invite link before launch.
- **N8N_WEBHOOK_URL secret:** Must be set in Supabase dashboard → Edge Functions → generate-content → Secrets. The MCP tool may not support setting secrets directly — check if `deploy_edge_function` accepts a `secrets` parameter; if not, set manually via dashboard.
- **Image domains:** `next.config.ts` uses `hostname: '**'` to allow all image sources. Tighten this once N8N's image CDN is known.
- **copied_count analytics:** Currently not incremented when a post is copied. Can be added later via a separate Supabase RPC call.
