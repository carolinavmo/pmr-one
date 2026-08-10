# PM&R Atlas — Product Specification v0.3
*Living document. Revise as we design. Core principles (§2) are permanent
and govern every decision below — database design, content architecture,
AI, UX, and feature development. If a future decision conflicts with §2,
the decision is wrong, not the principle.*

## 1. Mission
To become the daily workspace for every PM&R resident and physiatrist.

## 2. Core Architectural Principle — Two Knowledge Graphs, One Platform
PM&R Atlas is not a document platform or a CMS. It is a **Medical Knowledge
Platform** composed of two independent, connected knowledge systems.

### 2.1 Editorial Knowledge Graph (owned by PM&R Atlas)
The scientific source of truth — evidence-based, peer-reviewed, maintained
exclusively by the editorial team. Composed of reusable **knowledge
objects**, each existing exactly once and referenced everywhere relevant:
Disease, Anatomy Structure, Examination Maneuver, Imaging Finding,
Differential Diagnosis, Treatment Algorithm, Rehabilitation Protocol,
Exercise, Clinical Pearl, Guideline Recommendation, Reference, Medical
Illustration.
(Video, Clinical Case, Quiz Question, Flashcard reclassified as **Learning
Objects**, not Knowledge Objects — see §2.6.)

Disease pages are not documents — they are one way of rendering
relationships between knowledge objects. The same objects power every
**lens**: Disease Pages, Visual Atlas, Board Review, Clinical Cases, AI
Assistant, Search, and future experiences.

### 2.2 Personal Knowledge Graph (owned by the user)
Not a notes feature — the resident's or physician's own **"PM&R Brain."**
Completely independent from the editorial graph; grows throughout residency
and stays valuable in clinical practice. Composed of: Personal Notes,
Treatment Protocols, Collections, Bookmarks, Uploaded PDFs, Reading Lists,
Saved Illustrations, Saved Algorithms, Personal Clinical Pearls, Flashcards,
AI Conversations, Learning Progress, Recently Viewed, Custom Tags.

(End-state vision — object types are built incrementally, each arriving
with the lens that owns it; e.g. Flashcards ship with the Quiz lens, AI
Conversations with the AI Assistant lens. See roadmap, §12.)

### 2.3 Relationship Between the Graphs
- The two graphs intersect but never replace one another.
- Personal Graph objects **reference** Editorial Graph objects by ID — they
  never copy them. If an editorial object is revised, every personal
  reference stays current automatically.
- A Personal Protocol may mix references to editorial Treatment Algorithms
  with the user's own original text (hybrid composability).
- User content must never modify editorial knowledge. Users must never lose
  their work because editorial content changes.
- **Disease Pages stay editorial-only** — clean, evidence-based, no
  annotation surface. They expose only lightweight entry points into the
  Personal Graph: Add Note, Save, Bookmark, Add to Protocol, Add to
  Collection. Actual management of personal knowledge happens inside the
  dedicated Personal Workspace lens.
- **Data portability:** export not built at MVP (deliberately deferred),
  but treated as a quiet constraint from day one — Personal Graph objects
  are stored as structured, standard data, not a proprietary blob, so
  export stays a small feature to add later, not a re-architecture.

### 2.4 Why This Matters Strategically
This split resolves the resident-vs-attending tension raised early in this
project: the Disease Page stays resident/exam-oriented, while the Personal
Graph is what a practicing physiatrist keeps using for years after
training — the platform follows the user through their career instead of
being outgrown.

### 2.5 Relationships Are First-Class Citizens
A relationship between two objects is not a bare link — it carries its own
metadata, because clinical meaning often lives in the relationship, not
either endpoint alone. Example: *Examination Maneuver → confirms → Disease*
carries sensitivity, specificity, evidence strength, confidence, and its
own reference — because the same maneuver has different diagnostic value
against different diseases (Tinel's sign means something different for
carpal tunnel vs. tarsal tunnel). Similarly, *Treatment Algorithm → treats
→ Disease* carries first-line/second-line status, recommendation strength,
guideline source, and patient subgroup.
Practical implication: this metadata belongs on the relationship, not on
either object's own attributes — modeling it on the object would force a
false single answer where a nuanced, context-dependent one exists. In
relational terms this is a join table with real columns, not a bare
many-to-many link — standard modeling, not added architectural risk.
Sequencing: fully modeled now for MVP-relevant relationships (*confirms*,
*treats*, *cites*); other relationship types get metadata added when the
objects they connect are modeled.

