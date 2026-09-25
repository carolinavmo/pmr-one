# Flashcards — improved dashboard

Reference: `FLASHCARDS-D-dashboard.png` and `FLASHCARDS-D-topic.png`
**Source of truth**: `flashcards-progress-tiles.html`
Earlier layout options: `FLASHCARDS-folder-options.png` (progress tiles chosen)
(Pink circles in the reference are annotations.)

## What was wrong
1. **The counts measured the wrong thing.** "Total decks · total cards · in progress ·
   completed" tells you nothing about whether to study now.
2. **No primary action.** The page could not be used to *start studying* — only to open one deck
   at a time.
3. **The sidebar was the library tree**, which navigates somewhere else entirely.
4. **Folders as large colour tiles** used a quarter of the screen for four words, in colours
   that carried no meaning, and appeared twice ("Folders" and "My Folders").
5. **Decks showed "0 cards" and a Study button** that opens nothing.
6. **No spaced-repetition feedback at all** — no due counts, no forecast, no retention.

## Structure
| Region | Contents |
|---|---|
| Rail 252px | ＋ New deck · search · **Study** (Due today, All decks, Favourites) · **My folders** with due badges · **From the library** by subject |
| Header | title, one line, and three figures: **streak · retention · cards** |
| Session panel | navy: due count, estimated time, new/learning/review split, **Start review**, Custom session, seven-day forecast |
| Toolbar | search · filters (All / Due / In progress / Not started) · sort · grid or list · New deck |
| Folders | compact rows: colour swatch, name, deck and card counts, due badge |
| Decks | 3-per-row cards |

## Session panel
`--navy`, radius 18. Eyebrow `TODAY'S SESSION` in `--acc-dk`; headline **34 cards due · about
9 min** at 34px / 900 white; split shown with three dots — **new `#E8564B`**, **learning
`--acc-dk`**, **review `#4FBF86`**. Primary **▶ Start review** in `--acc`; secondary *Custom
session* outlined. Forecast: seven bars, today first, with weekday labels.

Estimate the time at roughly **6 seconds per card**, rounded to the nearest minute.

## Deck card
| Part | Spec |
|---|---|
| Tag | subject colour chip (MSK amber, Neurology purple, my decks accent) |
| Star | outline, `--gold` when favourited |
| Title | 17px / 900 navy |
| Source | "From the library · 28 cards" or "Created by you · 18 cards" |
| Counts | new / learning / known, with the same three colours |
| Bar | one 7px bar split in those proportions — mastery at a glance |
| Meta | last studied, and **due count in red** on the right |
| Action | **"Study 12"** when due · **"Review early"** when done today · **"＋ Add cards"** when empty |

## Rules
1. **The button says what it will do.** Never a bare "Study deck".
2. **Never offer a session that does not exist** — an empty deck offers Add cards; a finished
   deck offers Review early, styled as secondary.
3. **Colour means state**: red new, teal learning, green known. Subject colour lives only in the
   tag.
4. **The rail is the deck index**, not the library tree.
5. **Due counts appear everywhere they are actionable**: rail, folder, deck.

## Data needed
- Per card: state (new / learning / review), due date, ease or interval.
- Per deck: card counts by state, last studied, source (library page id or user-created).
- Per user: streak (days with at least one review), retention (% of review cards answered
  correctly over the last 30 days).
- Forecast: count of cards due per day for the next seven days.


---

# Progress tiles — the chosen layout

## Topic tile
| Part | Spec |
|---|---|
| Card | 2px border in the subject's border tone, background its tint, radius 18 |
| Ring | 96px, `conic-gradient(subject colour <known %>, tint 0)`, white 74px centre |
| Ring label | percentage 23px / 900 navy, `KNOWN` 9.5px / 900 `#9AA5B4` |
| Title | 17px / 900 navy · subtitle "3 decks · 84 cards" 11.5px `#9AA5B4` |
| State bar | one 6px bar split **new `#E8564B` / learning `#0E9BA6` / known `#4FBF86`** |
| Due badge | red pill "12 due"; when nothing is due, white pill "✓ up to date" in green |
| Star | top-right, `--gold` when the topic is favourited |
| Last tile | dashed "＋ New topic — group decks, or generate one from a library region" |

