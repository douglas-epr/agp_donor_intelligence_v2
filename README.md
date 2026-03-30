# AGP Donor Intelligence v2

> A lightweight donor analytics dashboard for nonprofit leadership.
> Upload a CSV. Get an executive-ready dashboard. Ask questions in plain English.

---

## What This Is

AGP Donor Intelligence is a web application built for the VP of Development at a mid-size nonprofit client of Allegiance Group + Pursuant (AGP). It eliminates the need to manually pull CRM reports every week by letting users upload a donor gift history CSV and immediately see fundraising performance, donor trends, and campaign effectiveness — presented in a format suitable for a board meeting.

The app also includes an AI-powered query interface backed by Claude, where leadership can ask natural language questions about their data and receive grounded, streamed answers.

---

## Personas

**VP of Development (Primary)**
Responsible for fundraising performance across campaigns. Needs quick answers before board or leadership meetings. Receives weekly CRM exports and wants clean executive visualizations, not spreadsheets.

**Fundraising Analyst (Secondary)**
Uploads and validates the dataset before leadership reviews it. Ensures data accuracy and handles minor formatting issues in the CSV before import.

---

## Four Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Email + password authentication. Protected session. No public data. |
| Executive Dashboard | `/dashboard` | KPI cards, gifts over time, segment breakdown, campaign performance, channel performance. |
| CSV Upload | `/upload` | Drag-and-drop or file browse. Real-time validation. Row-level error reporting. Preview before import. |
| AI Explorer | `/ai-explorer` | Natural language query interface. Structured context passed to Claude. Streamed responses. |

---

## Tech Stack

### Next.js 15 (App Router)
**Why:** App Router enables per-route server components, which keeps sensitive data aggregation off the client. Server Actions handle CSV processing and AI context building. Route Handlers power the streaming AI response endpoint. Protected layout groups (`(protected)/`) handle auth guards cleanly without middleware complexity.

### Supabase *(Phase 2)*
**Why:** Provides Auth (email/password, session management), PostgreSQL with Row Level Security (RLS) for per-user data isolation, and Storage for raw CSV file archival. RLS policies enforce that users can only query their own data at the database layer — not just the application layer.
- Auth: replaces mock session
- PostgreSQL: replaces in-memory data store
- Storage: stores original uploaded CSV files

### Vercel *(Phase 3)*
**Why:** Zero-config Next.js deployment. Edge runtime for the AI streaming route handler minimizes first-token latency. Preview deployments on each PR. Environment variable management for Supabase and Anthropic keys.

### Claude API — `claude-sonnet-4-6`
**Why:** Powers the AI Explorer. Receives structured context (schema, aggregates, filtered rows, sample data) alongside the user's question. Returns grounded answers — never hallucinated data. Streaming via Anthropic SDK `stream()`.

### Recharts
**Why:** Lightweight, composable React charting library with full TypeScript support. Handles line charts (gifts over time), bar charts (campaign/channel performance), and donut charts (segment breakdown) without heavy bundle overhead.

### Tailwind CSS
**Why:** Utility-first CSS maps directly to design tokens defined in `tailwind.config.ts`. Keeps styling co-located with components and makes design-system compliance enforceable at the code level.

### shadcn/ui
**Why:** Accessible, unstyled component primitives (dialogs, tables, badges, tooltips) that accept Tailwind classes. Avoids building form controls and overlays from scratch.

---

## Architecture Overview

```
User Browser
    │
    ├── /login             Mock auth → session cookie (Phase 1)
    │                      Supabase Auth → JWT (Phase 2)
    │
    ├── /dashboard         Reads from src/mocks/donors.ts (Phase 1)
    │                      Reads from Supabase donor_gifts (Phase 2)
    │                      Aggregates computed server-side
    │
    ├── /upload            CSV parsed client-side (PapaParse)
    │                      Validation runs in lib/parsers/
    │                      Preview rendered before commit
    │                      Commit → updates React context (Phase 1)
    │                      Commit → inserts to Supabase (Phase 2)
    │
    ├── /ai-explorer       User question → lib/ai/buildContext()
    │                      Context + question → POST /api/query
    │                      /api/query → Anthropic SDK stream()
    │                      Stream piped back to UI via ReadableStream
    │
    └── /reports           Placeholder — Phase 2+
```

---

## Phase Plan

### Phase 1 — Mock UI (Current)
- All screens built and styled to final design
- Data sourced from `src/mocks/donors.ts` (50 static rows)
- Auth simulated via `src/mocks/session.ts`
- CSV upload validated and previewed; confirmed data stored in React context
- AI Explorer functional with real Claude API calls (only integration active in Phase 1)
- Goal: UI/UX sign-off from stakeholder

### Phase 2 — Supabase Integration
- Replace mock session with Supabase Auth
- Replace React context data store with Supabase `donor_gifts` table
- Add RLS policies (see `docs/architecture.md`)
- Store uploaded CSVs in Supabase Storage
- Generate TypeScript types from schema

### Phase 3 — Vercel Deployment
- Push repo to GitHub
- Connect to Vercel project
- Set environment variables (Supabase URL/key, Anthropic API key)
- Configure preview deployments
- Validate production build

---

## Getting Started (Phase 1)

```bash
# Install dependencies (already done — node_modules present)
npm install

# Start development server
npm run dev

# Open in browser
http://localhost:3000

# Demo login credentials (mock)
Email:    demo@agpintelligence.com
Password: any value accepted in Phase 1
```

---

## Environment Variables

Not required for Phase 1 (mock data). Required from Phase 2 onward:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=       # Phase 2
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Phase 2
ANTHROPIC_API_KEY=              # Phase 1 (AI Explorer only)
```

---

## Project Rules

See [RULES.md](./RULES.md) — the absolute source of truth for all development decisions on this project.

## Architecture & Schema

See [docs/architecture.md](./docs/architecture.md) — Supabase schema, design system tokens, and integration specs.
