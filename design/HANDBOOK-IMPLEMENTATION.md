# Implementing My Handbook

## Commit first
```
design/
  HANDBOOK-SPEC.md
  handbook-improved.html     ← source of truth
  ref/HANDBOOK-improved.png
```

---

## Before any code: what the editor already is
This feature stands or falls on the editor, so settle these before touching layout.

| Question | Why it decides everything |
|---|---|
| **Which editor library?** (TipTap/ProseMirror, Lexical, Slate, a textarea, a markdown field) | The toolbar, tasks, tables and "insert card" are all editor extensions — or a rewrite |
| **What is stored?** HTML, markdown, or a JSON document model | Cards, tasks and links need structured nodes; if notes are HTML strings today, plan a migration |
| **Is there autosave?** | The header shows a save state, never a Save button |
| **Do tags exist?** Links between pages? Sharing? | Each is a section of the design that ships or waits |
| **Do folders (pages / protocols / templates) have counts and ordering?** | The rail shows both |
| **What does "Share" mean here** — a link, a PDF, or a colleague? | It changes the whole permissions model; may become Export only for now |

Ask Claude Code to report on all six and to tell you **which of the six design sections it can
build with what exists**, before it writes anything.

---

## Pass 1 — layout and the index rail
> Read `design/HANDBOOK-SPEC.md` and open `design/handbook-improved.html` — that HTML is the
> source of truth; read its CSS for exact values rather than sampling the PNG.
>
> Restructure the page into three columns: **index rail 268px**, editor (text column capped at
> **680px**), **context rail 250px**. The library tree does not appear on this route at all —
> the rail is the handbook's own index.
>
> Rail: **＋ New page** primary button, search, filter chips (All / ★ Pinned / Recent / Shared),
> then the three folders with a coloured tile, a count and a `＋` that creates inside that
> folder. Rows show a star when pinned, otherwise a relative time. Footer: total pages, last sync.
>
> Leave the context rail in place but empty for now. Do not touch the editor yet.

## Pass 2 — the page header
> Breadcrumb, editable title, and the actions: **Export, Share, Editing/Reading toggle, ⋯**.
> Meta row beneath: tags with `+ tag`, edited date, save state, **word count and reading time**
> (words ÷ 200, rounded up).
>
> If sharing does not exist yet, ship **Export** only and tell me — do not add a Share button
> that opens nothing.

## Pass 3 — the editor and the toolbar
> Add the writing toolbar: H1–H3, bold/italic/underline, bullet and numbered lists, **tasks**,
> table, image, link. Implement as extensions of the existing editor; if the editor cannot
> support tasks or tables, say so before starting rather than faking them with markup.
>
> Then **＋ Insert card**: a picker for our highlight blocks (pearl, red flag, exam tip, in the
> clinic, definition) that inserts a **card node**, not styled text — it must survive a reload,
> an export, and a copy-paste. Use the tokens from `CARDS-SOFT-SPEC.md`.
>
> Autosave with a debounce (about 800ms after typing stops), and show the state in the header:
> *Saving… / ✓ Saved / Offline — changes kept locally*.

## Pass 4 — links to the library, outline, backlinks
> 1. **Library link**: a note can reference a library page. Store the page id, show the chip in
>    the header and the source card in the context rail with its review date.
> 2. **On this page**: build the outline from the note's headings, highlight the current one on
>    scroll (same scroll-spy rules as the library reader), and scroll on click.
> 3. **Linked from**: other handbook pages referencing this one — requires storing internal
>    links as node attributes, not raw URLs.
> 4. **Template**: show which template created the page, and "Save as template".

## Pass 5 — pull from the library
> The feature that makes this a handbook rather than a notes app.
>
> **＋ Pull from library** opens a search over library pages. Choosing a page lists its sections;
> choosing a section inserts it as a **quoted block with attribution** — the page name, the
> section, and the review date — linked back to the source. The inserted text is a copy the user
> can edit, but the attribution stays attached.
>
> Do the same for a calculator result from Clinical Tools if the score data is available;
> otherwise leave a hook and tell me.

## Pass 6 — export
> Export a page to **PDF and Markdown**, preserving headings, tasks, tables and cards. Cards
> export as their own styled blocks; tasks export as checkboxes. Test with a page that contains
> all of them.

---

## Guardrails
- **"The rail is the handbook."** The library tree does not belong on this route.
- **"One text column, 680px."**
- **"Nothing hidden behind an icon alone."** Every action has a label.
- **"Cards and tasks are content, not styling."** They must survive reload, export and paste.
- **"Autosave, always."** No Save button; show the state.

## Check it yourself
- Is the library tree gone from `/handbook`?
- Type a long paragraph — does the text column stay at 680px?
- Insert a clinical pearl card, reload the page — is it still a card?
- Export to PDF — do the card, a task list and a table all survive?
- Pull a section from the library — is the source named, and does it link back?
- Stop typing — does the header go from "Saving…" to "✓ Saved" on its own?
- New account with no pages — is there an empty state, or an empty rail?
