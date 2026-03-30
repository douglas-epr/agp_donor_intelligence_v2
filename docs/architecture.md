# Architecture — AGP Donor Intelligence v2

---

## 1. Supabase Schema (Phase 2 — for future use)

> Do not implement until Phase 1 UI/UX is approved. Schema is defined here for planning and type generation purposes only.

### Enums

```sql
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
```

### Table: `profiles`

Extends Supabase `auth.users`. Created automatically on user signup via trigger.

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### Table: `uploads`

One record per CSV import session.

```sql
CREATE TABLE uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_count       INTEGER NOT NULL DEFAULT 0,
  rejected_count  INTEGER NOT NULL DEFAULT 0,
  status          upload_status NOT NULL DEFAULT 'pending',
  storage_path    TEXT  -- path in Supabase Storage bucket
);

-- RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Table: `donor_gifts`

One record per gift row from the imported CSV.

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

-- Index for dashboard aggregation queries
CREATE INDEX idx_donor_gifts_user_id ON donor_gifts(user_id);
CREATE INDEX idx_donor_gifts_gift_date ON donor_gifts(gift_date);
CREATE INDEX idx_donor_gifts_segment ON donor_gifts(segment);
CREATE INDEX idx_donor_gifts_campaign ON donor_gifts(campaign);
CREATE INDEX idx_donor_gifts_channel ON donor_gifts(channel);

-- RLS
ALTER TABLE donor_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own donor gifts"
  ON donor_gifts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own donor gifts"
  ON donor_gifts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Storage Bucket: `csv-uploads`

```sql
-- Bucket policy: each user can only access their own folder
-- Folder structure: csv-uploads/{user_id}/{upload_id}/{filename}
```

---

## 2. Design System Tokens

All tokens are implemented in `tailwind.config.ts` and as CSS custom properties in `app/globals.css`.

### Color Palette

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--color-primary` | Institutional Blue | `#1F3E77` | Top nav bar, dashboard headers, primary section backgrounds |
| `--color-secondary` | Insight Blue | `#2F6FED` | Primary buttons, links, active nav items, chart lines, focus rings |
| `--color-bg` | Cloud Interface | `#F5F7FA` | Page background, dashboard canvas, card backgrounds |
| `--color-accent` | Momentum Green | `#9EDC4B` | Growth indicators, positive metric deltas, chart highlights |
| `--color-text` | Executive Graphite | `#2A2E35` | All titles, KPI numbers, primary body text |
| `--color-text-muted` | — | `#6B7280` | Secondary labels, captions, metadata |
| `--color-border` | — | `#E5E7EB` | Card borders, table dividers, input borders |
| `--color-error` | — | `#EF4444` | Rejected rows, validation errors |
| `--color-warning` | — | `#F59E0B` | Flagged rows, warnings |
| `--color-surface` | — | `#FFFFFF` | Card surfaces, modal backgrounds, table rows |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| Font family | Inter (Google Fonts) | All text throughout the app |
| `--text-xs` | 12px / 400 | Captions, badges, metadata |
| `--text-sm` | 14px / 400 | Body text, table cells, descriptions |
| `--text-base` | 16px / 400 | Default body |
| `--text-lg` | 18px / 500 | Card labels, section subheadings |
| `--text-xl` | 20px / 600 | Card headings, page subheadings |
| `--text-2xl` | 24px / 700 | KPI values, page titles |
| `--text-3xl` | 30px / 700 | Hero KPI numbers |

### Spacing & Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Inputs, badges, tags |
| `--radius-md` | 8px | Cards, modals, dropdowns |
| `--radius-lg` | 12px | Large panels, upload zone |
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | KPI cards, chart containers |
| `--shadow-elevated` | `0 4px 12px rgba(0,0,0,0.12)` | Modals, dropdowns |
| Page padding | 24px (desktop), 16px (tablet) | Main content area horizontal padding |
| Sidebar width | 220px | Left navigation |
| Topnav height | 56px | Fixed top navigation bar |
| Card gap | 16px | Grid spacing between KPI cards |

### Chart Color Scale

Used in order for multi-series charts:

