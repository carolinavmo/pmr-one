# PM&R Atlas — Visual Identity

*Sits above `DESIGN_SYSTEM.md` (Tier 1). Tier 1 defines the tokens —
this document defines the character those tokens, every future
component, and every future illustration are in service of. The test
for everything below: if the wordmark were removed, would a screenshot
still be recognizable as PM&R Atlas? Written before any page is
touched, at the founder's explicit request — identity decided once, as
a document, not re-decided page by page.*

## Positioning: the one thing nobody else can copy

Amboss, Kenhub, and Complete Anatomy all present clinical content as a
flat list of facts. None of them show *why* one fact relates to
another — that a positive McMurray's test doesn't confirm knee
osteoarthritis, it identifies a commonly co-existing finding; that
forehead sparing doesn't just accompany facial weakness, it *rules
out* the diagnosis on this page entirely. PM&R Atlas already models
this — every exam maneuver, imaging finding, and risk factor carries a
typed relationship to the disease it appears on (`confirms` /
`rules_out` / `assesses_contributing_factor` / `increases_risk_of` /
`suggests`). Today that structure is expressed as a small gray text
label. It is the single most ownable, least copyable asset this
product has, and almost the entire identity below is either built
directly from it (§6) or exists to give it room to be seen (§1, §3).

The second real asset is illustration — but only once it exists.
Every illustration on the platform today is a placeholder. Section 1
is a production brief, not a decoration; it will not be true until
illustrations are actually commissioned or licensed against it.

## 1. Illustration Language

**The rule: one spotlight, always.** Every illustration renders in a
muted, desaturated anatomical palette — line-and-fill technical
linework in the register of a redrawn Gray's/Netter plate, not a flat
icon and not a photo-real render — *except* the one structure that is
clinically relevant to the page it appears on, which alone is
rendered in the accent teal. A Plantar Fasciopathy illustration shows
the whole foot in muted grayscale-sepia; the plantar fascia itself is
the only element in color. A Bell's Palsy illustration shows the
skull and cranial nerve pathway muted; CN VII alone is teal.

This is the whole device: **grayscale means anatomy, color means "this
is the point."** Once a reader has seen it twice, they don't need to
read a label to know where to look — recognition before reading,
which is already Tier 1 principle #1, just not yet applied to the one
asset class built to carry it. It is also cheap to keep consistent
across an illustrator, a licensed set, or an AI-assisted pipeline,
because it's a rule about treatment, not a specific hand's style.

Leader-line labels stay outside the art (never overlaid on top of
linework), set in the UI typeface at the eyebrow weight defined in
§2 — never hand-lettered into the image file itself. Numbered
annotation markers keep their current circular-badge treatment,
recolored to the single accent, never more than one accent color per
image.

**Production note**: until real illustrations exist, the placeholder
stays honest and quiet (`public/placeholder-illustration.svg`, fixed
this session) rather than pretending. Do not build a fake illustration
system out of icons or gradients to fill the gap — an honest "coming
soon" is on-brand; a cheap simulation of the real thing is not.

## 2. Typography

Keep the two-typeface split (Tier 1) — it's sound, the issue was never
the fonts, it was that nothing was done with them. Two additions:

**The eyebrow.** A small, uppercase, wide-tracked (0.08em), UI-weight
label in accent teal, placed before every *named grouping* — homepage
modules, a disease page's section clusters, card-grid headers. The
homepage's "CONDITIONS" label is already this device, unnamed and
used once. Name it, and use it everywhere a group of things is about
to be introduced: it becomes a small, constant, unmistakable rhythm
mark, the way a kicker works in print editorial.

**Arrival vs. flow.** Reserve genuinely large type for exactly two
moments per page — the homepage hero and a Disease Page's title — and
keep everything else, including in-page section headers, disciplined
and small. The contrast between "you just arrived" and "you are now
reading" is the signature, not a uniformly large type scale
throughout. Apple's restraint isn't "big text everywhere," it's big
text at *one* moment per screen so it still means something.

Sentence case, two weights only, both already Tier 1 rules — keep
both exactly as written.

## 3. Composition

**The Clinical Snapshot.** Every Disease Page opens with a fixed,
named two-column module: illustration (per §1) on the left, a
structured facts card — Definition, Epidemiology, Key Risk Factors, a
single boxed Key Message — on the right, at roughly a **70/30 width
split in the illustration's favor**. The illustration dominates on
purpose — it's the hero, the facts card is support, not an equal
partner. Not a layout choice made fresh per disease; a named,
repeating unit that becomes recognizable as "this is what a PM&R
Atlas condition looks like" independent of which condition it is.
Everything after the Snapshot reverts to the single reading column
already established (Overview through References) — the Snapshot is
the arrival moment (§2), the rest is flow.

