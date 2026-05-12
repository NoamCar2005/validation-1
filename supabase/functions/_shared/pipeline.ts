// supabase/functions/_shared/pipeline.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { SurveyAnswer, GeneratedPost, PostType } from './types.ts'
import { scrape } from './scrape.ts'
import { summarize } from './summarize.ts'
import { plan } from './plan.ts'
import { generateValidatedPostCopy } from './validate-post.ts'
import { humanizePost } from './humanize.ts'
import { generateImage } from './generate-image.ts'
import { Diagnostics } from './diagnostics.ts'

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
  const diag = new Diagnostics(supabaseUrl, supabaseServiceKey, userId)
  diag.log('pipeline', 'info', 'start', { websiteUrl, surveyAnswersCount: surveyAnswers.length, hasGeminiKey: !!geminiApiKey })

  // One-time diagnostic: fire-and-forget so it doesn't block the pipeline.
  void listAvailableModels(geminiApiKey, diag)

  try {
    // Stage 1: Scrape
    const t0 = Date.now()
    let scrapedText: string
    try {
      scrapedText = await scrape(websiteUrl)
    } catch (err) {
      diag.log('scrape', 'error', 'scrape failed', { error: err instanceof Error ? err.message : String(err) })
      throw new Error(`[stage:scrape] ${err instanceof Error ? err.message : String(err)}`)
    }
    diag.log('scrape', 'info', `done ${Date.now() - t0}ms len=${scrapedText.length}`)

    // Stage 2: Summarize
    const t1 = Date.now()
    const businessProfile = await summarize(scrapedText, surveyAnswers, geminiApiKey)
    diag.log('summarize', 'info', `done ${Date.now() - t1}ms business_name="${businessProfile.business_name}"`)

    // Stage 3: Plan
    const t2 = Date.now()
    const marketingPlan = await plan(businessProfile, geminiApiKey)
    diag.log('plan', 'info', `done ${Date.now() - t2}ms`)

    // Stage 4: Generate all 3 posts in parallel
    const t3 = Date.now()
    const postTypes: PostType[] = ['value', 'trust', 'cta']
    const postPlans = {
      value: marketingPlan.value_post,
      trust: marketingPlan.trust_post,
      cta: marketingPlan.cta_post,
    }

    const results = await Promise.allSettled(
      postTypes.map(async (postType) => {
        const validated = await generateValidatedPostCopy(postType, businessProfile, postPlans[postType], geminiApiKey)
        diag.log(`copy:${postType}`, 'info', `validated ok channel=${validated.channel_recommended} image_prompt_len=${validated.image_prompt?.length ?? 0}`)

        let copy: typeof validated
        try {
          copy = await humanizePost(validated, postType, geminiApiKey)
          diag.log(`humanize:${postType}`, 'info', 'humanized ok')
        } catch (err) {
          diag.log(`humanize:${postType}`, 'warn', 'humanize failed, using validated output', { error: err instanceof Error ? err.message : String(err) })
          copy = validated
        }

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

    const posts: GeneratedPost[] = []
    const failures: string[] = []
    results.forEach((r, i) => {
      const pt = postTypes[i]
      if (r.status === 'fulfilled') {
        posts.push(r.value)
      } else {
        const reason = r.reason instanceof Error ? r.reason.message : String(r.reason)
        diag.log(`post:${pt}`, 'error', 'task failed', { error: reason })
        failures.push(`${pt}: ${reason}`)
      }
    })
    diag.log('generate-posts', 'info', `done ${Date.now() - t3}ms succeeded=${posts.length}/3 with_image=${posts.filter(p => p.image_url).length}`)

    if (posts.length < 3) {
      throw new Error(
        `[stage:generate-posts] only ${posts.length}/3 posts succeeded. Failures: ${failures.join(' | ')}`
      )
    }

    // Stage 5: Write to DB
    const t4 = Date.now()
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
    if (insertError) {
      diag.log('db-insert', 'error', insertError.message)
      throw new Error(`[stage:db-insert] ${insertError.message}`)
    }
    diag.log('db-insert', 'info', `done ${Date.now() - t4}ms rows=${rows.length}`)

    return {
      posts: posts.map(({ image_prompt: _ip, ...rest }) => rest),
    }
  } finally {
    await diag.flush()
  }
}

async function listAvailableModels(geminiApiKey: string, diag: Diagnostics) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200`,
      { headers: { 'x-goog-api-key': geminiApiKey } },
    )
    if (!res.ok) {
      const body = await res.text()
      diag.log('list-models', 'error', `ListModels http ${res.status}`, { body: body.slice(0, 500) })
      return
    }
    const data = await res.json()
    const models = (data.models ?? []) as Array<{
      name?: string
      supportedGenerationMethods?: string[]
      description?: string
    }>
    // Models that support generateContent (i.e. usable with our endpoint)
    const usable = models
      .filter(m => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map(m => m.name ?? '')
    // Likely image-output models: name contains 'image' or 'imagen' or 'banana'
    const imageCandidates = usable.filter(n => /image|imagen|banana/i.test(n))
    diag.log('list-models', 'info', `total=${models.length} generateContent=${usable.length} imageCandidates=${imageCandidates.length}`, {
      imageCandidates,
      allUsable: usable,
    })
  } catch (err) {
    diag.log('list-models', 'error', 'ListModels threw', { error: err instanceof Error ? err.message : String(err) })
  }
}
