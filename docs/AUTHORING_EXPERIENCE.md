# PM&R Atlas — Author Experience

*Sits alongside `VISUAL_IDENTITY.md`. That document defines what a
reader sees; this one defines what an editor does. Written against the
seven-question framework in `IMPLEMENTATION_PLAN.md`, which explicitly
scoped a visual editor out of MVP with an explicit trigger to revisit:
disease #10-15. We're at 5. This document doesn't override that
trigger — it answers the founder's direct request to design the
experience now, with the timing question named explicitly rather than
assumed (see "Open questions" at the end).*

## The core bet, and the risk that comes with it

The pitch — Notion's inline editing, Figma's direct manipulation,
Webflow's edit-the-real-page philosophy, Apple's restraint — describes
a *feeling*. It does not, by itself, describe how to keep an author
from quietly flattening the thing that makes this product's content
different from Amboss or Kenhub: the typed Knowledge Graph. Every
design decision below answers one question first — **does this keep
the structured path at least as easy as the prose path?** — before
asking whether it feels good.

## The one architectural insight everything else follows from

The Editorial Block model already has the split this editor needs.
**Prose blocks** (`section_heading`, `paragraph`, `key_point`, a
pearl's `body`) carry no independent identity — they're just text
authored in place. **Object blocks** (`examination_workflow`,
`imaging_findings`, `treatment_algorithm`, `medical_illustration`, a
pearl's underlying `clinical_pearl_editorial` row) reference a real
Knowledge Object that may be shared across diseases — `Obesity` is
one row shared by four diseases across three families, proven this
session, not theoretical. These two kinds of content should not share
one editing metaphor. Prose gets full inline Notion-style editing.
Objects get a side panel. Conflating them is the single most likely
way this project quietly becomes a form-filling CMS despite every
intention not to.

## The editor is the page, not a page about the page

An editor/admin viewing a published disease page (the actual route,
`/conditions/[slug]`, not a separate `/edit/[slug]`) sees an **Edit**
toggle. Off, it renders exactly as a reader sees it — this is already
true today for drafts, extending it to an edit affordance is additive,
not a new rendering path. On, every block grows a thin, quiet edit
affordance on hover — never visible at rest, so a screenshot of the
page mid-edit still looks like the calm reading experience underneath,
per Apple's restraint and this project's own "recognition before
reading" principle. This is the literal fulfillment of "editing the
real page, not a separate admin" — reusing `BlockRenderer`,
`BlockSequence`, and `DiseaseSnapshot` exactly as built, with edit
affordances layered on, not a parallel builder screen maintained
separately.

## Prose blocks — inline, Notion-register

Click a paragraph, heading, key point, or pearl body: a cursor
appears, you type, a minimal selection toolbar offers only what Tier 1
typography already allows (bold, link — no third weight, matching
"two weights only" already established). Saves on blur via a server
action writing straight to `editorial_block.content_config`. No modal,
no side panel, no "are you sure" — text is cheap to fix, and Tier 1
principle #7 ("calm over complete") already says default to the
lighter interaction when in doubt.

## Object blocks — a side panel, and it says so out loud

Click an exam maneuver, imaging finding, risk factor, or illustration:
a right-side drawer opens — the same visual real estate
`WorkspacePanel` already claims for readers, now doing an author's
job instead. It shows, unmissably: **which real object this is**, and
**how many other diseases already reference it** ("Obesity — used on
4 diseases"). Editing a shared object's own fields (technique,
positive finding, description) edits it everywhere it's used, and the
panel says so before the edit lands, not after. This single line of
UI is the entire defense of Q3/Q4 — it's the only thing standing
between "reuse" and "someone silently breaks four other disease pages
while editing one."

**Relationship type is a visible control, not a hidden field.** The
same five-glyph grammar built for readers this session (`Confirms
diagnosis` ✓ teal, `Rules out` ⊘ warning, `Contributing factor` △
amber) becomes the actual selector control here — an author picks a
glyph, not an enum value they've never seen. One visual system, used
on both sides of the page. No graph leakage extends naturally to the
author surface: nobody needs to know `assesses_contributing_factor`
exists as a string.

## Adding a block — reuse-first, by construction

The "+" between blocks (or at the end of a section) opens a
**searchable, grouped command palette** — deliberately not a generic
CMS component tray ("add text," "add image," "add gallery"). Every
entry in the palette *is* a real Editorial Block type. This is the
single most important promise the picker makes: the author isn't
picking a layout primitive, they're picking a piece of the actual
content model. Groups, roughly matching the shape of the content
model itself:

- **Text** — Paragraph, Key Point, Clinical Pearl, Learning Objective,
  Warning / Pitfall
- **Visual** — Medical Illustration, Comparison Table, Timeline,
  Infographic
- **Clinical** — Examination Workflow, Treatment Algorithm,
  Rehabilitation Progression, Diagnostic Imaging, Outcome Measures
- **Knowledge Objects** — Risk Factors, Anatomy, Differential
  Diagnosis, Complications, Procedures, References
- **Layout** — Card Grid, Large Cards, Small Cards

"Knowledge Objects" as a *group label the author sees* is a deliberate
exception to "no graph leakage" (Tier 1, principle #6). That principle
protects readers, who never need to know the model exists. Authors are
the opposite case: understanding that some blocks own their words and
some blocks point at a shared, structured object *is the whole value
proposition* of this editor over a generic CMS. Naming it once, in the
one surface built for people who need to know it, doesn't leak
anything — hiding it here would be the actual mistake.

### Search-first, grouped as the browse fallback, suggestions on top

At 8 block types a flat list works. At the ~25 named above, and
especially at the 30-40 this is explicitly meant to scale to, a flat
list stops working long before a *grouped* list does — but grouping
alone still asks an author to know which group their answer is in.
The resolution (Notion's `/`-menu and Linear's Cmd-K both converge on
this for the same reason): **typing is the primary path, browsing by
group is the fallback, and a short "Suggested" row sits above both
when context makes a confident guess.** Concretely:

1. Open state: a search input, focused, plus the full group structure
   below it, collapsed to just group headers + top 2-3 items each so
   the whole picker is scannable without scrolling.
2. Typing filters everything, flattening groups into a single ranked
   list — fuzzy match on the block's name, not a rigid prefix match.
3. **Suggested** appears above Text only when the insertion point's
   nearest preceding `section_heading` text confidently matches a
   block type's home section (inserting inside "Rehab" surfaces
   Rehabilitation Progression; inside "Exam," Examination Workflow).
   A cheap heuristic — literal/fuzzy string match against each
   available type's declared home sections — not a model call, and it
   never removes an item from its normal group, only mirrors it to
   the top. Wrong suggestions cost nothing; the full picker is always
   still there underneath.

### The registry is what keeps this from becoming 40 special cases

Every block type — including ones nothing renders yet — is one entry
in a single table (`src/lib/block-registry.ts`, not built yet):
group, display label, icon, and exactly one of two `kind`s:

- **`owns-content`** — inserting it does what Pass 1's paragraph/
  heading/key-point insert already does: create an empty block,
  drop straight into inline editing. No new mechanism, just more
  entries pointing at the existing one.
- **`references-object`** — inserting it opens **search before
  create** against that object type's table: "Search existing Risk
  Factors…", each result annotated with how many diseases already use
  it, and only an empty search offers "Create new." This is
  `findOrCreate` — the same discipline every seed script has followed
  since Sprint 3 — moved from something an author has to remember into
  something the UI refuses to let them skip.

The command palette component, the insert Server Action, and (later)
the object-reuse search panel all read this one registry instead of
each carrying their own copy of "which types exist and how do they
behave" — so growing from today's ~12 real block types toward 30-40
means adding registry rows, not touching the palette or the action
again. This is the direct answer to "does this still make sense at
30-40 types": yes, *because* the picker's own complexity is capped by
the registry's shape, not by how many rows are in it.

**Not every named type is real yet, and the picker should say so
honestly rather than pretend.** Checked against the actual schema:

| Status | Types |
|---|---|
| **Renders, and insertable via the "+" picker** | Paragraph, Section Heading, Key Point, Warning / Pitfall, Learning Objective, Risk Factors, Clinical Pearl, Examination Workflow, Diagnostic Imaging, References, Medical Illustration, Timeline, Infographic, Comparison Table, Treatment Algorithm, Rehabilitation Progression, Card Grid, Large Cards, Small Cards, Test Yourself (`self_check`), Tabs (`tabs`), Rich Table (`rich_table`), Evidence Summary (`evidence_summary`), Stat Card (`stat_card`), Image Comparison (`image_comparison`), Citation Card (`citation_card`), Callout Banner (`callout_banner`), Badge Row (`badge_row`), Icon List (`icon_list`), Photo Card Gallery (`photo_card_gallery`) |
| **Table exists, no block type yet** | Anatomy (`anatomy_structure` exists, only used via illustration annotation, never standalone), Procedures (`procedure` table exists, no relationship table, unused) |
| **Nothing exists yet** | Differential Diagnosis, Complications, Outcome Measures |

Card Grid/Large Cards/Small Cards turned out not to need the
multi-select interaction this document originally assumed — see
`LESSONS_LEARNED.md` #42 for the reframing (insert a fresh empty
grid, not select-and-group existing blocks). Two-column layout is
still a named-but-unbuilt fourth preset of the same mechanism.

Treatment Algorithm and Rehabilitation Progression were the two types
that needed *both* pieces proven separately combined at once: the
reuse-first search-or-create step (proven on Risk Factor/Clinical
Pearl/Examination Workflow/Diagnostic Imaging/References/Medical
Illustration) and the multi-item step editor (proven on Timeline/
Infographic/Comparison Table, `LESSONS_LEARNED.md` #40) — a real
Knowledge Object (the algorithm/protocol itself) whose *steps* also
need list editing, at the same time.

Examination Workflow, Diagnostic Imaging, and References are all
architecturally **aggregators** (one block per disease, holding
several objects as an id array) — all three now insert by joining the
disease's existing block rather than spawning a new one, sharing a
single `joinOrCreateAggregatorBlock` helper (`LESSONS_LEARNED.md`
#34-37). Treatment Algorithm and Rehabilitation Progression would need
the same join logic plus a step-list editor on top — not yet built.

A "future" row still appears in the palette, per the same "(future)"
notation used when this list was first sketched — visibly part of the
vision, greyed out, not silently missing — but selecting it is a
no-op until its schema and resolver actually exist. This keeps the
palette honest without hiding the roadmap.

## Reordering

Drag handle on hover, writes to the `position` column that already
exists on `editorial_block` — no new schema. (Pass 1 shipped simple
up/down buttons on the same column as a deliberate stand-in; real
drag-and-drop is still open, tracked below with the rest of Pass 2.)

## Layout

Every block carries `display_config.layout` (`{ row, width }`) —
originally added so Card Grid could insert fresh, pre-grouped cards
(`LESSONS_LEARNED.md` #42), but the mechanism itself was always
type-agnostic: `BlockSequence` groups any consecutive blocks sharing a
`row` into a 12-column grid regardless of block type. Per the
founder's own reframe, layout is now exposed as a property of *any*
existing block rather than something only Card Grid produces: a small
toolbar control lets an author combine a block with whichever neighbor
is already adjacent (any two types — a Paragraph next to a Warning /
Pitfall works the same as two cards, or an illustration next to
either). "Full" and "remove from row" are the same action from the
author's side. See `LESSONS_LEARNED.md` #43 for the implementation and
the orphaned-row cleanup it required (a row with only one member left,
after a delete or a move past its edge, ungroups automatically rather
than rendering half-empty).

Width on a combined pair is set by dragging a real divider between the
two blocks, not a dropdown — snapped to fixed stops (25/33/50/66/75/
100%), not free pixel resizing. Scoped to exactly 2-member rows (what
"combine" produces); Card Grid's 3-4 uniform members keep their
original static widths, since a pairwise divider has no meaningful
range to move within a uniform 3-4-way split. See `LESSONS_LEARNED.md`
#44.

## Medical Illustration controls

A Medical Illustration block carries more than just the shared image
reference: block-owned `title`/`subtitle` (distinct from the shared
`medical_illustration` row's own title — editing that would rename the
image everywhere it's reused, the same hazard a Clinical Pearl's body
already has), "Delete image" (clears the reference, keeps the block —
an author can pick a new image into the same spot without re-typing
the caption or losing annotations), and an image-width control
(25/33/50/66/75/100%, nested inside whatever column-width the block
itself has if it's part of a combined row). See `LESSONS_LEARNED.md`
#45.

## Rich text

Paragraph body, Key Point, Clinical Pearl body, and Test Yourself
question/answer support real per-selection formatting — select a word
or phrase and apply Bold, Underline, one of 3 font sizes, or a text/
background color from the same 8-color decorative palette cards use
(`CardColor`, `LESSONS_LEARNED.md` #46). Distinct from `cardStyle`
(which colors a whole card) — this colors an arbitrary run of text
inside one. Stored as sanitized HTML in the same `content_config`
field prose already used as a plain string (`src/lib/rich-text.ts`);
existing plain-text content needs no migration, since text with no
tags in it is already valid, unformatted HTML. "Clear formatting"
strips markup from a selection back to plain text rather than trying
to toggle individual attributes back off. See `LESSONS_LEARNED.md`
#50 for the sanitization model (allowlisted classes only, no inline
`style`, sanitized on both save and render) and the security
verification.

## What's deliberately not in v1

- **Drag-and-drop treatment-algorithm canvas editor.** A real node-
  graph editor (drag steps and branch targets anywhere, draw arbitrary
  connections) is its own large, risky project. What v1 has instead
  (`LESSONS_LEARNED.md` #54-55): the editor renders the exact same
  flowchart layout the read view does — connected trunk boxes, a
  Yes/No decision diamond, branch outcomes stacked into cards — with
  "+" controls sitting at the specific point in the diagram a new step
  would appear, rather than a flat list with a separate "add step"
  field. Still fully structured, still writes straight to
  `treatment_algorithm_step` (including its
  `next_step_if_true`/`next_step_if_false` columns, present since
  `0001_schema_v1.0.sql` but unused until lesson #54), just not a
  canvas where an author drags a step anywhere they like or draws a
  connection between two arbitrary steps by hand — the shape (trunk →
  one decision → two branches) is fixed, not freeform. Deliberately
  single-decision — a second branch point further down the same
  algorithm isn't specially rendered yet.
- **Illustration upload + click-to-annotate.** Real value, but gated on
  a decision this document doesn't make: where do uploaded assets
  live (object storage, CDN, review process for a clinical image).
  v1's illustration panel supports search-and-reuse of existing
  illustrations only; upload is a named v2, not silently dropped.
- **PubMed/DOI auto-lookup.** Genuinely lower-risk than the above (one
  external API, well-defined metadata) — a reasonable v1.5, not v1.
- **The full 5-stage editorial lifecycle in the UI.** `lesson #25` kept
  publish/unpublish binary deliberately, since nothing consumed the
  finer stages yet. A real in-page authoring flow is the first thing
  that might actually want "mark ready for scientific review" as its
  own step, distinct from publish. Worth reopening — flagged below,
  not decided here.

## What v1 actually is

Inline prose editing (4 block types) + reuse-first object search for
the three most-proven-reusable object types (exam maneuver, risk
factor, imaging finding) + the relationship-glyph selector + drag
reorder + edit-mode gated to editor/admin on the real page. Everything
else above is named and sequenced, not silently scoped out.

## Open questions

1. **Timing — confirmed, not assumed.** Not yet the active bottleneck
   at 5 diseases; this is deliberately getting ahead of the
   `IMPLEMENTATION_PLAN.md` disease #10-15 trigger, anticipating other
   (non-technical, clinician) authors joining before the trigger fires
   on its own. Confirmed directly with the founder rather than guessed.
   Consequence: v1 should be built properly, not rushed as a bare
   proof-of-concept — there's room to do it right the first time.
2. **The 5-stage lifecycle** — still open. Worth reopening now that
   real authoring exists, or still correctly binary per lesson #25?
3. **Asset storage for illustrations** — still open, blocks the upload
   feature specifically; not blocking for v1 as scoped (search-and-
   reuse only).
