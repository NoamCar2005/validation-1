// supabase/functions/_shared/generate-image.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { PostType, Channel } from './types.ts'

export const IMAGE_MODEL = 'google/nano-banana-pro'
const GEMINI_IMAGE_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${key}`

const ASPECT_RATIO: Record<Channel, string> = {
  instagram: '1:1',
  linkedin: '16:9',
  facebook: '4:3',
}

export function buildImagePrompt(
  imageDirection: string,
  channel: Channel,
): string {
  const ratio = ASPECT_RATIO[channel]
  return `${imageDirection}. Professional social media image for ${channel}, aspect ratio ${ratio}. High quality, authentic, not stock-photo generic. Suitable for an Israeli business owner's social media post.`
}

export async function generateImage(
  imagePrompt: string,
  postType: PostType,
  channel: Channel,
  userId: string,
  geminiApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
): Promise<string | null> {
  try {
    const prompt = buildImagePrompt(imagePrompt, channel)

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], aspectRatio: ASPECT_RATIO[channel] },
    }

    const res = await fetch(GEMINI_IMAGE_URL(geminiApiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error(`Image API returned ${res.status} for ${postType}`)
      return null
    }

    const data = await res.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData?.mimeType?.startsWith('image/')
    )
    if (!imagePart?.inlineData?.data) {
      console.error(`No image data in response for ${postType}`)
      return null
    }

    // Decode base64 → Uint8Array
    const base64 = imagePart.inlineData.data
    const mimeType: string = imagePart.inlineData.mimeType
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    // Upload to Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const storagePath = `${userId}/${postType}.png`
    const { error: uploadError } = await supabase.storage
      .from('Validation')
      .upload(storagePath, bytes, { contentType: mimeType, upsert: true })

    if (uploadError) {
      console.error(`Storage upload failed for ${postType}:`, uploadError.message)
      return null
    }

    return `${supabaseUrl}/storage/v1/object/public/Validation/${storagePath}`
  } catch (err) {
    console.error(`generateImage failed for ${postType}:`, err)
    return null
  }
}