### 2.6 Knowledge Objects vs. Learning Objects
**Knowledge Objects** represent scientific knowledge (Disease, Examination
Maneuver, Treatment Algorithm, Medical Illustration, Clinical Pearl,
Reference, etc. — the Editorial Graph, §2.1).
**Learning Objects** represent educational experiences built from that
knowledge, and never become a source of truth themselves. Two distinct
subtypes, because they behave very differently:
- **Derived Learning Objects** — computed/rendered at query time directly
  from Knowledge Objects and Relationships, no independent storage or
  lifecycle, always current by construction. Examples: Quiz, Flashcard,
  Board Question.
- **Produced Learning Objects** — authored media that references and must
  stay accurate to Knowledge Objects, but is itself a distinct artifact
  requiring its own production pipeline, storage, and review (similar in
  shape to §7A, but for content production rather than scientific review).
  Examples: Video Lesson, Podcast Episode, Infographic, Patient Leaflet,
  Clinical Case.
Every clinical claim inside a Produced Learning Object must still trace
back to a Knowledge Object for evidence-linking — the production pipeline
doesn't exempt it from the trust standard, it just means the content
itself isn't computed.

## 3. V1 Positioning Statement
A fast, expert-curated MSK exam and injection reference for PM&R residents —
trustworthy enough to replace asking the senior resident, faster than
Googling, designed to be checked mid-rotation in five seconds, one thumb.
*(Positioning for the flagship Disease Page lens specifically — see §11 for
full lens roadmap.)*

## 4. Primary User (v1)
**Who:** PM&R resident, PGY-1 through boards.
**Not yet designed for (deliberately deferred):** practicing physiatrists,
program directors, med students — served later primarily via the Personal
Graph (§2.4), not the v1 Disease Page.

## 5. The Core Job-to-be-Done
"When I'm mid-rotation and need to confirm an exam maneuver, injection
landmark, or reference value, I want a fast, trustworthy answer — so I look
competent and safe in front of my attending and patient."

Emotional core: **confidence.** Not "I consumed content" — "I will get this
right."

## 6. V1 Scope
### In scope
- Disease Page lens only, flagship condition = plantar fasciopathy
- MSK/musculoskeletal focus, deep coverage over breadth
- Curated, authored content (not user-generated at launch)
- Mobile-first responsive web app (single codebase, no native app yet)
- Disease Page components, priority order: evidence-based content, clinical
  examination, treatment algorithms, clinical pearls, references
  (lightweight), visual atlas content (scoped down — well-chosen images,
  not a full interactive atlas)

### Explicitly out of scope for v1 (later phases)
- Personal Workspace / Personal Graph (Phase 2)
- Visual Atlas as a standalone lens (Phase 1)
- Quiz / spaced repetition / flashcards (Phase 7)
- AI Assistant (Phase 6)
- Clinical Cases (Phase 5)
- Curriculum / Rotation Path (Phase 4)
- Guideline & Evidence Tracker as standalone lens (Phase 3)
- Community features
- Other PM&R subspecialties (EMG, neuro rehab, peds, sports, pain, etc.)
- Native mobile app

*Rationale: multiple genuinely hard subsystems cannot be built well
simultaneously by one person. Prove the flagship Disease Page earns the
daily habit before expanding to other lenses.*

## 6A. Disease Page — Confirmed Section Order
Overview · Definition · Anatomy · Epidemiology · Clinical Pearls · Risk
Factors · Exam · Imaging · Treatment · Rehab · References · Quiz (status
below).

Mapping to the object model:
- Overview, Definition, Epidemiology → structured content fields directly
  on Disease itself (not separate reusable objects — unlike a maneuver or
  algorithm, these aren't naturally reused by other diseases; making them
  their own type would add indirection with no reuse payoff)
- Anatomy, Clinical Pearls, Exam, Treatment, References → already modeled
  (§11A) — Anatomy Structure, Clinical Pearl, Examination Maneuver,
  Treatment Algorithm, Reference
- **Risk Factors** → newly promoted to a full reusable object (not a
  Disease field) — a risk factor like "obesity" is cited across many
  diseases with its own evidence (odds ratio, relative risk), same pattern
  as Examination Maneuver's *confirms* relationship. New relationship type:
  *increases risk of* → Disease, carrying evidence metadata (§2.5 pattern).
