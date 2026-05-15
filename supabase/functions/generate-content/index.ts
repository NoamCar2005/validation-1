// supabase/functions/generate-content/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

  const authed = await authenticate(req, supabaseUrl, supabaseAnonKey, supabaseServiceKey)
  if (!authed) {
    return new Response(JSON.stringify({ error: 'לא מורשה' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try { await req.json() } catch { /* empty body is fine */ }

  const admin = createClient(supabaseUrl, supabaseServiceKey)

  const { data: remaining, error: rpcErr } = await admin
    .rpc('consume_generation_credit', { p_user_id: authed.userRowId })

  if (rpcErr) {
    console.error('[generate-content] credit decrement failed:', rpcErr.message)
    return new Response(JSON.stringify({ error: 'שגיאה. אנא נסה שוב.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  if (remaining === null) {
    return new Response(JSON.stringify({ error: 'no_credits' }), {
      status: 402,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { data: surveyRows } = await admin
      .from('survey_responses')
      .select('question_key, answer_text')
      .eq('user_id', authed.userRowId)

    const surveyAnswers = (surveyRows ?? []).map(r => ({
      key: r.question_key,
      value: r.answer_text,
    }))

    const { data: priorPosts } = await admin
      .from('posts')
      .select('post_type, content, copy')
      .eq('user_id', authed.userRowId)
      .order('generated_at', { ascending: true })

    const { posts } = await runPipeline(
      authed.websiteUrl,
      surveyAnswers,
      authed.userRowId,
      geminiApiKey,
      supabaseUrl,
      supabaseServiceKey,
      (priorPosts ?? []) as Array<{ post_type: 'value' | 'trust' | 'cta'; content: string; copy: string }>,
    )

    return new Response(JSON.stringify({ posts }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err)
    console.error('[generate-content] FATAL:', rawMessage, err instanceof Error ? err.stack : '')

    const { error: refundErr } = await admin
      .rpc('refund_generation_credit', { p_user_id: authed.userRowId })
    if (refundErr) {
      console.error('[generate-content] REFUND FAILED:', refundErr.message)
    }

    const stageMatch = rawMessage.match(/\[stage:([^\]]+)\]/)
    const stage = stageMatch ? stageMatch[1] : 'unknown'

    return new Response(
      JSON.stringify({ error: 'שגיאה ביצירת התוכן. אנא נסה שוב.', stage }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
