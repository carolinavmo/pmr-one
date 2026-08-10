# PM&R Atlas — Design System (Tier 1: Foundations)
*Companion to DESIGN_PHILOSOPHY.md. Tier 1 only — the tokens everything
else depends on. Component patterns (cards, badges, forms) and system
behavior (navigation, empty/error states) are deliberately deferred to
Tier 2 and Tier 3 (see product-spec-v1.md open questions).*

## Design Principles
1. **Recognition before reading** — visual pattern first, text second.
2. **Evidence is ambient, not demanded** — always present, never blocking.
3. **One object, one look, everywhere** — a Disease looks the same in
   every lens; consistency is how trust compounds across contexts.
4. **Progressive disclosure of clinical depth** — answer first, evidence
   metadata one interaction away.
5. **Calm over energetic** — this product does not compete for attention
   the way consumer apps do; it is the quiet, reliable object in a loud
   environment.
6. **No graph leakage** — relationship types, lifecycle states, and
   schema structure are implementation detail. Never surface a raw
   enum, a table name, or a literal node/edge diagram to the user.
   Relationships manifest only as meaningful context — a Pearl appears
   because it enriches the topic, a Related Disease appears because it
   aids understanding — never as a labeled edge or graph structure.
7. **When in doubt, choose calm over complete** — whenever a decision
   exists between exposing more information and keeping the interface
   lighter, default to clarity and progressive disclosure. The tie-
   breaker rule for every future ambiguous design decision.

## Visual Identity
Not a sterile clinical-white "hospital app," and not a flashy
consumer-startup gradient product. The reference points are a
well-typeset medical textbook (authority, calm) crossed with a modern
reading tool (Linear/Notion-grade restraint). Warm neutral surfaces,
not stark white — reduces eye strain across long study sessions and
avoids the generic "healthcare SaaS" look most competitors share.

## Typography
Two-typeface system, split by role — not by page:
- **Reading typeface** (serif or humanist slab, e.g. in the vein of
  Tiempos/Source Serif): used for actual clinical content — Overview,
  Definition, Clinical Pearls, algorithm text. Signals textbook
  authority; slows the eye just enough for retention during study
  contexts.
- **UI typeface** (clean grotesk, e.g. Inter/Söhne-adjacent): used for
  everything that is navigation, labels, buttons, badges, metadata.
  Signals "modern tool," stays out of the way during quick lookups.
The split itself is the design decision: content that should be
*trusted and absorbed* reads differently from chrome that should be
*used and ignored*. A Windlass test's technique description is reading
typeface; the tab that took you there is UI typeface.
- Sentence case throughout, no ALL CAPS, no unnecessary title case
  (matches the trust-not-hype tone from the philosophy doc).
- Two weights only per family (regular / medium) — a third weight adds
  visual noise without adding meaning. **One deliberate exception**:
  section headings (`SectionHeadingBlockView`) use bold (700) per
  direct founder request — `layout.tsx` loads the real static weight
  rather than letting the browser fake it. See `LESSONS_LEARNED.md`
  #48.

## Color System
Neutral-first: ~90% of any screen is warm neutral surface and text.
Color is reserved for meaning, not decoration — three roles only:
- **Accent (interactive)** — a restrained deep teal. Used for links,
  primary actions, active states. Chosen deliberately over the generic
  "medical blue" every competitor defaults to.
- **Trust (verified/reviewed)** — a quiet, desaturated green. Used
  *only* for the editorial review checkmark and last-reviewed date.
  Never used decoratively — its rarity is what makes it mean something.
- **Insight (clinical pearl)** — a warm amber/gold. Distinguishes
  experiential knowledge from verified evidence at a glance, consistent
  with the deliberately-lower evidence bar pearls carry (spec §2.6).
A fourth, muted warning tone is held in reserve for genuinely important
clinical flags (e.g. "red flag" differentials) — used rarely enough that
it never competes with the trust or insight colors for attention.

**Exception, added deliberately, not by drift:** author-facing card
backgrounds and freeform badges (`ParagraphBlockView`) offer color as
a genuine decorative choice — an editor picking a card's color, not
the system asserting meaning. That palette is a *separate* set of
tokens (`--color-card-blue/violet/rose/slate`, `src/lib/card-colors.ts`)
chosen to sit far from this section's four hues on the color wheel, so
a decoratively-colored card can never be mistaken for a Trust/Insight/
Warning signal. Accent/Trust/Insight are also offered there as author
choices (never Warning — its rarity stays absolute) — see
`LESSONS_LEARNED.md` #46.

## Spacing Scale
Standard 8px base grid: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px. No
exotic or arbitrary values — predictability here is what makes every
future component feel like it belongs to the same system without
extra effort.

## Grid System
- Reading content (Disease Page body, Clinical Case narrative): max-width
  ~680-720px — the same comfortable line length already validated in the
  disease-page mockup, not arbitrary.
- Browsing content (Visual Atlas grid, search results, Personal
  Workspace collections): wider, responsive card grid, `minmax` based,
  no fixed column count.
- The two grid types map directly to the two contexts from spec §7
  (context-first): reading grid serves study/desktop depth, browsing
  grid serves fast scanning in either context.

## Iconography
Single outline icon set, used consistently platform-wide (no mixing
styles). Critically: **every Knowledge Object type gets exactly one
icon, used identically in every lens it appears in** — a Disease's icon
in Search matches its icon in the Atlas matches its icon in a Personal
Workspace bookmark. This is the literal mechanism behind "one object,
one look, everywhere" — recognition transfers because the icon never
changes context to context.

## Motion Principles
Fast, subtle, purposeful — motion exists only to clarify a state change
(evidence panel expanding, tab switching), never as spectacle. No
decorative animation, no attention-seeking transitions. Consistent with
"calm over energetic" — a platform competing for engagement would
animate to delight; this platform animates only to orient.

## Illustration Language (production note, not just aesthetic)
One consistent illustration style across every Medical Illustration
object — not a mix of stock photography, 3D renders, and hand-drawn
diagrams. This is a real production constraint on the "Visual Asset
Production" lifecycle stage (spec §7A), not a preference: a mixed
illustration style undermines "one object, one look" as surely as
inconsistent icons would.

## Deferred to Tier 2 (components — next step)
Card system, Knowledge Object cards (Disease/Exam/Pearl/Reference/
Guideline/Illustration), evidence badges, trust indicators, clinical
badges, buttons, forms, search experience, contextual attachment pattern
(replacing "relationship visualization" — see DESIGN_PHILOSOPHY.md).

## Deferred to Tier 3 (system behavior — after Tier 2)
Navigation hierarchy, information hierarchy, empty states, loading
states, error states, accessibility principles (though accessibility
constraints should inform Tier 2 components as they're built, not be
bolted on afterward).
