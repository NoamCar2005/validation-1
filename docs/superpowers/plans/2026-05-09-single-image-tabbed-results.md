# Single Image + Tabbed Results — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce image generation from 3 calls to 1 (value post only), and replace the 3-card grid on the results page with a shared image header + 3 tabbed text posts.

**Architecture:** One conditional in `pipeline.ts` skips image generation for trust and CTA posts. `app/results/page.tsx` is rewritten: PostCard is replaced by a shared image block + tab switcher + tab content panel. All 3 post text copies are still generated and displayed — only the image call is reduced.

**Tech Stack:** Deno Edge Functions (pipeline), Next.js + inline styles (frontend), `next/image` for the shared image

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `supabase/functions/_shared/pipeline.ts` | Conditional image generation (value only) + raise success threshold to 3 |
| Modify | `app/results/page.tsx` | Replace 3-card grid with shared image + tabs |

---

## Task 1: Pipeline — single image generation

**Files:**
- Modify: `supabase/functions/_shared/pipeline.ts`

- [ ] **Step 1: Make image generation conditional on post type**

In `supabase/functions/_shared/pipeline.ts`, find the `generateImage` call inside the `Promise.allSettled` block (around line 65). Replace:

```ts
    const imageUrl = await generateImage(
      copy.image_prompt,
      postType,
      copy.channel_recommended,
      userId,
      geminiApiKey,
      supabaseUrl,
      supabaseServiceKey,
      diag,
    )
```

With:

```ts
    const imageUrl = postType === 'value'
      ? await generateImage(
          copy.image_prompt,
          postType,
          copy.channel_recommended,
          userId,
          geminiApiKey,
          supabaseUrl,
          supabaseServiceKey,
          diag,
        )
      : null
```

- [ ] **Step 2: Raise the success threshold to require all 3 posts**

In the same file, find the failure guard (around line 101):

```ts
    if (posts.length < 2) {
```

Replace with:

```ts
    if (posts.length < 3) {
```

Also update the error message on the next line from:

```ts
        `[stage:generate-posts] only ${posts.length}/3 posts succeeded. Failures: ${failures.join(' | ')}`
```

To (no change needed — message is already correct).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/pipeline.ts
git commit -m "feat: generate image for value post only, require all 3 text posts"
```

---

## Task 2: Results page — shared image + tabbed posts

**Files:**
- Modify: `app/results/page.tsx`

This task fully replaces the main content section of the results page. The error state, sticky bar, and EarlyAccessModal are preserved verbatim. `PostCard` is no longer used.

- [ ] **Step 1: Replace `app/results/page.tsx` with the new tabbed layout**

Write the following as the complete contents of `app/results/page.tsx`:

```tsx
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import EarlyAccessModal from '@/components/EarlyAccessModal'

type PostType = 'value' | 'trust' | 'cta'
type Channel = 'instagram' | 'linkedin' | 'facebook'

interface Post {
  post_type: PostType
  content: string
  copy: string
  image_url?: string | null
  channel_recommended: Channel
}

const TAB_META: Record<PostType, { label: string; icon: string }> = {
  value: { label: 'ערכי', icon: '💡' },
  trust: { label: 'אמון', icon: '🤝' },
  cta:   { label: 'CTA',  icon: '🎯' },
}

const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: 'אינסטגרם',
  linkedin:  'לינקדאין',
  facebook:  'פייסבוק',
}

function formatPostContent(text: string): string {
  if (!text) return text
  if (text.includes('\n')) return text
  return text.replace(/([.!?])\s+(?=[֐-׿])/g, '$1\n\n').trim()
}

