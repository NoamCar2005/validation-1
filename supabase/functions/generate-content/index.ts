import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch user
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

    const survey_answers = (surveyRows ?? []).map((r) => ({
      key: r.question_key,
      value: r.answer_text,
    }))

    // Call N8N webhook — wait synchronously
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id,
        website_url: user.website_url,
        survey_answers,
      }),
    })

    if (!n8nResponse.ok) {
      throw new Error(`N8N returned ${n8nResponse.status}`)
    }

    // N8N handles content generation, image creation, and inserts posts with image_url into Supabase
    // We just wait for it to finish, then read the posts directly from the DB
    await n8nResponse.json()

    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('post_type, content, copy, image_url, channel_recommended')
      .eq('user_id', user_id)
      .order('id', { ascending: false })
      .limit(3)

    if (fetchError) throw fetchError
    if (!posts || posts.length !== 3) throw new Error('Posts not found after generation')

    // Attach image URLs constructed from predictable storage path
    const postsWithImages = posts.map((p) => ({
      ...p,
      image_url: `${supabaseUrl}/storage/v1/object/public/Validation/${user_id}/${p.post_type}.png`,
    }))

    return new Response(
      JSON.stringify({ posts: postsWithImages }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('generate-content error:', err)
    return new Response(
      JSON.stringify({ error: 'שגיאה ביצירת התוכן. אנא נסה שוב.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
