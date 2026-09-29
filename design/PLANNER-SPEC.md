# Study Planner — improved

Reference: `PLANNER-1-today.png` · `PLANNER-2-calendar.png` · `PLANNER-3-plan.png` ·
`PLANNER-4-editing.png`
**Source of truth**: `planner-today.html`, `planner-calendar.html`, `planner-plan.html`,
`planner-editing.html`
(+ `qbank-style.css`)

## What was wrong
1. **The month grid was the page** — and it was empty. A calendar shows *when*; a planner has to
   answer *what do I do now*.
2. **The sidebar was the library tree** — the same bug as Clinical Tools, Handbook, Flashcards
   and Question Bank.
3. **Every number was zero**: 0% ring, 0 / 0 weekly goal, 0-day streak, "nothing scheduled yet".
   Four ways of saying the same thing, none of them actionable.
4. **Tasks were generic to-dos**, unconnected to the library, flashcards, question bank or
   courses — so the planner could not start anything.
5. **No concept of a plan.** An exam date, a rotation or a weekly routine is what generates
   tasks; without them the user has to invent every task by hand.
6. **"New Task" floated** above the calendar as the only action on the page.

## Structure
| Region | Contents |
|---|---|
| Rail | ＋ New task · search · **Planner** (Today · This week · Overdue · Done · Calendar) · **My plans** with progress |
| Header | date, then four figures: **due today · this week · streak · hours studied** |
| Today panel | navy: count and estimated time, one line of context, **▶ Start today's plan**, Reschedule, and the task list |
| This week | seven day cards: done, missed, planned, today outlined, rest days named |
| My plans | pastel cards: name, deadline, progress bar, on-track state |
| Coming up | the next seven days as rows, each tagged and dated |

## The task
A task is **a thing to do in the platform**, not a note.

| Field | Notes |
|---|---|
| Type | `read` · `flashcards` · `questions` · `course` · `custom` — shown as a tag |
| Target | the library page, deck, question set or course it points at |
| Estimate | minutes, from the target (cards × 6 s, questions × 45 s, reading time) |
| Plan | which plan generated it, or "one-off" |
| State | pending · done · missed, and **missed tasks roll forward as overdue**, tinted red |

**Every task has a Start button** that opens the right feature with the right content loaded.
A task that cannot be started is a note, and belongs in the handbook.

## Plans
A plan generates tasks from a goal:
- **Exam date** — "Board exam, 18 May 2027" → distributes topics across the weeks remaining.
- **Rotation** — "Neurology, 6 weeks" → a topic list paced over the rotation.
- **Weekly routine** — "flashcards daily, 20 questions on Monday and Thursday".

Each plan shows progress and whether it is **on track**, comparing tasks completed with tasks
that should have been by now. Two tasks behind is stated plainly, not hidden.

## Rules
1. **Today is the page.** The calendar is a view inside the planner, never the landing view.
2. **Every task starts something.** Tag, estimate, Start.
3. **Never show a statistic at zero** — see the empty state below.
4. **A missed task rolls forward**, marked overdue; it is never silently deleted.
5. **A rest day is a state**, labelled as such.
6. **The rail is the planner**, not the library.

## Empty state — first visit
No tasks and no plans: hide the metrics, the week strip and Coming up. Show **one panel**:
*"Plan your study — pick a goal and the tasks write themselves"* with three starting points —
**an exam date**, **a rotation**, **a weekly routine** — and a fourth, quieter option to add a
single task. The calendar appears only once something is scheduled.


---

# The calendar

`/planner/calendar` — reference `PLANNER-2-calendar.png`

| Region | Contents |
|---|---|
| Header | month and year, ‹ › and **Today**, a **Month / Week / Agenda** segmented control, ＋ New task |
| Filters | one toggle per plan in its colour, a **Completed** toggle, and a **workload** control (how many tasks a day the generator may schedule) |
| Grid | seven columns, day cells 104px minimum, tasks as **chips in their plan's colour** with type and size |
| Day panel | 300px on the right: the selected day, its tasks with estimates, **▶ Start this day**, and ＋ Add a task |

**Chip rules**
- Colour = the plan. Type and size in the label ("Cards · 20", "Read · Anterior cord").
- **Completed chips stay**, struck through at 55% opacity — the month should show effort, not
  empty out as you work.
- **Overdue chips are red**, wherever they originally sat.
- More than three chips in a cell collapses to "+n more".
- Drag a chip to move a task; click empty space in a day to add one.

**No modals.** Selecting a day fills the right-hand panel; it never opens a dialogue.

---

# Inside a plan

`/planner/plan/:id` — reference `PLANNER-3-plan.png`

| Region | Contents |
|---|---|
| Header | plan colour panel: completion ring, name, deadline and weeks left, **on-track pill**, and actions — ▶ Today's tasks, Adjust the pace, Edit topics · Pause |
| Metrics | tasks done of total · hours a week · current pace · **projected finish** |
| Tabs | Overview · Topics · Schedule · Settings |
| Coverage by topic | one row per topic with its task count and a progress bar — this is where the gaps show |
| The weeks | one row per week, **one square per task**: done green, missed red, planned grey |
| Settings preview | study days and session length, shown rather than hidden in a menu |
| Falling behind | the rule stated in the interface: missed tasks roll forward, and past five the planner offers to **re-spread the remaining topics** |

