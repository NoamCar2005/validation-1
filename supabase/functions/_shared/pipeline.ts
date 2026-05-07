// supabase/functions/_shared/pipeline.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { SurveyAnswer, GeneratedPost, PostType } from './types.ts'
import { scrape } from './scrape.ts'
import { summarize } from './summarize.ts'
import { plan } from './plan.ts'
import { generatePostCopy } from './generate-post.ts'
import { generateImage } from './generate-image.ts'

interface PipelineResult {
  posts: Omit<GeneratedPost, 'image_prompt'>[]
}

export async function runPipeline(
  websiteUrl: string,
  surveyAnswers: SurveyAnswer[],
  userId: string,
  geminiApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
): Promise<PipelineResult> {
  // Stage 1: Scrape
  const scrapedText = await scrape(websiteUrl)

  // Stage 2: Summarize
  const businessProfile = await summarize(scrapedText, surveyAnswers, geminiApiKey)

  // Stage 3: Plan
  const marketingPlan = await plan(businessProfile, geminiApiKey)

  // Stage 4: Generate all 3 posts in parallel
  const postTypes: PostType[] = ['value', 'trust', 'cta']
  const postPlans = {
    value: marketingPlan.value_post,
    trust: marketingPlan.trust_post,
    cta: marketingPlan.cta_post,
  }

  const results = await Promise.allSettled(
    postTypes.map(async (postType) => {
      const copy = await generatePostCopy(postType, businessProfile, postPlans[postType], geminiApiKey)
      const imageUrl = await generateImage(
        copy.image_prompt,
        postType,
        copy.channel_recommended,
        userId,
        geminiApiKey,
        supabaseUrl,
        supabaseServiceKey,
      )
      const post: GeneratedPost = {
        post_type: postType,
        content: copy.content,
        copy: copy.copy,
        channel_recommended: copy.channel_recommended,
        image_prompt: copy.image_prompt,
        image_url: imageUrl,
      }
      return post
    })
  )

  // Collect successful posts
  const posts: GeneratedPost[] = results
    .filter((r): r is PromiseFulfilledResult<GeneratedPost> => r.status === 'fulfilled')
    .map(r => r.value)

  if (posts.length < 2) {
    throw new Error('שגיאה ביצירת התוכן. אנא נסה שוב.')
  }

  // Stage 5: Write to DB
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const rows = posts.map(p => ({
    user_id: userId,
    post_type: p.post_type,
    content: p.content,
    copy: p.copy,
    channel_recommended: p.channel_recommended,
    image_url: p.image_url,
  }))

  const { error: insertError } = await supabase.from('posts').insert(rows)
  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`)

  // Return posts without internal image_prompt field
  return {
    posts: posts.map(({ image_prompt: _ip, ...rest }) => rest),
  }
}
