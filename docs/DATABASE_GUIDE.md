# PM&R Atlas — Database Guide
*Companion to schema-v1.0.sql. This explains why the schema exists in
this shape, not just how to query it — written for a future contributor
who wasn't in the room for these decisions.*

## The one idea everything else follows from
PM&R Atlas is not a CMS with disease articles. It's a graph of reusable
**Knowledge Objects** (Disease, Examination Maneuver, Treatment
Algorithm, Reference, etc.) connected by **typed relationships that
carry their own evidence**, rendered into pages by a separate
**Editorial Block** layer that composes objects without ever copying
them. If you remember one thing: **content exists once, is referenced
everywhere, and presentation is a different concern from data.**

## Why two graphs (Editorial vs. Personal)
Editorial content (Disease, Treatment Algorithm, etc.) is authored,
reviewed, and identical for every user. Personal content (notes,
protocols, bookmarks) is owned by the user and references editorial
objects by ID, never copies them — so if a Treatment Algorithm is
revised, every user's saved reference to it stays current automatically.
This split is also why the platform doesn't lose users after residency:
the Personal Graph is what a practicing physiatrist keeps using for
years, even after they stop needing exam-focused content.

## Why relationships carry their own columns (not bare foreign keys)
`maneuver_disease_relationship` isn't just `(maneuver_id, disease_id)` —
it carries sensitivity, specificity, and evidence_strength, because the
same maneuver has different diagnostic value against different diseases.
Modeling this on the Examination Maneuver object itself would force a
single, context-free answer where a genuinely context-dependent one
exists — this was an actual bug caught during domain modeling, not a
style choice. The same reasoning produced the `relationship_type` enum
(`confirms` vs. `assesses_contributing_factor` vs. `rules_out`) — not
every maneuver associated with a disease confirms it; some assess a
contributing factor instead, and conflating them would be clinically
wrong, not just imprecise.

## Why some relationships are polymorphic (target_type + target_id)
`pearl_attachment`, `citation`, and `illustration_usage` connect one
object type to many possible target types (a Clinical Pearl can attach
to a Disease, a Maneuver, an Algorithm...). The alternative — a
dedicated join table per (source, target) pair — gives full database-
level referential integrity but grows combinatorially as object types
increase, working against the platform's core "everything can relate to
everything" principle. **Trade-off accepted deliberately**: integrity
for these specific tables is an application-layer responsibility, not a
database constraint. If this ever causes a real data-integrity incident,
that's the trigger to reconsider it — not before.

## Why Editorial Blocks are a separate layer from Knowledge Objects
A Disease Page is not one document — it's an ordered sequence of blocks,
each either embedding an existing Knowledge Object (via the same
polymorphic pattern above) or carrying pure authored narrative. This is
what lets Plantar Fasciopathy be biomechanics-heavy and Stroke be
timeline-heavy without forcing every disease into identical sections,
while the underlying objects (Windlass Test, etc.) still exist exactly
once regardless of how many blocks embed them.

## Why Templates use copy semantics, not live inheritance
Instantiating a disease from a Template duplicates its block structure;
there's no ongoing link afterward. A "live" template (where diseases
stay bound to it) would mean editing the Tendinopathy Template could
silently change already-published diseases — the opposite of the
non-restrictive, freely-customizable behavior templates are supposed to
provide.

## Why Editorial and Personal Lifecycles differ
Editorial objects go through Draft → Scientific Review → Visual Asset
Production → Editorial Review → Published → Updated → Archived, because
the platform's core trust promise depends on every published claim being
reviewed. Personal objects go through Created → Edited → Archived, with
no gatekeeping, because they're the user's own knowledge — imposing
editorial review on someone's private note would be both wrong and
pointless.

## Extending the schema — a checklist for future contributors

**Adding a new Knowledge Object type?** First ask: is this content
genuinely reused across multiple diseases (like a maneuver or a
reference), or is it intrinsic to one disease (like its epidemiology)?
If the latter, it's probably just a field on Disease, not a new object
type — this exact question was answered explicitly for Overview/
Definition/Epidemiology (spec §6A). Don't create a type for something
that will only ever have one referencing row.

**Adding a new relationship type?** Extend the `relationship_type` enum.
Ask what evidence shape it needs (sensitivity/specificity? relative
risk/odds ratio? recommendation strength?) — this determines what
columns the relationship's join table needs, following the pattern
already established for `confirms`/`increases_risk_of`/`treats`.

**Adding a new Editorial Block type?** Extend the `editorial_block_type`
enum — no new table needed, since blocks already have a generic shape
(`referenced_object_type`/`id`, `display_config`, `content_config`).
Define the block's config contract (what goes in `display_config` vs.
`content_config`) before building its renderer, following the Illustration
and Paragraph block examples in product-spec-v1.md §15A.

## What's deliberately absent, and why
No billing/subscription tables (§6B — postponed until paywall trigger is
defined), no AI conversation storage (Phase 6, not built), no formal
versioning UI for editorial history (retained for audit per the
Lifecycle, but no interface to browse it yet — nobody's asked for it,
building it now would fail question 6).