export default function ResultsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedTab, setSelectedTab] = useState<PostType>('value')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const err = localStorage.getItem('generation_error')
    if (err) {
      setError(err)
      localStorage.removeItem('generation_error')
      return
    }

    const raw = localStorage.getItem('generated_posts')
    if (!raw) { router.replace('/'); return }

    try {
      setPosts(JSON.parse(raw))
      setTimeout(() => setRevealed(true), 120)
    } catch {
      router.replace('/')
    }
  }, [router])

  useEffect(() => { setCopied(false) }, [selectedTab])

  const sharedImageUrl = posts.find(p => p.post_type === 'value')?.image_url ?? null
  const activePost = posts.find(p => p.post_type === selectedTab)

  async function handleCopy() {
    if (!activePost) return
    await navigator.clipboard.writeText(`${activePost.content}\n\n${activePost.copy}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
        background: 'var(--body-bg)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(220,38,38,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 20,
        }}>😕</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24, fontWeight: 900,
          color: 'var(--text-primary)', marginBottom: 12,
        }}>
          אופס, משהו השתבש
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28, maxWidth: 400 }}>
          {error}
        </p>
        <button
          onClick={() => router.push('/loading')}
          style={{
            padding: '14px 32px', background: 'var(--indigo)', color: 'white',
            border: 'none', borderRadius: 14, fontFamily: 'inherit',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: 'var(--shadow-btn)',
          }}
        >
          נסה שוב
        </button>
      </div>
    )
  }

  if (!posts.length) return null

  return (
    <div className="screen-enter" style={{
      minHeight: '100vh',
      background: 'var(--body-bg)',
      paddingBottom: 100,
    }}>

      {/* ── Header ──────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, var(--navy) 0%, #12152e 100%)',
        padding: 'clamp(36px,6vw,60px) 24px clamp(40px,7vw,68px)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(37,211,102,0.12)', color: '#0E8E48',
            borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 700, marginBottom: 20,
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--green)', color: 'white',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pop .4s',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            מוכן! {posts.length} פוסטים נוצרו עבורך
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px,5.5vw,48px)',
            fontWeight: 900, color: 'white',
            letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.15,
          }}>
            התוכן החדש שלך<br />
            <span style={{ color: 'var(--accent)' }}>מוכן לפרסום</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: 15, lineHeight: 1.65 }}>
            בחר פוסט, לחץ &quot;העתק&quot; והדבק ישירות ברשת החברתית שלך.
          </p>

          <div style={{
            display: 'flex', justifyContent: 'center',
            gap: 10, marginTop: 24, flexWrap: 'wrap',
          }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--accent)', color: 'var(--navy)',
                fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
                border: 'none', borderRadius: 12, padding: '12px 24px',
                cursor: 'pointer', boxShadow: 'var(--shadow-btn-accent)',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              הצטרף לגישה מוקדמת ⚡
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.65)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
                borderRadius: 12, padding: '12px 20px',
                cursor: 'pointer', transition: 'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              ← צור פוסטים לאתר אחר
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────── */}
      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: 'clamp(28px,5vw,48px) 20px 0',
      }}>
        {revealed && (
          <div className="card-reveal-1">

            {/* Shared image */}
            <div style={{
              borderRadius: 20, overflow: 'hidden', marginBottom: 20,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
              aspectRatio: '16/9',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              position: 'relative',
            }}>
              {sharedImageUrl ? (
                <Image
                  src={sharedImageUrl}
                  alt="תמונה לפוסט"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48, opacity: 0.35,
                }}>
                  🖼️
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, direction: 'rtl' }}>
              {(['value', 'trust', 'cta'] as PostType[]).map(tab => {
                const { label, icon } = TAB_META[tab]
                const isActive = selectedTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    style={{
                      flex: 1, padding: '10px 12px',
                      borderRadius: 12, fontFamily: 'inherit',
                      fontWeight: 700, fontSize: 14,
                      border: '1.5px solid',
                      borderColor: isActive ? 'var(--navy)' : 'var(--border)',
                      background: isActive ? 'var(--navy)' : 'white',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab content panel */}
            {activePost && (
              <div style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
              }}>
                {/* Header row */}
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {TAB_META[activePost.post_type].icon} פוסט {TAB_META[activePost.post_type].label}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)',
                    background: 'var(--body-bg)',
                    padding: '3px 10px', borderRadius: 100,
                    border: '1px solid var(--border)',
                  }}>
                    {CHANNEL_LABEL[activePost.channel_recommended]}
                  </span>
                </div>

                {/* Post content + tagline */}
                <div style={{ padding: '20px 20px 0' }}>
                  <p style={{
                    fontSize: 15, lineHeight: 1.9,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}>
                    {formatPostContent(activePost.content)}
                  </p>
                  {activePost.copy && (
                    <p style={{
                      fontSize: 13, lineHeight: 1.7,
                      color: 'var(--text-secondary)',
                      marginTop: 12, paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                      fontStyle: 'italic',
                      marginBottom: 0,
                    }}>
                      {activePost.copy}
                    </p>
                  )}
                </div>

                {/* Copy button */}
                <div style={{ padding: '16px 20px 20px' }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      width: '100%', padding: '13px',
                      borderRadius: 12, fontWeight: 700, fontSize: 14,
                      background: copied ? 'var(--green)' : 'var(--navy)',
                      color: 'white', border: 'none', cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      boxShadow: copied
                        ? '0 4px 16px rgba(37,211,102,0.3)'
                        : '0 6px 22px rgba(12,14,29,0.18)',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}
                  >
                    {copied ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        הועתק!
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        העתק פוסט
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Value proposition strip */}
        <div style={{
          marginTop: 'clamp(40px,6vw,56px)',
          background: 'white',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: 'clamp(24px,4vw,36px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 24,
          textAlign: 'center',
        }}>
          {[
            { icon: '🎯', title: 'פוסט ערכי', desc: 'ידע מקצועי שמצב אותך כמומחה' },
            { icon: '🤝', title: 'פוסט אמון', desc: 'הסיפור שלך — למה לבחור דווקא בך' },
            { icon: '⚡', title: 'פוסט CTA', desc: 'קריאה לפעולה שמביאה לקוחות' },
          ].map(item => (
            <div key={item.title}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sticky bottom CTA bar ───────────────── */}
      <div
        className="sticky-bar-enter"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          padding: '16px 20px',
          background: 'linear-gradient(180deg, transparent, rgba(251,247,240,0.92) 30%, var(--body-bg))',
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: '100%', padding: '17px 22px',
              background: 'var(--navy)', color: 'white',
              border: 'none', borderRadius: 16, fontFamily: 'inherit',
              fontWeight: 800, fontSize: 16,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 10px 32px rgba(12,14,29,0.30)',
              cursor: 'pointer', transition: 'all 0.18s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            רוצה כזה כל שבוע? הצטרף לרשימה
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {showModal && <EarlyAccessModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify the dev server compiles cleanly**

```bash
npm run dev
```

Expected: server starts with no TypeScript or compilation errors. If you see a type error about `image_url`, confirm the `Post` interface has `image_url?: string | null` (it does in the code above).

- [ ] **Step 3: Test the tabbed UI in the browser**

Open `http://localhost:3000/results` in your browser. The page will redirect to `/` because there are no posts in localStorage. Seed it via the browser console:

```js
localStorage.setItem('generated_posts', JSON.stringify([
  { post_type: 'value', content: 'פסקה ראשונה.\n\nפסקה שנייה.\n\nפסקה שלישית.', copy: 'הוק קצר', channel_recommended: 'instagram', image_url: null },
  { post_type: 'trust', content: 'פסקה ראשונה.\n\nפסקה שנייה.\n\nפסקה שלישית.', copy: 'הוק לאמון', channel_recommended: 'linkedin', image_url: null },
  { post_type: 'cta', content: 'פסקה ראשונה.\n\nפסקה שנייה.', copy: 'הוק CTA', channel_recommended: 'facebook', image_url: null }
]))
```

Then navigate to `http://localhost:3000/results` (hard refresh if needed).

Verify:
- Shared image area renders with the placeholder emoji (no image_url in test data)
- Three tab buttons appear: 💡 ערכי | 🤝 אמון | 🎯 CTA
- Default active tab is "ערכי" (navy filled)
- Clicking each tab switches content and updates channel badge
- Copying a post turns the button green and shows "הועתק!"
- Switching tabs resets the copy button back to navy
- Sticky bar is visible at bottom
- Header action buttons work (Early Access modal opens)

- [ ] **Step 4: Commit**

```bash
git add app/results/page.tsx
git commit -m "feat: replace 3-card grid with shared image + tabbed posts"
```

---

## Self-Review

**Spec coverage:**
- ✅ `generateImage` only called for `postType === 'value'` — Task 1
- ✅ Success threshold raised to `posts.length < 3` — Task 1
- ✅ Trust/CTA posts stored with `image_url: null` (via the conditional returning `null`) — Task 1
- ✅ `sharedImageUrl` extracted from value post — Task 2
- ✅ `selectedTab` state defaults to `'value'` — Task 2
- ✅ `revealed` animation preserved via `card-reveal-1` on wrapper — Task 2
- ✅ Image block: 16/9 aspect ratio, rounded, shadowed — Task 2
- ✅ Graceful placeholder when `sharedImageUrl` is null — Task 2
- ✅ Three tab buttons: `ערכי` | `אמון` | `CTA` — Task 2
- ✅ Active tab: navy fill / white text; inactive: bordered — Task 2
- ✅ RTL tab layout (`direction: 'rtl'`) — Task 2
- ✅ Channel badge per tab — Task 2
- ✅ Full post content, no truncation, `white-space: pre-wrap` — Task 2
- ✅ `post.copy` as italic tagline below content — Task 2
- ✅ Copy button: full-width, copies `content + '\n\n' + copy` — Task 2
- ✅ Copied state resets on tab change — Task 2
- ✅ Value prop strip retained unchanged — Task 2
- ✅ Sticky CTA bar unchanged — Task 2
- ✅ `EarlyAccessModal` unchanged — Task 2
- ✅ `PostCard` import removed — Task 2

**Placeholder scan:** All steps have exact code. No TBDs. ✅

**Type consistency:**
- `PostType = 'value' | 'trust' | 'cta'` used everywhere consistently
- `TAB_META[activePost.post_type]` — `activePost.post_type` is `PostType` ✅
- `CHANNEL_LABEL[activePost.channel_recommended]` — `channel_recommended` is `Channel` ✅
- Pipeline: `postType === 'value'` — `postType` is `PostType` from the `postTypes` array ✅