**Known %** = cards in the review state with an interval ≥ 21 days ÷ total cards. Whatever
definition you choose, use the same one in the ring, the bar and the topic page.

## "Fix these first"
Up to three decks ordered by **lapses in the last 7 days**, each with its subject swatch, the
reason ("8 lapses this week"), its bar and percentage, and a button — `Study 6` on the first,
`Later` on ones you have already handled today. A "Why these? ›" link explains the rule.

## Inside a topic
| Region | Contents |
|---|---|
| Breadcrumb | Flashcards › Topics › Foot & ankle |
| Header | the **same ring at 124px**, title, "3 decks · 84 cards · from MSK in the library", the state bar with a legend, and the actions: **▶ Study 12 due**, Custom session, ＋ New deck |
| Metrics | four tiles: due today · retention here · next review · lapses this week |
| Tabs | Decks · All cards · Statistics · Settings |
| Deck rows | subject swatch, name (★ if favourite), "28 cards · from the library · studied yesterday", bar, percentage, and a button that names the action: **Study 12 / Review early / Open** |
| New deck row | dashed: "＋ New deck in Foot & ankle · or generate one from a library page" |
| Weak cards | the actual questions that keep failing, with **Edit** and **Study** |

**The topic page is the tile, enlarged.** Same ring, same colours, same state bar — so opening a
tile feels like zooming in rather than arriving somewhere new.

## Rules
1. **The ring is the topic's identity.** Same colour and same percentage everywhere it appears.
2. **Every button names its size** — "Study 12 due", never "Study".
3. **Nothing due is a state, not an absence** — show "✓ up to date", never an empty tile.
4. **Weak cards are shown as questions**, not ids — that is what makes the list act­ionable.
5. Topic colours come from the **Candy palette** below — one hue per topic, not per deck.

## Topic palette — Candy
Compared in `FLASHCARDS-palettes.png` (source `flashcards-palettes.html`).

| Colour | Ring / badge | Tint (card) | Border |
|---|---|---|---|
| Orange | `#FF8A3D` | `#FFF1E4` | `#FFD6B8` |
| Pink | `#F0569A` | `#FFEAF3` | `#FFC6DD` |
| Violet | `#7B61FF` | `#F0ECFF` | `#D6CCFF` |
| Mint | `#17BF9A` | `#E1FBF4` | `#B3F0E1` |
| Sky | `#2EA8FF` | `#E6F4FF` | `#BCE0FF` |
| Sunny (spare) | `#FFC53D` | `#FFF7E0` | — |
| Coral (spare) | `#FF6B6B` | `#FFECEC` | — |
| Lime (spare) | `#9BD24A` | `#F1FAE2` | — |

Eight colours so a new topic always has a free one. Assign on creation, let the user change it,
and keep it for good.

**Two rules that do not change with the palette**
- The colour belongs to the **topic**, not the deck — every deck inside shows its topic's colour.
- **State colours are fixed**: new `#E8564B`, learning = the topic colour, known `#4FBF86`.
  The bar means the same thing on every tile.

**Where the bright palette does not go:** the navigation stays navy and `#0E9BA6`, and library
content colours (pearls, red flags) are unchanged. These eight are for topics only — otherwise
the platform starts to look like a different product on every page.


---

# The card itself — study screen

Reference: `FLASHCARDS-card-screens.png` · source `flashcards-card-screens.html`

Studying is a **separate screen**: no navbar, no sidebar. Three states — front, back, session
complete.

## Chrome (all states)
| Part | Spec |
|---|---|
| Close | 34px outlined button, top left — returns to the topic |
| Deck | topic colour square, deck name 14.5px / 900, topic name in grey |
| Remaining | new / learning / review counts with their state colours, always visible |
| Card actions | ★ favourite · ✎ edit · ⚑ flag · ⋯ — 34px outlined, top right |
| Progress | 5px bar under the header, filled in the **topic's colour** |