- **Imaging** → maps to **Imaging Finding**, named in the original object
  catalog, not yet modeled in detail. Confirmed in-scope for MVP now.
- **Rehab** → maps to **Rehabilitation Protocol** and **Exercise**, named
  early, not yet modeled. Confirmed in-scope for MVP now.
- **Quiz** → **STATUS: UNRESOLVED.** Conflicts with the Phase 7 sequencing
  decision (Quiz ranked lowest in two independent prioritization exercises).
  Not yet clear whether this is the eventual full-page layout (Quiz arrives
  later) or a pull-forward into MVP. Explicitly deferred — revisit before
  finalizing MVP scope, don't let it default silently into either answer.

**Schema implication**: Risk Factor, Imaging Finding, Rehabilitation
Protocol, and Exercise still need the same domain-modeling pass (Purpose,
Owner, Identity, Metadata, Relationships, Reusability, UI Representations)
that Disease/Maneuver/Algorithm/Pearl/Reference/Illustration already got,
before schema-v0.1.sql can be considered complete for MVP. Currently the
schema only covers a subset of what this confirmed page layout needs.

## 6B. Business Model
**Model**: Individual resident/physiatrist subscription (Amboss-like),
following the person through career (consistent with §2.4 — the Personal
Graph is what retains attendings post-training).
**Early phase**: Free access during build-out. Paywall introduced once a
meaningful content library exists — **exact threshold not yet defined,
open item, revisit as content grows** (e.g. full MSK coverage? a certain
number of Disease Pages? not decided).
**MVP technical implication**: no billing/subscription infrastructure
needed at launch — real scope reduction, not just a pricing deferral.

## 7. Platform Decision — RESOLVED: Context-First
Not mobile-first or desktop-first. **Context-first**: the underlying
Knowledge Graph is identical regardless of device; only the presentation
layer adapts to the user's context.
- **Mobile context**: clinical work, rapid lookup, decision support —
  optimized for "fastest trustworthy answer, one thumb, five seconds" (§10).
- **Desktop context**: dedicated study sessions, board prep, personal
  knowledge management (Personal Workspace, Phase 2) — optimized for depth
  and reading.
Implementation implication (not a v1 commitment, just a design constraint):
UI/rendering layer must be able to query the same graph and produce
different layouts per context, rather than maintaining separate content.

## 7A. Cross-Cutting Framework: Knowledge Object Lifecycle
**Editorial Lifecycle** (all Editorial Graph objects):
`Draft → Scientific Review → Visual Asset Production* → Editorial Review → Published → Updated → Archived`
(*optional stage, skipped where no visual component applies)
- Draft: authoring, not visible to users
- Scientific Review: subject-matter accuracy check against evidence
- Visual Asset Production: illustration/video attached where applicable
- Editorial Review: consistency, tone, structure check
- Published: live, current version shown by default
- Updated: revision creates a new version; full pipeline re-run only for
  substantive changes (policy TBD, not urgent)
- Archived: retired, retained for audit/trust, not surfaced as current

**Personal Lifecycle** (all Personal Graph objects) — minimal, no
editorial gatekeeping:
`Created → Edited → Archived/Deleted`

**Versioning principle**: Editorial objects retain prior published versions
for audit/trust. Personal objects don't require formal versioning at MVP.

## 7B. Cross-Cutting Framework: Domain Events
Naming the event vocabulary now as a domain concept — NOT a commitment to
event-sourcing as the storage architecture; that implementation choice is
deferred to schema/infra design.
- **Editorial events**: Created, Submitted for Review, Reviewed,
  Approved/Rejected, Published, Updated, Archived
- **Cross-graph usage events** (any user, any object): Viewed/Rendered,
  Referenced (by object or AI), Searched, Explained by AI
- **Personal events**: Personal Object Created, Knowledge Object Saved,
  Added to Protocol/Collection, Personal Object Edited, Archived/Deleted

Purpose: audit/trust, future analytics (usage-driven roadmap prioritization
instead of founder-ranked only), AI context grounding, future notifications.

## 7C. Cross-Cutting Framework: Search & AI Retrieval Principles
- Every Editorial object declares its searchable fields (name, aliases,
  tags, body content) rather than each object defining its own search
  behavior from scratch.
- Search surfaces both graphs together for a user's own experience
  (editorial content + their own notes on the same topic), but Personal
  Graph content is never visible in another user's search — hard boundary.