## Rules for a plan
1. **On track is a statement, not a colour alone** — "2 tasks ahead", "2 tasks behind".
2. **Projected finish comes from the actual pace**, not the plan's intention.
3. **Coverage beats completion.** 62% overall hides a topic at 0%; the topic bars are the point.
4. **Any plan can be reshaped** — pace, topics, pause. A plan that cannot be changed is
   abandoned the first busy week.
5. **Nothing is silently deleted.** Missed tasks roll forward and are visible.


---

# Creating and editing

Reference: `PLANNER-4-editing.png` · source `planner-editing.html`

## Editing a plan — on the page, not in a dialogue
Reference: `PLANNER-5-plan-editing.png` · source `planner-plan-editing.html`

### Content tab — what the plan covers
A list of **folders from the library**, each expandable to its pages, each with a drag handle and a
⋯ menu (rename in plan, remove folder, move up or down).

| Element | Behaviour |
|---|---|
| Page row | drag handle, type tag, title, estimate, and ✕ to remove it from the plan |
| Folder row | drag handle, colour dot, name, "12 pages · 32 tasks", ⋯ (rename in plan · remove · move up/down) |
| **＋ Add pages or folders** | opens an **inline panel in the page** — search plus a multi-select grid of library folders with page counts, and "Browse the whole library ›" |
| Add footer | states the consequence: *"2 folders selected · 16 pages · creates about 34 tasks, spread over the weeks left"* |

**Adding content re-spreads only pending tasks.** Completed ones are never moved — say so under
the panel.

### Schedule tab — every task editable where it sits
Tasks grouped by week, each row: checkbox · drag handle · type tag · title · **day** · estimate · ⋯

The ⋯ menu:
```
MOVE TO
  Tomorrow            Sat 28
  Next study day      Mon 30
  Next week           Mon 6 Oct
  Pick a date…
—
  Edit task
  Change type or target
  Duplicate
—
  Remove from plan            (red)
```

- **Multi-select** shows a navy bulk bar: *Move to… · Change day · Mark done · Remove · Clear
  selection*.
- **Drag** a task between days and weeks; a week header offers **Move the whole week ›**.
- Dropping onto a day that is already at its cap asks whether to **exceed the cap** or **push
  the rest along** — it never silently overfills a day.
- Overdue tasks appear in their week with a red tag and "was Tue 24".
- A dashed **＋ Add a task to next week** row sits at the end of each week group.

### Rules
1. **No modal for editing.** Inline panels, row menus and a drawer only for creating a task from
   elsewhere.
2. **Every destructive action names its scope** — "Remove from plan", not "Delete".
3. **Consequences are stated before the action**, in the panel footer or the confirm row.
4. **Completed work is immutable** to every editing flow.

## New plan — a full page
Not a dialogue and not a wizard: everything on one page, because the choices interact.

| Block | Contents |
|---|---|
| What the plan is for | four cards — **an exam · a rotation · a weekly routine · something else**. The choice changes which fields appear below |
| Identity | name, target date (with "34 weeks" computed beside it), colour from the eight-key palette |
| Schedule | **study days** as day toggles, **session length** (15/30/45/60), **tasks a day, maximum** (1–5) |
| Topics | every library region as a row: include toggle and the resulting task count — excluded rows fade. Order is set by dragging |
| Preview | grey strip: **tasks created · pace · finish date**, plus a sentence on slack and interleaving |
| Order | the same three-way control: interleave · one topic at a time · as listed |
| Footer | Cancel · a line saying nothing is scheduled until you create it · **Create plan and generate tasks** |

**The weight stepper updates the task estimate live.** Changing spine from 10 to 12 changes
"~24 tasks" to "~29" and the preview strip with it — the user should never press Create and be
surprised.

## Add a task — a drawer
460px from the right; the planner stays visible behind it.

1. **Type** — read · cards · questions · course · something else.
2. **Target** — a search over the chosen feature, results showing the estimate. A custom task
   skips this and takes a free-text title.
3. **When**, **estimate** (auto from the target, editable), **part of** (a plan or none),
   **repeat** (none, daily, weekly, every study day).

Opened from: ＋ New task in the rail, ＋ on the Today panel, a click on empty space in a
calendar day (pre-dated), or "Add a task to this day" in the day panel.

## Adjust the pace
Offered automatically once **overdue > 5**, and available any time from the plan page.

| Option | What it does |
|---|---|
| **Re-spread the remaining topics** | same finish date, slightly more each week — shows the new pace |
| **Add a study day** | keeps the pace, uses one more day |
| **Drop the lowest-weighted topics** | names which topics leave, shows the task reduction |
| **Forgive them** | clears the overdue list, carries on from today, reschedules nothing |

Each option shows its consequence on the right, and the preview strip shows **the state
afterwards**: on track, new pace, new finish date.

**"Forgive them" is not optional.** A planner that refuses to let someone wipe the slate is a
planner they stop opening.

