# RULES.md — Absolute Source of Truth
# AGP Donor Intelligence v2

> This file governs all development decisions on this project.
> Any conflict between this document and other files resolves in favor of RULES.md.

---

## RULE #1 — MANDATORY: Mock Data Only Until UI/UX Is Finalized

**DO NOT connect to Supabase, GitHub, or Vercel during Phase 1.**

- All data fetching must use static mock data from `lib/mock/`
- All mutations must update local React state only (no persistence to any external service)
- No `.env` keys for Supabase, no `supabase` client instantiation, no `fetch` calls to external APIs (except the Claude AI endpoint)
- This rule is lifted only when the UI/UX is approved and Phase 2 begins

---

## Phase Gates

| Phase | Description | Unlock Condition |
|-------|-------------|-----------------|
| **Phase 1** | Mock UI — all screens built with mock data and local state | UI/UX approved by stakeholder |
| **Phase 2** | Supabase wiring — replace mock data with real DB, Auth, and Storage | Phase 1 approved |
| **Phase 3** | Vercel deployment — production build, CI/CD, environment variables | Phase 2 approved |

---

## CSV Schema

Every donor gift file must conform to this schema. Column names are case-insensitive on import.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `donor_id` | string | yes | Unique identifier per donor |
| `donor_name` | string | yes | Full name |
| `segment` | enum | yes | See Segment Enum below |
| `gift_date` | date | yes | ISO 8601 preferred (YYYY-MM-DD) |
| `gift_amount` | numeric | yes | Positive number, no currency symbols |
| `campaign` | string | yes | Free text campaign name |
| `channel` | enum | yes | See Channel Enum below |
| `region` | enum | yes | See Region Enum below |

---

## Enums

### Donor Segment
```
MAJOR_GIFT   = "Major Gifts"
MID_LEVEL    = "Mid-Level"
SUSTAINER    = "Sustainer"
FIRST_TIME   = "First-Time"
LAPSED       = "Lapsed"
GENERAL      = "General"
```

### Gift Channel
```
EMAIL        = "Email"
DIRECT_MAIL  = "Direct Mail"
EVENT        = "Event"
ONLINE       = "Online"
PHONE        = "Phone"
```

### Gift Region
```
MIDWEST      = "Midwest"
NORTHEAST    = "Northeast"
WEST         = "West"
SOUTH        = "South"
```

**Never hardcode enum values as raw strings outside of these definitions.** Import from `lib/constants/enums.ts`.

---

## Data Validation Rules

Applied during CSV parsing before preview is shown:

| Issue | Handling | Row Status |
|-------|----------|------------|
| Missing required field | Flag with warning message | `warning` — included in valid count |
| Malformed date (unparseable) | Reject row | `rejected` |
| Non-numeric gift amount | Reject row | `rejected` |
| Negative gift amount | Reject row | `rejected` |
| Unknown enum value in segment/channel/region | Flag with warning | `warning` — included in valid count |
| Unknown extra columns | Ignore silently | — |
| Duplicate donor_id + gift_date + gift_amount combo | Flag with warning | `warning` |

Preview must show:
- First 10 rows of the full dataset
- Total valid row count
- Total rejected row count
- Per-row error/warning messages inline

User may proceed with valid rows only. Rejected rows are excluded from import.

---

## Authentication Rules

- Every route except `/login` is protected
- Unauthenticated users accessing any protected route are redirected to `/login`
- Each user's uploaded data is isolated — no cross-user data access
- Sessions persist across browser refresh (not just in-memory)
- **Phase 1:** Mock session via `lib/mock/session.ts` — hardcoded demo user, no real auth
- **Phase 2:** Replace with Supabase Auth (email + password)
- No public endpoints that expose donor data

---

## AI Behavior Rules

- The AI must operate on the **actual uploaded dataset**, never hallucinate data
- Every query to the AI model must include structured context:
  - Dataset schema (column names and types)
  - Aggregate summaries (totals, averages, unique values per dimension)
  - Filtered rows relevant to the question
  - Sample rows for grounding
- The raw natural language question alone is never sufficient — always build context first
- AI responses must stream progressively to the UI (no waiting for full response)
- AI model: `claude-sonnet-4-6` via Anthropic API

---

## UI / Design Rules

- All colors, typography, and spacing must strictly follow the design tokens in `docs/architecture.md`
- No technical terminology in user-facing copy (no "null", "undefined", "500 error", "boolean", etc.)
- Charts must be presentation-quality — suitable for executive meetings, not prototypes
- All screens must be responsive for laptop (1280px+) and tablet (768px+)
- Use Inter font (Google Fonts) throughout

---

## Coding Rules

1. **No orphan code.** Every file must trace back to a documented screen, feature, or workflow.
2. **No speculative abstractions.** Build for what exists, not hypothetical future requirements.
3. **No hardcoded strings.** All enum values, route paths, and config values live in constants files.
4. **No client-side logic for server concerns.** AI queries and data aggregation run server-side (Route Handlers or Server Actions).
5. **No feature flags, backwards-compat shims, or TODO comments** for features not in the current phase.
6. **No mock imports in Phase 2+.** When Supabase is wired, remove all `lib/mock/` references completely.

---

## Performance Targets

- CSV parsing and validation: **< 5 seconds** for datasets under 10,000 rows
- Dashboard initial load: **< 2 seconds** from confirmed import to visible KPI cards
- AI query first token: **< 3 seconds** from submission

---

## Out of Scope for v1

The following will not be built in Phase 1 or Phase 2 of this project:

- CRM integrations (Salesforce, Blackbaud, etc.)
- Multi-file dataset merging
- Automated donor segmentation
- Scheduled reports
- Data export to PDF
- Role-based permissions
- Predictive donor analytics
- Automated fundraising recommendations
- Mobile (< 768px) optimization

---

## Directory Contract

```
agp_donor_intelligence_v2/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/login/       # Login screen
│   ├── (protected)/        # All protected routes
│   │   ├── dashboard/      # Executive summary
│   │   ├── upload/         # CSV upload and parsing
│   │   ├── ai-explorer/    # Natural language query
│   │   └── reports/        # Placeholder
│   └── api/
│       └── query/          # Claude API streaming route handler
├── components/             # Reusable UI components
├── lib/
│   ├── constants/          # Enums, route paths, config
│   ├── mock/               # Phase 1 only: mock data and session
│   ├── parsers/            # CSV parsing and validation logic
│   └── ai/                 # AI context builder and query helpers
├── docs/                   # Architecture, changelog, decisions
├── public/                 # Static assets
├── RULES.md                # This file
└── README.md               # Project overview
```
