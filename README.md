# AGP Donor Intelligence

> Upload a donor CSV. Get an executive-ready dashboard. Ask questions in plain English.

Built for nonprofit development teams at Allegiance Group + Pursuant (AGP). Eliminates manual CRM report-pulling by letting users import a donor gift history file and immediately see fundraising performance, campaign effectiveness, and donor trends — all backed by a natural language AI query interface with persistent conversation history.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Features](#features)
- [Architecture Notes](#architecture-notes)
- [Security](#security)
- [Deployment](#deployment)
- [CSV Schema Reference](#csv-schema-reference)

---

## Quick Start

**Prerequisites:** Node.js 18+, a Supabase project, npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# (see Environment Variables below)

# 3. Apply database migrations — Supabase Dashboard → SQL Editor
# Run each file in supabase/migrations/ in numeric order

# 4. Create the avatars storage bucket
# Supabase Dashboard → Storage → New bucket → name: avatars → Public: on

# 5. Start the dev server
npm run dev
# → http://localhost:3000 (redirects to /login)
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 16 (App Router) | Server Components run aggregation queries server-side; Server Actions handle all mutations; layout groups (`(protected)/`) provide clean auth guards with a single `layout.tsx` |
| **Database** | Supabase (PostgreSQL + RLS) | Row Level Security enforces per-user data isolation at the DB layer — the application layer cannot accidentally leak another user's data regardless of query logic |
| **Auth** | Supabase Auth | Email + password, JWT sessions via cookies, password reset via PKCE flow, session refresh on every request via `@supabase/ssr` middleware |
| **Storage** | Supabase Storage | Profile avatar uploads in the `avatars` bucket |
| **AI** | Multi-provider (Claude / OpenAI / Gemini) | Users configure their preferred provider + API key in Settings; active provider stored in `ai_settings`; processing happens entirely server-side with full chat history context |
| **Chat persistence** | Supabase `chat` table | Each user+upload conversation is stored with a `chat_role` ENUM (`user` / `assistant`); history reloads on navigation and feeds multi-turn AI context |
| **Styling** | Tailwind CSS v4 | Utility classes co-located with components; CSS custom properties for design token enforcement (`--color-*`, `--shadow-*`) |
| **Language** | TypeScript (strict mode) | Hand-maintained DB types in `lib/supabase/types.ts` aligned to the live schema |
| **Deployment** | Vercel | Zero-config Next.js hosting; environment variables managed via Vercel dashboard |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                        # Unauthenticated routes (no sidebar)
│   │   ├── login/page.tsx             # Email + password sign-in
│   │   ├── forgot-password/page.tsx   # Send password reset email
│   │   └── reset-password/page.tsx    # Set new password via PKCE recovery token
│   │
│   ├── (protected)/                   # Auth-gated routes (middleware enforced)
│   │   ├── layout.tsx                 # Sidebar + conditional top nav; UploadContextProvider
│   │   ├── dashboard/
│   │   │   ├── page.tsx               # Server Component — runs getDashboardData(), passes props
│   │   │   └── DashboardClient.tsx    # Charts, KPI cards, PDF report, historical upload selector
│   │   ├── upload/page.tsx            # CSV drag-drop, client validation, batch import, upload history
│   │   ├── ai-explorer/page.tsx       # Natural language chat; loads/saves history per upload
│   │   ├── profile/page.tsx           # Edit display name, upload avatar
│   │   ├── settings/page.tsx          # Change email/password; configure AI provider + API key
│   │   └── reports/page.tsx           # Placeholder (future phase)
│   │
│   ├── api/
│   │   ├── query/route.ts             # AI query endpoint — authenticates, builds donor context,
│   │   │                              # calls provider (non-streaming), saves chat to DB, returns JSON
│   │   └── validate-ai/route.ts       # Validates a user-supplied AI API key against the provider
│   │
│   ├── globals.css                    # CSS custom properties (design tokens) + Tailwind base
│   └── layout.tsx                     # Root layout — Inter font, html/body wrapper
│
├── context/
│   └── UploadContext.tsx              # Client context: selectedUploadId ↔ localStorage
│
├── lib/
│   ├── constants/
│   │   ├── enums.ts                   # DonorSegment, GiftChannel, GiftRegion, Campaign, RowStatus
│   │   └── tokens.ts                  # Design token references (colors, chart palette)
│   ├── data/
│   │   └── dashboard.ts               # getDashboardData(uploadId?) — server-side KPI aggregation
│   └── supabase/
│       ├── client.ts                  # Browser Supabase client (anon key)
│       ├── server.ts                  # Server Supabase client (cookie-based session)
│       ├── types.ts                   # Database types + convenience aliases
│       └── actions.ts                 # Server Actions: auth, profile, ai_settings, uploads, chat
│
├── mocks/
│   └── types.ts                       # Shared TypeScript interfaces (DonorGift, DashboardAggregates…)
│
└── middleware.ts                      # Auth guard — redirects unauthenticated browsers to /login;
                                       # refreshes Supabase JWT on every request

supabase/
└── migrations/                        # Run in numeric order via Supabase Dashboard → SQL Editor
    ├── 0000_initial.sql               # Core schema: enums, profiles, uploads, donor_gifts, RLS
    ├── 0001_ai_settings_prompt.sql    # ai_settings + prompts tables
    ├── 0002_profiles_avatar.sql       # avatar_url column on profiles
    ├── 0003_fix_uploads_rls.sql       # Corrected RLS policies for uploads table
    ├── 0004_chat_table.sql            # chat_role ENUM, chat table, RLS, index, updated_at trigger
    └── 0005_security_hardening.sql    # DELETE RLS policy on donor_gifts

public/
└── agp-logo.svg                       # Official AGP logo
```

---

## Environment Variables

Create `.env.local` in the project root:

```bash
# Supabase — required for all functionality
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-jwt>

# Optional: Anthropic API key fallback (used if no user-configured key is found)
ANTHROPIC_API_KEY=<sk-ant-...>
```

**Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser — this is safe because the Supabase anon key is a public credential; RLS handles authorization.
- `SUPABASE_SERVICE_ROLE_KEY` is **not needed** for this application. The app exclusively uses the anon key with cookie-based user sessions and RLS.
- AI provider API keys are **not** stored in `.env`. Users enter them via **Settings → AI Configuration**; they are stored in the `ai_settings` table and used only server-side.

---

## Database Setup

Run all migrations in order via **Supabase Dashboard → SQL Editor**:

```
supabase/migrations/0000_initial.sql
supabase/migrations/0001_ai_settings_prompt.sql
supabase/migrations/0002_profiles_avatar.sql
supabase/migrations/0003_fix_uploads_rls.sql
supabase/migrations/0004_chat_table.sql
supabase/migrations/0005_security_hardening.sql
```

After migrations, create the Storage bucket manually:

> **Supabase Dashboard → Storage → New bucket**
> Name: `avatars` | Public: **on**

---

## Features

### Executive Dashboard (`/dashboard`)
- KPI cards: Total Raised, Average Gift, Donor Count, Retention Rate
- Gifts Over Time — monthly bar chart (current year vs. previous year)
- Segment Breakdown — donut chart with per-segment legend
- Campaign Performance — horizontal bar chart, top 6 campaigns by revenue
- Channel Performance — horizontal bar chart with percentage contribution
- **Historical modal** — select any previous upload to scope the entire dashboard
- Auto-selects the most recent complete upload when no session is active
- **Download Report** — exports a 3-page PDF (Cover + KPIs, Gifts Over Time, Performance Metrics) built with jsPDF primitives (no screenshot/html2canvas)
- Active dataset shown as a badge in the header subtitle

### CSV Upload (`/upload`)
- Drag-and-drop or file browser (`.csv` only, max 50 MB / 100k rows enforced client-side)
- Client-side validation: required fields, date normalization to ISO `YYYY-MM-DD`, numeric amounts, enum matching
- Live preview: first 10 rows with per-row status badge (valid / warning / rejected)
- Validation summary before confirming import
- Batch insert to `donor_gifts` (100 rows per batch)
- Previous uploads table: inline filename rename, one-click dataset selection, delete with CASCADE
- Newly imported file is auto-selected; app navigates to `/dashboard?upload=<id>`

### AI Explorer (`/ai-explorer`)
- **Gated**: requires an active upload and a configured AI provider
- Multi-turn conversation with full history context — prior messages are sent to the AI on each request
- **Persistent chat history**: each message is saved to the `chat` table; conversation reloads from DB when navigating back to the same upload
- Switching uploads clears the chat area and loads that upload's conversation history
- AI processing is fully server-side — switching uploads mid-generation does not lose the response; it saves to DB and loads on return
- Input is locked while the AI is generating (prevents duplicate sends)
- Multi-provider: Claude (Anthropic), OpenAI, or Gemini — switched without leaving the page via **Change** button
- Agent prompt is user-customisable (name + system prompt stored in `prompts` table)
- Example question chips for quick-start

### Authentication & Profile
- Email + password sign-in, sign-out, forgot password, reset password (PKCE flow)
- All routes protected by middleware; unauthenticated requests redirect to `/login`
- Profile page: edit display name, upload/replace avatar (Supabase Storage)

### Settings
- Change email, change password
- Configure AI provider: select Claude / OpenAI / Gemini, enter API key and model, mark as active
- API key is validated against the live provider before being saved

---

## Architecture Notes

### Upload Session — Two-Layer Context

The selected upload ID is propagated through two parallel mechanisms:

| Mechanism | Scope | How |
|-----------|-------|-----|
| URL param `?upload=<id>` | Dashboard Server Component | `searchParams.upload` passed to `getDashboardData()` |
| `localStorage` + React Context (`UploadContext`) | AI Explorer, Upload page, nav links | Context wraps the protected layout; persists across tab refreshes |

Navigation links for Upload and AI Explorer dynamically append `?upload=<id>` from context so the active dataset is never silently dropped when moving between tabs.

### Server / Client Component Split

`dashboard/page.tsx` is a **Server Component** — it runs `getDashboardData()` inside the Next.js server process. All Supabase aggregation queries run server-side; the client receives only serialisable JSON props. Formatters and computed values are defined inside `DashboardClient.tsx`, not passed as props, to avoid the "non-serialisable prop" constraint.

### AI Query Pipeline (`/api/query`)

1. Authenticates the request via Supabase server client (cookie session)
2. Loads the user's active AI provider, model, and API key from `ai_settings`
3. Queries up to 500 `donor_gifts` rows scoped to `uploadId`, builds a structured context string (totals, campaigns, segments, channels, sample rows)
4. Embeds context in the **system prompt** so all conversation turns share it without repeating data
5. Calls the provider's **non-streaming** API with the full message history (`history` array from client)
6. Saves the user message and assistant response to the `chat` table server-side (scoped to `upload_id`)
7. Returns `{ content: string }` JSON — the client never sees raw provider responses

The `uploadId` is captured at the start of the request. If the user switches uploads while waiting, the response is still saved to the original upload's chat history and will appear when they navigate back.

### Row Level Security

Every table has RLS enabled. All `SELECT` / `INSERT` / `UPDATE` / `DELETE` policies verify `auth.uid() = user_id`. The application never needs to filter by user — the database refuses to return or modify another user's rows regardless of what query is sent. The `uploads` → `donor_gifts` → `chat` cascade ensures deleting an upload removes all child records atomically.

### Chat History Schema

```sql
chat (
  id          UUID PRIMARY KEY,
  user_id     UUID  → auth.users (CASCADE),
  upload_id   UUID  → uploads (CASCADE),
  role        chat_role ENUM ('user' | 'assistant'),
  message     TEXT,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ   -- auto-set by trigger
)
-- Index: (user_id, upload_id, created_at ASC) for efficient history loads
```

---

## Security

| Control | Implementation |
|---------|---------------|
| Route auth | Middleware checks `auth.getUser()` on every request; redirects unauthenticated browsers to `/login` |
| API route auth | `/api/query` and `/api/validate-ai` check `auth.getUser()` server-side and return 401 JSON for unauthenticated programmatic clients |
| Data isolation | RLS on all tables — database-layer enforcement independent of application logic |
| Input validation | `question` capped at 2000 chars; `history` array validated (max 40 entries, each entry max 4000 chars); agent name max 200 chars; description max 5000 chars |
| File upload | CSV rejected client-side if > 50 MB or > 100k rows before any parsing begins |
| Secret handling | AI API keys stored server-side only; never returned to the browser; `NEXT_PUBLIC_*` contains only the Supabase anon key |
| CSRF | All state mutations use Next.js Server Actions (built-in CSRF protection via same-origin enforcement) |

---

## Deployment

```bash
# Push to GitHub — Vercel auto-deploys on push to main
git push origin main

# Or deploy manually:
npx vercel deploy --prod
```

**Required environment variables in Vercel dashboard:**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY          # optional fallback
```

> Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel — this application does not use it.

---

## CSV Schema Reference

Files imported via the Upload page must conform to this structure (column names are case-insensitive):

| Column | Type | Required | Valid values |
|--------|------|----------|-------------|
| `donor_id` | string | yes | Any unique identifier |
| `donor_name` | string | yes | Full name |
| `segment` | enum | yes | `Major Gifts`, `Mid-Level`, `Sustainer`, `First-Time`, `Lapsed`, `General` |
| `gift_date` | date | yes | Any parseable date — normalized to `YYYY-MM-DD` on import |
| `gift_amount` | numeric | yes | Positive number; `$` and `,` are stripped automatically |
| `campaign` | string | yes | Free-text campaign name |
| `channel` | enum | yes | `Email`, `Direct Mail`, `Event`, `Online`, `Phone` |
| `region` | enum | yes | `Midwest`, `Northeast`, `West`, `South` |

**Row outcomes:**
- **Rejected** — unparseable date or non-numeric amount; row is excluded from import
- **Warning** — unknown enum value or missing non-critical field; row is included with a flag
- **Valid** — all fields parsed and recognised

---

See [RULES.md](./RULES.md) for development rules and coding conventions.
