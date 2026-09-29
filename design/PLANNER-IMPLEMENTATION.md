# Implementing the Study Planner

Designs: `PLANNER-1-today.png` · `PLANNER-2-calendar.png` · `PLANNER-3-plan.png` ·
`PLANNER-4-editing.png` · `PLANNER-5-plan-editing.png` · `PLANNER-6-share-flexible-done.png` ·
`PLANNER-7-task-bar.png`
Spec: `PLANNER-SPEC.md` — read it first; it is the contract.

## Commit first
```
design/
  PLANNER-SPEC.md
  planner-today.html            ← landing page
  planner-calendar.html         ← month view
  planner-plan.html             ← plan overview
  planner-plan-editing.html     ← content + schedule tabs (final, no weights)
  planner-editing.html          ← new plan, add-task drawer, adjust the pace
  planner-share-flexible-done.html  ← plan modes and completion
  planner-task-bar.html         ← the task bar inside other features
  qbank-style.css
  ref/PLANNER-*.png
```

---

## 1 · The model

**A plan is an ordered list of library content plus how it runs. A task points at something in
the platform.**

```
plan        id, user_id, name, kind('exam'|'rotation'|'routine'|'custom'),
            colour_key, target_date null,
            mode('scheduled'|'flexible'|'target'),
            order_mode('interleave'|'one_topic'|'as_listed'),
            study_days int[], session_minutes, max_tasks_per_day,
            weekly_target int null,        -- target mode only
            status('active'|'paused'|'done')

plan_item   id, plan_id, kind('folder'|'page'|'deck'|'question_set'),
            ref_id, position                -- no weight; order carries the emphasis

task        id, user_id, plan_id null, type('read'|'flashcards'|'questions'|'course'|'custom'),
            target_ref null, title, estimate_minutes,
            scheduled_for date null,        -- null = lives in the queue
            queue_position int null,
            original_date date null,        -- set when a task rolls forward
            state('pending'|'done'|'skipped'),
            completed_at, completed_via('auto'|'manual'|'bulk')

day_log     user_id, date, minutes_studied, tasks_done
```

Four decisions that are painful to add later:
- **`target_ref` on every non-custom task.** A task that cannot be started is a note.
- **`original_date`** — what lets a rolled-forward task still read "was Tue 24".
- **`scheduled_for` nullable** — the whole flexible mode depends on it.
- **`state` includes `skipped`** — skipped work must never count as studied.

## 2 · Audit before writing code
1. Do library pages, decks, question sets and lessons have **stable ids**?
2. Is there a reading-time estimate per page? If not, compute from word count ÷ 200 wpm.
3. **Does the library already record a page as read?** If it does, the planner subscribes to that
   event. If not, build it there — not in the planner (see pass 5).
4. Is the existing planner's task table worth migrating, or empty in practice?

---

# Reader-facing passes

## Pass 1 — model, rail, Today
> Read `design/PLANNER-SPEC.md`, open `design/planner-today.html`.
>
> Create the tables. Replace the library tree on `/planner` with the planner rail:
> Today · This week · Overdue · Done · Calendar, then **My plans** with their percentages.
>
> Build **Today**: header figures (due today · this week · streak · hours), the navy panel with
> count, estimate, **▶ Start today's plan**, the task list with type tags and Start buttons, the
> week strip, plan cards, and Coming up. Unscheduled tasks appear in an **Up next** section.

## Pass 2 — the generator
> Given a plan, produce tasks.
>
> ```
> content  = plan_items expanded to pages/decks/sets, in position order
> order    = interleave  → rotate through folders, one item each pass
>            one_topic   → finish a folder before the next
>            as_listed   → exactly the stored order
> ```
> Then place them according to **mode**:
> - `scheduled` — onto study days only, never exceeding `max_tasks_per_day`, between today and
>   `target_date`.
> - `flexible` — **no dates**: `scheduled_for = null`, `queue_position` in generated order.
> - `target` — no dates, but the Today page draws `weekly_target ÷ study_days` per day from the
>   queue.
>
> Rules: emit **read → flashcards → questions** per topic; never move or delete a completed task
> when regenerating; adding content appends and re-spreads **pending only**.

