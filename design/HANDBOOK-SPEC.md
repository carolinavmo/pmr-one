# My Handbook — improved

Reference: `HANDBOOK-improved.png` · **source of truth**: `handbook-improved.html`
(The pink circles in the reference are annotations, not part of the design.)

## What was wrong
1. **The left sidebar showed the library tree** while you were in your handbook — it navigated
   somewhere else entirely, and the handbook's own index was squeezed into a middle column.
2. **Two navigation columns** competing: library tree + index, leaving the editor narrow.
3. **No writing tools** — no headings, lists, tasks, tables or images.
4. **Actions hidden** behind two small icons (copy, delete). No export, share, or
   editing/reading state.
5. **No link back to the library** — a note about lateral epicondylopathy had no relationship to
   the library page on the same subject.
6. **No outline**, so a long protocol was a single scroll.

## Layout
| Column | Width | Contents |
|---|---|---|
| Index rail | 268px | New page, search, filters, folders with counts, footer stats |
| Editor | fluid, text column max **680px** | header, toolbar, page |
| Context rail | 250px | outline, library link, backlinks, template |

## 1 · Index rail
- **＋ New page** as a navy primary button at the top; a `＋` on each folder header creates
  inside that folder.
- Search, then filter chips: **All · ★ Pinned · Recent · Shared**.
- Folder headers carry a coloured tile (pages teal, protocols purple, templates amber), a count
  and a `＋`.
- Rows show a star when pinned and a relative time otherwise. The open page is white with a
  soft shadow.
- Footer: total pages and last sync.

## 2 · Page header
Breadcrumb → title (edit in place) → actions: **Export, Share, Editing/Reading toggle, ⋯**.
Meta row: **library link chip**, tags with `+ tag`, edited date, save state, **word count and
reading time**.

## 3 · Linked to the library
A note can name the library page it came from (`🔗 Linked · MSK › Elbow › Lateral
epicondylopathy`). The context rail shows that page's review date and a link to open it.
This is what separates a handbook from a notes app.

## 4 · Writing toolbar
Headings, bold/italic/underline, lists, **tasks**, table, image, link — plus two platform
actions:
- **＋ Insert card** — the highlight blocks used across the site (pearl, red flag, exam tip…),
  so notes look like the rest of the platform.
- **＋ Pull from library** — quote a section, a pearl or a calculator result into the note,
  with the source attached automatically.

## 5 · Context rail
- **On this page** — the note's own headings, current one marked.
- **From the library** — the source page and when it was last reviewed.
- **Linked from** — other handbook pages that reference this one.
- **Template** — which template the page uses, and "Save as template".

## Rules
1. **The rail is the handbook.** The library tree belongs to the library, not here.
2. **One text column, 680px.** Notes are read, not scanned — do not let lines run the full width.
3. **Autosave, always**; the save state is shown, never a Save button.
4. **Nothing hidden behind an icon alone** — every action has a label.
5. Tasks, cards and tables are content, not formatting tricks: they export to PDF as themselves.
