# Clinical tools — dashboard

Reference: `TOOLS-dashboard-colour.png` · **source of truth**: `tools-dashboard-colour.html`
Sidebar alternatives considered: `TOOLS-sidebar-options.png` (option 5 chosen)

## What was wrong with the current page
1. Titles cut mid-word — "FIM - Functional Independenc…", "IADL - Lawton-Brody Instrume…"; descriptions too.
2. The abbreviation is repeated inside every title: "BI - Barthel Index".
3. The same generic icon on every card — 40px carrying no information.
4. Favourites duplicate the cards below with nothing to show they are the same tool.
5. The sidebar shows the **library tree** while the user is in Clinical Tools.
6. No filtering or sorting, and nothing about length, time or population before opening a tool.

## Sidebar — expandable, with tool names
The sidebar is the tool index: categories open to reveal the calculators inside, so any tool is
reachable without touching the main list.

| Section | Contents |
|---|---|
| Search | "Find a calculator…", sticky at the top |
| ★ Favourites | expandable, open by default, gold tint header |
| CATEGORIES | five expandable categories with counts |
| BY POPULATION | plain links with counts — Stroke, Spinal cord injury, Older adults, Low back pain |

### Rows
| Part | Spec |
|---|---|
| Category header | 12.5px / 800, 9px colour square, count right, chevron `›` closed / `⌄` open, radius 8 |
| Header, open | background `--tint`, label in `--c` |
| Tool row | 11.5px / 600 `--mute`, indented 12px, wraps to two lines |
| Abbreviation chip | 9px / 900 on `--tint` in `--c`, radius 4 |
| Tool row, hover | white background |
| Tool row, current | white, navy 800, soft shadow, chip **solid `--c` with white text** |
| Population row | 12px / 700, count right |

### Behaviour
1. **One category open at a time.** Opening another closes the previous one, so the sidebar
   never becomes a long scroll.
2. **Favourites open by default**; collapsing it is remembered.
3. **Opening a calculator keeps the sidebar** — its category opens and the tool is marked, so
   neighbouring tools stay one tap away.
4. **Search filters the sidebar too**: matching categories auto-open and non-matching tools are
   hidden.
5. A category with no tools is hidden. Counts always come from real data.
6. Tool names **wrap, never truncate**.

## Header
`Clinical tools` 34px / 900; one line with the total count. Search 48px, placeholder
"Search by name, abbreviation or what it measures…", `⌘K` hint, with a "Try:" hint line
underneath. A **Cards / List** segmented control on the right.

## Card
| Part | Spec |
|---|---|
| Abbreviation chip | 11px / 900, +0.6px, category colour on its tint, 1px border, radius 7 |
| Star | 17px, `#C6CED8` outline; `#E8A317` filled when favourited; toggles on the card |
| Name | **16px / 900 navy, wraps to two lines — never truncated** |
| Description | 13px / 1.5 `--mute`, two lines, min-height reserved so cards align |
| Meta | `▤ 10 items` · `◷ 5–10 min` · optional `Used 3× this week` chip in accent |
| Population | 11.5px `#B4BDC8`, above a 1px hairline |

Single items read "1 item"; a tool without a fixed item count reads "Full exam".
Hover: `0 8px 20px rgba(20,40,74,.09)`, border `#C6D0DC`.

## Category colours — four values each
| Category | `--c` text / chip | `--tint` card | `--bd` border | Used on |
|---|---|---|---|---|
| Independence | `#0A7680` | `#F0FAFB` | `#CFE9EB` | chip fill, meta text, section band, sidebar row |
| Neurological | `#5A479C` | `#F6F4FC` | `#DED7F1` | " |
| Mobility & balance | `#1F7A4D` | `#F1F9F4` | `#CFE8DA` | " |
| Pain | `#B8262B` | `#FEF5F5` | `#F6D9DA` | " |
| Cognition & mood | `#8A5F08` | `#FEF9EE` | `#F0E3C6` | " |
| Favourites | `#E8A317` | `#FEF6E3` | `#F1E2BF` | band only |

**Where the colour goes**
- **Card** — background `--tint`, border `--bd`, hairline above the population line `--bd`.
- **Abbreviation chip** — solid `--c`, white text.
- **Meta line** (items · time) — `--c` at 800. The "used" chip is white with a `--bd` border.
- **Section band** — full-width, `--tint` background, `--bd` border, **5px left border in `--c`**,
  title in `--c`.
- **Sidebar** — category rows carry a 3px left border and a `--tint` background.
- Titles stay navy and body text stays `--mute` in every category, so only the *frame* is
  coloured, never the reading text.

## How much colour — three levels
| Level | Card | When |
|---|---|---|
| 1 Subtle | white card, 4px left edge in `--c`, chip only | if the page must stay quiet |
| **2 Tinted (chosen)** | tinted background + border + coloured meta | groups readable at a glance, text still calm |
| 3 Headed | solid `--c` strip across the top with the category name | if category matters more than the tool name |

## Sections
Favourites first, inside a gold band (`#FDF6E6`, 1px `#F1E2BF`, radius 16), then one section
per category with a coloured dot, count and "See all ›". Three cards per row.
Favourited tools keep a **filled star** in their category section, so the duplicate is visibly
the same tool.

## Rules
1. **Never truncate a tool name.** Wrap to two lines.
2. **The abbreviation lives in the chip**, never in the title.
3. **Items, time and population come from the tool page** — one source, shown in both places.
4. **Categories are single**; a tool belongs to one. Populations are many — use tags for those.
5. Empty categories are hidden.