## Pass 3 — the calendar
> Month, week and agenda at `/planner/calendar`. Chips in the plan's colour with type and size;
> completed struck through at 55%; overdue red; "+n more" past three. Selecting a day fills the
> **right-hand panel** — never a modal. Drag to move; clicking empty space opens the add-task
> drawer pre-dated. **Flexible plans have no chips** — their tasks are not on the calendar.

## Pass 4 — the plan page, editable in place
> `/planner/plan/:id`, four tabs, as in `planner-plan-editing.html`.
>
> - **Overview** — ring, deadline, **on-track pill with a number**, four metrics including a
>   **projected finish from the last four weeks' actual pace**, coverage by topic, the week
>   squares.
> - **Content** — the ordered list of folders with their pages; drag handles; ✕ to remove a page;
>   ⋯ on a folder (rename in plan · remove · move up/down); the **Order** control
>   (interleave · one topic at a time · as listed); and **＋ Add pages or folders**, which opens
>   an **inline panel** with search and a multi-select grid, footed by the consequence
>   ("16 pages · about 34 tasks, added to the end of the plan").
> - **Schedule** — tasks grouped by week, each row with checkbox, drag handle, type, title, day,
>   estimate and a ⋯ menu: *Move to Tomorrow / Next study day / Next week / Pick a date*, then
>   Edit, Change type or target, Duplicate, **Remove from plan**. Multi-select shows the navy bulk
>   bar. Dropping onto a full day asks: exceed the cap, or push the rest along.
>   In a flexible plan this tab is **Up next**: a single ordered queue with drag-to-reorder.
> - **Settings** — mode, study days, session length, tasks a day, colour, pause, delete.

## Pass 5 — the task bar and completion
> **Start opens the target directly.** Pass the task id through, and render the **task bar**
> above whatever loads: `TASK 2 OF 3 · plan · day`, position segments, **Skip**, **Back to
> planner**, **✓ Mark as read/done**.
>
> Completion is event-driven, and **the event belongs to the feature, not the planner**:
> | Event | Emitted by | Completes |
> |---|---|---|
> | `page_read` | the library reader — end of page **and** ≥ 30 s dwell, or a manual "Mark as read" | any open `read` task for that page |
> | `flashcard_session_finished` | flashcards | the matching `flashcards` task |
> | `question_set_submitted` | question bank | the matching `questions` task |
> | `lesson_finished` | courses | the matching `course` task |
>
> A page marked read **while browsing**, with no task open, must still complete a matching task
> — one source of truth. Manual completion also works from any task row, from the left-rail
> *Reading progress* box, and from the end-of-page block.
>
> Every completion shows a toast with **Undo**; un-ticking reopens the task and clears
> `completed_at`.

## Pass 6 — creating and adjusting
> - **New plan**: a full page (`planner-editing.html`) — kind, name, date, colour, mode, study
>   days, session length, tasks a day, content picked from the library, order control, and a
>   **preview strip** (tasks created · pace · finish date) before Create.
> - **Add task**: a 460px **drawer**, not a modal — type, target search, when, estimate, plan,
>   repeat.
> - **Adjust the pace**: offered automatically once `overdue > 5`. Four options — re-spread ·
>   add a study day · drop the lowest-priority content · **forgive them** — each showing its
>   consequence, with an after-state preview.

## Pass 7 — the edges
> 1. **Empty state**: no plans → one panel with three starting points (exam · rotation · weekly
>    routine) and a quiet "add a single task". Hide metrics, week strip and calendar.
> 2. **Roll-forward job**, once a day: pending scheduled tasks with `scheduled_for < today` move
>    to today, keeping `original_date`. Flexible plans are untouched — nothing is ever late.
> 3. **Rest days** are labelled, not blank.
> 4. **Streak** = consecutive days with ≥ 1 task done, user's timezone.
> 5. **Pause** hides a plan's pending tasks everywhere and stops generation; resume restores.
> 6. Mobile: Today only; week strip scrolls; calendar defaults to agenda; the task bar collapses
>    to position + ✓.

---

# Seeding