```
1. #2F6FED  (Insight Blue)
2. #1F3E77  (Institutional Blue)
3. #9EDC4B  (Momentum Green)
4. #F59E0B  (Amber)
5. #8B5CF6  (Violet)
6. #EC4899  (Pink)
```

---

## 3. App Route Map

| Route | Layout | Auth Required | Screen |
|-------|--------|--------------|--------|
| `/login` | Auth layout (centered, no nav) | No | Login form |
| `/dashboard` | Protected layout (sidebar + topnav) | Yes | Executive Summary |
| `/upload` | Protected layout | Yes | CSV Upload & Parsing |
| `/ai-explorer` | Protected layout | Yes | AI Data Explorer |
| `/reports` | Protected layout | Yes | Reports (placeholder) |
| `/api/query` | Route Handler (no layout) | Yes (session check) | Claude streaming endpoint |

---

## 4. Integrations

### Anthropic Claude API
- **Purpose:** AI Explorer natural language queries
- **Model:** `claude-sonnet-4-6`
- **Method:** Server-side streaming via `@anthropic-ai/sdk`
- **Endpoint:** `POST /api/query`
- **Context payload structure:**
  ```json
  {
    "question": "Which campaign had the highest average gift?",
    "context": {
      "schema": ["donor_id", "donor_name", "segment", "gift_date", "gift_amount", "campaign", "channel", "region"],
      "totalRows": 2512,
      "segments": ["Major Gifts", "Mid-Level", "Sustainer"],
      "campaigns": ["Year-End Appeal", "Spring Drive", "Major Gift Gala"],
      "channels": ["Email", "Direct Mail", "Event"],
      "regions": ["Northeast", "Midwest", "West"],
      "aggregates": {
        "totalRaised": 1200000,
        "averageGift": 480,
        "donorCount": 2500,
        "retentionRate": 0.65,
        "byCampaign": [{ "campaign": "Year-End Appeal", "total": 540000, "avgGift": 520 }]
      },
      "filteredRows": [],
      "sampleRows": []
    }
  }
  ```
- **Active in:** Phase 1 (only external integration in mock phase)
- **Env var:** `ANTHROPIC_API_KEY`

### Supabase Auth *(Phase 2)*
- **Purpose:** Email + password authentication, session JWTs, protected route middleware
- **Replaces:** `lib/mock/session.ts`
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase PostgreSQL *(Phase 2)*
- **Purpose:** Persistent donor gift storage with per-user RLS isolation
- **Replaces:** React context in-memory data store
- **Migration files:** `supabase/migrations/`

### Supabase Storage *(Phase 2)*
- **Purpose:** Archive original uploaded CSV files
- **Bucket:** `csv-uploads`
- **Path pattern:** `{user_id}/{upload_id}/{original_filename}.csv`

### Vercel *(Phase 3)*
- **Purpose:** Production hosting, preview deployments, edge runtime
- **Edge function:** `/api/query` benefits from edge runtime for lower AI streaming latency
- **Config:** `vercel.json`

---

## 5. Mock Data Strategy (Phase 1)

All mock data lives in `lib/mock/`. These files are **removed entirely when Phase 2 begins**.

### `lib/mock/donors.ts`
Static array of 50 `DonorGift` objects matching the CSV schema. Covers all enum variants across segments, channels, regions, and campaigns. Includes deliberate variation in gift amounts and dates to make charts meaningful.

### `lib/mock/session.ts`
Exports a `mockSession` object:
```ts
{
  user: { id: 'mock-user-001', email: 'demo@agpintelligence.com', name: 'Demo User' },
  isAuthenticated: true
}
```

### `lib/mock/aggregates.ts`
Pre-computed KPI values derived from `donors.ts`:
- `totalRaised`, `averageGift`, `donorCount`, `retentionRate`
- `giftsByMonth[]`, `byCampaign[]`, `bySegment[]`, `byChannel[]`

### State Management
- React Context (`DataContext`) wraps the protected layout
- Provides `donors`, `aggregates`, `uploads`, and `setDonors` to all protected pages
- CSV import replaces the `donors` array in context (no persistence in Phase 1)
