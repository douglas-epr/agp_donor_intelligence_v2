# Architecture — AGP Donor Intelligence

---

## 1. System Overview

```
Browser
  │
  ├─ /login, /forgot-password, /reset-password
  │    └─ Supabase Auth (email + password, PKCE password reset, JWT sessions)
  │
  ├─ /dashboard                           Server Component
  │    ├─ getDashboardData(uploadId?)     lib/data/dashboard.ts
  │    │    └─ SELECT donor_gifts         Supabase PostgreSQL (RLS)
  │    └─ <DashboardClient />             Client Component (charts, KPI cards, PDF export)
  │
  ├─ /upload                              Client Component
  │    ├─ CSV parse + validate            client-side (custom parser, no library)
  │    │    └─ Guard: > 50 MB or > 100k rows → rejected before parsing
  │    └─ INSERT uploads + donor_gifts    Supabase PostgreSQL (RLS), 100-row batches
  │
  ├─ /ai-explorer                         Client Component
  │    ├─ Load history from chat table    Supabase (user_id + upload_id)
  │    └─ POST /api/query                 Node.js Route Handler
  │         ├─ Auth check                 supabase.auth.getUser()
  │         ├─ SELECT ai_settings         resolve active provider + key
  │         ├─ SELECT donor_gifts         scoped to uploadId (≤ 500 rows)
  │         ├─ Build context string       aggregates + sample rows → system prompt
  │         ├─ Call provider (sync)       Claude / OpenAI / Gemini — non-streaming
  │         ├─ INSERT chat (×2)           user message + assistant response
  │         └─ Response.json({ content }) returned to browser
  │
  ├─ /profile                             Client Component
  │    └─ Storage upload                  Supabase avatars bucket
  │
  └─ /settings                            Client Component
       ├─ ai_settings upsert              Server Action (SELECT → INSERT/UPDATE)
       └─ POST /api/validate-ai           Node.js Route Handler (auth-checked)

middleware.ts
  └─ Every request: refresh session cookie, redirect unauthenticated browsers to /login
```

---

## 2. Database Schema

### Enums

```sql
CREATE TYPE donor_segment AS ENUM (
  'Major Gifts', 'Mid-Level', 'Sustainer',
  'First-Time', 'Lapsed', 'General'
);

CREATE TYPE gift_channel AS ENUM (
  'Email', 'Direct Mail', 'Event', 'Online', 'Phone'
);

CREATE TYPE gift_region AS ENUM (
  'Midwest', 'Northeast', 'West', 'South'
);

CREATE TYPE upload_status AS ENUM (
  'pending', 'processing', 'complete', 'failed'
);

CREATE TYPE chat_role AS ENUM (
  'user', 'assistant'
);
```

---

### Table: `profiles`

Auto-created on signup via a `BEFORE INSERT` trigger on `auth.users`.

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Column | Notes |
|--------|-------|
| `id` | Matches `auth.users.id` — the Supabase Auth user UUID |
| `avatar_url` | Public URL in Supabase Storage `avatars` bucket |

**RLS Policies**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

---

### Table: `uploads`

One record per CSV import session.

> **Critical:** The timestamp column is **`uploaded_at`**, not `created_at`. There is no `created_at` on this table.

```sql
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
```

| Column | Notes |
|--------|-------|
| `uploaded_at` | Use this for ordering — **not** `created_at` |
| `status` | Lifecycle: `pending` → `processing` → `complete`. Stuck `processing` rows are visible to users |
| `storage_path` | Reserved for future Supabase Storage archival of original CSV |

**RLS Policies** (from migration `0003_fix_uploads_rls.sql`)

```sql
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploads_select_own" ON uploads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "uploads_insert_own" ON uploads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "uploads_update_own" ON uploads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "uploads_delete_own" ON uploads
  FOR DELETE TO authenticated USING (user_id = auth.uid());
```

---

### Table: `donor_gifts`

One record per gift row from an imported CSV.

