@AGENTS.md

# Claude Code — Project Guide: AGP Donor Intelligence

This file is loaded automatically by Claude Code at the start of every session.
Read it in full before writing any code.

---

## What This App Is

A multi-tenant donor analytics platform for nonprofit fundraising teams.
Users upload a donor gift CSV, explore an executive dashboard, and query
their data in plain English via a multi-provider AI chat interface.

**Live URL:** https://agpdonorintelligencev2.vercel.app  
**Repo:** https://github.com/douglas-epr/agp_donor_intelligence_v2  
**Stack:** Next.js 16 · Supabase (PostgreSQL + Auth + Storage) · Tailwind CSS v4 · TypeScript · Vercel

---

## Must-Read Before Coding

### 1. Column name gotcha — `uploads` table
The `uploads` table uses **`uploaded_at`**, NOT `created_at`. There is no `created_at` column.
Using `created_at` on `uploads` will silently fail or throw at runtime.
All other tables (`donor_gifts`, `ai_settings`, `prompts`, `chat`) use `created_at`.

### 2. AI is non-streaming
`/api/query` calls AI providers synchronously (no SSE / `ReadableStream`).
It returns `Response.json({ content: string })`.
Do NOT reintroduce streaming — the chat persistence pattern depends on atomic save-after-complete.

### 3. Chat persistence is server-side
`/api/query` saves both the user message and assistant response to the `chat` table.
The client never calls `saveChatMessage()` directly for query results.
`saveChatMessage` in `actions.ts` is reserved for future client-side use only.

### 4. `ai_settings` has no UNIQUE constraint
There is no `UNIQUE(user_id, type)` on `ai_settings`.
The `saveAISettings` Server Action uses a manual SELECT → INSERT/UPDATE pattern.
Do NOT use `.upsert()` with `onConflict` here — it will fail without the constraint.

### 5. `SUPABASE_SERVICE_ROLE_KEY` is not used
This app uses the anon key + RLS for all data access. There is no service role key
in production. Do not add service role calls.

### 6. Edge runtime is off
`/api/query` and `/api/validate-ai` both use the default Node.js runtime
(they call `cookies()` which requires Node). Do not add `export const runtime = "edge"`.

### 7. History array is validated server-side
`/api/query` enforces: `question.length <= 2000`, `history.length <= 40`,
each history entry content <= 4000 chars. The client sends at most 20 entries.
Do not bypass these limits.

---

## Key File Map

| Task | File |
|------|------|
| Add a Server Action (mutation) | `src/lib/supabase/actions.ts` |
| Change dashboard KPIs | `src/lib/data/dashboard.ts` |
| Change AI query behavior | `src/app/api/query/route.ts` |
| Change AI provider validation | `src/app/api/validate-ai/route.ts` |
| Add/change DB types | `src/lib/supabase/types.ts` |
| Add a new enum value | `src/lib/constants/enums.ts` + new SQL migration |
| Add a new page | `src/app/(protected)/<name>/page.tsx` |
| Change sidebar / top nav | `src/app/(protected)/layout.tsx` |
| Change auth redirect logic | `src/middleware.ts` |
| Add a migration | `supabase/migrations/<next-number>_<name>.sql` |

---

## RLS Pattern

Every table has RLS enabled. All policies check `auth.uid() = user_id`.
When writing a new query, never add `.eq("user_id", user.id)` as the sole
auth control — RLS already enforces it. Application-layer filtering is
defense-in-depth, not the primary gate.

New tables must have policies for every operation they support:
`SELECT`, `INSERT`, `UPDATE`, `DELETE` — even if the app doesn't use `DELETE` yet.

---

## Server Actions Checklist

Every Server Action in `actions.ts` must:
1. Call `supabase.auth.getUser()` first
2. Return `{ error: string }` on failure — never throw
3. Return `{ success: true }` or `{ data: … }` on success
4. Validate user-supplied string lengths before the DB call

---

## Design Tokens

Colors, spacing, shadows, and radii are CSS custom properties defined in
`src/app/globals.css`. Always use `var(--color-*)`, `var(--shadow-*)`, etc.
Never use raw hex values or hardcoded `px` measurements in component files.

---

## Migrations

- Append-only: never edit an existing file
- Filename format: `<4-digit-number>_<snake_case_description>.sql`
- Always include `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and all required policies
- Inform the user to run the migration manually via Supabase Dashboard → SQL Editor

---

## What NOT To Do

- Do not introduce `export const runtime = "edge"` on any route
- Do not use `.upsert()` on `ai_settings` or `prompts` (no UNIQUE constraint)
- Do not add `updated_at` to an `uploads` UPDATE — the column does not exist
- Do not use `created_at` on `uploads` — the column is `uploaded_at`
- Do not add `saveChatMessage` calls in `sendMessage` — server saves to DB
- Do not reintroduce streaming on `/api/query`
- Do not pass `SUPABASE_SERVICE_ROLE_KEY` anywhere
- Do not hardcode hex colors or enum strings in component files
