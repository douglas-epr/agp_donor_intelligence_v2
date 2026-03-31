-- ── Chat Role ENUM ────────────────────────────────────────────────────────────
CREATE TYPE public.chat_role AS ENUM ('user', 'assistant');

-- ── Chat Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat (
  id          UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id   UUID             REFERENCES public.uploads(id) ON DELETE CASCADE,
  role        public.chat_role NOT NULL,
  message     TEXT             NOT NULL,
  created_at  TIMESTAMPTZ      DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ      DEFAULT now() NOT NULL
);

-- ── Index: history queries per user+upload ordered by time ────────────────────
CREATE INDEX IF NOT EXISTS chat_user_upload_idx
  ON public.chat(user_id, upload_id, created_at ASC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own chat messages"
  ON public.chat FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON public.chat FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON public.chat FOR DELETE USING (auth.uid() = user_id);

-- ── Auto-update updated_at on row modification ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_set_updated_at
  BEFORE UPDATE ON public.chat
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