## Rules for all three
1. **Preview before commit** — every flow ends in a strip saying what will happen.
2. **A drawer, not a modal**, for anything short; a full page for a new plan.
3. **Completed tasks are never moved or deleted** by any of these flows.
4. **Everything is reversible** — a generated plan can be re-spread, paused or deleted, and
   deleting a plan offers to keep its completed tasks in the history.


---

# Share, flexible plans, and completion

Reference: `PLANNER-6-share-flexible-done.png` · source `planner-share-flexible-done.html`

## No weights — order instead
A plan is **a list of folders and pages in an order**. There is no weighting control.

| Control | Options |
|---|---|
| **Order** | **Interleave topics** (default — rotate through the list, which spaces topics) · **One topic at a time** (finish a folder before the next) · **The order below** (exactly as listed, no rotation) |
| Position | drag a folder to move it; pages keep their own order inside it |

Emphasis is expressed by **what you include and where you put it**, not by a number. A topic you
want more of goes higher in the list, or gets more of its pages added.

## How a plan runs — three modes
Set at creation, changeable at any time from Settings.

| Mode | Behaviour |
|---|---|
| **Scheduled** | tasks land on specific days; a missed task becomes overdue |
| **Flexible — a queue** | **no dates at all**: an ordered list you pull from. Nothing is ever late |
| **Target only** | a weekly amount ("about 15 tasks a week") with no day assigned |

In **flexible** mode the plan page shows **Up next** instead of a schedule: an ordered queue with
drag-to-reorder, **▶ Do the next 3**, and a projected finish computed from the user's **actual
rate**. No calendar chips, no overdue, no "7 tasks behind".

**Per task, in any mode:** the ⋯ menu includes **"No date — move to the queue"**, so a single
task can be unscheduled without changing the plan. Unscheduled tasks appear in an **Up next**
section under Today.

## Marking a task done — four ways
1. **Automatically.** Finishing the linked activity completes the task: the flashcard session
   ends, the question set is submitted, the page is scrolled to the end. No second action.
2. **The checkbox**, on every task row — Today, the calendar day panel, the plan schedule — for
   work done outside the platform.
3. **Bulk**: select rows, then **Mark done** in the bulk bar.
4. **Skip**, in the ⋯ menu, for tasks that will not be done. A skipped task leaves the queue
   **without counting as studied**, so coverage and accuracy stay honest.

**Always undoable.** Completion shows a toast with **Undo**; un-ticking a checkbox reopens the
task. Completed tasks keep their completion date, so the week strip, the hours and the streak
stay accurate.

### Data
```
task.state      'pending' | 'done' | 'skipped'
task.completed_at, task.completed_via ('auto'|'manual'|'bulk')
task.scheduled_for  nullable  -- null means it lives in the queue
task.queue_position int       -- ordering when unscheduled
plan.mode       'scheduled' | 'flexible' | 'target'
plan.weekly_target int        -- target mode only
```

---

# Start, finish, and the task bar

Reference: `PLANNER-7-task-bar.png` · source `planner-task-bar.html`

## Start opens the thing itself
No intermediate screen. **Start** on a task loads the library page, the flashcard session, the
question set or the lesson, with a **task bar** pinned above it.

## The task bar
Navy, 44px, present in every feature when arriving from a task.

| Part | Contents |
|---|---|
| Left | `TASK 2 OF 3` · the plan and day · three segments showing position in the day |
| Right | **Skip** · **Back to planner** · **✓ Mark as read / done** (hidden where completion is automatic and already handled by the session's own end screen) |

It disappears when the user navigates away from the task's target, and reappears if they return.
Arriving at a page **not** from a task shows no bar.

## When a task completes automatically
| Type | Completes when | Manual override |
|---|---|---|
| Read a page | the reader reaches the **end of the page** and has been on it **≥ 30 seconds** | Mark as read — task bar, left rail, or end-of-page block |
| Flashcards | the **session ends** (every card graded) | leaving early keeps the task open, showing "12 of 20 done" |
| Questions | the **set is submitted** or every question answered | same, partial progress kept |
| Course lesson | the lesson's own completion rule fires | checkbox on the task row |
| Custom | never — nothing to observe | the checkbox, always shown |

## Where the manual controls live on a reading page
Three places, all doing the same thing:
1. **Task bar** — "✓ Mark as read", the primary.
2. **Left rail** — a *Reading progress* box with the percentage, minutes left, and a checkbox
   labelled "Mark as read", with the note *"Ticks itself when you reach the end."*
3. **End-of-page block** — appears at the bottom of the page: "You have reached the end… this
   completes *Read: Anterior cord syndrome*" with **✓ Done · next task →** and **Not yet**.

**Why not only a sidebar checkbox:** it would solve one task type out of five, and the left rail
means something different in every feature (contents when reading, the question map when
answering, the deck index in flashcards). The task bar is one component that behaves the same
everywhere.

## One source of truth
A page's **read state belongs to the library**, not the planner. Marking a page read anywhere —
from a task, or while browsing — writes the same `page_read` event, which completes any open
planner task pointing at it. The two features never disagree.