```sql
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

CREATE INDEX idx_donor_gifts_user_id   ON donor_gifts(user_id);
CREATE INDEX idx_donor_gifts_upload_id ON donor_gifts(upload_id);
CREATE INDEX idx_donor_gifts_gift_date ON donor_gifts(gift_date);
CREATE INDEX idx_donor_gifts_segment   ON donor_gifts(segment);
CREATE INDEX idx_donor_gifts_campaign  ON donor_gifts(campaign);
CREATE INDEX idx_donor_gifts_channel   ON donor_gifts(channel);
```

**RLS Policies**

```sql
ALTER TABLE donor_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donor_gifts_select_own" ON donor_gifts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "donor_gifts_insert_own" ON donor_gifts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own donor gifts" ON donor_gifts
  FOR DELETE USING (auth.uid() = user_id);
```

---

### Table: `ai_settings`

One row per provider per user. Stores provider type, model, and API key.

```sql
CREATE TABLE ai_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,        -- 'Claude' | 'OpenAI' | 'Gemini'
  model      TEXT NOT NULL,
  api_key    TEXT NOT NULL,
  selected   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> **Note:** There is no `UNIQUE(user_id, type)` constraint. The `saveAISettings` Server Action uses a manual `SELECT → INSERT or UPDATE` pattern. Do not use `.upsert()` without first adding the constraint in a migration.

**RLS Policies**

```sql
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_settings_all_own" ON ai_settings
  FOR ALL TO authenticated USING (user_id = auth.uid());
```

---

### Table: `prompts`

One row per user. Stores the custom AI agent name and system prompt.

```sql
CREATE TABLE prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS Policies**

```sql
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompts_all_own" ON prompts
  FOR ALL TO authenticated USING (user_id = auth.uid());
```

---

### Table: `chat`

One row per message. Stores the full conversation history per user + upload.

```sql
CREATE TABLE chat (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id   UUID        REFERENCES uploads(id) ON DELETE CASCADE,
  role        chat_role   NOT NULL,   -- 'user' | 'assistant'
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chat_user_upload_idx ON chat(user_id, upload_id, created_at ASC);
```

| Column | Notes |
|--------|-------|
| `role` | `chat_role` ENUM — `'user'` or `'assistant'` |
| `upload_id` | `NULL` if sent without a selected upload; CASCADE deletes on upload removal |
| `updated_at` | Auto-set by trigger `chat_set_updated_at` |

**RLS Policies**

```sql
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own chat messages" ON chat
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON chat
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 3. Upload Session Architecture

The "selected upload" state must be available to both Server Components (dashboard) and Client Components (AI Explorer, upload page). Two mechanisms run in parallel:

| Mechanism | Scope | How it works |
|-----------|-------|-------------|
| `?upload=<id>` URL param | Server Components | `dashboard/page.tsx` reads `searchParams.upload` and passes `uploadId` to `getDashboardData()` |
| `UploadContext` + `localStorage` | Client Components | Context provider wraps the protected layout; `selectedUploadId` persists to `localStorage` key `agp_selected_upload_id` and survives page refresh |

Navigation links for Upload and AI Explorer dynamically append `?upload=<id>` from context so the active dataset is never dropped when moving between tabs.

**Auto-select flow:** When `/dashboard` loads without `?upload=`, `DashboardClient` queries the most recent complete upload and calls `router.replace("/dashboard?upload=<id>")`.

---

## 4. Data Flow: CSV Import

```
User selects file
  └─ Guard: file > 50 MB or > 100k rows? → reject immediately, show error
       └─ parseCSV()         Split lines, normalise headers to lowercase
            └─ validateRow() Required fields → date parse → amount parse → enum check
                 └─ Preview rendered (first 10 rows + validation summary)

User clicks "Confirm Import"
  ├─ INSERT uploads           status = 'processing'
  ├─ INSERT donor_gifts       100 rows per batch
  │    └─ is_valid = true for passed rows; is_valid = false for rejected rows
  └─ UPDATE uploads           status = 'complete', row_count, rejected_count
       └─ setSelectedUploadId(upload.id)
            └─ router.push('/dashboard?upload=' + upload.id)
