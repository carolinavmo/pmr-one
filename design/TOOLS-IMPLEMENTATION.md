# Implementing the Clinical Tools dashboard

## Commit first
```
design/
  TOOLS-DASHBOARD-SPEC.md
  tools-dashboard-colour.html     ← source of truth
  ref/TOOLS-dashboard-colour.png
```
`TOOLS-sidebar-options.png` is exploration — do not commit it.

---

## Data audit — ask before building
The page mostly renders fields. Have Claude Code report on each before any code.

| Needed for | Field | If missing |
|---|---|---|
| Category colour, sections, sidebar | **one** category per tool (independence, neurological, mobility, pain, cognition) | the page can't be built — add it first |
| Card meta | `items` (integer, nullable) and `duration` (text, e.g. "5–10 min") | show `Full exam` when items is null; hide the time if absent |
| Card footer | `population` — who the tool is for | hide the line |
| Sidebar "By population" | population **tags** (many per tool) — not the same as the single `population` line | drop that section |
| Favourites | per-user favourites | drop the section and the stars |
| "Used 3× this week" | per-user usage log | drop the chip |
| Abbreviation chip | `abbreviation` separate from `name` | **most likely missing** — today's titles read "BI - Barthel Index"; split them |

**The titles almost certainly need splitting.** "BI - Barthel Index", "mRS - Modified Rankin
Scale", "IADL - Lawton-Brody Instrumental Activities of Daily Living Scale" are one string now.
Split into `abbreviation` + `name`, and fix the names while you're there — the current ones are
long enough to have caused the truncation in the first place.

---

## Pass 1 — data and tokens
> Read `design/TOOLS-DASHBOARD-SPEC.md` and open `design/tools-dashboard-colour.html` — that
> HTML is the source of truth; read its CSS for exact values rather than sampling the PNG.
>
> First, report on the data audit above. Then:
>
> Add **four CSS custom properties per category** (`--c`, `--tint`, `--bd`, plus the text use of
> `--c`), set from a `data-category` attribute — never hard-coded per component.
>
> Split `abbreviation` from `name` on every calculator and update the seed data. Show me the
> before/after list of all 19 before applying it.

## Pass 2 — cards and sections
> Rebuild the calculator card: abbreviation chip (solid `--c`, white text), star, **full name
> that wraps and never truncates**, description clamped to two lines, meta line in `--c`
> (`▤ 10 items · ◷ 5–10 min`), and the population line above a `--bd` hairline.
>
> Group the grid into sections, each with a **banded header**: `--tint` background, `--bd`
> border, 5px left border in `--c`, title in `--c`, count, "See all ›". Favourites first in the
> gold band. Three cards per row; equal heights within a row.
>
> Rules: the card background is `--tint` and the border `--bd`; titles stay navy and
> descriptions stay grey in every category. Hide empty categories.

## Pass 3 — the expandable sidebar
> Replace the library tree on this route with the tool index from the spec: search, ★ Favourites
> (open by default), the five categories, and "By population".
>
> Each category expands to its tools, each row showing an abbreviation chip and the full name,
> wrapping to two lines. **One category open at a time.** Opening a calculator keeps the sidebar,
> opens that tool's category and marks the tool (white row, solid chip).
>
> Typing in the sidebar search filters it: matching categories auto-open, non-matching tools hide.
> Remember the open category and whether Favourites was collapsed.
>
> Accessibility: each category header is a `button` with `aria-expanded`; the tool list is a
> `ul`; the current tool carries `aria-current="page"`; the whole sidebar is keyboard reachable.

## Pass 4 — favourites, usage and list view
> 1. Star toggles on the card and in the tool page header, optimistic, persisted per user.
> 2. Favourited tools keep a **filled star** in their category section — the duplicate is
>    intentional and must stay in sync.
> 3. Log tool opens; show "Used 3× this week" only above 2 uses in the last 7 days.
> 4. Build the **List** view behind the Cards/List toggle: a table of code, name, category,
>    items, time, star — sortable by name, time and items. Remember the choice.
> 5. Responsive: two cards per row under ~1200px, one under ~820px, and the sidebar becomes a
>    "Categories" sheet from the top.

---

## Guardrails
- **"Never truncate a tool name."** Wrap to two lines, in cards and sidebar alike.
- **"The abbreviation lives in the chip"**, never in the title.
- **"One category per tool; many populations."**
- **"Colour is the frame, not the text."** Card background, border, chip and meta take the
  category colour; titles stay navy, descriptions grey.
- **"Items, time and population come from the tool page"** — one source, two places.

## Check it yourself
- Is any card title cut off, at any width? → should not be
- Does any title still contain its abbreviation ("BI - Barthel Index")? → should not
- Open Neurological, then Mobility — does Neurological close?
- Open a calculator: is its category open, with the tool marked?
- Search "balance" in the sidebar: do matching categories open and the rest hide?
- Favourite a tool from a category card: does the Favourites section and the sidebar update?
- A tool with no item count: does it read "Full exam" rather than "0 items"?
