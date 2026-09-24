# Implementing the "Add a topic" card (deck of cards)

Reference: `FLASHCARDS-empty-optionA-deck.png` · source `flashcards-empty-optionA-deck.html`
Context: `FLASHCARDS-SPEC.md` → "Empty and early states"

---

## 1 · What the card shows

| Part | Source |
|---|---|
| Name | the library topic (a region or subject) |
| `3 decks` | decks available for that topic |
| `84 cards` badge | total cards across them |
| Three titles | the first three deck names, comma-joined, clipped to two lines |
| ＋ Add topic | the action |

All of it comes from a **catalogue of library topics**, not from the user's data:

```
library_topic
  id, name, region_id/subject_id
  deck_count, card_count        -- denormalised, refreshed nightly or on publish
  sample_deck_titles text[]     -- first three, in reading order
  default_colour_key            -- suggested colour; the user's free colour wins
  position
```

Never compute these counts per request by walking decks and cards — cache the catalogue and
invalidate when an editor publishes a deck.

## 2 · Markup and CSS

The stack is two absolutely positioned layers behind the card. They are decoration: give them
`pointer-events:none` so they never swallow a click, and `aria-hidden`.

```html
<article class="lt" data-colour="orange">
  <span class="edge e1" aria-hidden="true"></span>
  <span class="edge e2" aria-hidden="true"></span>
  <div class="face">
    <span class="count">84 cards</span>
    <h3>Foot &amp; ankle</h3>
    <p class="decks">3 decks</p>
    <p class="titles">Achilles · plantar fasciopathy · ankle sprain</p>
    <button class="add">＋ Add topic</button>
  </div>
</article>
```

```css
.lt{position:relative;padding-top:10px}
.lt .edge{position:absolute;border-radius:15px;border:2px solid var(--topic-bd);
          background:#fff;pointer-events:none}
.lt .e1{top:0;left:12px;right:12px;height:30px;opacity:.6}
.lt .e2{top:5px;left:6px;right:6px;height:30px;opacity:.85}
.lt .face{position:relative;border:2px solid var(--topic-bd);background:var(--topic-bg);
          border-radius:16px;padding:15px}
.lt .count{position:absolute;top:-11px;right:12px;background:var(--topic);color:#fff;
           font:900 11px/1 Roboto;border-radius:11px;padding:4px 10px}
.lt h3{font:900 16px/1.15 Roboto;color:#14284A;letter-spacing:-.3px}
.lt .decks{font:700 11.5px/1 Roboto;color:#9AA5B4;margin-top:4px}
.lt .titles{font:600 12px/1.35 Roboto;color:#5E6B80;margin-top:8px;min-height:32px;
            display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lt .add{display:block;width:100%;background:#fff;border:1.5px solid var(--topic);
         color:var(--topic);font:900 13px/1 Roboto;border-radius:10px;padding:9px 0;margin-top:12px}
```

`--topic`, `--topic-bg`, `--topic-bd` come from `[data-colour]`, as in `FLASHCARDS-SPEC.md`.
`min-height:32px` on the titles keeps every card the same height when one topic has short names.

## 3 · What "Add topic" does

```
POST /api/flashcards/topics
     { library_topic_id }
  →  creates topic (name, colour_key, source_region_id)
     copies its decks and cards into the user's account
     returns the new topic with its counts
```

**Decide the copy semantics before building**, because it is hard to change later:

| Model | Behaviour | Cost |
|---|---|---|
| **Copy** (simplest) | cards are duplicated; the user can edit anything; library updates never arrive | a card fixed in the library stays wrong in every account |
| **Copy + source id** (recommended) | same, but each card keeps `source_card_id` and `source_version` | lets you later show "3 cards were updated in the library — review them" |
| Subscribe | cards stay the library's; user edits are overrides | most work, and editing becomes confusing |

Take the middle one: copy on add, **store `source_card_id` and the version**, and leave the
sync feature for later. It costs one column now and saves a migration.

**Colour**: use the topic's `default_colour_key` if the user has not used it, otherwise the
least-used free key from the eight.

**Response should be fast.** Copying 96 cards must not block the button for two seconds: insert
in one statement, or queue the copy and return the topic immediately with a "preparing" state.

## 4 · Interaction

1. Click ＋ Add topic → button becomes **✓ Added** (filled) immediately, optimistic.
2. The new tile appears in **Your topics** above, with its ring at 0% — animate it in so the eye
   follows it.
3. A snackbar: *"Foot & ankle added · 84 cards · **Study now** · Undo"*. Undo for 10 seconds
   deletes the topic and its copies.
4. On failure, the button returns to ＋ Add topic and the snackbar explains.
5. The whole card is **not** a link — the card is informational and the button is the action. If
   you want a preview, add a secondary "Preview" text button; do not make the card clickable,
   or people will add topics by accident.

## 5 · States

| State | Card |
|---|---|
| Available | as drawn |
| Added | button filled "✓ Added", card at 70% opacity, sorted to the end |
| Adding | button shows a spinner and the label "Adding…", disabled |
| Empty topic (no decks published yet) | greyed, "Coming soon", no button |
| Catalogue loading | three skeleton cards, not a spinner |

## 6 · Accessibility

- The card is an `<article>` with `aria-labelledby` pointing at its `<h3>`.
- The button's accessible name is the full sentence: **"Add topic Foot & ankle, 3 decks, 84
  cards"** — not just "Add topic", which is identical on eight cards.
- The stack layers and the count badge are `aria-hidden`; the count is in the button's label.
- After adding, move focus to the new tile and announce it in a live region.

---

## Prompt

> Read `design/FLASHCARDS-SPEC.md` (section "Empty and early states") and open
> `design/flashcards-empty-optionA-deck.html` — that HTML is the source of truth for the
> "Add a topic" card and the first-visit dashboard.
>
> 1. Add a **library topic catalogue**: id, name, region, `deck_count`, `card_count`,
>    `sample_deck_titles` (first three), `default_colour_key`, position. Denormalised, refreshed
>    when an editor publishes — never counted per request.
> 2. Build the card exactly as in the reference: two decorative stack edges (`pointer-events:none`,
>    `aria-hidden`), tinted face, count badge on the corner, name, deck count, two-line clipped
>    titles, outlined Add button. Colours from `[data-colour]`.
> 3. `POST /api/flashcards/topics { library_topic_id }` creates the topic, copies its decks and
>    cards, and returns the topic with counts. **Each copied card stores `source_card_id` and
>    `source_version`** so a future "updated in the library" feature is possible. Assign the
>    default colour, or the least-used free key.
> 4. Optimistic UI: button → ✓ Added, new tile animates into "Your topics" at 0%, snackbar with
>    **Study now** and **Undo** (10 s).
> 5. States: available, adding, added, "coming soon" when a topic has no published decks, and a
>    skeleton while the catalogue loads.
> 6. The card itself is not clickable — only the button acts.
>
> Before starting, tell me whether library decks exist as publishable objects with a region, and
> how many topics and cards are currently publishable.

## Check it yourself
- Are all eight cards the same height, including topics with one short deck title?
- Click the stack edges — nothing should happen.
- Add a topic: does the tile appear above at 0% without a page reload?
- Undo: is the topic and its copied cards gone?
- Add a 96-card topic: does the button respond in under 300 ms?
- Screen reader: does each Add button read the topic name, not just "Add topic"?
- A topic with no published decks: does it read "Coming soon" rather than "0 cards"?
