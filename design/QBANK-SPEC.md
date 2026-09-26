# Question Bank — improved

Reference: `QBANK-1-dashboard.png` · `QBANK-2-folder.png` · `QBANK-3-answering.png`
**Source of truth**: `qbank-dashboard.html`, `qbank-folder.html`, `qbank-answering.html`
(+ `qbank-style.css`)

## Structure
**Subject → folder → topic → question.** A folder (Foot & ankle) holds topics (Plantar
fasciopathy, Achilles tendinopathy); a topic holds questions. Subjects are separators, not
clickable containers.

## What was wrong
1. **The sidebar was the library tree** — the same bug as Clinical Tools, Handbook and Flashcards.
2. **The counts were vanity**: total questions, sets, score, attempts. None of them tells you
   what to practise.
3. **No way to build a session.** A question bank is used by filtering — incorrect, unseen,
   flagged, by subject — and none of that existed.
4. **Folders as large colour tiles** in arbitrary colours, with an empty-state sentence below.
5. **"Manage questions" was visible to learners** on the question screen.
6. **"Next Question" with no submit step**, so answering and advancing were the same action.
7. **No feedback beyond right or wrong**: no source, no difficulty, no what others chose.

---

# The dashboard

| Region | Contents |
|---|---|
| Rail | **▶ Start a session**, search, **Practice** (all, my incorrect, flagged, not seen), **By subject** with your accuracy, **Sets** |
| Header | four figures: **answered · accuracy · to review · streak** |
| Session panel | navy: size and time, what it is built from, **mode selector** (tutor / exam / timed), **Start**, **Resume · Q12 of 20** when a session is open, and Custom |
| Filter row | *Build from*: weakest first · not seen · incorrect · flagged · subject · set · difficulty |
| Accuracy by subject | one row per subject with a bar and a percentage, coloured by band |
| Browse by folder | subject separators, then **coloured folder cards** |
| Your progress | accuracy ring · 12 weeks of activity · weakest folders |

### Folder card — minimal, pastel
Each folder takes one colour from the **pastel palette** below. The card carries no actions: the
practising happens in the session panel above and inside the folder.

| Part | Spec |
|---|---|
| Card | `--cb` tint, radius 18, padding 18/20, hover shadow `0 8px 20px rgba(20,40,74,.10)` |
| Name | 20px / 900 **navy** — never the accent colour |
| Sub | "3 topics · 48 questions", 12.5px / 700 `--mute` |
| Accuracy | a white pill with a `--cd` border and `--c` text: "74% correct", or "not started" in grey |
| Open | `Open ›`, 13px / 900 in `--c`, right-aligned |
| Last card | dashed **＋ New folder** |

**Pastel palette** — tint / border / accent:
| | tint | border | accent |
|---|---|---|---|
| peach | `#FFF0E4` | `#F8D7BC` | `#D9762F` |
| rose | `#FFEBF2` | `#F7CEDD` | `#CE5C87` |
| lilac | `#EFEBFC` | `#DBD3F5` | `#6F5FCB` |
| mint | `#E3F6F0` | `#C3E9DF` | `#2E9B80` |
| sky | `#E7F2FB` | `#C7E1F4` | `#4189C4` |
| butter | `#FFF6DF` | `#F2E3B8` | `#B58A25` |
| sage | `#F0F7E4` | `#D7E9BD` | `#6E9B39` |
| blush | `#FFECEA` | `#F8D2CF` | `#CE6660` |

**Text is always navy.** The accent is used only for the pill text, the Open link and small
marks — so contrast never depends on the hue.

**The trade-off to accept:** a minimal card cannot start a session. That work is carried by the
session panel, the *build from* filters, **Practise the weakest 20** in the progress panel, and
the folder page itself. If the analytics later show people wanting to practise straight from a
card, add one action on hover rather than making every card louder.

Options explored: `QBANK-folder-options.png`, `-colour.png`, `-pastel.png` (option P chosen).

### Your progress
The same three questions as the flashcards page, in question-bank terms:
| Panel | Contents |
|---|---|
| Overall accuracy | 100px ring, "147 of 222 answered correctly", the month's change, plus *to review* and *not seen* |
| Questions answered | 12 weekly bars, then total, weekly average and streak |
| Weakest folders | four folders sorted by accuracy, each in its colour, and **Practise the weakest 20 ›** |

Accuracy bands are the same everywhere: ≥ 70% green, 55–69% amber, < 55% red.

**Accuracy bands:** ≥ 70% green, 55–69% amber, < 55% red. Same thresholds everywhere.

---

# Inside a folder

`/qbank/folder/:id`

| Region | Contents |
|---|---|
| Breadcrumb | Question Bank › MSK › Foot & ankle |
| Header | pastel peach panel, 120px accuracy ring, name, "3 topics · 48 questions · from MSK in the library", a three-part bar with a legend, and three actions: **Practise this folder**, *9 I got wrong*, *14 not seen* |
| Metrics | questions · your accuracy · flagged · last practised |
| Tabs | Topics · All questions · My incorrect · Statistics |
| Topic rows | subject swatch, name, "20 questions · from the library · 6 left to answer", a three-part bar, the accuracy, and a button that names the action — **Start / Continue / Retake** |
| New topic | dashed row: "＋ New topic in Foot & ankle · or generate questions from a library page" |
| Worth revisiting | the actual questions answered wrong more than once, with **Review** and **Practise** |

**The folder page is the folder card, enlarged** — same ring colour logic, same three-part bar,
same accuracy band.

---

# Answering

**The session owns the screen** — no navbar, no sidebar.

| Part | Spec |
|---|---|
| Chrome | exit · set name and mode · **Q 6 of 20** · timer · running correct and wrong · flag · ⋯ |
| Progress | 5px bar in `--acc` |
| Stem | 23px / 1.5, max 820px column, key phrases bold |
| Options | 2px border, 32px letter chip, keyboard number on the right; selected takes `--acc` |
| Action | **Submit answer** (navy) · "or press enter" · *Skip for now* |
| Question map | right rail: 20 squares — correct green, wrong red, current navy, unseen grey; jumpable |

## After answering
1. **Options re-marked**: your wrong choice red, the correct one green, and **what share of users chose each** distractor.
2. **Verdict bar** — "Not quite — 41% get this one wrong", with your answer and the right one.
3. **Why B is right**, then **why the others are not**, one line each with its letter.
4. **The source**, in an accent panel: the library page and its review date, with *Open the page ›*.
5. **Actions**: ＋ Add to flashcards · Note · Report · **Next question →**.
6. The right rail shows **difficulty**, **tags**, and confirmation that the question has been
   **added to the review list**.

## Rules
1. **Answer and advance are two actions.** Submit reveals; Next moves on.
2. **Every explanation names its source** and links to it.
3. **A wrong answer becomes future practice** — automatically added to the review list, and
   offered as a flashcard.
4. **Editing tools never appear to learners.** "Manage questions" belongs in the admin area.
5. **Keyboard**: 1–5 select, enter submits, `n` next, `f` flag, `Esc` exits.
6. Tutor mode explains immediately; exam mode explains at the end. The mode is chosen **before**
   the session, and shown in the chrome throughout.

## Data needed
- Per question: subject, set, difficulty, tags, source page id, and the **answer distribution**
  across all users.
- Per user per question: last answer, correct or not, flagged, seen count.
- Sessions: an open session with its position, so Resume works.
- Structure: subject → folder → topic → question, with counts and per-user accuracy cached at
  folder and topic level.
