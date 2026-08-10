# PM&R Atlas — Design System (Tier 2: Components)
*Depends on Tier 1 (DESIGN_SYSTEM.md). Every component here is built to
be assembled into lenses, not designed per-page. A Disease Page, Visual
Atlas result, and Board Review question all reuse these same pieces.*

## The Universal Knowledge Object Card
One skeleton, reused for every object type — this is the literal
mechanism behind Tier 1's "one object, one look, everywhere."

**Anatomy** (same five slots for every variant):
1. Leading icon — type-specific, from Tier 1 iconography (or a thumbnail
   image, for Illustration cards specifically — see below)
2. Title — canonical name
3. One-line context — varies by type, always exactly one line
4. Trust indicator — the quiet reviewed checkmark + date (Tier 1 color)
5. Whole card is the tap target — no separate "view" button

**Variants** (content differs, skeleton doesn't):
- **Disease Card** — context line = one-sentence definition snippet
- **Exam Card** — context line = technique in a few words
- **Pearl Card** — context line = the pearl text itself (already short);
  accent = insight amber (Tier 1), never the neutral card border
- **Reference Card** — compact citation form (author, year, journal);
  no trust checkmark (references cite evidence, they don't carry a
  review status themselves)
- **Guideline Card** — context line = the recommendation itself
- **Illustration Card** — the one true exception to "icon leads": the
  thumbnail image IS the leading element, since for this object type the
  visual is the content, not a label for it (consistent with philosophy
  doc: "illustrations come before text")

## Evidence Badges
Small pill, hidden by default, revealed on interaction (the "why this
test" pattern already validated in the disease-page mockup). Never
present unprompted on a card — evidence detail is Tier 1's progressive
disclosure principle applied concretely. Content: sensitivity/specificity
for exam relationships, relative risk/odds ratio for risk-factor
relationships, recommendation strength for treatment relationships —
pulled directly from the first-class relationship metadata (spec §2.5),
but the badge itself never names the relationship type or shows a raw
number without a label.

## Trust Indicators
One visual form, used identically everywhere an Editorial object
appears: a small checkmark (Tier 1 trust green) plus a last-reviewed
date, e.g. "Reviewed · Jan 2026." Never a paragraph, never a modal —
its consistency and restraint is what makes it legible as trust rather
than clutter.

## Clinical Badges
Short text pills for clinically meaningful distinctions surfaced by the
vertical slice — e.g. "First-line," "Contributing factor," "Differential."
Neutral gray by default; only escalates to the Tier 1 flag color for
genuinely important flags (e.g. a red-flag differential). Restraint here
is deliberate — if every badge is colored, none of them mean anything.

## Buttons
One accent-filled (primary) button per screen, maximum — everything else
is secondary or ghost. Directly enforces Tier 1's "calm over energetic":
a screen with three colored buttons competing for attention is the
opposite of what this product should feel like. Verb-first labels,
sentence case, no punctuation ("Save to workspace," not "Save!").

## Forms
Minimal by design — PM&R Atlas has very few forms at MVP (search,
save/bookmark, personal notes). Follows the Tier 1 typeface split
concretely: single-line inputs (search, titles) use the UI typeface;
personal note text areas use the reading typeface, because a user's own
notes are content, not chrome, the same distinction that governs
Disease Page body text. Generous touch targets (44px+) given the mobile
lookup context (spec §7).

## Search Experience
Directly implements this session's core instruction — "users should
navigate knowledge naturally, not graphs." Results are NOT grouped by
object type in separate sections; they're a single relevance-ranked list
of Universal Knowledge Object Cards, mixing Diseases, Exam Maneuvers, and
Pearls freely. This is what makes the vertical slice's finding real: an
Exam Maneuver is independently findable, not buried under its parent
Disease. The card's icon alone communicates what kind of object it is —
no separate labeled category needed.

## Contextual Attachment (replaces "relationship visualization")
This is the direct translation of the founder's instruction: relationships
manifest only as meaningful, human-titled context — never as edges.
Pattern: a **contextual rail** — a short, titled row or list of Universal
Knowledge Object Cards, appearing adjacent to primary content.
Section titles are written in plain language derived from *why* the
relationship matters, never from its technical name:
- Clinical Pearl attachments → titled "Worth knowing," not "Attached pearls"
- Differential relationships → titled "Consider also," not "Differential diagnoses of"
- Risk Factor relationships → integrated into the Overview/Epidemiology
  section directly, not a separate rail (they're context, not a detour)
- Illustration usage → embedded inline at first mention, not a rail at all
  (illustrations lead, per philosophy — they don't wait in a sidebar)
- Exam Maneuver → the primary Exam section itself, since this is the
  core reason a resident opens a Disease Page
The rule of thumb: **if a relationship earns its own titled section with
a plain-language name, it's a rail. If it directly supports understanding
in place, it's inline. Never a graph.**

## Deferred to Tier 3 (system behavior — next)
Navigation hierarchy, information hierarchy, empty states, loading
states, error states, accessibility principles.