**Alternation as rhythm.** Within the reading column, deliberately
alternate module width — full-width prose, then a card row (risk
factors, exam maneuvers), then full-width prose, then a diagram — so
scrolling has a visible pulse instead of a flat list of paragraphs.
This is already partially true by accident (`BlockSequence`'s row
grouping); the difference is treating the alternation as a rule
authors compose toward, not a side effect of whichever blocks happen
to carry a `layout.row`.

**Cards are not interchangeable weight.** A risk-factor icon card and
a Key Message callout should not read as the same visual importance
just because they're both rounded rectangles with a border. Establish
at least three card weights — quiet (risk factors, related-topic
thumbnails: small, low-contrast, built to be scanned in a row and
half-ignored), standard (exam maneuvers, imaging findings: the current
default treatment), and focal (the Key Message, a single decisive
Clinical Pearl: larger, more contrast, meant to stop the scroll). A
page where every card has identical weight has no hierarchy no matter
how good the spacing is — this is the fix for "dozens of identical
white cards," which is a real, current problem (`/dev/blocks` and
every existing disease page use one card treatment for everything).

**Three columns is the target shape, not the current one.** The
reference layout's third column — sticky Contents (quiet, left),
reading column (center), Personal Workspace (right, visually
secondary, "should never compete") — is the right long-term grid, and
it's worth designing the center column's max-width now assuming a
right column will eventually exist, so it isn't re-measured later.
But Workspace itself remains the explicitly deferred, undesigned
Phase 2 feature (Personal Graph, `product-spec-v1.md` §2) — building
an empty or fake right column now to match a reference image would be
the same mistake as the fabricated stats bar from the last review:
decoration standing in for a feature that isn't real yet. Disease
pages stay two-column (Contents + reading) until Workspace has an
actual data model behind it.

## 4. Spacing

Keep Tier 1's 8px scale as the mechanical system — it works. Add one
rule on top: **section breaks get triple the space of everything
else.** Gaps between blocks inside a section stay at the current 32px
rhythm; the gap before a new named section (a new eyebrow + heading)
jumps to 96px. Most products use one spacing rhythm for everything,
which is why generous whitespace usually just reads as "unfinished"
rather than "confident" — the confidence comes from the *contrast*
between tight and generous, not from generous alone. This is the
concrete version of the Apple observation from the product review:
negative space has to be unmistakably deliberate to read as
intentional rather than incomplete.

## 5. Iconography

Icons are not a third identity carrier — only two things are (§
Positioning): illustration and relationship. Iconography's job is to
stay quiet enough not to compete with either, not to become a third
signature. Two tiers, not one:

**Tier A — the relationship glyphs (§6).** Fully custom, small in
number (five, matching the five relationship types), the only icons
in the entire product that are not from a shared library. These carry
almost all of the iconographic identity load.

**Tier B — everything else.** Stays Lucide (no reason to hand-draw a
hundred utility icons), but re-skinned with one non-default,
consistent stroke width and corner treatment applied platform-wide —
the cheap version of what Linear does with its custom set. The goal
isn't to hide that it's Lucide; it's that a *specific*, deliberately
chosen stroke weight, applied with zero exceptions, stops reading as
"whatever the library shipped with" and starts reading as a choice.
The region-derived icon work already shipped this session (footprints
for foot/ankle, hand for wrist, etc.) is Tier B done correctly —
keep extending that pattern, don't replace it.

## 6. Relationship Visualization

This is the center of the identity, and it needs to be reconciled with
something already on record. Tier 1 defers "relationship
visualization" to a "contextual attachment pattern" instead, citing a
`DESIGN_PHILOSOPHY.md` that isn't in this repo (referenced twice in
Tier 1, not present in `docs/` — flagging the gap rather than guessing
its contents). Tier 1 principle #6 is unambiguous about what that
guards against: never a raw enum, never a table name, never a literal
node/edge diagram. What's already shipped — `maneuverRelationshipLabel`
turning `rules_out` into "Rules out" on exam maneuver cards — already
threads this needle today: plain clinical meaning, not schema. What
follows is that same translation, carried into a shape and a color
instead of only a word, which is principle #1 ("visual pattern first,
text second") applied to something that's currently text-only. It is
not a node graph, not a diagram, not a database view — it's a small,
fixed vocabulary of five glyphs standing in for five clinical
meanings, exactly as "Rules out" already stands in for `rules_out`.
Flagging this explicitly because it revisits a decision that predates
this document — worth an explicit yes before it's built, not an
inherited assumption.

