-- DELETE policies so authenticated users can erase their own data (GDPR right-to-erasure).

CREATE POLICY "posts: own delete" ON public.posts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "survey_responses: own delete" ON public.survey_responses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "users: own delete" ON public.users
  FOR DELETE TO authenticated
  USING (auth.uid() = auth_user_id);