```

---

## 5. Data Flow: AI Query

```
User submits question in /ai-explorer
  │
  ├─ Client: captures uploadId + historySnapshot at send time
  ├─ Client: adds optimistic user + "thinking" bubble to message list
  └─ POST /api/query  { question, uploadId, history[] }
       │
       ├─ Validate: question ≤ 2000 chars, history ≤ 40 entries (each ≤ 4000 chars)
       ├─ Auth check: supabase.auth.getUser() → 401 if not authenticated
       │
       ├─ SELECT prompts WHERE user_id = ?
       │    └─ Resolves: system prompt (agent description)
       │
       ├─ SELECT ai_settings WHERE user_id = ? AND selected = true
       │    └─ Resolves: provider type, model, api_key
       │
       ├─ SELECT donor_gifts WHERE user_id = ? AND upload_id = ?
       │    └─ Limit 500 rows, ordered by gift_date DESC
       │    └─ buildContext() → aggregates + sample rows → appended to system prompt
       │
       ├─ Call provider (non-streaming, synchronous):
       │    ├─ Claude:  POST /v1/messages        { stream: false }
       │    ├─ OpenAI:  POST /v1/chat/completions { stream: false }
       │    └─ Gemini:  POST /v1beta/models/{model}:generateContent
       │
       ├─ INSERT chat (role='user',      message=question, upload_id=resolvedUploadId)
       ├─ INSERT chat (role='assistant', message=content,  upload_id=resolvedUploadId)
       │
       └─ Response.json({ content })
            │
            └─ Client: if selectedUploadId === uploadIdAtSend → replace thinking bubble
                       else → answer is in DB; loads when user navigates back
```

---

## 6. Chat History Flow

```
User navigates to /ai-explorer (or switches upload)
  └─ useEffect([selectedUploadId])
       ├─ setMessages([])           clear previous conversation
       ├─ SELECT uploads.filename   show active dataset badge
       └─ SELECT chat
            WHERE user_id = ?
              AND upload_id = selectedUploadId
            ORDER BY created_at ASC
              └─ setMessages(rows)  restore full conversation
```

---

## 7. Route Map

| Route | Type | Auth | Description |
|-------|------|------|-------------|
| `/` | Server | No | Redirects to `/login` |
| `/login` | Client | No | Email + password sign-in |
| `/forgot-password` | Client | No | Send password reset email |
| `/reset-password` | Client | No | Set new password via PKCE recovery token |
| `/dashboard` | Server + Client | Yes | Executive Summary — KPIs, charts, PDF export, dataset selector |
| `/upload` | Client | Yes | CSV import, validation preview, previous uploads |
| `/ai-explorer` | Client | Yes | Multi-turn AI chat with persistent history |
| `/profile` | Client | Yes | Edit name, upload avatar |
| `/settings` | Client | Yes | Change credentials, configure AI provider |
| `/reports` | Client | Yes | Placeholder (future phase) |
| `/api/query` | Route Handler (Node) | Yes | AI query — validates, builds context, calls provider, saves chat, returns JSON |
| `/api/validate-ai` | Route Handler (Node) | Yes | Validates a user-supplied AI API key against the live provider |

---

## 8. Migration History

| File | Description |
|------|-------------|
| `0000_initial.sql` | Core schema: enums, profiles, uploads, donor_gifts, RLS, Storage bucket policies |
| `0001_ai_settings_prompt.sql` | `ai_settings` + `prompts` tables with RLS |
| `0002_profiles_avatar.sql` | `avatar_url` column added to `profiles` |
| `0003_fix_uploads_rls.sql` | Dropped and recreated all uploads RLS policies with correct `WITH CHECK` clauses |
| `0004_chat_table.sql` | `chat_role` ENUM, `chat` table, RLS (SELECT/INSERT/DELETE), index, `updated_at` trigger |
| `0005_security_hardening.sql` | DELETE RLS policy on `donor_gifts` |

---

## 9. Design System

All tokens are defined as CSS custom properties in `src/app/globals.css`. Reference them via `var(--token-name)` — never use raw hex values or pixel measurements outside of token definitions.

### Colour Palette

| Token | Hex | Role |
|-------|-----|------|
| `--color-primary` | `#1F3E77` | Navigation, headers, primary section backgrounds |
| `--color-secondary` | `#2F6FED` | Buttons, links, active states, chart primary series, focus rings |
| `--color-accent` | `#9EDC4B` | Growth indicators, positive deltas, chart accent series |
| `--color-bg` | `#F5F7FA` | Page canvas, card backgrounds |
| `--color-surface` | `#FFFFFF` | Card surfaces, modal backgrounds, table rows |
| `--color-text` | `#2A2E35` | Titles, KPI values, primary body copy |
| `--color-text-muted` | `#6B7280` | Labels, captions, metadata, secondary copy |
| `--color-border` | `#E5E7EB` | Card borders, table dividers, input borders |
| `--color-error` | `#EF4444` | Rejected rows, validation errors, destructive actions |
| `--color-warning` | `#F59E0B` | Warning rows, advisory states |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| Font family | Inter (Google Fonts) | All text |
| `text-xs` | 12px | Captions, badges, timestamps |
| `text-sm` | 14px | Body copy, table cells, descriptions |
| `text-base` | 16px | Default body |
| `text-lg` | 18px | Card labels, section subheadings |
| `text-xl` | 20px | Card headings |
| `text-2xl` | 24px | KPI values, page titles |

