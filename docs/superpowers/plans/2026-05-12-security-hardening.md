# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the security gaps surfaced in the 2026-05-12 audit (Critical IDOR on `generate-content`, public storage bucket, Next.js CVEs, CORS, SSRF, error leakage, weak `next` param handling, missing DELETE policies, Gemini key in URL, etc.) without breaking the existing user flow.

**Architecture:** All fixes are layered onto the existing pipeline. The Edge Function moves from "trust body" to "derive identity from JWT." Storage moves from public bucket with predictable paths to public bucket with random per-object UUIDs (preserves public URL contract for the `<Image>` component, removes path-guessing). RLS gets DELETE policies added. Next.js bumped within its 14.x line (non-breaking). All other fixes are localized refactors.

**Tech Stack:** Next.js 14 App Router (Node), Supabase Postgres + Auth + Edge Functions (Deno), `@supabase/supabase-js` v2, Gemini API.

---

## File Structure

**Edge Function (Deno):**
- Modify `supabase/functions/generate-content/index.ts` — add JWT verification, derive user from auth, tighten CORS, drop debug leak.
- Create `supabase/functions/_shared/auth.ts` — JWT validation + user lookup helper.
- Create `supabase/functions/_shared/cors.ts` — origin allowlist helper.
- Modify `supabase/functions/_shared/scrape.ts` — SSRF guard before fetch.
- Modify `supabase/functions/_shared/summarize.ts` — Gemini key to header.
- Modify `supabase/functions/_shared/generate-image.ts` — Gemini key to header + random storage path.
- Modify `supabase/functions/_shared/pipeline.ts` — Gemini key to header (model-list call).

**Database:**
- Create `supabase/migrations/20260512000000_add_delete_policies.sql` — DELETE policies for `posts` and `survey_responses`.

**Frontend (Next.js):**
- Modify `app/auth/callback/route.ts` — validate `next` param against open-redirect shapes.
- Modify `app/loading/page.tsx` — stop sending `user_id` in body (function derives from JWT).
- Modify `package.json` — bump `next` to latest 14.2.x patched.

**Docs:**
- This file documents the manual steps that require dashboard access (leaked-password protection).

---

## Constraints & Non-Goals

- We **do not** flip `Validation` bucket to private because `app/results/page.tsx` and the `<Image>` component use unsigned public URLs. Randomizing paths gives us the practical security win (unguessable) without rewriting the read path.
- We **do not** add per-user rate-limiting in this plan (separate effort). The IDOR fix already removes anonymous-abuse capacity.
- We **do not** rotate the Supabase anon key currently in committed docs — it's a public key by design, and rotation is disruptive. Mentioned in audit, not actioned here.

---

## Task 1: Add DELETE policies migration

**Files:**
- Create: `supabase/migrations/20260512000000_add_delete_policies.sql`

- [ ] **Step 1.1: Write the migration**

```sql
-- DELETE policies so authenticated users can erase their own data (GDPR right-to-erasure).

CREATE POLICY "posts: own delete" ON public.posts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "survey_responses: own delete" ON public.survey_responses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "users: own delete" ON public.users
  FOR DELETE TO authenticated
  USING (auth.uid() = auth_user_id);
```

- [ ] **Step 1.2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `20260512000000_add_delete_policies` and the SQL above.

- [ ] **Step 1.3: Verify**

Use `mcp__supabase__execute_sql`:
```sql
SELECT policyname, cmd FROM pg_policies
WHERE schemaname='public' AND cmd='DELETE'
ORDER BY tablename, policyname;
```
Expected: three rows — one per table.

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260512000000_add_delete_policies.sql
git commit -m "feat(db): add DELETE RLS policies for user-owned tables"
```

---

## Task 2: CORS allowlist helper

**Files:**
- Create: `supabase/functions/_shared/cors.ts`

- [ ] **Step 2.1: Write the helper**

```ts
// supabase/functions/_shared/cors.ts

// Origins allowed to call our Edge Functions from a browser.
// Add prod + Vercel previews here. Server-to-server callers (no Origin header)
// are unaffected.
const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:3000',
  'https://contentmine.app',
])

const VERCEL_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/

function isAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true
  if (VERCEL_PREVIEW_RE.test(origin)) return true
  return false
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowOrigin = isAllowed(origin) ? origin : 'null'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
```

- [ ] **Step 2.2: Commit** (combined with Task 3 commit)

---

## Task 3: JWT verification helper

**Files:**
- Create: `supabase/functions/_shared/auth.ts`

- [ ] **Step 3.1: Write the helper**

```ts
// supabase/functions/_shared/auth.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthedUser {
  authUserId: string  // auth.users.id (UUID)
  userRowId: string   // public.users.id (UUID)
  websiteUrl: string
}