## A · Plan templates (shipped, editable by an admin)
No weights — **order is the emphasis**, so the list order below is the teaching order.

```json
[
  {
    "key": "board-exam", "name": "Board exam", "kind": "exam", "colour_key": "peach",
    "defaults": { "mode": "scheduled", "order_mode": "interleave",
                  "study_days": [1,2,3,4,6], "session_minutes": 45, "max_tasks_per_day": 3 },
    "content": [
      "msk.spine", "neuro.stroke", "neuro.sci", "msk.shoulder", "msk.knee",
      "neuro.tbi", "msk.hip", "msk.foot-ankle", "neuro.mononeuropathies",
      "msk.wrist-hand", "basic.physical-exam", "other.amputees", "basic.anatomy",
      "msk.elbow", "basic.biomechanics", "other.paediatric", "neuro.cranial-facial",
      "basic.physical-agents", "other.pelvic-floor", "basic.icf"
    ]
  },
  {
    "key": "rotation", "name": "Rotation", "kind": "rotation", "colour_key": "lilac",
    "defaults": { "mode": "scheduled", "order_mode": "one_topic",
                  "study_days": [1,2,3,4,5], "session_minutes": 30, "max_tasks_per_day": 2 },
    "content": "one library region, chosen at creation"
  },
  {
    "key": "weekly-routine", "name": "Weekly routine", "kind": "routine", "colour_key": "mint",
    "defaults": { "mode": "target", "weekly_target": 10, "session_minutes": 15 },
    "recurring": [
      { "type": "flashcards", "target": "due-today", "days": [1,2,3,4,5,6,7] },
      { "type": "questions",  "target": "weakest", "count": 20, "days": [1,4] }
    ]
  },
  {
    "key": "flexible-catchup", "name": "No fixed days", "kind": "custom", "colour_key": "sky",
    "defaults": { "mode": "flexible", "order_mode": "interleave" },
    "content": "chosen at creation"
  }
]
```

## B · Demo data for development
One deterministic script (fixed random seed) producing the reference screenshots:

- **4 plans**: Board exam (peach, scheduled, +34 weeks, 62%), Neurology rotation (lilac,
  scheduled, week 2 of 6, 28%, **2 tasks behind** so the amber state is visible), Weekly routine
  (mint, target mode), and one **flexible** plan with a 40-task queue and no dates.
- **240 tasks** for the board plan — 148 done, 2 overdue with `original_date` set, 3 pending
  today (one `read`, one `flashcards` 20 cards, one `questions` 15) and one already done today.
- **day_log** for 40 days with realistic gaps → **5-day streak**, **4.2 h this week**.
- One **skipped** task, so the skipped state appears somewhere.

```
npm run seed:planner -- --user demo@pmrexplained.com --weeks-back 12 --weeks-forward 34 --seed 42
```

---

## Guardrails
- **"Today is the page."** The calendar is a view.
- **"Every task starts something."** No target, no task — it is a note.
- **"The feature owns the event."** Completion is emitted by the library, flashcards, questions
  or courses; the planner only listens.
- **"Nothing is silently deleted."** Missed tasks roll forward; skipped tasks are marked skipped.
- **"Completed work is immutable"** to every editing flow.
- **"Flexible plans have no overdue."**
- **"Preview before commit"** on create, add-content and adjust-pace.
- **"The rail is the planner."**

## Check it yourself
- Start a read task — does the page open with the task bar, and does reaching the end complete it?
- Read the same page later **without a task** — does it still complete an open task for it?
- Leave a flashcard session halfway — does the task stay open and show partial progress?
- Skip a task — is it gone from the queue but **not** counted in hours or streak?
- Miss two days — do those tasks appear as overdue today and still show as missed in the week
  strip and the calendar?
- Switch a plan to **flexible** — do its calendar chips disappear and the queue appear, with no
  overdue anywhere?
- Add two folders to a plan — are only pending tasks re-spread, and does the footer's estimate
  match what is created?
- Drag a task onto a full day — are you asked whether to exceed the cap?
- Complete anything — do Today's figures, the week strip, the plan percentage and the streak all
  move without a reload, and does Undo restore them?
