# Implementing the library sidebar

## Commit first
```
design/
  LIBRARY-FINAL-SPEC.md
  library-final.html        ← source of truth
  ref/LIBRARY-FINAL.png
```
Only these. Do not commit `_explorations/` — it contains rejected designs that will confuse
the build.

## Settle the data first
Folders as a real content type · section number as its own field · word count per section ·
ordered pages per folder · a place to store per-user read state. If any is missing, fix the data
before Pass 1.

---

## Pass 1 — tokens and the tree
> Read `design/LIBRARY-FINAL-SPEC.md` and open `design/library-final.html`. That HTML is the
> source of truth — read its CSS for exact values rather than sampling the PNG.
>
> Add the accent tokens from the spec (`--acc`, `--acc-ink`, `--acc-bg`, `--acc-bd`,
> `--acc-dk`). Use `--acc-ink` for any small accent text on white — never `--acc`.
>
> Rebuild the Explore tree as the straight-line tree: regions, amber-tiled folders, dotted
> pages, 1.5px straight guide lines at a 21px indent step, `--acc` on the open path and
> `#D0D7E1` elsewhere. One open per level, folders before pages, wrap instead of truncating.
> Only the current page gets a fill.
>
> Build for Musculoskeletal first and show me a screenshot. Before starting, tell me how the
> tree data is shaped and whether folders and section numbers exist as fields.

## Pass 2 — the reading dock
> When a page is opened, a dock rises from the bottom of the sidebar, as described in
> `LIBRARY-FINAL-SPEC.md` section 2. **The tree is never replaced** — it stays above the dock.
>
> Build the layout first, without dragging: the sidebar is a flex column of the search field,
> the tree (`flex:1; min-height:0; overflow:auto`) and the dock (fixed height). Implement the
> three heights — **peek 64px, half 55%, full = all but a 40px strip** — switched by the ▾ / ▴
> buttons and `Ctrl ↑ / Ctrl ↓`. At full, replace the tree with the "▴ Show the library" strip.
>
> Dock contents: navy header card (eyebrow, title, ▾ button, progress bar, caption), then
> `ON THIS PAGE` and the numbered sections on a straight line. Peek shows only the navy bar with
> a progress ring. Tree and dock scroll independently.
>
> Opening another page from the tree swaps the dock's contents and keeps the dock's height.
> Remember the last height per user.

## Pass 2b — dragging
> Add dragging on the grip band using Pointer Events (one code path for mouse and touch).
> While dragging, follow the pointer; on release, **snap to the nearest of the three heights**
> with a 180ms ease. Never leave the dock at an in-between height. Respect
> `prefers-reduced-motion` by snapping without animation. The grip is a button with
> `aria-label="Resize reading panel"`; keyboard users use the ▾ / ▴ buttons.

## Pass 3 — scroll, progress, read state
> 1. Scroll-spy with one IntersectionObserver on the article's section headings
>    (`rootMargin: '-96px 0px -60% 0px'`); current = topmost intersecting heading.
> 2. While a click-scroll is running, ignore the observer; clear on `scrollend` (700ms fallback).
> 3. Read = ≥ 50% visible for 3 continuous seconds, or passed by the reader.
> 4. Set `--progress` on the sections list, the dock header bar and the peek ring from the
>    article's scroll ratio, throttled with requestAnimationFrame. Time left = words remaining
>    ÷ 200 wpm. Also mirror the percentage onto the page's row in the tree.
> 4b. Auto-scroll the dock's section list to keep the current section in view — without ever
>    scrolling the tree.
> 5. At 100%: bar turns green, show "Page complete" and "Next in [folder]".
> 6. Persist `{readSections, lastSection, progress}` per user per page; debounce 2s.

---

## Check it yourself
- Is any small accent text in `#0E9BA6` on white? → should be `#0A7680`
- Open Spine, then Shoulder — does Spine close?
- Are guide lines straight, with only your path in the accent colour?
- Open a page — does the dock rise to half with the tree still usable above?
- Drag the grip and let go midway — does it snap to a height, never stop in between?
- At full, is "Show the library" visible and one tap from the tree?
- At peek, does tapping the bar bring the dock back?
- Open another page from the tree — does the dock swap contents and keep its height?
- Do the tree and the dock scroll independently?
- Scroll fast to the bottom — is anything marked read? → should not be
- Leave and come back — does it land on the section you left?
