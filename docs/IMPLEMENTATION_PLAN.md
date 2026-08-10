# PM&R Atlas — Implementation Plan
*Every phase and cut below is justified against the seven questions.
Smallest functional MVP, long-term architecture intact.*

## The evaluation framework (applied throughout, not just stated once)
1. Time to author a new disease — reduce or increase?
2. Long-term maintenance burden — reduce or increase?
3. Consistency across hundreds of diseases — improve or reduce?
4. Single source of truth — preserved?
5. Resident learning experience — improved?
6. Truly necessary for MVP, or safely postponed?
7. Still makes sense at 500+ diseases, thousands of objects, millions of users?

## Scope decision made before any phase: no CMS/admin UI at MVP
Content is authored via structured seed scripts (direct inserts against
schema-v1.0.sql), not a visual editor. **Q1**: with one disease, a CMS
saves close to zero authoring time — there's nothing to compare it
against yet. **Q6**: clearly postponable — build it once there are
enough diseases (and possibly other authors) that hand-writing content
is the actual bottleneck, not before. Revisit this decision explicitly
around disease #10-15, not on a calendar date.

## Phase 0 — Foundation (infrastructure, not features)
- Repo setup, TypeScript/Next.js skeleton (per original stack decision)
- Postgres deployed, schema-v1.0.sql migrated (Knowledge Graph +
  Editorial Block System + Templates, all layers, since they don't
  conflict — deploying the whole frozen schema costs nothing extra)
- Design Tokens (Tier 1: DESIGN_SYSTEM.md) implemented as real CSS
  variables/Tailwind config — this is cheap and everything downstream
  depends on it existing correctly from day one (**Q3**: skipping this
  now means retrofitting consistency across every component later)
- Deploy pipeline, nothing else — **no auth, no billing** (§6B already
  deferred this correctly)

## Phase 1 — Plantar Fasciopathy reference build
**Sprint 1 — Component library in code**
Tier 2 components (Universal Knowledge Object Card, badges, buttons,
search) built as real, tested components before any block rendering —
blocks compose FROM these, so building blocks first would mean rebuilding
them once components exist properly (**Q2**: building in the wrong order
here is exactly what creates maintenance burden later).

**Sprint 2 — Block rendering engine, scoped to what's actually used**
Only the block types Plantar Fasciopathy's reference design actually
needs: `paragraph`, `section_heading`, `medical_illustration`,
`key_point`, `clinical_pearl`, `treatment_algorithm`,
`rehabilitation_progression`, `examination_workflow`, `reference_list`.
**Q6**: the other ~16 block types in the enum stay unbuilt until a real
disease needs them — the enum already has room, building renderers
speculatively would be exactly the complexity the new framework forbids.

**Sprint 3 — Seed content + assembly**
The actual Plantar Fasciopathy Knowledge Objects and Editorial Blocks,
written as a seed script using the vertical-slice content and the
reference mockups already designed this session as source material —
not new authoring, transcription of decisions already made. Assemble
Contents rail (left nav) + main content. **No right-rail Workspace panel
at MVP** — Personal Workspace is Phase 2 architecturally; showing an
empty or stubbed panel would violate the Tier 3 "no dead UI" rule as
much as a grayed-out nav tab would (**Q6** again).

**Sprint 4 — Editorial review, walked for real, then launch**
Walk the actual Editorial Lifecycle (§7A) on this one disease — Draft →
Scientific Review → Visual Asset Production → Editorial Review →
Published — with the founder as sole reviewer. This validates the
lifecycle isn't just a diagram before it's ever asked to scale to a
second reviewer. Soft launch: public, free, no paywall (§6B).

## Phase 2+ — sequence unchanged from spec §11 roadmap
Visual Atlas → Personal Workspace → Guideline Tracker → Curriculum →
Clinical Cases → AI Assistant → Board Review/Quiz. Not re-derived here;
this plan governs Phase 0-1 execution specifically. One open item
inherited, not resolved by this plan: Quiz's MVP-vs-later status (spec
§6A) still needs a real answer before Phase 2 planning gets specific.

## Explicitly NOT built yet, with reasoning
- **Visual block editor** — Q1 fails at low disease count; Q6 clearly postponable
- **Billing/subscription infra** — already deferred, §6B
- **AI Assistant** — Q6, Phase 6; also carries real accuracy/liability weight not to rush (spec §2.6)
- **Native mobile app** — Q6; responsive web serves the context-first decision (§7) fine at this scale
- **Interactive Anatomy/3D atlas** — Q6, Q1; major build, deferred since the original Visual Atlas scoping decision
- **Data export tooling** — Q6; architecturally kept feasible (§2.3), not built

## Success criteria for Phase 1 (ties to spec §12)
Residents return to the Plantar Fasciopathy page without prompting;
time-to-answer beats status quo; the page is described as trustworthy,
not just polished. If these don't hold for one disease, building nine
more of them faster (via templates, Phase 2A) doesn't fix the real
problem — it scales it.