- AI grounds itself in the traversable relationships of the object(s) in
  view (established with the Disease object, §Object Model), not general
  model knowledge. Full depth deferred to Phase 6.

## 8. Content Taxonomy — MSK v1 (draft, to refine)
- Exam maneuvers (by joint/region: shoulder, elbow, wrist/hand, hip,
  knee, ankle/foot, spine)
- Special tests (per maneuver: name, technique, positive finding, visual;
  sensitivity/specificity lives on the maneuver-to-disease relationship,
  §2.5, not on the maneuver itself)
- Injection landmarks (per procedure: indication, anatomy, technique,
  needle approach, pitfalls, visual)
- Reference values / classification systems relevant to MSK (as needed)

## 9. Information Architecture (draft — next to design in detail)
- Entry point: fast search/lookup (primary), browse-by-region (secondary)
- Each entry: single-screen answer first, expand for depth
- No forced linear curriculum — this is a reference, not a course

## 10. Design Principle
**"The fastest trustworthy answer, one thumb, five seconds."**
Every screen gets evaluated against this before anything else.

## 11. Lenses & Roadmap
A lens is a query + layout over the knowledge graph (§2) — never a separate
feature, app, or content owner.

| Phase | Lens | Job-to-be-done |
|---|---|---|
| 0 (MVP) | **Disease Page** | Teach/remind everything about this condition, integrated |
| 1 | Visual Atlas | Browse by anatomy/structure, not by disease |
| 2 | Personal Workspace | The user's own PM&R Brain — protocols, notes, saved content (§2.2) |
| 3 | Guideline & Evidence Tracker | What's changed / current, as its own feed + trust signal everywhere |
| 4 | Curriculum / Rotation Path | What to learn, in what order, for my stage of training |
| 5 | Clinical Cases | Walk through a real patient, make decisions |
| 6 | AI Assistant | Answer my question, grounded in platform content, scoped to what I'm viewing |
| 7 | Board Review / Quiz | Test whether I actually know this |

Note: Quiz and AI Assistant ranked lowest in two independent prioritization
exercises — a deliberate signal that this product's identity is "trusted
reference + personal knowledge space" first, not a testing tool or chatbot.

## 11A. Knowledge Object Model (domain-driven, pre-schema)
Template: Purpose, Owner, Canonical Identity, Required Metadata,
Relationships, Reusability, UI Representations, Notable Exceptions.
Lifecycle/Versioning/Search/AI-retrieval follow §7A–§7C unless noted.

### Disease
Central, highest-connectivity object; anchors nearly everything else.
Owner: Editorial. Identity: stable ID independent of name (terminology
shifts, e.g. "fasciitis"→"fasciopathy"), canonical name + alias list
(incl. ICD-10). Relationships are typed, not generic: *has* Examination
Maneuvers/Treatment Algorithms/Rehab Protocols/Exercises/Clinical Pearls
(compositional); *cites* References/Guidelines; *illustrated by*
Illustrations/Videos; *differential of* other Diseases (associative,
bidirectional); *located at* Anatomy Structures. Reused by: everything
that needs to say "this is about X disease" (Cases, Quiz, Curriculum).
Renders in: Disease Page (primary), Visual Atlas, Curriculum, Clinical
Cases, AI Assistant, Board Review.

### Examination Maneuver
Owner: Editorial. Identity: canonical name + aliases (eponyms vary
regionally). Metadata: technique, positive/negative finding definition,
body region. **Sensitivity/specificity/diagnostic value moved to the
*confirms* relationship (§2.5), not object metadata** — they're not
intrinsic to the maneuver, they depend on which disease it's being tested
against. Relationships: *confirms/rules out* Disease (many-to-many, each
edge carrying its own sensitivity/specificity/evidence strength/reference),
*performed on* Anatomy Structure, *illustrated by* Illustration/Video. High
reuse (same maneuver, many diseases). Renders in: Disease Page, Visual
Atlas (Ph.1), Clinical Cases (Ph.5), Board Review (Ph.7).

