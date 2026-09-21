# Library sidebar — final

Reference: `LIBRARY-FINAL.png` · **source of truth**: `library-final.html`
Earlier explorations are in `_explorations/` and are **not** part of the build.

**Browsing** is a straight-line tree. **Reading** rises from the bottom of the sidebar as a
**dock** with three heights. The tree never leaves, so there is no "back" — the library is
always above the page, or one strip away.

---

## Accent tokens
| Token | Value | Use |
|---|---|---|
| `--acc` | `#0E9BA6` | guide lines on your path, chips, fills, progress, focus rings |
| `--acc-ink` | `#0A7680` | **small accent text on white** (open labels, current page, read counts) |
| `--acc-bg` | `#E1F4F5` | current-page row, read section chips |
| `--acc-bd` | `#B5E0E3` | borders on tinted chips |
| `--acc-dk` | `#7FD3DA` | accent text on navy (path, position) |
| inactive line | `#D0D7E1` | guide lines off your path |

**Why two accent shades:** `#0E9BA6` on white is about 3.4 : 1 — fine for lines, icons and fills,
too light for small text (needs 4.5 : 1). `#0A7680` is the same hue at about 5.4 : 1.

---

## 1 · Browsing — the tree
| Row | Spec |
|---|---|
| Group label | 9.5px / 900, +1.4px, `#9AA5B4` |
| Region | 13px / 700 `--ink`, 19px tile `#E7EBF4` radius 6, padding 6px 8px, radius 8 |
| Folder | same, 19px **amber** tile (`--amb-bg`, `#E6D2A8` border) |
| Page | 12.5px / 600 `--mute`, 5px dot `#B8C1CD` |
| Chevron | `›` closed / `⌄` open, regions and folders only |
| Guide line | **straight**, 1.5px, indent step 21px; `--acc` on your path, `#D0D7E1` elsewhere |
| Open row | label `--acc-ink`, chevron `--acc`, **no fill** |
| Current page | `--acc-bg` fill, `--acc-ink` 800, `--acc` dot, progress `%` right-aligned |
| Hover | `#EAEEF3` · Focus: 2px `--acc` ring, 2px white gap |

Rules: one open per level · folders before pages · wrap, never truncate · only the current page
is filled.

## 2 · Reading — the dock
Opening a page brings the dock up from the bottom of the sidebar. The tree stays above it.

### Journey
| Step | Sidebar |
|---|---|
| Open a page | dock rises to **half**; tree stays usable above; the page row gets `--acc-bg` and its % |
| Drag up | dock at **full**; tree collapses to a strip: "▴ Show the library" + current path |
| Drag down | dock tucks to **peek**; the tree has the whole sidebar; tap the bar to return |

### Three heights — snap only
| Height | Size | Contents |
|---|---|---|
| Peek | 64px | navy bar: progress ring, `STILL READING`, title, section, ▴ |
| Half | 55% of the sidebar | grip, navy header, `ON THIS PAGE`, sections |
| Full | all but a ~40px strip | same, more sections visible |

Drag the grip or use ▾ / ▴. **Snaps to the three heights, never in between.** Keyboard:
`Ctrl ↑` / `Ctrl ↓`. The last height chosen is remembered per user.

### Dock
| Part | Spec |
|---|---|
| Container | white, radius 14 14 0 0, top border `--line`, shadow `0 -10px 24px rgba(20,40,74,.12)` |
| Grip | 36 × 4px, `#C7CFDA`, centred in a 16px band; the whole band is the drag target |
| Header | navy card inside the dock, margin 0 8px, radius 10, padding 9px 11px 10px |
| Header eyebrow | `READING · 2 / 4` 9px / 900, +1.2px, `--acc-dk` |
| Header title | 14px / 900 white, wraps |
| Header button | ▾ / ▴ 24px, `rgba(255,255,255,.14)`, radius 7 |
| Progress | 3px, `--acc` on `rgba(255,255,255,.14)`; `#4FBF86` when complete |
| Caption | `46% · 22 min left` → `Read`, 10px / 700 `#9DB0CA` |

### Sections inside the dock
- `ON THIS PAGE` 9.5px / 900 `#9AA5B4`.
- Straight 1.5px line, **`--acc` down to the reading position, `#D0D7E1` below**:
  ```css
  .sections{
    padding-left:6px;
    background:linear-gradient(to bottom,
      var(--acc) 0, var(--acc) var(--progress),
      #D0D7E1 var(--progress), #D0D7E1 100%) left top/1.5px 100% no-repeat;
  }
  ```
- Section row: 18px numbered chip, 12.5px / 700. Read → `#A6B0BC`, chip `--acc-bg` /
  `--acc-ink`. Current → `--acc-bg` row, filled `--acc` chip.
- Sub-sections only under the current section, 11.5px; current `--acc-ink` / 800.
- End of page: green "Page complete" card, then a navy **"Next in [folder]"** card.

### Peek bar
Navy, radius 14 14 0 0, grip `rgba(255,255,255,.35)`. 30px ring (`--acc` on
`rgba(255,255,255,.16)`), `STILL READING` 8.5px / 900 `--acc-dk`, title 13px white,
`46% · section 3 of 6` 10px `#9DB0CA`, ▴ button 28px. The whole bar is a tap target.

### Full-height strip
White, bottom border `--line`, padding 8px 10px: 22px `--acc-bg` tile with ▴, "Show the library"
11.5px / 800 `--acc-ink`, current path right-aligned 10px `#9AA5B4`. Tap drops the dock to half.

### Dock rules
1. **No back needed.** The library is at worst one strip away.
2. **One page in the dock.** Opening another page replaces the contents; the previous page
   keeps its progress in the tree.
3. **Independent scroll.** Tree and dock scroll separately; the dock keeps the current section
   in view.
4. **Snap, don't drift.** Three heights only.

## Behaviour
- Scroll highlights the current section; clicking a section jumps. Never the reverse.
- A section is read only after ≥ 50% visible for 3 continuous seconds, or when the reader moves
  past it. A fast scroll to the bottom marks nothing.
- Progress persists per user per page; returning lands on the last section read.
- `Esc` drops the dock to peek. Numbers come from a field, never the title string.
- Tree: `role="tree"`, `aria-expanded`, arrow-key navigation; current page `aria-current="page"`.

## Open decision
The logo and Instagram posts use `#0B7A83`. `#0E9BA6` is the brighter chrome teal that was
previously reserved for dark backgrounds. Decide whether `--acc` replaces `--teal` platform-wide
or applies to navigation only.