/**
 * Validates the request's Authorization header against Supabase Auth,
 * then loads the matching public.users row.
 * Returns null when unauthenticated or no profile exists.
 *
 * Uses the anon key + caller's bearer token to validate (no service-role
 * key needed for the JWT check itself).
 */
export async function authenticate(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey: string,
): Promise<AuthedUser | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return null

  // Look up the public.users row by auth_user_id using service-role
  // (RLS bypass is fine here because we just verified the JWT).
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const { data: row, error: rowErr } = await adminClient
    .from('users')
    .select('id, website_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (rowErr || !row) return null
  return { authUserId: user.id, userRowId: row.id, websiteUrl: row.website_url }
}
```

- [ ] **Step 3.2: Commit Tasks 2+3**

```bash
git add supabase/functions/_shared/cors.ts supabase/functions/_shared/auth.ts
git commit -m "feat(edge): add CORS allowlist and JWT auth helpers"
```

---

## Task 4: SSRF guard in scrape

**Files:**
- Modify: `supabase/functions/_shared/scrape.ts`

- [ ] **Step 4.1: Replace the file with hardened version**

```ts
// supabase/functions/_shared/scrape.ts

const TIMEOUT_MS = 8_000
const MAX_CHARS = 8000
const ALLOWED_PORTS = new Set(['', '80', '443'])

/**
 * Reject IP literals that point to private/internal ranges, plus a small
 * deny-list of hostnames. We do this on (a) the user-submitted URL and
 * (b) every redirect target (by walking the chain manually).
 */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h === 'metadata.google.internal') return true

  // IPv6 literal (URL bracketed form arrives unbracketed in URL.hostname)
  if (h.includes(':')) {
    if (h === '::1') return true
    if (h.startsWith('fc') || h.startsWith('fd')) return true  // ULA
    if (h.startsWith('fe80')) return true                       // link-local
    return true  // be conservative: reject all IPv6 literals
  }

  // IPv4 literal
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const [a, b] = [parseInt(v4[1], 10), parseInt(v4[2], 10)]
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true                     // link-local / AWS IMDS
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true           // CGNAT
    if (a >= 224) return true                                    // multicast/reserved
  }
  return false
}

function assertSafeUrl(raw: string): URL {
  let u: URL
  try { u = new URL(raw) } catch { throw new Error('Invalid URL') }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`Disallowed scheme: ${u.protocol}`)
  }
  if (!ALLOWED_PORTS.has(u.port)) {
    throw new Error(`Disallowed port: ${u.port}`)
  }
  if (isPrivateHost(u.hostname)) {
    throw new Error(`Disallowed host: ${u.hostname}`)
  }
  return u
}

export async function scrape(websiteUrl: string): Promise<string> {
  // Walk redirects manually so each hop is re-validated.
  let current = assertSafeUrl(websiteUrl).toString()
  let html = ''
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(current, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ContentMineBot/1.0; +https://contentmine.app)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'he,en;q=0.5',
        },
        signal: controller.signal,
        redirect: 'manual',
      })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) throw new Error(`Redirect with no Location at hop ${hop}`)
        // Resolve relative redirects against current
        const next = new URL(loc, current).toString()
        current = assertSafeUrl(next).toString()
        continue
      }
      if (!res.ok) throw new Error(`Site fetch failed: HTTP ${res.status}`)
      html = await res.text()
      break
    }

    if (!html || html.trim().length < 200) {
      throw new Error('Scraped content too short — site may be empty or blocked')
    }
    return htmlToText(html).slice(0, MAX_CHARS)
  } finally {
    clearTimeout(timer)
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Step 4.2: Commit**

```bash
git add supabase/functions/_shared/scrape.ts
git commit -m "fix(scrape): add SSRF guard, allow only http(s) public hosts, validate each redirect"
```

---

## Task 5: Move Gemini API key from URL query to header

**Files:**
- Modify: `supabase/functions/_shared/summarize.ts:8-9`
- Modify: `supabase/functions/_shared/summarize.ts:96-107` (fetch call)
- Modify: `supabase/functions/_shared/generate-image.ts:15-16`
- Modify: `supabase/functions/_shared/generate-image.ts:96-105` (fetch call)
- Modify: `supabase/functions/_shared/pipeline.ts:147-152` (listAvailableModels)

- [ ] **Step 5.1: summarize.ts — change URL builder + add x-goog-api-key header**

Replace lines 8-9:
```ts
const modelUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
```

Replace the fetch call (currently lines 96-107):
```ts
      let res: Response
      try {
        res = await fetch(modelUrl(model), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify(body),
        })
      } catch (err) {
        console.error(`[gemini:${stage}] network error model=${model} attempt=${attempt}:`, err)
        lastErr = { status: 0, body: String(err) }
        continue
      }
```

- [ ] **Step 5.2: generate-image.ts — change URL builder + header**

Replace lines 15-16:
```ts
const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
```

Replace the fetch call (currently lines 96-105):
```ts
      let res: Response
      try {
        res = await fetchWithTimeout(
          GEMINI_URL(model),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': geminiApiKey,
            },
            body: JSON.stringify(body),
          },
          FETCH_TIMEOUT_MS,
        )
```

- [ ] **Step 5.3: pipeline.ts — listAvailableModels**

Replace lines 148-151:
```ts
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200`,
      { headers: { 'x-goog-api-key': geminiApiKey } },
    )
