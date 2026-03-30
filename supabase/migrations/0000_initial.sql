-- AGP Donor Intelligence v2 — Initial Schema
-- Generated from docs/architecture.md
-- Run once against the Supabase project: olrmtazyepkxjyecfyba

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE donor_segment AS ENUM (
  'Major Gifts',
  'Mid-Level',
  'Sustainer',
  'First-Time',
  'Lapsed',
  'General'
);

CREATE TYPE gift_channel AS ENUM (
  'Email',
  'Direct Mail',
  'Event',
  'Online',
  'Phone'
);

CREATE TYPE gift_region AS ENUM (
  'Midwest',
  'Northeast',
  'West',
  'South'
);

CREATE TYPE upload_status AS ENUM (
  'pending',
  'processing',
  'complete',
  'failed'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- Extends auth.users. Created automatically on signup via trigger.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- UPLOADS
-- One record per CSV import session.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_count       INTEGER NOT NULL DEFAULT 0,
  rejected_count  INTEGER NOT NULL DEFAULT 0,
  status          upload_status NOT NULL DEFAULT 'pending',
  storage_path    TEXT
);

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON uploads FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DONOR GIFTS
-- One record per gift row from the imported CSV.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE donor_gifts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id         UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  donor_id          TEXT NOT NULL,
  donor_name        TEXT NOT NULL,
  segment           donor_segment,
  gift_date         DATE,
  gift_amount       NUMERIC(12, 2),
  campaign          TEXT,
  channel           gift_channel,
  region            gift_region,
  is_valid          BOOLEAN NOT NULL DEFAULT TRUE,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes for dashboard aggregation queries
CREATE INDEX idx_donor_gifts_user_id   ON donor_gifts(user_id);
CREATE INDEX idx_donor_gifts_gift_date ON donor_gifts(gift_date);
CREATE INDEX idx_donor_gifts_segment   ON donor_gifts(segment);
CREATE INDEX idx_donor_gifts_campaign  ON donor_gifts(campaign);
CREATE INDEX idx_donor_gifts_channel   ON donor_gifts(channel);
CREATE INDEX idx_donor_gifts_upload_id ON donor_gifts(upload_id);

ALTER TABLE donor_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own donor gifts"
  ON donor_gifts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own donor gifts"
  ON donor_gifts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKET
-- Stores original uploaded CSV files per user.
-- Path pattern: {user_id}/{upload_id}/{filename}.csv
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-uploads', 'csv-uploads', FALSE);

CREATE POLICY "Users can upload own CSVs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own CSVs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
