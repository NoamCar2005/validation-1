// supabase/functions/_shared/scrape.ts

const TIMEOUT_MS = 8_000
const MAX_CHARS = 8000
const ALLOWED_PORTS = new Set(['', '80', '443'])

// Reject IP literals pointing to private/internal ranges plus a small
// deny-list of hostnames. Runs on the original URL and every redirect target.
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h === 'metadata.google.internal') return true

  // IPv6 literal (URL.hostname strips the brackets)
  if (h.includes(':')) {
    if (h === '::1') return true
    if (h.startsWith('fc') || h.startsWith('fd')) return true
    if (h.startsWith('fe80')) return true
    return true  // conservative: reject all IPv6 literals
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
