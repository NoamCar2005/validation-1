// supabase/functions/_shared/cors.ts

// Origins allowed to call our Edge Functions from a browser.
// Add prod + Vercel previews here. Server-to-server callers (no Origin header)
// are unaffected.
const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:3000',
  'https://contentmine.app',
  'https://adcraftai.co',
  'https://www.adcraftai.co',
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