### Treatment Algorithm
Owner: Editorial. Identity: versioned name (shifts with guidelines).
Metadata: decision steps/branches (internal structure), severity/stage
tags. **First-line/second-line status, recommendation strength, guideline
source, patient subgroup moved to the *treats* relationship (§2.5)** — a
disease can have multiple algorithms (e.g. conservative vs. surgical), and
the relationship states which is first-line, not the algorithm itself.
Relationships: *treats* Disease (edge carries line-of-therapy metadata);
steps reference Rehab Protocol/Exercise/Procedure/Guideline; *cites*
Reference. Medium reuse (sub-steps shared across algorithms). Renders in:
Disease Page (interactive step-through), Personal Workspace (Ph.2),
Clinical Cases (Ph.5). **Exception**: internal branching structure is
materially more complex than flat content — real schema-design challenge,
deferred.

### Clinical Pearl
Owner: Editorial **and separately Personal** (two distinct object types,
not one type with an owner flag — their lifecycles are categorically
different, collapsing them would reintroduce CMS-style muddling). Identity:
short body text, optional attribution. Metadata: evidence level (lower
tier than Disease/Algorithm content, visually signaled per §7C).
Relationships: *attached to* Disease/Maneuver/Algorithm/Procedure —
attachments, not standalone destinations. Medium-high reuse. Renders in:
Disease Page (callout), Board Review (Ph.7), AI Assistant (Ph.6).

### Reference
Owner: Editorial. Identity: canonical citation (authors/title/journal/
year/DOI or PMID) — needs real dedup logic. Metadata: link/DOI, evidence
level (RCT/meta-analysis/case series/expert opinion), publication date
(feeds trust signal, §7C). Relationships: *cited by* nearly every
Editorial object — high fan-in, mirrors Disease's high fan-out. Very high
reuse. Renders in: Disease Page, Guideline & Evidence Tracker (Ph.3,
primary render), AI Assistant (Ph.6). **Exception**: copyright boundary —
citation metadata and links only, never source text itself.

### Medical Illustration
Owner: Editorial. Identity: associated Anatomy Structure(s)/region.
Metadata: asset reference, alt-text (accessibility + AI groundability),
style tag. Relationships: *depicts* Anatomy Structure, *illustrates*
Maneuver/Algorithm step/Procedure. Very high reuse. Renders in: Disease
Page (embedded), Visual Atlas (Ph.1, primary render), AI Assistant (Ph.6).
**Exception**: first object with real storage/CDN + context-dependent
resolution needs (§7). Also surfaces an open question: Personal Graph's
"Uploaded PDFs"/"Saved Illustrations" — a saved illustration is a
reference to this object, but an uploaded one implies a distinct
"Personal Visual Asset" type. Deferred to Phase 2 design.

### Not yet modeled (remaining Editorial objects — light pass only,
deferred to their owning phase): Anatomy Structure, Differential
Diagnosis (may resolve into Disease's *differential of* relationship
rather than needing its own type — TBD), Imaging Finding, Rehabilitation
Protocol, Exercise, Guideline Recommendation, Video, Clinical Case (Ph.5),
Quiz Question (Ph.7), Flashcard (Ph.7). Personal Graph objects beyond
Personal Clinical Pearl: deferred to Phase 2 detailed design.

## 12. Success Criteria for V1 (draft — to refine together)
- Residents return without being prompted (organic daily/weekly opens)
- Time-to-answer for a known lookup is faster than status quo
  (asking a colleague / searching generally)
- Qualitative: residents describe it as "trustworthy," not just "nice"

## 15. Editorial Block System (first-class architectural concept)
**Knowledge Objects are the data. Editorial Blocks are the presentation.**
A Disease Page is not a fixed template — it's an ordered sequence of
Editorial Blocks, composed per disease to match how that specific
condition is best taught. Plantar fasciopathy can lean on biomechanics
and illustration; stroke can lean on timelines and clinical photographs;
facial palsy can lean on grading scales and video — without forcing
every disease into identical section slots.

**Mechanism**: an Editorial Block either (a) embeds an existing
Knowledge Object via the same polymorphic reference pattern already used
for pearl_attachment/citation/illustration_usage (§2.5) — the object
stays singular in the graph, only its size/context in `display_config`
changes — or (b) carries pure authored narrative content (paragraph,
key point, timeline) with no object behind it. This is what preserves
single-source-of-truth while allowing full editorial freedom: Windlass
Test is one row in `examination_maneuver`, reused as a large illustration
in a Biomechanics block, a small icon in an Exam block, and an image in
a Board Question block — never duplicated.

