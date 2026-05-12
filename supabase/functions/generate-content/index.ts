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

    // Drain (but ignore) the body so older clients that still send user_id don't break.
    try { await req.json() } catch { /* empty body is fine */ }

    // 2) Fetch survey answers using the AUTHENTICATED user's row id.
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: surveyRows } = await supabase
      .from('survey_responses')
      .select('question_key, answer_text')
      .eq('user_id', authed.userRowId)

    const surveyAnswers = (surveyRows ?? []).map(r => ({
      key: r.question_key,
      value: r.answer_text,
    }))

    // 3) Run pipeline.
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

    // Never return raw stack/error to the client. Stage tag is a fixed enum,
    // safe to surface for support routing. Details stay in server logs only.
    return new Response(
      JSON.stringify({
        error: 'שגיאה ביצירת התוכן. אנא נסה שוב.',
        stage,
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
