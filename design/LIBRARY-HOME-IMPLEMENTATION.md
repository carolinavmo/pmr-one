# Implementing the library home page

## Commit first
```
design/
  LIBRARY-HOME-MIX-SPEC.md
  library-home-mix.html        ← source of truth
  ref/LIBRARY-HOME-MIX.png
```
The sidebar is a separate piece of work — see `LIBRARY-FINAL-SPEC.md`. This page only adds the
**Library home** row at the top of the tree.

---

## Before any code: the data audit
Most of this page is data, not layout. Ask Claude Code to report on all of it **before**
building, because each answer decides whether a section ships now or later.

| Needed for | Data | If missing |
|---|---|---|
| Browse list, chips | `type` per page (anatomy, biomechanics, examination, condition, rehabilitation, procedure) | add as a field; do not infer from the title |
| Browse list, continue | `reading_time` per page | estimate from word count ÷ 200 wpm |
| Counts on tabs, pills, chips | pages per area / region / type | compute server-side and cache |
| NEW / UPDATED tags | `published_at`, `reviewed_at` | tags simply don't show |
| Continue, progress, list progress | reading progress per user per page | **blocks sections 2 and 3** |
| Activity grid, streak | one row per user per day with pages or sections read | grid and streak hidden |
| Q-bank column, "where to go next" | Question Bank results tagged by area and region | column shows "—", suggestions fall back to "not started" only |
| Topic of the week | an editor-set field on one page, with a short pitch | section hidden |
| Card thumbnails | a diagram per page | fall back to the region's diagram, then to a plain tint |

**Also fix these first** — the browse list reads the same fields as the current Conditions page:
descriptions offset by one card, regions filed as conditions, "Disease Page" placeholder text
published, excerpts cut mid-word.

---

## Pass 1 — hero and browse by area
> Read `design/LIBRARY-HOME-MIX-SPEC.md` and open `design/library-home-mix.html`. That HTML is
> the source of truth — read its CSS for exact values rather than sampling the PNG.
>
> Build the library home page at the route the "Explore library" button points to, with two
> sections only:
>
> **Hero** — centred, padding 64px top / 56px bottom, gradient `#F2F8F9 → #fff`. Greeting by
> time of day with the user's title and first name; H1 42px; 58px search box (max-width 760)
> that submits to the existing search; "Browse:" chips linking to search filtered by type, each
> with a real count.
>
> **Browse by area** — tabs (All, MSK, Neurology, Basic sciences, Other topics) with counts;
> region pills for the active tab with counts; a list of that region's pages **grouped by
> folder**, each row showing title, type tag and reading time. Progress is added in Pass 2 —
> leave the column in place, empty.
>
> Rules: type tags are neutral grey outlines, never coloured. The active tab's underline uses
> the area colour. Folders come before loose pages. Titles wrap, never truncate.
>
> Before starting, run the data audit above and tell me what exists and what doesn't.

## Pass 2 — the personal sections
> Add, in this order, between the hero and the topic of the week:
>
> **Your progress** — ring (pages read of total), read + Q-bank per area, 12-week activity grid,
> recently completed chips, and "where to go next" with at most two suggestions using the rules
> in the spec. Any part without data is hidden rather than shown empty.
>
> **Continue reading** — three most recently read unfinished pages, newest first, each with its
> current section and progress bar.
>
> Then fill the **progress column** in the browse list: `✓ Read` green, `20% · 31 min left`
> accent, or the reading time in grey if unread.
>
> Everything here is per user. Cache it, and make sure a user with no history gets the
> first-visit version: greeting "Welcome, …", no Continue, and one line in place of Your progress.

## Pass 3 — topic of the week and artwork
> Add the navy feature panel driven by an editor-set field: eyebrow, title, pitch, "Start
> reading", "Save to handbook", and the meta line (region · time · reviewed date). One per page.
> Add thumbnails to the continue cards, using the page's diagram, then the region's, then a
> plain tint. Never use stock photography.

## Pass 4 — behaviour and polish
> 1. Remember the last tab, region, sort and "hide read" per user; first visit opens MSK › Spine.
> 2. `NEW` for pages published in the last 30 days, `UPDATED` for pages reviewed in the last 30
>    days; never both.
> 3. Sorting: reading order (default), A–Z, shortest first, recently updated.
> 4. Responsive: below ~1100px the browse list drops the type column; below ~800px the progress
>    cards stack and the pills scroll horizontally.
> 5. Accessibility: tabs are a real tablist with arrow-key navigation; the activity grid has a
>    text summary for screen readers ("6-day streak, 38 pages in 12 weeks"); every row is a
>    single link.
> 6. Performance: counts and per-area progress come from cached aggregates, not from counting
>    pages on each request.

---

## Guardrails to repeat
- **"Colour means area."** MSK amber, Neurology purple, Basic sciences `#0F8A6E`, Other green.
  Links, progress and buttons use the accent `#0E9BA6` / `#0A7680`. Type tags stay grey.
- **"Hide, don't fake."** A section with no data is removed, never filled with zeros or
  placeholder text.
- **"Read is not learned."** Never merge pages-read and Q-bank into one number.
- **"One feature per page."**

## Check it yourself
- New account: is the greeting "Welcome…", with no Continue and no progress section?
- Do the tab, pill and chip counts match the real number of pages?
- Open a page, read half, come back: does it appear in Continue with the right section?
- Does a page with no Question Bank questions show "—" rather than 0%?
- Switch tab and region, reload: does it reopen where you left it?
- Is any type tag coloured? → should not be
- Does the activity grid read sensibly in a screen reader?
