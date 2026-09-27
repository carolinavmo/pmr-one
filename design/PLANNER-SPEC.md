# Study Planner — improved

Reference: `PLANNER-1-today.png` · `PLANNER-2-calendar.png` · `PLANNER-3-plan.png`
**Source of truth**: `planner-today.html`, `planner-calendar.html`, `planner-plan.html`
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
