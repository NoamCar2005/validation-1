// supabase/functions/_shared/generate-image.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { PostType, Channel } from './types.ts'
import type { Diagnostics } from './diagnostics.ts'

// Nano Banana Pro (gemini-3-pro-image-preview) is the primary model for professional asset production.
// Fallback to faster alternatives if it's temporarily unavailable.
export const IMAGE_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'gemini-2.5-flash-image',
]

const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

const ASPECT_RATIO: Record<Channel, string> = {
  instagram: '1:1',
  linkedin: '16:9',
  facebook: '4:3',
}

const RETRYABLE = new Set([429, 500, 502, 503, 504])
const FETCH_TIMEOUT_MS = 60_000

export function buildImagePrompt(imageDirection: string, channel: Channel): string {
  const ratio = ASPECT_RATIO[channel]
  const channelContext = {
    instagram: 'vibrant, engaging, close personal connection',
    linkedin: 'professional, authoritative, business-focused',
    facebook: 'accessible, community-driven, inviting',
  }[channel]

  return `Create a professional social media image. Scene: ${imageDirection}.
Platform context: ${channelContext}.
Technical: Aspect ratio ${ratio}, high-fidelity, clean composition with strong visual hierarchy.
Style: Authentic, polished, not generic stock photography. Suitable for Israeli business owner's professional brand.
Hebrew text (if any): Must be rendered with proper right-to-left letter shapes and diacritics.
Render the scene naturally with appropriate lighting, depth, and professional color grading.`
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function generateImage(
  imagePrompt: string,
  postType: PostType,
  channel: Channel,
  userId: string,
  geminiApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  diag: Diagnostics,
): Promise<string | null> {
  const stage = `image:${postType}`

  if (!imagePrompt || imagePrompt.trim().length === 0) {
    diag.log(stage, 'error', 'image_prompt is empty', { imagePrompt })
    return null
  }
  if (!geminiApiKey) {
    diag.log(stage, 'error', 'GEMINI_API_KEY is empty/missing')
    return null
  }

  const prompt = buildImagePrompt(imagePrompt, channel)
  diag.log(stage, 'info', `start channel=${channel} prompt_len=${prompt.length}`)

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  let imagePart: { inlineData?: { mimeType?: string; data?: string } } | undefined
  let workingModel = ''

  // Try each model name; for each, do up to 3 attempts on retryable errors.
  outer:
  for (const model of IMAGE_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, attempt === 1 ? 1500 : 4000))
      }

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        diag.log(stage, 'error', `fetch threw model=${model} attempt=${attempt}`, { error: msg })
        continue
      }

      if (res.ok) {
        const data = await res.json().catch(e => ({ _parseError: String(e) }))
        const candidate = data.candidates?.[0]
        const parts = candidate?.content?.parts ?? []
        const promptFeedback = data.promptFeedback
        const finishReason = candidate?.finishReason
        imagePart = parts.find(
          (p: { inlineData?: { mimeType?: string; data?: string } }) =>
            p.inlineData?.mimeType?.startsWith('image/')
        )
        if (imagePart?.inlineData?.data) {
          workingModel = model
          diag.log(stage, 'info', `image bytes received model=${model} attempt=${attempt} mime=${imagePart.inlineData.mimeType} bytes_b64=${imagePart.inlineData.data.length}`)
          break outer
        }
        diag.log(stage, 'warn', `200 but no image bytes model=${model} attempt=${attempt}`, {
          finishReason,
          promptFeedback,
          partsKinds: parts.map((p: Record<string, unknown>) => Object.keys(p).join('+')),
          rawHead: JSON.stringify(data).slice(0, 800),
        })
        continue
      }

      const errBody = await res.text()
      diag.log(stage, 'error', `gemini http ${res.status} model=${model} attempt=${attempt}`, {
        status: res.status,
        body: errBody.slice(0, 800),
      })

      if (!RETRYABLE.has(res.status)) break
    }
    diag.log(stage, 'warn', `model exhausted, trying next: ${model}`)
  }

  if (!imagePart?.inlineData?.data) {
    diag.log(stage, 'error', 'all models failed; giving up')
    return null
  }

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
    // enumerated. Keep userId as the folder for future RLS scoping.
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
}
