# Prompt for Claude Code — three highlight card variants

## Commit first
```
design/
  CARDS-VARIANTS-SPEC.md
  cards-variants.html        ← source of truth
  ref/CARDS-VARIANTS.png
```

## The prompt

> Read `design/CARDS-VARIANTS-SPEC.md` and open `design/cards-variants.html`. That HTML is the
> source of truth — read its CSS for exact values rather than sampling the PNG.
>
> **Goal:** build our highlight / callout cards as **one component with three switchable
> variants** — `hairline`, `header` and `framed` — so I can compare them on real pages and pick
> one. Do not delete the losers yet; I will choose after seeing them in place.
>
> **1. Find what exists.** Before writing anything, list every callout, highlight or "pearl" box
> currently in the codebase and content (for example "PM&R Clinical Pearl"), with where each is
> used and how it is authored (component, markdown syntax, CMS field). Tell me how many kinds
> there are and how they map to these five types: `pearl`, `flag`, `exam`, `clinic`,
> `definition`. **Ask me before inventing a type or a colour** for anything that does not map.
>
> **2. Tokens.** Add the four colours per type from the spec (`--c`, `--cb`, `--cd`, `--cm`) as
> CSS custom properties, set by a `data-type` attribute or class — not hard-coded per variant.
> Use `#8A5F08` for the pearl label, not `#A8760F`.
>
> **3. One component.** `HighlightCard` with props `type` and `variant`. All three variants share
> the same markup — label element, then body — and differ **only in CSS**. The label is always
> rendered, always uppercase, taken from the type (not typed by authors). No icons.
>
> **4. A site-wide switch.** Make the variant a single setting (a config value or a
> `data-card-variant` attribute on `<html>`), so changing it restyles **every card on every
> page** at once. Individual cards must not override it.
>
> **5. A preview page.** Add a dev-only page at `/dev/cards` that shows all five types in all
> three variants side by side, like the reference, plus one real article with the switch at the
> top so I can flip between variants on real content.
>
> **6. Migrate the existing cards** to the new component, keeping their text exactly as it is.
> Do not rewrite, shorten or re-bold any content.
>
> Constraints: Roboto only; no new colours beyond the spec; keep the navigation accent
> `#0E9BA6` out of cards; cards must remain readable in dark mode if we have one — tell me if we
> do before styling it.
>
> Show me screenshots of `/dev/cards` in each variant before migrating the existing cards.

## Check it yourself
- On `/dev/cards`, do all 15 combinations (5 types × 3 variants) match the reference?
- Flip the site-wide switch — does every card on a real article change at once?
- Is there any icon on any card? → should not be
- Is the pearl label `#8A5F08`?
- In `framed`, are the inner corners even (outer 18px, inner 14px)?
- Did any existing card's text change during migration? → should not
