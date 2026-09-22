# Library home — the mix

Reference: `LIBRARY-HOME-MIX.png` · **source of truth**: `library-home-mix.html`
The pink numbered circles in the reference are annotations, not part of the design.

Greeting + centred search (find) → your progress → continue reading (personal) → topic of the week
(discover) → browse by area.

## Sections, top to bottom
| # | Section | Contents |
|---|---|---|
| 1 | Hero | centred. Greeting by time of day; H1 "What do you want to learn today?"; 58px search; "Browse:" chips |
| 2 | Your progress | overall ring, read vs tested by area, 12-week activity, recently completed, where to go next |
| 3 | Continue reading | 3 wide cards: thumbnail, title, section, progress bar. Hidden if nothing in progress |
| 4 | Topic of the week | navy feature, one per page |
| 5 | Browse by area | tabs for area, pills for region, list grouped by folder with type and progress |

## Hero
- **Centred**, padding **64px top, 56px bottom**, gradient `#F2F8F9 → #fff`, bottom border `#EEF1F5`.
- Greeting **22px / 600** `--mute`, name **900** `--navy`: "Good morning / afternoon / evening,
  Dr. Carolina". First visit: "Welcome, Dr. Carolina".
- H1 **42px / 900**, −1.5px, `--navy`, 10px below the greeting.
- Search 58px high, **max-width 760**, centred, 26px below the H1.
- Chips centred, 16px below the search.
- No progress chips here — the progress section sits directly below.

## Search
Height 56, radius 16, `0 8px 24px rgba(20,40,74,.07)`, max-width 880. Placeholder with real
examples. `⌘K` hint, navy button. Chips below link to filtered search results.

## Your progress
**Read is not the same as learned**, so each area shows two measures: pages read, and the
Question Bank score for that area.

| Card | Contents |
|---|---|
| Overall | 118px ring (`--acc` on `#EEF1F5`), pages read of total; "20% of the library"; `▲ 5 pages this week` in green; folders completed; questions answered |
| By area | one row per area: coloured square, name, 8px bar in the **area colour**, `read / total`, Q-bank chip |
| Activity | last 12 weeks, one 15px square per day, 5 levels from `#EEF1F5` to `#0A7680`; streak and best streak |
| Recently completed | green chips `✓ page name`, newest first, up to 6 |
| Where to go next | up to 2 suggestions, each with a reason and one button |

**Q-bank chip** — `≥ 70%` green "strong", `< 70%` amber "needs review", no questions answered grey "—".

**Where to go next — rules, in order:**
1. An area whose Q-bank score is below 70% → "review" the region with most missed questions.
2. An area not started → "start" its first region.
3. Otherwise → the next unread page in the area read most recently.

On a first visit the section is replaced by one line: "Your progress will appear here once you
start reading."

## Browse by area
**Tabs** — `All 186 · MSK 94 · Neurology 38 · Basic sciences 41 · Other topics 13`. 14px / 800;
active tab navy with a 3px underline **in the area's colour**; counts 11.5px `#9AA5B4`.

**Region pills** — one per region in the active area, with counts. Active pill navy with white
text. Right side: `Sort: Reading order ⌄` and a `Hide read` checkbox.

**List** — one bordered table, radius 14:
| Column | Content |
|---|---|
| Page | title 14px / 800 navy, indented under its folder; optional `NEW` (accent tint) or `UPDATED` (grey) tag |
| Type | neutral outlined tag: ANATOMY, BIOMECHANICS, EXAMINATION, CONDITION, REHABILITATION… |
| Progress | 90px bar + label: `✓ Read` green · `20% · 31 min left` accent · `25 min` grey for unread |
| › | chevron, the whole row is the link |

Folder header rows: 10.5px / 900 small caps, amber folder tile, page count.
Below the list: "Open Shoulder in the library ›" — opens the region in the sidebar tree.

**Type tags are deliberately neutral.** Colour already means area (MSK amber, Neurology
purple); coloured type tags would compete with it.

**Remembers the last tab and region.** First visit: MSK › Spine.

## Feature
`--navy`, radius 18, padding 26px 30px. Eyebrow `--acc-dk`; title 28px / 900 white; pitch
14.5px `#C8D3E2`; primary button `--acc`; secondary outlined white 25%. Artwork 240 × 150 on
`rgba(255,255,255,.06)`. **One feature per page.**

## Colour
Group colours (MSK amber, Neurology purple, Basic sciences `#0F8A6E`, Other green) appear only
in thumbnails and the small square beside a shelf title. Links, progress, buttons and the
selected sidebar row use the accent `#0E9BA6` / `#0A7680`.

## Data needed
- Reading progress per user per page (Continue, progress chips).
- Streak: days with at least one section read.
- A "topic of the week" field, set by an editor.
- Question Bank results tagged by area and region (for the Q-bank chips and "review" suggestions).
- Per-day reading activity (for the 12-week grid and streak).
- A **type** per page (anatomy, biomechanics, examination, condition, rehabilitation, …).
- Estimated reading time per page.
- `published_at` and `reviewed_at` per page (NEW / UPDATED tags, shown for 30 days).
- A thumbnail diagram for the continue cards and the feature — until one exists, use the
  region's diagram.
