// supabase/functions/generate-content/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runPipeline } from '../_shared/pipeline.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id נדרש' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, website_url')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'משתמש לא נמצא' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch survey answers
    const { data: surveyRows } = await supabase
      .from('survey_responses')
      .select('question_key, answer_text')
      .eq('user_id', user_id)

    const surveyAnswers = (surveyRows ?? []).map(r => ({
      key: r.question_key,
      value: r.answer_text,
    }))

    // Run pipeline
    const { posts } = await runPipeline(
      user.website_url,
      surveyAnswers,
      user_id,
      geminiApiKey,
      supabaseUrl,
      supabaseServiceKey,
    )

    return new Response(
      JSON.stringify({ posts }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה ביצירת התוכן. אנא נסה שוב.'
    const isHebrew = /[֐-׿]/.test(message)
    console.error('generate-content error:', err)
    return new Response(
      JSON.stringify({ error: isHebrew ? message : 'שגיאה ביצירת התוכן. אנא נסה שוב.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