## Front
Card 820px wide, 2px border in the topic's border tone, radius 24, `0 12px 34px rgba(20,40,74,.07)`.
Tags above the question: topic, and the card's state (`NEW CARD`, `LEARNING`, `REVIEW`).
Question **36px / 900 navy, centred**. Then the hint line and **Show answer** (navy, `space`).
Under the card: "4 of 12 · about 3 min left".

## Back
The question shrinks to 17px / 800 grey above a rule; the answer takes its place:
- **Answer line** 30px / 900 navy, centred — the thing to remember.
- **Explanation** 17px / 1.6, left aligned.
- **Highlight cards allowed** — a pearl in a flashcard looks exactly like a pearl in the library.
- **Source line**: "From Foot & ankle › Achilles tendinopathy · reviewed Aug 2026", linked.

### Grading
Four buttons, each **naming the interval**, with its keyboard number:
| Button | Interval | Colour |
|---|---|---|
| Again | `< 1 min` | red tint `#FDF0EF` / `#E8564B` |
| Hard | `6 min` | amber tint `#FEF7E8` / `#A8760F` |
| Good | `1 day` | green tint `#EDF9F2` / `#1F7A4D` — also `space` |
| Easy | `4 days` | blue tint `#EDF6FD` / `#1E6FB8` |

**Never hide the interval.** The number is what the grade means; a bare "Good" makes people
guess.

## Session complete
Ring with accuracy, "12 cards done in 3 min 20 s", and the line that matters — **what the topic's
percentage did** ("now 62% known — up 4 points"). Three figures: correct, to see again today,
streak. Then the next action: **Study the next deck · 9 due**, or back to the topic, and when the
deck returns.

## Rules
1. **One card, nothing else.** No navigation during a session.
2. **Space does the common thing** — reveal, then Good.
3. **Keyboard 1–4 grade**; every action reachable without the mouse.
4. **Every card names its source** and links to it.
5. **Finishing is a moment**, not a dead end — always offer what comes next.


---

# Empty and early states

Reference: `FLASHCARDS-empty-first-visit.png` · `FLASHCARDS-empty-few-topics.png`
Source: `flashcards-empty-states.html`

**The dashboard is never empty.** With nothing studied, its job changes from "what is due" to
"what is there to learn", and the library's topics become the page.

## First visit — no decks at all
| Region | Contents |
|---|---|
| Rail | Due today and All decks greyed at 0; under TOPICS, one line: "Add a topic to see it here"; **From the library** lists subjects with their card counts |
| Start panel | navy, `START HERE` → **"Pick a topic and the cards are ready"**, one paragraph, **Add my first topic** and **＋ Build a deck** |
| Topics from the library | every library topic as a tile: coloured icon, name, "3 decks · 84 cards", three example deck titles, and **＋ Add topic** |
| Footnote | "Adding a topic copies its decks into your account — you can edit any card, and your progress is yours." |

No session panel, no forecast, no streak — none of them have data, and showing them at zero
teaches nothing.

## Library topic tile
Same colours as a real topic, different content: **an icon, not a ring** (there is no progress
yet), the deck and card counts, up to three deck titles so the topic is concrete, and the add
button. Once added it becomes **✓ Added** (filled) and the real tile appears above.

## Early — one to three topics
Once anything is started:
- The **session panel returns**, sized to what exists ("9 cards due · about 2 min").
- **Your topics** shows what was added, with "2 of 8" beside the heading.
- **Add from the library** stays underneath, with the remaining topics — the page keeps offering
  the next thing instead of looking finished.
- The rail shows added topics under TOPICS and the rest under FROM THE LIBRARY.

Keep the library section visible until the user has added **five topics or more**, then collapse
it to a single row: "Add from the library · 3 topics left ›".

## Rules
1. **Never show a blank slate.** If there is nothing of the user's, show the library's.
2. **Never show a statistic at zero.** No 0% ring, no empty forecast, no "0-day streak".
3. **One tap to start.** Add topic → decks copied → study immediately; no wizard.
4. **Say what adding does** — copied, editable, progress is theirs.
5. The first tile a user creates should look exactly like the ones they will have later.


---

# The dashboard — final order

Reference: `FLASHCARDS-D-dashboard.png` · **source of truth**: `flashcards-dashboard-final.html`

