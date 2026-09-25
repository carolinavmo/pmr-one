# Implementing Flashcards

Reader-facing designs: `FLASHCARDS-D-dashboard.png` · `FLASHCARDS-D-topic.png` ·
`FLASHCARDS-card-screens.png`
Spec: `FLASHCARDS-SPEC.md` · States: `FLASHCARDS-DASHBOARD-STATES.md`

## Commit first
```
design/
  FLASHCARDS-SPEC.md
  FLASHCARDS-DASHBOARD-STATES.md
  flashcards-dashboard-final.html    ← dashboard (browse + progress)
  flashcards-progress-tiles.html     ← topic page
  flashcards-card-screens.html       ← study screen
  ref/*.png
```

---

## The model, in one paragraph
**Cards are the library's; progress is the user's.** A deck belongs to a library topic and is
authored by editors. Nothing is copied when someone studies it. The only user-owned rows are
the **scheduling state per card**, the **review log**, and decks a user creates themselves. Fix
a card and it is fixed for everyone, immediately.

```
topic            id, name, subject('msk'|'neuro'|'basic'|'other'), colour_key, position
deck             id, topic_id, name, position, status('draft'|'published'),
                 reviewed_at, reviewed_by, source_page_id     -- the library page it came from
card             id, deck_id, front, back (rich JSON), position,
                 status('draft'|'published'), content_version, source_page_id, deleted_at
user_card_state  user_id, card_id, state('new'|'learning'|'review'|'relearning'),
                 due_at, interval_days, ease, lapses, last_reviewed_at
review_log       user_id, card_id, graded_at, grade(1..4),
                 interval_before, interval_after, ms_taken
```

`user_card_state` rows are created lazily — a card a user has never seen simply has no row and
counts as new.

## Audit before writing code
1. Does a scheduler exist? Which algorithm? Is every answer logged?
2. Do decks already belong to a region/topic, or are they loose?
3. Who can edit — a role, a flag, or "anyone with the admin URL"?
4. Are cards rich content (JSON) or plain strings? The answers need images and highlight cards.
5. Is there a draft/published distinction anywhere in the platform to copy?

---

# Reader side

## Pass 1 — the browse section
> Read `design/FLASHCARDS-SPEC.md` ("The dashboard — final order") and open
> `design/flashcards-dashboard-final.html`.
>
> Build **Browse the library**: topics grouped by subject, each group introduced by a separator
> (colour square, label, counts, hairline, "See all ›"), four topic cards per group.
>
> The card is the deck-of-cards design: two decorative edges (`pointer-events:none`,
> `aria-hidden`), count badge, name, deck count, up to three deck titles clipped to two lines,
> and a footer showing **12 due** / **✓ up to date** / **Not started** with **Open ›**.
> **The whole card is a link to the topic. There is no add or copy step anywhere.**
>
> Counts come from one grouped query over topics, decks, cards and the user's scheduling state —
> cached per user, invalidated on review and on publish.

## Pass 2 — the topic page
> `/flashcards/topic/:id` as in `flashcards-progress-tiles.html` (second frame): ring, title,
> "3 decks · 84 cards · from MSK in the library", state bar, **Study N due**, four metrics, tabs,
> then the **deck rows** — swatch, name, "28 cards · studied yesterday", bar, percentage, and a
> button naming the action: **Study 12 / Review early / Open**. Then weak cards in this topic.

## Pass 3 — the study screen and the scheduler
> As in `flashcards-card-screens.html`: no navbar or sidebar, front, back with four grading
> buttons **each showing the interval the scheduler returns**, and the session-complete screen.
> `space` reveals then grades Good, `1–4` grade, `Esc` exits.
> Write the review log before the UI advances; queue and retry on failure.
> If no scheduler exists, implement SM-2 and keep the log complete from day one.

## Pass 4 — progress
> The three panels (what you know · cards reviewed, 16 weeks · retention and study days) and the
> progress-by-topic rows. Definitions live in one place and are reused everywhere:
> known % = review cards with interval ≥ 21 days ÷ total; retention = correct ÷ answered over 30
> days; streak = consecutive days with ≥ 1 review. Hide any panel without enough data
> (`FLASHCARDS-DASHBOARD-STATES.md`).

---

# Editor side

The reader side is worthless without a decent way to write cards. Build it as **part of the
same admin area as library pages**, not a separate tool.

## Pass 5 — deck and card editor
> Add `/admin/flashcards`, permitted to the editor role only.
>
> **Deck list** — grouped by subject and topic, same separators as the reader's page. Each deck
> row: name, card count, **status chip (Draft / Published)**, last reviewed date and reviewer,
> and the library page it belongs to. Actions: new deck, reorder, duplicate, archive.
>
> **Deck editor** — name, topic, the linked library page, description, and the cards as a
> reorderable list. Each row shows the front text, a state chip, and edit / duplicate / delete.
>
> **Card editor** — front and back as the **same rich editor used in My Handbook**, so a card can
> hold text, an image and a highlight card. Beside it, a **live preview in the study screen's
> own styling** — an editor must see exactly what a learner sees.
> Fields: front, back, optional hint, tags, status, and "source" (library page + section).
>
> Rules: a deck cannot be published with zero published cards; publishing a card makes it
> available to every reader immediately; **deleting is a soft delete** (`deleted_at`) because the
> review log references it.

## Pass 6 — editing something people have already studied
> This is the part that goes wrong quietly.
>
> - Editing a card **keeps everyone's scheduling** and bumps `content_version`. A typo fix must
>   not reset anyone's progress.
> - Add an explicit **"this changes the answer"** checkbox on save. When ticked, the card's
>   scheduling is reset to `learning` for every user who had it in `review`, and the reader's
>   card shows a small **UPDATED** chip for 14 days.
> - **Archiving a deck** hides it from browse but keeps history; existing `user_card_state` rows
>   stop appearing in due counts.
> - Show editors the blast radius before they save: *"84 people have this card in review."*

## Pass 7 — authoring tools that save hours
> 1. **Generate from a library page**: pick a page, and the editor proposes draft cards from its
>    headings, definitions and pearls. **Drafts only — a human publishes.**
> 2. **Bulk import** CSV/TSV (front, back, tags) with a preview table and a dry run.
> 3. **Review workflow**: `reviewed_at` and `reviewed_by` per deck, a "needs review" filter after
>    12 months, and the reviewed date shown to readers on the card's source line.
> 4. **Card health**: a list of cards with the worst retention across all users — the cards
>    everybody fails are usually badly written, not hard.

---

## Guardrails
- **"Cards are shared; progress is personal."** Never copy a deck into an account.
- **"There is no add step."** Every topic is open to every reader.
- **"The interval is the label"** on every grading button.
- **"Editing is not resetting"** unless the editor says the answer changed.
- **"Soft delete only."** The review log must never point at nothing.
- **"Editors see the learner's view"**, in the learner's styling, while writing.

## Check it yourself
**Reader**
- Are the library groups separated by subject, with counts that match reality?
- Does a topic card read "Not started" before any review, and "12 due" after?
- Open a topic → pick a deck → study: is that three clicks from the dashboard?
- Finish a session: do the topic card, the progress ring and the rail all update?

**Editor**
- Publish a card: does it appear for a reader without a deploy?
- Fix a typo on a card 84 people have in review: is anyone's schedule touched? → it must not be
- Tick "this changes the answer": do those 84 return to learning, and see an UPDATED chip?
- Delete a card that has been reviewed: does the review log still resolve?
- Does the card editor's preview match the study screen exactly — including a highlight card?
