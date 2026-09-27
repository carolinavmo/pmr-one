# Implementing the Study Planner

Designs: `PLANNER-1-today.png` · `PLANNER-2-calendar.png` · `PLANNER-3-plan.png`
Spec: `PLANNER-SPEC.md`

## Commit first
```
design/
  PLANNER-SPEC.md
  planner-today.html      ← the landing page
  planner-calendar.html   ← month view
  planner-plan.html       ← inside a plan
  qbank-style.css
  ref/PLANNER-1-today.png, -2-calendar.png, -3-plan.png
```

---

## The model

**A plan generates tasks. A task points at something in the platform.**

```
plan            id, user_id, name, kind('exam'|'rotation'|'routine'|'custom'),
                colour_key, target_date, status('active'|'paused'|'done'),
                study_days int[]   -- 1=Mon … 7=Sun
                session_minutes, max_tasks_per_day, created_at
plan_topic      plan_id, topic_ref (library region or topic id), weight, position
task            id, user_id, plan_id (nullable), type('read'|'flashcards'|'questions'
                |'course'|'custom'),
                target_ref     -- page id, deck id, question set id, course id
                title, estimate_minutes, scheduled_for date,
                state('pending'|'done'|'skipped'), completed_at,
                original_date  -- kept when a task rolls forward
day_log         user_id, date, minutes_studied, tasks_done   -- for the streak and hours
```

Two things to get right at the start:
- **`original_date`.** A missed task moves to today and stays visible as overdue; the original
  date is what lets the week strip show "1 missed" on Tuesday rather than losing it.
- **`target_ref` is required for every type except `custom`.** A task that cannot be started is
  a note, and belongs in My Handbook.

## Audit before writing code
1. Do library pages, decks, question sets and courses all have **stable ids** to point at?
2. Is there an estimated reading time per page? If not, compute from word count (200 wpm).
3. Does anything already write a "studied today" event, or does the planner have to?
4. Is the existing planner's task table worth migrating, or is it empty in practice?

---

## Pass 1 — model, rail, and today
> Read `design/PLANNER-SPEC.md` and open `design/planner-today.html`.
>
> Create `plan`, `plan_topic`, `task`, `day_log`. Replace the library tree on `/planner` with
> the planner rail: Today · This week · Overdue · Done · Calendar, then **My plans** with their
> percentages.
>
> Build the **Today** page: header figures (due today · this week · streak · hours), the navy
> today panel with count, estimate, **▶ Start today's plan** and the task list, then the week
> strip, the plan cards and Coming up.
>
> Every task row shows **type tag · title · estimate · Start**. Start opens the target feature
> with that content loaded and marks the task done on completion.

## Pass 2 — the generator
> This is the feature. Given a plan, produce tasks.
>
> ```
> weeks            = weeks between today and target_date
> slots_per_week   = len(study_days) × max_tasks_per_day
> total_slots      = weeks × slots_per_week
> per_topic        = total_slots distributed by plan_topic.weight
> ```
> Then, for each topic, emit tasks in a repeating cycle — **read → flashcards → questions** —
> and lay them on study days only, never exceeding `max_tasks_per_day`.
>
> Rules:
> - **Interleave topics** rather than finishing one before starting the next; spacing beats
>   blocking for retention.
> - **Never schedule on a non-study day**, and leave any day already at its cap alone.
> - Re-running the generator must be **idempotent for completed tasks** — never delete or move
>   what is done.

## Pass 3 — the calendar
> Month, week and agenda views at `/planner/calendar`. Tasks as chips in the plan's colour,
> completed struck through at 55% opacity, overdue red, "+n more" past three per cell.
> Selecting a day fills the **right-hand panel** — never a modal. Drag to move a task; clicking
> empty space in a day opens the new-task form pre-dated.

## Pass 4 — the plan page
> `/planner/plan/:id` as in `planner-plan.html`: ring, deadline, **on-track pill with the number
> of tasks either way**, four metrics, tabs, coverage by topic, the week squares, and the
> settings preview.
>
> - `on_track = tasks_done − tasks_that_should_be_done_by_now`, stated as "2 tasks ahead" or
>   "2 tasks behind".
> - `projected_finish` uses the **actual pace over the last four weeks**, not the plan's
>   intended pace.
> - **Adjust the pace** re-spreads only pending tasks. Offer it automatically once overdue > 5.

## Pass 5 — the edges
> 1. **Empty state**: no plans → one panel, "Plan your study", with three starting points (exam
>    date · rotation · weekly routine) and a quiet "add a single task". Hide the metrics, the
>    week strip and the calendar until something exists.
> 2. **Rest days** are labelled, not blank.
> 3. **Rolling forward** runs once a day: pending tasks with `scheduled_for < today` move to
>    today, keeping `original_date`.
> 4. **Streak** = consecutive days with ≥ 1 task done, user's timezone.
> 5. Mobile: today page only, week strip scrolls, calendar defaults to agenda.