| # | Section | Why it is here |
|---|---|---|
| 1 | **Today's session** | the reason the page exists — start studying |
| 2 | **Browse the library** | every topic, grouped by subject; a card opens the topic |
| 3 | **Your progress** | three panels: what you know, how much you study, how well it sticks |
| 4 | **Progress by topic** | the rows, which are a second way into a topic |

## Browse the library
**There is no "add topic" step.** Every library topic is always available: a card opens the
topic, and the decks are chosen there. Nothing is copied, so a card fixed in the library is
fixed for everyone, and a user's progress is simply their own scheduling state on shared cards.

### Subject separators
Topics are grouped by subject, each group introduced by a separator row:
`● MSK   4 topics · 245 cards ──────────────── See all ›`
- 11px colour square, label 12px / 900 with +1.6px tracking in the subject colour, counts in
  `#9AA5B4`, a hairline to the right and **See all ›**.
- Subject colours: MSK `#A8760F` · Neurology `#5A479C` · Basic sciences `#0F8A6E` ·
  Other `#1F7A4D` — these are the **library's** colours; the bright Candy palette stays on the
  topic cards themselves.
- Four cards per group on the dashboard; the rest behind See all.

### Topic card
Deck-of-cards style: two decorative edges, count badge on the corner, name, deck count, up to
three deck titles, then a footer with **where you are** and **Open ›**:

| Footer state | Shown when |
|---|---|
| `12 due` in red | the user has cards due in that topic |
| `✓ up to date` in green | studied, nothing due |
| `Not started` in grey | no reviews yet |

One card, three audiences — someone who has never opened it, someone mid-way, someone finished
for today.

Three panels answering three questions, then the topics as rows so the section still navigates.

## Panel 1 — What you know
104px ring (`--kn` on `#EEF1F5`), `142 of 307` 19px / 900, "cards known", and the month's change
in green. Below: learning and not-started counts. Then **Next milestone** — the next round
number of known cards, a progress bar and "8 to go · about 2 sessions" (remaining ÷ average
known-per-session).

## Panel 2 — Cards reviewed, last 16 weeks
One bar per week, `--acc-dk`, current week in `--acc`. Axis labels at each end only. Below:
total reviews, weekly average, and the weekday the user studies most.

## Panel 3 — How well it sticks
Retention 34px / 900 with its 30-day change, then a **12-week study-day grid** (13px squares,
five levels from `#EEF1F5` to `#17BF9A`) and one line: current streak, best streak, and days
studied out of the last 84.

## Progress by topic
A row per topic: colour bar, name, "3 decks · 84 cards", the three-part bar, the percentage, and
the due count (green "✓ up to date" when there is none). **Each row is a link to the topic** —
this is what replaces the tiles as the way in, so it must stay.

## Rules
1. **Every number carries a trend** — ▲ 38 this month, ▲ 4 pts, best day, best streak. A bare
   number says nothing about whether the person is improving.
2. **Never show a panel with no data.** Under 20 reviews, hide retention; under two weeks, hide
   the bar chart; a new user sees the tiles version instead (state S1 in
   `FLASHCARDS-DASHBOARD-STATES.md`).
3. **The rows navigate.** Losing the tiles must not lose the way into a topic.
4. **Milestones are round numbers of known cards** (50, 100, 150…), never streaks — streaks
   punish a missed day, and a missed day is not failure.

## When to use which
| | Tiles (`FLASHCARDS-D-dashboard.png`) | Progress section (this) |
|---|---|---|
| Best for | choosing what to study | seeing whether it is working |
| New user | yes | no — not enough data |
| After a month | still fine | better |
| Navigation | the tile is the way in | the row is the way in |

**Why the library sits above progress:** after "study now", the dashboard's job is to get people
into a topic; progress rewards what they have already done. If the library section grows past
about three groups, collapse the empty ones (`Not started` only) behind their **See all**, rather
than moving progress down.

**What this simplifies.** With no add step there is no copying, no `source_card_id`, no sync
problem and no per-user duplicates: topics are library regions, decks are library decks, and the
only user-owned rows are the scheduling state per card, the review log, and any decks the user
creates themselves.