```

- [ ] **Step 5.4: Commit**

```bash
git add supabase/functions/_shared/summarize.ts \
        supabase/functions/_shared/generate-image.ts \
        supabase/functions/_shared/pipeline.ts
git commit -m "fix(edge): send Gemini API key as header, not URL query string"
```

---

## Task 6: Randomize storage path for generated images

**Files:**
- Modify: `supabase/functions/_shared/generate-image.ts:152-183` (upload + URL block)

- [ ] **Step 6.1: Replace the upload block to use crypto.randomUUID()**

Replace the entire `// ---- Upload to Supabase Storage ----` block (currently lines 152-183) with:

```ts
  // ---- Upload to Supabase Storage ----
  try {
    const base64 = imagePart.inlineData.data
    const mimeType: string = imagePart.inlineData.mimeType ?? 'image/png'
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const ext = mimeType.split('/')[1]?.split(';')[0] || 'png'
    // Random per-image filename — unguessable, so a public bucket URL can't be
    // enumerated. Keep userId as the folder so future Storage RLS scoping is
    // straightforward.
    const objectId = crypto.randomUUID()
    const storagePath = `${userId}/${postType}-${objectId}.${ext}`

    diag.log(stage, 'info', `uploading bucket=Validation path=${storagePath} bytes=${bytes.length} mime=${mimeType} model=${workingModel}`)

    const { error: uploadError } = await supabase.storage
      .from('Validation')
      .upload(storagePath, bytes, { contentType: mimeType, upsert: false })

    if (uploadError) {
      diag.log(stage, 'error', 'storage upload failed', {
        message: uploadError.message,
        // @ts-expect-error supabase StorageError can carry additional fields
        statusCode: uploadError.statusCode,
        // @ts-expect-error
        error: uploadError.error,
      })
      return null
    }

    const url = `${supabaseUrl}/storage/v1/object/public/Validation/${storagePath}`
    diag.log(stage, 'info', `upload ok url=${url}`)
    return url
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    diag.log(stage, 'error', 'upload pipeline threw', { error: msg })
    return null
  }
```

Note: `upsert: false` prevents an attacker (or stale re-runs) from clobbering an existing image. Each generation gets its own object.

- [ ] **Step 6.2: Commit**

```bash
git add supabase/functions/_shared/generate-image.ts
git commit -m "fix(storage): randomize image paths to prevent enumeration/overwrite"
```

---

## Task 7: Edge Function entry — JWT verification, derive user, tighten CORS, drop debug leak

**Files:**
- Modify: `supabase/functions/generate-content/index.ts` (full rewrite of the handler)

- [ ] **Step 7.1: Replace the file**

