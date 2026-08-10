@AGENTS.md

# PM&R Atlas

A medical knowledge platform for PM&R residents — not a CMS, a graph of
reusable Knowledge Objects (Disease, Examination Maneuver, Treatment
Algorithm, etc.) connected by typed relationships that carry their own
evidence, rendered into pages by a separate Editorial Block layer.

**Read these two files first, in this order:**
1. `docs/product-spec-v1.md` — the mission, the core architectural
   principle (§2, "Two Knowledge Graphs, One Platform" — permanent,
   overrides everything else if anything conflicts with it), and the
   full roadmap.
2. `LESSONS_LEARNED.md` — the actual running history of what's been
   built, why, and every real friction point hit along the way, in the
   order it happened. This is the single richest source of "why does
   the code look like this" — read it before assuming something is a
   bug rather than a deliberate, already-litigated decision.

Then `docs/DATABASE_GUIDE.md`, `docs/DESIGN_SYSTEM*.md`, and
`docs/IMPLEMENTATION_PLAN.md` for the design system tiers and the
phased build plan.

## Current state (as of this file's last update)

- **Stack**: Next.js (App Router) + TypeScript + Tailwind v4 + Postgres,
  running locally. `db/migrations/*.sql` is the *actual current* schema
  — `docs/schema-v1.0-original.sql` is the frozen v1.0 design doc for
  historical reference; migrations 0002-0005 extended it since (auth,
  disease slug, imaging_findings block, self_check block).
- **No CMS**: content is authored via structured Node seed scripts in
  `db/seed/`, not a visual editor — deliberate, see
  `docs/IMPLEMENTATION_PLAN.md`.
- **5 diseases seeded and verified**, across 4 Editorial Templates:
  Plantar Fasciopathy + Achilles Tendinopathy (Tendinopathy Template),
  Bell's Palsy (Cranial Neuropathy Template), Carpal Tunnel Syndrome
  (Peripheral Nerve Entrapment Template), Knee Osteoarthritis
  (Osteoarthritis Template). Live at `/conditions/<slug>`. The first
  four (all but Carpal Tunnel Syndrome) also have the full editorial-
  rhythm treatment from `LESSONS_LEARNED.md` #19-24 — illustrations,
  icon cards, comparison tables, self-checks; CTS doesn't yet, by
  scope choice, not oversight.
- **Auth**: Auth.js v5, Postgres adapter, Credentials provider, role
  column (`member`/`editor`/`admin`). `/login`, `/account` (change
  password), and `/admin` (role-gated review queue) are live. No
  signup UI — bootstrap accounts with
  `node scripts/create-user.mjs <email> <password> [role]` — that's a
  deliberate deferral, not a gap; see `LESSONS_LEARNED.md` #26.
- **Review/publish workflow**: `disease.status` actually gates
  visibility — only `published` diseases are visible to signed-out
  visitors and members (`/conditions/[slug]`, `/conditions`, and the
  homepage all gate on it); editors/admins see any status. A simple
  draft/published toggle, not the schema's full 5-stage lifecycle (see
  `LESSONS_LEARNED.md` #25 for why that scope was chosen deliberately).
- **Application shell**: a real header/nav (`src/components/shell/`),
  homepage, `/conditions` browse page, a command-palette search
  (Cmd/Ctrl+K, `/api/search`), and `not-found.tsx`/`error.tsx`/
  `loading.tsx` all exist now — implementing
  `docs/DESIGN_SYSTEM_TIER3_BEHAVIOR.md`, which had specified this
  before any page assembly began but hadn't been built. See
  `LESSONS_LEARNED.md` #26 for what was deliberately left out
  (register/signup UI, Personal Workspace — a separate scoping
  conversation, not forgotten) and why.
- **Content status discipline**: everything is seeded as `status:
  'draft'`, never `'published'`, no fabricated `reviewed_by` — an AI
  author is not a substitute for the platform's own Scientific Review
  stage. Numeric evidence claims (sensitivity/specificity) are left
  `null` with an honest note wherever confidence in the exact figure
  isn't real, rather than invented.
- **Deliberately deferred, not forgotten**: `warning_pitfall` block
  type, structured Electrodiagnostic/Outcome Measure objects, the
  commissioned-Infographic pipeline, Quiz/Flashcards. Each has a named
  trigger condition for revisiting in `LESSONS_LEARNED.md` — check
  there before building any of them.

## Running the app

```
npm run dev      # or use the Claude Code preview tool with the "pmr-atlas-dev" launch config
npm run build
npm run lint
```

Postgres runs locally (`pmr_atlas` database, see `.env.local` for the
connection string — not committed). To re-seed a disease after editing
its script: `node db/seed/<disease-name>.mjs` (idempotent — safe to
re-run).

## Working conventions established in this project

- Verify every UI change in an actual browser (light + dark, mobile
  width where layout is involved) before calling it done — this
  project has a working dev-server preview flow, use it.
- New block types / schema changes: check `LESSONS_LEARNED.md` for
  whether something similar was already deferred on purpose before
  building it.
- New Editorial Templates or diseases: read at least one existing
  seed script in `db/seed/` first (e.g. `plantar-fasciopathy.mjs`) —
  the pattern (`findOrCreate`, `upsertRelationship`, `replaceBlocks`,
  `instantiateTemplate` from `db/seed/lib/toolkit.mjs`) is established
  and should be followed, not reinvented.