### Layout

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar width | 220px | Left navigation |
| Top nav height | 52px | Conditional top navigation bar |
| Page padding | 24px | Main content horizontal padding |
| Card gap | 16px | Grid spacing |
| `--radius-sm` | 4px | Badges, inputs, tags |
| `--radius-md` | 8px | Cards, dropdowns |
| `--radius-lg` | 12px | Large panels, upload zone |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | KPI cards, chart containers |
| `--shadow-elevated` | `0 4px 12px rgba(0,0,0,0.12)` | Modals, dropdowns |

### Chart Colour Scale

Applied in order for multi-series and categorical charts:

```
1. #2F6FED   Insight Blue       (primary series, current year)
2. #1F3E77   Institutional Blue
3. #9EDC4B   Momentum Green
4. #F59E0B   Amber
5. #EF4444   Red
6. #8B5CF6   Violet
7. #06B6D4   Cyan
8. #EC4899   Pink
```

---

## 10. Storage

### Bucket: `avatars`

| Setting | Value |
|---------|-------|
| Visibility | Public |
| Path pattern | `{user_id}/avatar.{ext}` |
| Cache-bust | `?t={Date.now()}` appended to public URL after upload |

Avatars are uploaded via the Profile page. The public URL is written to `profiles.avatar_url` via the `updateProfile` Server Action and displayed in the sidebar.

---

## 11. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/supabase/types.ts` | TypeScript types for all DB tables. Update when schema changes. |
| `src/lib/supabase/actions.ts` | All Server Actions: auth, profile, ai_settings, uploads (rename/delete), prompts, chat |
| `src/lib/data/dashboard.ts` | `getDashboardData(uploadId?)` — server-side KPI aggregation from `donor_gifts` |
| `src/lib/constants/enums.ts` | Single source of truth for all enum values. Must stay in sync with DB enums. |
| `src/context/UploadContext.tsx` | `selectedUploadId` shared state — localStorage-backed React context |
| `src/app/api/query/route.ts` | AI query endpoint — auth, context build, provider call, chat save, JSON response |
| `src/app/api/validate-ai/route.ts` | API key validation — auth-checked, calls provider with minimal request |
| `src/middleware.ts` | Session refresh + auth redirect on every request |
| `supabase/migrations/` | Append-only migration files. Run in filename order. Never edit existing files. |
