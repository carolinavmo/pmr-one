# Which dashboard does a person see?

The flashcards dashboard has one layout and **six states**. This is the rule for choosing, and
what each section does in each. Without it, two developers will build two different pages.

## The decision

```
decks = decks the user owns
reviews = answers the user has ever given
due = cards due now
topics = the user's topics
days_since_last_review
```

| # | Condition | State |
|---|---|---|
| S0 | `decks == 0` | **Nothing yet** |
| S1 | `decks > 0` and `reviews == 0` | **Added, not started** |
| S2 | `reviews > 0` and `due > 0` and `topics < 5` | **Studying, early** |
| S3 | `reviews > 0` and `due > 0` and `topics ≥ 5` | **Studying, settled** |
| S4 | `reviews > 0` and `due == 0` | **Done for today** |
| S5 | `days_since_last_review ≥ 14` and `due > 40` | **Coming back** |

S5 wins over S2–S4 when it applies.

## What each section does

| Section | S0 Nothing yet | S1 Added, not started | S2/S3 Studying | S4 Done today | S5 Coming back |
|---|---|---|---|---|---|
| **Header figures** (streak · retention · cards) | hidden | cards only | all three | all three | cards + "last studied 3 weeks ago" |
| **Session panel** | "Pick a topic and the cards are ready" + Add my first topic / Build a deck | "84 cards ready · start with 12 new" + **Start learning** | "34 cards due · about 9 min" + Start review | "You're done for today" + next review date, **Learn 10 new** and **Study ahead** as secondary | "Welcome back · 96 cards waiting" + **Catch up on 20** (primary) and Study all | 
| **Your topics** | hidden | tiles at 0%, badge "84 to learn" | tiles as designed | tiles with "✓ up to date" | tiles with due counts |
| **Fix these first** | hidden | hidden (no lapses yet) | shown, top 3 | hidden | hidden — do not greet a returning user with failures |
| **Forecast** (7 days) | hidden | hidden | shown | shown | shown |
| **Add from the library** | **the page** — 8 topic cards | full grid under the tiles | full grid under the tiles | full grid | collapsed to one row |
| | | | *collapse to one row at ≥ 5 topics (S3)* | | |

## Rules behind the table
1. **Never show a statistic with no data.** No 0-day streak, no 0% retention, no empty forecast.
   Retention needs at least **20 review answers** before it appears at all.
2. **The primary button always exists** and always names its size: *Add my first topic* → *Start
   learning* → *Start review* → *Learn 10 new*.
3. **"Done for today" is an achievement, not an empty state.** Show what was done, when the next
   cards come, and two optional ways to keep going. Never a blank page for finishing.
4. **A returning user is not scolded.** Hide "fix these first", cap the session with a
   catch-up option, and say how long they have been away neutrally.
5. **The library section never disappears entirely** — it collapses to one row so there is always
   a next topic.

## Two states not yet drawn
S0, S1, S2 and S3 exist as designs (`FLASHCARDS-empty-optionA-deck.png`,
`FLASHCARDS-empty-few-topics.png`, `FLASHCARDS-D-dashboard.png`).

**S4 (done for today)** and **S5 (coming back)** are specified above but not mocked. They only
differ from S2/S3 in the session panel and two hidden sections, so they can be built from this
table — but they are worth drawing before release, because they are the states a regular user
sees most often.

## Add to the implementation
In Pass 4 of `FLASHCARDS-IMPLEMENTATION.md`, build the dashboard as **one component with a state
prop**, resolved server-side by the table above — not as separate pages, and not as a pile of
`if` statements in the template. Then:

- write one test per state with fixture data,
- and check the transitions: adding a first topic moves S0 → S1 **without a page reload**, and
  finishing the last due card moves S2 → S4 in place.
