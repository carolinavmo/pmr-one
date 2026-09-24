# Implementing Flashcards

## Commit first
```
design/
  FLASHCARDS-SPEC.md
  flashcards-progress-tiles.html   ← dashboard + topic page
  flashcards-card-screens.html     ← the study screen
  ref/FLASHCARDS-D-dashboard.png
  ref/FLASHCARDS-D-topic.png
  ref/FLASHCARDS-card-screens.png
  ref/FLASHCARDS-palettes.png
```

---

## Before any code: the scheduler
Everything on these screens is an output of the spaced-repetition scheduler. Settle this first.

| Question | Why |
|---|---|
| **Is there a scheduler at all**, or does "Study deck" just show cards in order? | If there is none, passes 2–4 have nothing to display |
| **Which algorithm** — SM-2, FSRS, or something homemade? | It decides the four intervals shown on the buttons |
| **Is every answer logged** (card, grade, timestamp, interval before and after)? | Retention, streak, lapses and "fix these first" all come from that log, not from the card row |
| **Card states**: new / learning / review, with due date and interval? | The counts, the bars and the ring all depend on them |
| **Topics**: do folders exist, can a deck belong to one, and does a topic have a colour? | The tiles are topics, not decks |
| **Deck source**: can a deck point at a library page? | The "From the library" line and the card's source link |

**Do not invent a scheduler.** If none exists, implement **SM-2** — it is short, well documented
and predictable — and keep the review log complete from day one, so you can move to FSRS later
without losing history.

---

## Pass 1 — data, tokens, palette
> Read `design/FLASHCARDS-SPEC.md`. Report on the scheduler questions above before writing code.
>
> Add the **Candy palette** as tokens: eight topics, each with `--topic`, `--topic-bg`,
> `--topic-bd`. A topic stores a palette key, not a hex value. Assign a free one on creation,
> and let the user change it.
>
> Add the fixed **state colours**: new `#E8564B`, known `#4FBF86`; learning uses the topic's
> colour. These never change per topic.

## Pass 2 — the study screen (build this first)
> This is the feature. Route `/flashcards/study?deck=…` or `?topic=…`, with **no navbar and no
> sidebar**.
>
> Front: chrome (close, deck, remaining counts, card actions), progress bar in the topic colour,
> card with the question, "Show answer".
> Back: question shrinks, answer appears, four grading buttons **each showing its own interval,
> taken from the scheduler** — never hard-coded.
> Keyboard: `space` reveals, then `space` = Good; `1–4` grade; `Esc` exits; `E` edits; `S` stars.
>
> Answers render rich content — text, images, and our highlight cards from `CARDS-SOFT-SPEC.md`.
> Each card shows its source when the deck has a library page, linked.
>
> Then **Session complete**: accuracy, time, how the topic's percentage moved, streak, and the
> next action.
>
> Write the review log on every grade, before the UI advances. If the write fails, queue it and
> retry — never lose a review.

## Pass 3 — the topic page
> `/flashcards/topic/:id`. Header is the tile enlarged: 124px ring, title, "3 decks · 84 cards ·
> from MSK in the library", state bar with legend, and actions (**Study N due**, Custom session,
> New deck).
> Four metrics: due today · retention here · next review · lapses this week.
> Tabs: Decks · All cards · Statistics · Settings.
> Deck rows: swatch, name, "28 cards · from the library · studied yesterday", bar, percentage and
> a button that names the action (Study 12 / Review early / Open).
> Then **weak cards in this topic** — the actual questions with the most lapses, with Edit and Study.

## Pass 4 — the dashboard
> Rail (Due today, All decks, Favourites, Topics with due badges, From the library), header with
> streak / retention / cards, the navy session panel with the seven-day forecast, the topic tiles,
> and "Fix these first".
>
> Definitions to implement exactly once and reuse everywhere:
> - **known %** = cards in review with interval ≥ 21 days ÷ total cards
> - **retention** = correct review answers ÷ review answers, last 30 days
> - **streak** = consecutive days with ≥ 1 review, in the user's timezone
> - **estimated time** = cards × 6 s, rounded to the minute
>
> "Fix these first" = decks ordered by lapses in the last 7 days, top three.

## Pass 5 — the edges
> 1. **Empty states**: no decks, no cards in a deck, nothing due today — each says what to do next.
> 2. **Mobile**: the study screen is the same, full-bleed; grading buttons become a 2×2 grid.
> 3. **Offline**: queue grades locally and sync; the session must survive a dropped connection.
> 4. **Accessibility**: the card is a live region, buttons are real buttons with labels including
>    the interval ("Good, next in 1 day"), and the ring has a text equivalent.
> 5. **Performance**: counts and percentages come from cached aggregates, recomputed on review.

---

## Guardrails
- **"The interval is the label."** Never show a grading button without its next interval.
- **"One card, nothing else."** No navigation inside a session.
- **"The colour belongs to the topic."**
- **"State colours are fixed."** New red, known green, learning = topic.
- **"Never lose a review."** The log is the source of truth for every number on the dashboard.

## Check it yourself
- Grade a card "Again" — does it come back in the same session?
- Do the four buttons show intervals that change as a card matures? → they should
- Close mid-session and return — does it resume where you left off?
- Answer a card with a pearl in it — does the card look like the library's pearl?
- Finish a session — does the topic percentage on the dashboard actually move?
- Turn off the network mid-session — are the grades still there after reconnecting?
- A topic with nothing due — does it read "✓ up to date" rather than an empty tile?
