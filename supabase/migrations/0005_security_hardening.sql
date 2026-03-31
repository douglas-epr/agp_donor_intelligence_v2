-- Security hardening: add DELETE RLS policy to donor_gifts
-- Run this in: Supabase Dashboard → SQL Editor

CREATE POLICY "Users can delete own donor gifts"
  ON donor_gifts FOR DELETE
  USING (auth.uid() = user_id);
