-- AGP Donor Intelligence v2 — AI Settings + Prompt tables
-- Run in: https://supabase.com/dashboard/project/olrmtazyepkxjyecfyba/sql/new

-- ─────────────────────────────────────────────────────────────────────────────
-- AI SETTINGS
-- Stores per-user AI provider configuration.
-- Only one provider can have selected=true at a time (enforced by app logic).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE ai_provider AS ENUM ('Gemini', 'OpenAI', 'Claude');

CREATE TABLE ai_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       ai_provider NOT NULL,
  model      TEXT        NOT NULL DEFAULT '',
  api_key    TEXT        NOT NULL DEFAULT '',
  selected   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type)
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai_settings"
  ON ai_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROMPT
-- One row per user — the agent's system prompt name and description.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE prompt (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'AGP Donor Intelligence Agent',
  description TEXT        NOT NULL DEFAULT 'You are an expert nonprofit fundraising analyst for Allegiance Group + Pursuant (AGP). Answer questions about donor data accurately and concisely. Always base answers on the data context provided — never hallucinate statistics.',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE prompt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prompt"
  ON prompt FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
