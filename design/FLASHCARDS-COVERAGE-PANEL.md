# Implementing the coverage panel

The navy panel at the top of the flashcards dashboard. Replaces "Today's session".
Reference: `FLASHCARDS-coverage-panel-options.png`, option 1 ·
source `flashcards-coverage-panel-options.html`

---

## 1 · What it shows

```
YOUR COLLECTION
142 of 307 cards known · 46%
6 due today, about a minute.                [▶ Review 6] [Learn 10 new]
████████████████░░░░░░░░░░░░░░░░░░░░░░░░░
● 142 known   ● 69 learning   ● 96 never seen
```

Four things, in this order: the **headline** (known of total, and the percentage), the **line
about today**, the **actions**, and the **bar with its legend**.

## 2 · The four numbers

Counted across **every card in the topics the user has**, not the whole library.

| Number | Definition |
|---|---|
| `total` | cards in the user's topics |
| `known` | `user_card_state.state = 'review'` **and** `interval_days >= 21` |
| `learning` | state `learning` or `relearning`, **or** review with `interval_days < 21` |
| `never_seen` | no `user_card_state` row for that card |
| `due` | `due_at <= now()` |

`known + learning + never_seen = total`. If they ever don't, the bar is lying — add a test.

**Define "known" once.** The same expression must produce the ring on the topic tiles, the topic
page and this panel. Put it in one place in the code, and say what it means in the interface —
a tooltip on the word *known*: "seen correctly with a gap of three weeks or more".

```sql
select count(*) as total,
  count(*) filter (where s.state='review' and s.interval_days >= 21)            as known,
  count(*) filter (where s.state in ('learning','relearning')
                      or (s.state='review' and s.interval_days < 21))           as learning,
  count(*) filter (where s.card_id is null)                                     as never_seen,
  count(*) filter (where s.due_at <= now())                                     as due
from card c
join deck d   on d.id = c.deck_id
join topic t  on t.id = d.topic_id and t.user_id = :user
left join user_card_state s on s.card_id = c.id and s.user_id = :user
where c.deleted_at is null;
```

One query, cached under `flashcards:coverage:{user}`, invalidated on: a graded review, a card
added or removed, a topic added or removed.

## 3 · The bar

```html
<div class="seg" role="img"
     aria-label="142 known, 69 learning, 96 never seen, of 307 cards">
  <i class="known"     style="width:46.3%"></i>
  <i class="learning"  style="width:22.5%"></i>
  <i class="unseen"    style="width:31.2%"></i>
</div>
```
- Height 18px, radius 9, `overflow:hidden`; segments have no gaps and no individual radius.
- Colours: known `#4FBF86`, learning `--acc-dk` `#7FD3DA`, never seen `rgba(255,255,255,.18)`.
- Widths are percentages of `total`, to one decimal, and **the last segment takes the
  remainder** so rounding never leaves a 0.3% sliver of background.
- A segment at 0 renders `display:none`, or you get a 1px line of the wrong colour.
- The legend is text, always — the bar is `aria-hidden` behind the label above.

## 4 · The actions

| Situation | Primary | Secondary |
|---|---|---|
| Cards due | **▶ Review 6** | Learn 10 new *(if unseen > 0)* |
| Nothing due, unseen remain | **Learn 10 new** | Review ahead |
| Nothing due, nothing unseen | **Review ahead** | — and the line reads "All caught up" |
| No topics yet | **Add your first topic** | — panel shows the library instead |

**The button always names its size.** "Review 6", not "Review". The number comes from the same
`due` count as the line above it.

## 5 · The line about today
One sentence under the headline, in this order of priority:
1. `6 due today, about a minute.` — cards × 6 s, rounded to the minute, "under a minute" below 60 s.
2. Nothing due: `Nothing due today. Next: 9 cards tomorrow.`
3. Nothing due, nothing scheduled: `Nothing due. 96 cards you have never seen.`

## 6 · States to build
- **Loading** — skeleton: grey headline, grey bar, no numbers. Never a spinner.
- **No topics** — hide the panel and show the library browse section as the page's first block.
- **New user, topics but no reviews** — headline reads `0 of 307 cards known`, the bar is one
  grey segment, the primary button is **Learn 10 new**.
- **Everything known** — headline `307 of 307 · 100%`, green bar, and the line
  "Nothing due. You have seen all of it — reviews will keep coming."

## 7 · Optional, and worth it later
Add the **next milestone** under the bar — "150 cards known · 8 to go · about two sessions".
The percentage moves under 1% on most days; the milestone moves every session. Build the panel
first, add this if engagement is flat.

---

## Prompt

> Read `design/FLASHCARDS-SPEC.md` and open
> `design/flashcards-coverage-panel-options.html` — **option 1** is the one to build.
>
> Replace the "Today's session" panel on the flashcards dashboard with the **coverage panel**:
> headline "142 of 307 cards known · 46%", a line about today, the actions, and a three-segment
> bar with a text legend.
>
> 1. One cached query returns total, known, learning, never_seen and due for the user's topics.
>    **known = review state with interval ≥ 21 days** — put that expression in one place and use
>    it for the topic tiles and the topic pages too.
> 2. Segment widths are percentages of total, last segment takes the remainder, zero segments are
>    not rendered. Colours: known `#4FBF86`, learning `#7FD3DA`, unseen `rgba(255,255,255,.18)`.
> 3. The primary button names its size and changes with the state (Review N / Learn 10 new /
>    Review ahead / Add your first topic).
> 4. Build the states: loading skeleton, no topics, no reviews yet, nothing due, everything known.
> 5. Invalidate the cache on review, card change and topic change — finishing a session must move
>    the bar without a reload.
>
> Tell me first whether `user_card_state` carries `interval_days`, since every number here
> depends on it.

## Check it yourself
- Do known + learning + never seen add up to the total, exactly?
- Finish a session — does the bar move without reloading?
- A user with 0 reviews: is the bar one grey segment rather than an empty box?
- A topic with every card known: is the bar fully green, with no 1px artefact at the end?
- Does the percentage here match the ring on the topic tiles for the same cards?
- Screen reader: is the whole bar announced as one sentence, not three unlabelled divs?
