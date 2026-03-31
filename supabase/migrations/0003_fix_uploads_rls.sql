-- Fix RLS policies for the uploads table
-- Run this in: Supabase Dashboard → SQL Editor

-- 1. Enable RLS (idempotent)
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on uploads (clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'uploads'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON uploads', pol.policyname);
  END LOOP;
END $$;

-- 3. Recreate correct policies

-- Users can read their own uploads
CREATE POLICY "uploads_select_own"
  ON uploads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own uploads
CREATE POLICY "uploads_insert_own"
  ON uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own uploads (e.g. status → complete, filename rename)
CREATE POLICY "uploads_update_own"
  ON uploads
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own uploads
CREATE POLICY "uploads_delete_own"
  ON uploads
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