```ts
// supabase/functions/generate-content/index.ts

import { runPipeline } from '../_shared/pipeline.ts'
import { authenticate } from '../_shared/auth.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const cors = corsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    // 1) Verify JWT and load the caller's public.users row.
    const authed = await authenticate(req, supabaseUrl, supabaseAnonKey, supabaseServiceKey)
    if (!authed) {
      return new Response(JSON.stringify({ error: 'לא מורשה' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 2) Drain (but ignore) the body so we don't break older clients that still send user_id.
    try { await req.json() } catch { /* empty body is fine */ }

    // 3) Fetch survey answers using the AUTHENTICATED user's row id.
    //    We still use service role for read because the function does
    //    write-side work that needs it; identity is already proven by JWT.
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: surveyRows } = await supabase
      .from('survey_responses')
      .select('question_key, answer_text')
      .eq('user_id', authed.userRowId)

    const surveyAnswers = (surveyRows ?? []).map(r => ({
      key: r.question_key,
      value: r.answer_text,
    }))

    // 4) Run pipeline against the authenticated user's website + answers.
    const { posts } = await runPipeline(
      authed.websiteUrl,
      surveyAnswers,
      authed.userRowId,
      geminiApiKey,
      supabaseUrl,
      supabaseServiceKey,
    )

    return new Response(JSON.stringify({ posts }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err)
    console.error('[generate-content] FATAL:', rawMessage, err instanceof Error ? err.stack : '')

    const stageMatch = rawMessage.match(/\[stage:([^\]]+)\]/)
    const stage = stageMatch ? stageMatch[1] : 'unknown'

    // NEVER return raw error/stack to the client. The stage tag is safe
    // (it's a fixed enum of pipeline labels) and helps support, but the
    // detail stays in server logs / pipeline_diagnostics only.
    return new Response(
      JSON.stringify({
        error: 'שגיאה ביצירת התוכן. אנא נסה שוב.',
        stage,
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 7.2: Commit**

```bash
git add supabase/functions/generate-content/index.ts
git commit -m "fix(edge): verify JWT, derive user from auth, tighten CORS, drop debug leak"
```

- [ ] **Step 7.3: Deploy with verify_jwt enabled**

Use `mcp__supabase__deploy_edge_function` with:
- `name: "generate-content"`
- `verify_jwt: true`
- `files`: include `index.ts` and all `_shared/*.ts` files referenced (`auth.ts`, `cors.ts`, `pipeline.ts`, `scrape.ts`, `summarize.ts`, `plan.ts`, `validate-post.ts`, `generate-post.ts`, `copywriting-rubric.ts`, `humanize.ts`, `generate-image.ts`, `diagnostics.ts`, `types.ts`)

- [ ] **Step 7.4: Verify deployment**

Use `mcp__supabase__list_edge_functions` — expected `verify_jwt: true` on `generate-content`.

---

## Task 8: Frontend — drop user_id from body, keep Authorization

**Files:**
- Modify: `app/loading/page.tsx:148-157`

- [ ] **Step 8.1: Replace the fetch block**

```ts
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token
        if (!accessToken) {
          localStorage.setItem('generation_error', 'יש להתחבר מחדש')
          router.replace('/auth')
          return
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({}),
        })
```

Note: we no longer fall back to the anon key for the bearer — the function now requires a real user JWT. The `apikey` header is what Supabase's gateway expects for the function route; the bearer is what we validate inside.

- [ ] **Step 8.2: Commit**

```bash
git add app/loading/page.tsx
git commit -m "fix(frontend): require auth session for generate-content, stop sending user_id"
```

---

## Task 9: Auth callback — validate `next` parameter

**Files:**
- Modify: `app/auth/callback/route.ts:9, 32`

- [ ] **Step 9.1: Replace the file**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  // Must be a single-slash absolute path. Reject protocol-relative ("//evil"),
  // scheme attempts, and backslash tricks.
  if (!raw.startsWith('/')) return '/'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/auth?error=auth_failed', origin))
}
```

- [ ] **Step 9.2: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "fix(auth): validate next param against open-redirect shapes"
```

---

## Task 10: Bump Next.js to latest 14.2.x patched

**Files:**
- Modify: `package.json:14`
- Modify: `package-lock.json` (regenerated)

- [ ] **Step 10.1: Install latest 14.2.x**

```bash
npm install next@^14.2 --save
```

- [ ] **Step 10.2: Verify**

```bash
npm ls next
npm run lint
npm run build
```

Expected: build succeeds. If `npm audit` still shows next high-severity advisories that are only fixed in 15+/16+, that's acceptable for this patch (documented as known).

- [ ] **Step 10.3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): bump next to latest patched 14.2.x for CVE fixes"
```

---

## Task 11: Manual dashboard steps (documented, not code)

These cannot be done from code; the user must apply them in the Supabase dashboard.

- [ ] **Step 11.1: Enable leaked-password protection**

Dashboard → Authentication → Providers → Email → "Password Security" → enable "Check passwords against HaveIBeenPwned."

- [ ] **Step 11.2: (Optional) Set minimum password length**

Same screen — set min length to at least 8.

---

## Final Verification

- [ ] **Step F.1: Confirm Edge Function rejects anonymous calls**

```bash
curl -i -X POST \
  https://aslqxpoqajxbvkogklan.supabase.co/functions/v1/generate-content \
  -H "Content-Type: application/json" \
  -H "apikey: <anon>" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000"}'
```

Expected: HTTP 401 (Supabase gateway will reject before our handler runs once `verify_jwt: true` is deployed).

- [ ] **Step F.2: Re-run security advisor**

`mcp__supabase__get_advisors` with `type: "security"`. Expected: leaked-password warning gone (after Task 11), `rls_enabled_no_policy` for `pipeline_diagnostics` remains (intentional — only service role writes), `anon_security_definer_function_executable` for `rls_auto_enable` remains (false-positive, harmless).

- [ ] **Step F.3: Re-run npm audit**

```bash
npm audit --omit=dev
```

Expected: lower count; remaining high-sev advisories (if any) are only fixable by bumping to 15+/16+.

- [ ] **Step F.4: Manual smoke test**

Run `npm run dev`, sign in, submit a URL, complete survey, watch loading page complete, verify posts render on `/results`. End-to-end flow must still work.
