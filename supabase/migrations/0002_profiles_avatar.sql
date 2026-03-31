-- AGP Donor Intelligence v2 — Add avatar_url to profiles
-- Run in: https://supabase.com/dashboard/project/olrmtazyepkxjyecfyba/sql/new

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
