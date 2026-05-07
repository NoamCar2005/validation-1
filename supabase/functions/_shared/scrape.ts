// supabase/functions/_shared/scrape.ts

const JINA_BASE = 'https://r.jina.ai/'
const TIMEOUT_MS = 15_000

export async function scrape(websiteUrl: string): Promise<string> {
  const jinaUrl = JINA_BASE + websiteUrl

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(jinaUrl, {
      headers: { Accept: 'text/markdown', 'X-No-Cache': 'true' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Jina returned ${res.status}`)
    const text = await res.text()
    if (!text || text.trim().length < 100) {
      throw new Error('Scraped content too short — site may be empty or blocked')
    }
    // Trim to ~8000 chars to stay within Gemini context without wasting tokens
    return text.slice(0, 8000)
  } finally {
    clearTimeout(timer)
  }
}
