# PM&R Atlas — Design System (Tier 3: System Behavior)
*Depends on Tier 1 (DESIGN_SYSTEM.md) and Tier 2
(DESIGN_SYSTEM_TIER2_COMPONENTS.md). This is the last tier before pages
are assembled — see product-spec-v1.md roadmap.*

## Navigation Hierarchy — Organized by Intent, Not by Lens
*Revised after founder reference review: keep concrete, recognizable
lens names, but group under intent so no single lens becomes a peer-level
nav item on its own — this is where the "one tab per lens" risk actually
lived, not in the labels themselves.*

Primary navigation is not "one tab per lens." Eight lenses as eight top-
level items is the architecture wearing a UI skin — the same graph
leakage principle #6 forbids, one layer higher. Instead, four
intent-based groups, each a dropdown revealing its concrete
destinations — specific names preserved, peer-level clutter removed:

| Nav group (top-level) | Reveals on open | Underlying lens(es) |
|---|---|---|
| Learn | Conditions, Visual Atlas | Disease Page, Visual Atlas |
| Practice | Clinical Cases, Procedures | Clinical Cases, (Procedure objects) |
| Review | Board Review, Quiz | Board Review, Curriculum/Rotation Path |
| — (no top-level item) | — | Personal Workspace — lives in the persistent right-rail panel instead (see below), not a nav destination |

**Search stays omnipresent** (⌘K), not inside any group.

**AI Assistant is deliberately not a nav destination anywhere** — no
top-level item, no dropdown entry. It lives in two places only: a
contextual "Ask AI" quick action inside the persistent Workspace panel,
and inline on evidence badges themselves (spec: AI explains what's
already on screen, it doesn't open a new surface).

**Personal Workspace revision — adopted from founder reference, an
improvement on the original nav-tab plan**: rather than a destination
users navigate away to, Personal Workspace renders as a **persistent
right-rail panel** present on every content screen — My Notes, saved
Clinical Pearls, Treatment Protocols, Flashcards, saved References, Ask
AI, Recent Notes, Recent Searches. This is more consistent with "one
graph, many honest views" than a separate destination would have been:
personal knowledge stays visible alongside whatever the user is already
reading, not gated behind a click away from it.

**MVP consequence unchanged**: only Learn (Conditions → Disease Page)
and Search are real at launch. The nav renders only what exists — no
grayed-out groups, no empty dropdowns for unbuilt lenses.

## Information Hierarchy
Within any single screen, the same three-layer order applies regardless
of lens:
1. **Primary answer** — the thing that satisfies the immediate intent,
   full width, first thing seen (e.g. the Exam section's maneuver list)
2. **Supporting depth** — evidence badges, one interaction away, never
   pre-expanded (Tier 2)
3. **Contextual rails** — "Worth knowing," "Consider also," quieter,
   positioned after the primary answer, never before it
Trust indicators and metadata stay small and corner-placed throughout —
present, never competing for primary attention (philosophy: "evidence
always visible but never intrusive").

## Empty States
An invitation, not an apology — never "Nothing here yet." Specifically:
- **New Personal Workspace**: framed as "Your PM&R Brain starts here,"
  with the action tied to whatever the user was just doing (most users
  should reach an empty workspace rarely, since saving from a Disease
  Page is the natural on-ramp — the empty state is a fallback, not the
  main path).
- **No search results**: never a dead end — suggest the closest
  available matches rather than stopping at "no results," consistent
  with "the interface should always feel lighter than the underlying
  complexity" (a blank search result feels like the graph failed, even
  when it's just narrow MVP content coverage).

## Loading States
Skeleton screens shaped like the final Knowledge Object Cards — not
generic spinners — so layout never jumps and the wait itself previews
the answer's shape. No technical language ever ("Fetching knowledge
objects" is graph leakage in words, not pixels). Motion stays subtle per
Tier 1: a loading state should feel like a beat, not an event.

## Error States
Say what happened, then what to do — one line, no raw error text, no
technical prefix. Critical, platform-specific rule: **an error state
must never be visually or linguistically confusable with a clinical
gap.** A failed request and "this diagnosis has no known treatment"
must never look the same — conflating a technical hiccup with clinical
uncertainty is a trust failure this platform specifically cannot afford,
given the whole product rests on the user trusting what's presented as
medical fact.

## Accessibility Principles
- Every Medical Illustration's `alt_text` (already a required schema
  field, schema-v1.0.sql) is surfaced to screen readers — accessibility
  was designed into the data model, not bolted on here.
- WCAG-compliant contrast for all text and badge colors, checked
  against the warm neutral background specifically (not just against
  white — the whole point of a warm base is that it isn't white).
- Cards are real interactive elements (button/link semantics), not
  clickable `<div>`s — screen readers must be able to navigate the
  Knowledge Object Card grid as a real list of actionable items.
- Minimum 44px touch targets throughout, already required by the
  mobile lookup context (spec §7), not an accessibility-only add-on.
- **Dark mode is a real requirement, not a nice-to-have**, for a
  specific and non-generic reason: residents study post-call, at odd
  hours, often in dark rooms (on-call rooms, next to a sleeping
  partner). This isn't aesthetic preference — it's a direct consequence
  of who actually uses this product and when.

## Tier 3 Complete
Foundations (Tier 1) → Components (Tier 2) → System Behavior (Tier 3)
are now all defined. Per the founder's explicit sequencing, page
assembly (starting with the Disease Page) can now begin — assembled
from these pieces, not designed independently of them.
