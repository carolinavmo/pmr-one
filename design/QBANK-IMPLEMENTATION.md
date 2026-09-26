# Implementing the Question Bank

Designs: `QBANK-1-dashboard.png` · `QBANK-2-folder.png` · `QBANK-3-answering.png`
Spec: `QBANK-SPEC.md`
Chosen layouts: **dashboard with minimal pastel folders**, **folder page**, and the
**column-with-question-map answering screen with the inline explanation** (the first version).
Alternatives explored are in `QBANK-answering-options.png` and `QBANK-answer-options.png` —
do not build those.

## Commit first
```
design/
  QBANK-SPEC.md
  qbank-dashboard.html      ← dashboard
  qbank-folder.html         ← inside a folder
  qbank-answering.html      ← question + explanation
  qbank-style.css
  ref/QBANK-1-dashboard.png, -2-folder.png, -3-answering.png
```

---

## The model

**Subject → folder → topic → question.** Subjects are separators, not rows in a table.

```
folder     id, name, subject('msk'|'neuro'|'basic'|'other'), colour_key, position
topic      id, folder_id, name, position, source_page_id, status('draft'|'published')
question   id, topic_id, stem (rich), explanation (rich), teaching_point,
           difficulty, tags[], source_page_id, status, position, deleted_at
option     id, question_id, letter, text, is_correct, rationale   -- why this one is wrong
attempt    user_id, question_id, option_id, correct, answered_at, ms_taken, session_id
flag       user_id, question_id
session    id, user_id, mode('tutor'|'exam'|'timed'), built_from (json), position,
           started_at, finished_at
session_item  session_id, question_id, order, attempt_id
```

Two things that are easy to leave out and painful to add later:
- **`option.rationale`** — the one-line reason each distractor is wrong. Without it the
  explanation is a paragraph and the screen cannot show "why the others are not".
- **`attempt` as an append-only log.** Every accuracy figure on every screen is derived from it.
  Never overwrite a previous attempt; a question answered three times has three rows.

## Audit before writing code
1. Do questions already have structured options, or is the answer stored as a letter in text?
2. Is there an attempt log, or only a "score" on the set?
3. Do questions carry a difficulty, tags and a source page?
4. Who can author questions, and is there a draft/published state?
5. Is "Manage questions" currently visible to learners? (It is, in the screenshot — remove it.)

---

## Pass 1 — structure and the rail
> Read `design/QBANK-SPEC.md` and open `design/qbank-dashboard.html`.
>
> Create `folder` and `topic`, move existing sets under them, and add the pastel `colour_key`
> (eight colours, stored as a key, never a hex).
>
> Replace the library tree on `/qbank` with the question index: **▶ Start a session**, search,
> **Practice** (all · my incorrect · flagged · not seen) and **By subject** with the user's
> accuracy beside each. Counts come from one grouped query over `attempt`, cached per user and
> invalidated when an attempt is written.

## Pass 2 — the dashboard
> Header figures: **answered · accuracy · to review · streak**.
> Session panel: size and estimated time, what it is built from, the **mode selector**
> (tutor / exam / timed), **Start**, **Resume · Q12 of 20** when a session is open, Custom.
> Filter row — *build from*: weakest first · not seen · incorrect · flagged · subject · set ·
> difficulty. These are the session builder, not a view filter.
> **Browse by folder**: subject separators, then minimal pastel cards — name, "3 topics · 48
> questions", one accuracy pill, `Open ›`. No actions on the card.
> **Your progress**: accuracy ring, twelve weekly bars, weakest folders with
> **Practise the weakest 20 ›**.
>
> Definitions, implemented once and reused: accuracy = correct ÷ answered (latest attempt per
> question); to review = questions whose latest attempt is wrong; streak = consecutive days with
> ≥ 1 attempt; estimated time = questions × 45 s.

## Pass 3 — the folder page
> `/qbank/folder/:id`, built as the card enlarged: accuracy ring, name, "3 topics · 48 questions
> · from MSK in the library", the three-part bar with a legend, and three actions —
> **Practise this folder**, *9 I got wrong*, *14 not seen*.
> Four metrics, tabs (Topics · All questions · My incorrect · Statistics), topic rows with a bar
> and a button that names the action (Start / Continue / Retake), and **Worth revisiting**: the
> questions answered wrong more than once, by name.

## Pass 4 — the session engine
> A session is built once and stored, so Resume is exact. `built_from` records the filters.
>
> - **Tutor**: explanation after each answer. **Exam**: answers only at the end. **Timed**: exam
>   plus a countdown.
> - Selection order: incorrect first, then unseen, then weakest subject, unless the filters say
>   otherwise. Never repeat a question inside one session.
> - Write the attempt **before** advancing, and queue plus retry if it fails.
> - A session survives a reload and a device change.

## Pass 5 — answering and the explanation
> Route `/qbank/session/:id` with **no navbar and no sidebar**.
>
> Chrome: exit · set name and mode · **Q 6 of 20** · timer · running correct and wrong · flag ·
> ⋯. Progress bar in `--acc`. Stem 23px in a 820px column. Options with letter chips and
> keyboard numbers. **Submit answer** — submitting and advancing are separate actions.
> Right rail: the **question map**, clickable, with correct / wrong / current / unseen states.
>
> After submitting, in this order: options re-marked with **the share of users who chose each**,
> the verdict bar with the national percentage, **why the right answer is right**, **why the
> others are not** (one line each, from `option.rationale`), the **source panel** linking the
> library page with its review date, then **＋ Add to flashcards · Note · Report** and
> **Next question →**.
>
> Keyboard: 1–5 select, enter submits, `n` next, `f` flag, `Esc` exits.
> A wrong answer is added to the review list automatically.

## Pass 6 — end of session and statistics
> A summary: score, time, accuracy by topic within the session, the questions to revisit, and
> two next actions (practise what you got wrong · another 20). Then the statistics tab: accuracy
> over time, by subject and by folder.

---

## Editor side

## Pass 7 — authoring questions
> `/admin/qbank`, editor role only.
>
> **Question editor**: stem and explanation in the **same rich editor as My Handbook**, options
> with a correct flag and **a rationale per option**, a teaching point, difficulty, tags, and the
> library page it comes from. A **live preview in the learner's styling** beside it.
>
> Rules: a question cannot be published without a correct option and a rationale on every
> distractor; deleting is a **soft delete** because attempts reference it; editing a published
> question bumps `content_version` and **never alters past attempts**.
>
> Also: bulk import (CSV with stem, options, correct, rationales), "generate draft questions from
> a library page" — drafts only, a human publishes — and a **question health** list sorted by the
> proportion of users answering correctly, since anything under about 30% is usually a badly
> written question rather than a hard one.

---

## Guardrails
- **"Submit and next are two actions."**
- **"Every explanation names its source"** and links to it.
- **"Every distractor has a rationale."** No rationale, no publish.
- **"The attempt log is append-only."** Every figure on every screen derives from it.
- **"Folders are quiet."** Practising starts from the session panel, the filters, the progress
  panel or the folder page — never from a folder card.
- **"No editing tools in the learner's view."**

## Check it yourself
- Answer a question, reload the page mid-session — does it resume on the same question?
- Answer the same question wrong twice — does it appear in *Worth revisiting* and in *My incorrect*?
- Does the explanation show a line for every wrong option?
- Exam mode: are explanations really withheld until the end?
- Does the dashboard accuracy match the folder page accuracy for the same folder? (One definition.)
- Publish a question as an editor — does it appear for a learner without a deploy?
- Is "Manage questions" gone from the learner's screen?
- A folder with no attempts — does it read "not started" rather than 0%?