**Confirmed, not assumed**: asked directly whether the signature
reasoning section should be attached glyphs (this) or a literal
node-and-edge "Clinical Reasoning Map" diagram (closer to a later
reference image, but a genuine reversal of principle #6). Answer was
attached glyphs — principle #6 stands, no diagram, ever. Recorded here
so it isn't re-litigated next time a reference image suggests one.

The full `relationship_type` enum has ten values, not five — five are
structural/authoring relationships (`treats`, `illustrates`, `depicts`,
`cites`, `attached_to`) that are never rendered as a judgment-call
badge in the first place (a treatment algorithm is just attached to
its disease; nobody needs a glyph explaining that). The five below are
the actual reader-facing clinical judgment calls, and the only ones
that need a glyph.

Proposed grammar, one glyph + one color per relationship type, used
identically everywhere a typed relationship appears (exam maneuver
cards, imaging findings, risk factors — anywhere `relationship_type`
currently renders as a plain badge):

| Relationship | Glyph | Color |
|---|---|---|
| Confirms diagnosis | filled circle / check | accent teal, solid |
| Rules out | crossed circle | warning tone, solid |
| Assesses contributing factor | small triangle | insight amber |
| Increases risk of | upward arrow | insight amber, outline |
| Suggests | outline check | accent teal, outline (lower confidence than "confirms," same family) |

A reader learns this once — the way a diff's red/green or a musical
dynamic mark is learned once — and reads it instantly on every
subsequent page, with the text label still present alongside it (this
augments the existing label, it doesn't replace it — no regression on
accessibility or clarity for a first-time reader).

## 7. Motion

Currently near-zero (200ms opacity/color fades on hover) — not wrong,
just invisible, so it isn't contributing to identity at all. Two
changes, both restrained — precision, not playfulness, matching a
clinical-credibility product rather than a consumer one:

**One signature curve.** A quick, decisive ease-out — fast start,
settled finish, no bounce or overshoot — ~200ms for micro-interactions
(hover, badge state), ~320ms for anything larger (a panel opening, a
self-check answer revealing). Applied everywhere, nowhere excepted, so
it becomes a felt signature rather than a per-component decision.

**Two moments get bespoke treatment, not the generic fade.** The
self-check answer reveal (already the platform's signature retrieval-
practice interaction, used nowhere else in the category) deserves a
distinct motion — not more expressive, just *its own*, so it's felt
as "this is the PM&R Atlas way of testing yourself" rather than
another accordion. Illustration annotation numbers (§1) animate in on
scroll, in sequence, once — reinforcing the labeled-diagram device at
the exact moment a reader's attention is already on the image.

## 8. Editorial Rhythm

The pattern every major section repeats, tying §2–§5 together into how
a page actually feels to scroll through: **eyebrow → heading → one
framing sentence → a module (alternating per §3) → occasional Clinical
Pearl as a rest point.** The Pearl is already visually distinct
(amber, boxed) — the addition is treating it deliberately as a
*rhythm-breaker*, the pull-quote of the piece, placed with intent
roughly every 2-3 sections rather than wherever a pearl happened to be
authored. A reader should be able to skim a Disease Page by its
pearls alone and get the shape of the disease, the way skimming pull-
quotes gets you the shape of a long-form article.

## What this document does not decide

Nav/IA structure (Tier 3 already governs this, unchanged), feature
scope (Workspace, AI Assistant, Board Review — still the deferred
conversation from earlier this session), and marketing content
(no stat, count, or claim gets fabricated to fill a hero — unchanged
discipline from every seed script this project has shipped).

## Relationship to Tier 1

Everything above is additive except one explicit choice to *not*
change something the reference images suggested: **the warm-neutral
surface stays**, not the cooler white/light-gray the reference images
leaned toward. Tier 1's reasoning for it — avoiding the generic
"healthcare SaaS" look most competitors default to — is sound, and a
lighter/whiter background doesn't move the identity needle the way
§1 and §6 do; it would just trade one common default (warm-cream-and-
teal wellness palette) for an even more common one (white SaaS
default). The identity is meant to live in the illustration system and
the relationship grammar, not in background hue.