**Simplification adopted**: Clinical Photograph, Ultrasound Gallery, MRI
Gallery, and Procedure Video are NOT new Knowledge Object types — they
reuse Medical Illustration with an expanded `style` tag, avoiding graph
fragmentation. Interactive Anatomy and Interactive Illustration remain
named but deliberately unbuilt — same deferred scope as the original
Visual Atlas decision (§6, "not a full interactive atlas").

**Consistency preserved deliberately**: blocks compose FROM Tier 2
components (Cards, badges) rather than inventing new styling per block —
this is what stops "editorial freedom" from eroding "one object, one
look, everywhere."

**Production cost, named honestly**: a fully free-form system requires
bespoke composition per disease, made by one person. A visual block
editor (a real engineering project — effectively a small Notion) is
deliberately deferred; early diseases get hand-authored block sequences
as structured data, same "don't build infrastructure before it's proven
necessary" discipline as the billing decision (§6B).

**Retroactive mapping**: the reference-page work already done isn't
wasted — it maps directly onto block types. The Exam workflow widget =
an `examination_workflow`-shaped composition of Exam Cards; the Treatment
roadmap = the `treatment_algorithm` block type; "Key Point" callouts =
the `key_point` block type. Plantar Fasciopathy's specific block sequence
becomes the first real disease composition, not the universal template.

**Schema**: see schema-v1.0.sql, "Editorial Block System" — additive
layer, does not modify the frozen Knowledge Graph.

## 15A. Editorial Templates & Block Configuration
**Templates** (Tendinopathy, Peripheral Nerve Injury, Stroke, Spinal Cord
Injury, Osteoarthritis, etc.) provide a starting block sequence for a
disease family — consistency across similar diseases without restricting
customization. **Copy semantics, deliberately**: instantiating a disease
from a template duplicates its block structure; there is no ongoing link
afterward. Editing a disease never touches the template; editing a
template never retroactively changes existing diseases. This is what
keeps templates genuinely non-restrictive rather than a hidden
constraint. No formal "disease family" taxonomy is modeled — template
selection is a human authoring choice, not a stored relationship
(avoiding scope creep for something that doesn't need to be queryable).

**Block configuration, split into two concerns**:
- `display_config` — purely visual/presentation (width, alignment,
  whether animation is enabled)
- `content_config` — structured content variants specific to the block
  type (summary text, callout text, learning objective, caption,
  highlighted-annotation labels)

Example contracts (application-layer validated per block_type, same
trade-off already accepted for polymorphic tables, §2.5):

**Illustration block** — `referenced_object_id` → Medical Illustration;
`display_config: {width, alignment, animated: bool}`; `content_config:
{caption, annotations: [{label, x, y}]}`. The "Watch animation" affordance
from the founder's biomechanics reference maps directly to
`animated: true` plus a multi-frame Medical Illustration sequence — a
bounded, config-driven step-through, not a full interactive 3D model
(that remains the deferred Visual Atlas scope, §6).

**Paragraph block** — no referenced object; `content_config: {body,
summary, callout: bool, learning_objective}`; `display_config:
{expandable: bool}`.

Example: **Tendinopathy Template** starting sequence — Overview →
Biomechanics (illustration-heavy) → Contributing Factors → Exam workflow
→ Treatment roadmap → Rehab progression → Worth Knowing. Plantar
Fasciopathy's actual composition (built this session) is this template
instantiated once, then freely customized — not a special case.

## Schema — FROZEN at v1.0
See `schema-v1.0.sql` (supersedes schema-v0.1.sql). Validated via a full
vertical slice (`vertical-slice-plantar-fasciopathy.md`), then refined
with a formal relationship taxonomy, typed maneuver-disease relationships,
Risk Factor, and Procedure as first-class objects. Domain modeling pauses
here by design — next phase is the rendering/UX layer.

## Open Questions / Next Design Steps
1. ~~Platform decision~~ — RESOLVED, context-first (§7)
2. ~~First-pass schema~~ — RESOLVED, see schema-v0.1.sql
3. Resolve whether Differential Diagnosis needs its own object type or is
   just Disease's *differential of* relationship (§11A)
4. Design the actual disease-page layout for plantar fasciopathy (wireframe level)
5. Decide business model & pricing approach (not yet discussed)
6. Decide how trustworthiness/evidence freshness is signaled in the UI
   (sourcing, review process, last-reviewed date)
7. Application-layer integrity strategy for polymorphic tables (validation
   approach, e.g. ORM-level checks vs. periodic consistency audits) — not
   urgent, but shouldn't be forgotten given the DB won't catch it
