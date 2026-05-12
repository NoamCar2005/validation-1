// supabase/functions/_shared/auth.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthedUser {
  authUserId: string  // auth.users.id
  userRowId: string   // public.users.id
  websiteUrl: string
}

// Validates the Authorization header against Supabase Auth, then loads the
// matching public.users row. Returns null on any failure (unauthenticated,
// no profile, bad token). Caller treats null as 401.
export async function authenticate(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey: string,
): Promise<AuthedUser | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return null

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const { data: row, error: rowErr } = await adminClient
    .from('users')
    .select('id, website_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (rowErr || !row) return null
  return { authUserId: user.id, userRowId: row.id, websiteUrl: row.website_url }
}
