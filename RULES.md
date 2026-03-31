# RULES.md — Development Rules

> Governing document for all development decisions on AGP Donor Intelligence.
> In any conflict between this file and other documentation, RULES.md wins.

---

## 1. Code Hygiene

### No orphan code
Every file must trace back to a documented screen, feature, or workflow defined in `docs/architecture.md`. Delete unused files; do not comment them out.

### No speculative abstractions
Build for the requirements that exist right now. Do not create helpers, utilities, or abstractions for features not yet spec'd. Three similar lines of code is preferable to a premature abstraction.

### No hardcoded strings
All enum values live in `lib/constants/enums.ts`. All design tokens reference CSS custom properties or `lib/constants/tokens.ts`. Raw strings for these purposes are prohibited.

### No client-side data logic
Aggregation, filtering, and AI context building run server-side (Server Components, Server Actions, or Route Handlers). Client components receive pre-computed data as props or fetch it via Server Actions. They render; they do not aggregate.

### No mock imports outside the mocks directory
`src/mocks/` contains shared TypeScript interfaces (`types.ts`). Do not import static mock data into `app/` or `lib/`.

---

## 2. Database Rules

### Every table must have RLS
No table ships without `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and policies for every operation the app uses (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). See `supabase/migrations/` for the reference pattern.

### Column names are the source of truth
The `uploads` table uses **`uploaded_at`** — not `created_at`. The `chat`, `donor_gifts`, `ai_settings`, and `prompts` tables use `created_at`. Always verify column names against `lib/supabase/types.ts` before writing queries. Never guess column names.

### Enum values match the DB enums
`donor_segment`, `gift_channel`, `gift_region`, `upload_status`, and `chat_role` are PostgreSQL enums defined in the migrations. TypeScript enums in `lib/constants/enums.ts` must remain in sync. If a value is added to one, it must be added to the other.

### Migrations are append-only
Never edit an existing migration file. Create a new numbered migration for every schema change. Migrations run in filename order. Inform the user to run new migrations manually via Supabase Dashboard → SQL Editor.

### No upsert on unconstrained tables
`ai_settings` and `prompts` do not have `UNIQUE` constraints on `(user_id, type)` / `(user_id)`. The `saveAISettings` and `savePrompt` Server Actions use explicit `SELECT → INSERT or UPDATE` logic. Do not replace this with `.upsert()` without first adding the constraint in a migration.

---

## 3. Authentication Rules

- Every route under `(protected)/` is guarded by `middleware.ts` — never add public access to these routes without a deliberate decision documented here.
- Unauthenticated browsers are redirected to `/login` at the middleware layer.
- API routes (`/api/*`) must also call `supabase.auth.getUser()` server-side and return a JSON `401` for unauthenticated programmatic clients — middleware only sends browser redirects.
- Each user's data is isolated by `user_id = auth.uid()` at both the RLS layer and the application query layer.
- Sessions are refreshed on every request via `@supabase/ssr` cookie handling in `middleware.ts`. Do not bypass or remove this.
- Passwords and API keys are never logged, printed to the console, or included in error messages returned to the client.
- `SUPABASE_SERVICE_ROLE_KEY` is not used. All data access goes through the anon key + RLS.

---

## 4. AI Rules

### Context is mandatory
The AI model must never receive a bare natural language question. Every request to `/api/query` must include structured context built from the user's actual `donor_gifts` data: schema, aggregates, and sample rows embedded in the system prompt.

### No hallucination surface
The system prompt instructs the model to answer only from the data context provided. Do not modify this constraint.

### Processing is non-streaming and server-side
AI responses are fetched synchronously. `/api/query` calls the provider, receives the full response, saves both the user message and assistant response to the `chat` table, and returns `{ content: string }`. Do not reintroduce streaming — the chat persistence model depends on atomic save-after-complete.

### Multi-turn history is passed by the client
The client sends up to 20 previous messages as a `history` array. The server validates: max 40 entries, each content <= 4000 chars, `question` <= 2000 chars. These limits must not be relaxed without considering AI provider token costs.

### Multi-provider support is table-driven
The active AI provider is resolved by querying `ai_settings WHERE selected = true`. Adding a new provider means adding a new branch in `/api/query/route.ts` and `/api/validate-ai/route.ts` — no environment variable changes required.

### No edge runtime on AI routes
`/api/query` and `/api/validate-ai` use the Node.js runtime (required for `cookies()`). Do not add `export const runtime = "edge"` to these files.

---

## 5. Chat Rules

### Persistence is always server-side
The `/api/query` route saves user and assistant messages to the `chat` table after the AI responds. The client does not call `saveChatMessage()` for query results.

### History is scoped to upload + user
Chat history is loaded per `(user_id, upload_id)` pair. Switching uploads clears the message list and reloads history for the new upload from the DB.

### Upload ID is captured at send time
`sendMessage` captures `uploadId` before any state mutations. If the user switches uploads while waiting for a response, the answer is still saved to the original upload's history and loads on navigation back. The UI only updates if the user is still viewing the same upload.

### No duplicate sends
`loading = true` is set before the fetch and cleared in `finally`. The input and send button are disabled while `loading` is true.

---

## 6. CSV Import Rules

### Validation order
1. Guard: reject files > 50 MB or > 100,000 rows before parsing
2. Parse headers (case-insensitive)
3. For each row: check required fields → validate date → validate amount → validate enums
4. Any row with an unparseable date or non-numeric amount is `rejected` and excluded entirely
5. Any row with a missing optional field or unknown enum value gets `warning` status but is included

### Date normalisation
All dates are normalised to `YYYY-MM-DD` (ISO 8601) using `new Date(Date.parse(gift_date)).toISOString().split("T")[0]` before insert. The DB column is `DATE` type.

### Batch size
`donor_gifts` inserts use batches of 100 rows. Do not increase this without testing Supabase payload limits.

### Status lifecycle
`uploads.status` progresses: `pending` → `processing` → `complete`. Set to `complete` only after all batches succeed. An upload stuck in `processing` due to a prior error is visible to the user in the uploads list.

---

## 7. Security Rules

### Input validation on all API routes
All user-supplied strings must be validated for type and length at the API boundary before use. Current enforced limits: `question` ≤ 2000, `history` ≤ 40 entries each ≤ 4000, agent `name` ≤ 200, agent `description` ≤ 5000.

### No raw provider errors to the client
AI provider error responses (which may contain internal details) must be parsed to extract only the human-readable `message` field before returning to the client.

### API keys are server-side only
User-supplied AI API keys are stored in `ai_settings` and used only inside Server Actions and Route Handlers. They are never returned to the browser in any response.

### CSRF protection via Server Actions
All state mutations (DB writes) use Next.js Server Actions, which enforce same-origin calls. Do not expose mutation endpoints as plain API routes without auth checks.

---

## 8. UI / Design Rules

### Design tokens only
All colours, font sizes, spacing, shadows, and border radii must use CSS custom properties defined in `app/globals.css`. Do not introduce inline hex codes or hardcoded pixel values outside of token definitions.

### No technical language in user-facing copy
Error messages, labels, and empty states must use plain language. Never expose: `null`, `undefined`, `500`, `NaN`, `UUID`, SQL terms, or stack traces to the user.

### Charts are presentation-quality
Dashboard charts are reviewed by leadership and must be visually suitable for a board presentation. Axes must be labelled. Empty states must explain what to do next.

### Responsive floor
The app targets laptop (1280px+) and tablet (768px+). Screens narrower than 768px are out of scope.

---

## 9. Performance Targets

| Operation | Target |
|-----------|--------|
| CSV validation + preview render | < 5 s for ≤ 10,000 rows |
| Dashboard initial load (KPI cards visible) | < 2 s from page navigation |
| AI response (non-streaming) | < 15 s end-to-end |

---

## 10. Out of Scope

The following will not be built unless explicitly added to this document:

- CRM integrations (Salesforce, Blackbaud, Raiser's Edge, etc.)
- Multi-file dataset merging or diffing
- Automated donor segmentation or ML scoring
- Scheduled report generation
- Role-based permissions (admin vs. viewer)
- Predictive fundraising analytics
- Mobile (< 768px) layout optimisation
- Real-time collaborative editing
- Audit logging
- API key encryption at rest
- Redis-based rate limiting

---

## 11. Directory Contract

```
src/
├── app/(auth)/           # Unauthenticated pages only
├── app/(protected)/      # Authenticated pages — all require session
├── app/api/query/        # AI query endpoint — Node.js runtime, non-streaming
├── app/api/validate-ai/  # AI key validation endpoint — Node.js runtime, requires auth
├── context/              # React contexts — client-side only, no DB logic
├── lib/constants/        # Enums, design token refs
├── lib/data/             # Server-side data functions (Supabase queries + aggregation)
├── lib/supabase/         # Supabase client factories, Server Actions, DB types
├── mocks/types.ts        # Shared TypeScript interfaces — no static data
└── middleware.ts         # Auth guard only — no business logic

supabase/migrations/      # Append-only SQL migration files — run in filename order
docs/                     # Architecture reference
public/                   # Static assets only
```