---

# Seeding

## A · Plan templates (ship these, editable by an admin)

```json
[
  {
    "key": "board-exam",
    "name": "Board exam",
    "kind": "exam",
    "colour_key": "peach",
    "defaults": { "study_days": [1,2,3,4,6], "session_minutes": 45, "max_tasks_per_day": 3 },
    "topics": [
      { "ref": "msk.spine",            "weight": 10 },
      { "ref": "msk.shoulder",         "weight": 7 },
      { "ref": "msk.knee",             "weight": 7 },
      { "ref": "msk.foot-ankle",       "weight": 6 },
      { "ref": "msk.hip",              "weight": 6 },
      { "ref": "msk.elbow",            "weight": 4 },
      { "ref": "msk.wrist-hand",       "weight": 5 },
      { "ref": "neuro.stroke",         "weight": 9 },
      { "ref": "neuro.sci",            "weight": 9 },
      { "ref": "neuro.tbi",            "weight": 7 },
      { "ref": "neuro.mononeuropathies","weight": 6 },
      { "ref": "neuro.cranial-facial", "weight": 3 },
      { "ref": "basic.anatomy",        "weight": 5 },
      { "ref": "basic.biomechanics",   "weight": 4 },
      { "ref": "basic.physical-exam",  "weight": 5 },
      { "ref": "basic.physical-agents","weight": 3 },
      { "ref": "basic.icf",            "weight": 2 },
      { "ref": "other.amputees",       "weight": 5 },
      { "ref": "other.paediatric",     "weight": 4 },
      { "ref": "other.pelvic-floor",   "weight": 3 }
    ]
  },
  {
    "key": "rotation",
    "name": "Rotation",
    "kind": "rotation",
    "colour_key": "lilac",
    "defaults": { "study_days": [1,2,3,4,5], "session_minutes": 30, "max_tasks_per_day": 2 },
    "prompt": "Which rotation, and how many weeks?",
    "topics": "chosen at creation from one library region"
  },
  {
    "key": "weekly-routine",
    "name": "Weekly routine",
    "kind": "routine",
    "colour_key": "mint",
    "defaults": { "study_days": [1,2,3,4,5,6,7], "session_minutes": 15, "max_tasks_per_day": 1 },
    "recurring": [
      { "type": "flashcards", "target": "due-today", "days": [1,2,3,4,5,6,7] },
      { "type": "questions",  "target": "weakest",  "count": 20, "days": [1,4] }
    ]
  }
]
```

**Weights are relative, not percentages** — the generator normalises them. The board-exam
weights above roughly follow the usual exam blueprint emphasis; an editor should be able to
change them without a deploy.

## B · Demo data for development
A seed script should create one user whose planner looks like the reference image:

- **3 plans**: Board exam (peach, target +34 weeks, 62% done), Neurology rotation (lilac,
  6 weeks, week 2, 28%), Weekly routine (mint, recurring).
- **240 tasks** for the board plan, of which **148 done**, spread backwards over ~12 weeks at
  3 a day on Mon/Tue/Wed/Thu/Sat, plus forward to the target date.
- **2 overdue**: one `read` from two days ago, one `questions` from last week, both with
  `original_date` set.
- **Today**: 3 pending tasks — one `read`, one `flashcards` (20 cards), one `questions` (15) —
  plus one already done, so the panel shows a completed row.
- **day_log** for the last 40 days with realistic gaps, giving a **5-day streak** and about
  **4.2 hours this week**.
- One plan deliberately **behind** (the rotation, 2 tasks behind) so the amber on-track state is
  visible in development.

```
npm run seed:planner -- --user demo@pmrexplained.com --weeks-back 12 --weeks-forward 34
```

Keep the demo generator **deterministic** (a fixed random seed) so screenshots and tests do not
change between runs.

---

## Guardrails
- **"Today is the page."** The calendar is a view, never the landing view.
- **"Every task starts something."**
- **"Nothing is silently deleted."** Missed tasks roll forward, visible.
- **"Coverage beats completion"** on a plan page.
- **"Any plan can be reshaped"** — pace, topics, pause.
- **"The rail is the planner."**

## Check it yourself
- Create a board-exam plan with a date 8 weeks out — are tasks spread across study days only,
  interleaved by topic, and capped per day?
- Miss a day — do those tasks appear as overdue today, and still show as missed on that day in
  the week strip and the calendar?
- Complete a task from the Today panel — do the header figures, the week strip, the plan
  percentage and the streak all move without a reload?
- Re-run the generator — are completed tasks untouched?
- Pause a plan — do its future tasks disappear from Today and the calendar, and return on resume?
- A new account — is the empty state one panel with three starting points, and no zeroes?
