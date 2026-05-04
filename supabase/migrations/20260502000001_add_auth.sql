-- Add auth_user_id to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for lookups by auth user
CREATE INDEX IF NOT EXISTS users_auth_user_id_idx ON public.users(auth_user_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "users: authenticated insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "users: own row select" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "users: own row update" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policies for survey_responses
CREATE POLICY "survey_responses: authenticated insert" ON public.survey_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "survey_responses: own rows select" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

-- RLS Policies for posts
CREATE POLICY "posts: authenticated insert" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "posts: own rows select" ON public.posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );
