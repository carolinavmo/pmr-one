"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { AtlasSection, AtlasPage } from "@/lib/atlas";
import type { CardColor } from "@/lib/editorial-blocks";
import {
  createSectionAction,
  renameSectionAction,
  updateSectionColorAction,
  deleteSectionAction,
  reorderSectionsAction,
  createPageAction,
  renamePageAction,
  movePageAction,
  reorderPagesAction,
  togglePagePinnedAction,
  deletePageAction,
  updatePageTagsAction,
  setPageLinkedDiseaseAction,
} from "@/lib/actions/atlas";
import { AtlasIndex } from "./AtlasIndex";
import { AtlasEditor } from "./AtlasEditor";

// Owns the workspace's client-side state directly rather than relying
// on props re-syncing after revalidatePath — every mutating action
// below already returns (or implies) the exact row that changed, so
// local state is patched immediately for a snappy UI, while
// revalidateAtlasSurfaces() (called inside each action) keeps the
// server-rendered copy fresh for the next full page load.
export function AtlasWorkspace({
  initialSections,
  initialPages,
}: {
  initialSections: AtlasSection[];
  initialPages: AtlasPage[];
}) {
  const t = useTranslations("myAtlas");
  const [sections, setSections] = useState(initialSections);
  const [pages, setPages] = useState(initialPages);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(initialPages[0]?.id ?? null);

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) ?? null,
    [pages, selectedPageId]
  );

  async function handleCreateSection(name: string) {
    const section = await createSectionAction(name);
    setSections((prev) => [...prev, section]);
  }

  async function handleRenameSection(sectionId: string, name: string) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, name } : s)));
    await renameSectionAction(sectionId, name);
  }

  async function handleUpdateSectionColor(sectionId: string, color: CardColor) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, color } : s)));
    await updateSectionColorAction(sectionId, color);
  }

  // orderedIds is the section list's full new order — reorder local
  // state to match immediately, matching every other handler here.
  async function handleReorderSections(orderedIds: string[]) {
    setSections((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      return orderedIds.map((id) => byId.get(id)).filter((s): s is AtlasSection => !!s);
    });
    await reorderSectionsAction(orderedIds);
  }

  async function handleDeleteSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    const remaining = pages.filter((p) => p.sectionId !== sectionId);
    setPages(remaining);
    if (selectedPageId && !remaining.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(null);
    }
    await deleteSectionAction(sectionId);
  }

  async function handleCreatePage(sectionId: string, templatePageId?: string) {
    const page = await createPageAction(sectionId, t("untitledPage"), templatePageId);
    setPages((prev) => [...prev, page]);
    setSelectedPageId(page.id);
  }

  async function handleRenamePage(pageId: string, title: string) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, title } : p)));
    await renamePageAction(pageId, title);
  }

  async function handleMovePage(pageId: string, sectionId: string) {
    // Moved pages land at the end of their new section server-side
    // (movePage's own COUNT(*) append) — moving this page to the end
    // of the local array keeps it last among that section's pages too,
    // since rendering just filters the array in its existing order.
    setPages((prev) => {
      const page = prev.find((p) => p.id === pageId);
      if (!page) return prev;
      return [...prev.filter((p) => p.id !== pageId), { ...page, sectionId }];
    });
    await movePageAction(pageId, sectionId);
  }

  // orderedIds is the full new order for one section's own page list —
  // re-slot just that section's entries into the existing array so
  // every other section's pages keep their current positions untouched.
  async function handleReorderPages(sectionId: string, orderedIds: string[]) {
    setPages((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter((p): p is AtlasPage => !!p);
      let i = 0;
      return prev.map((p) => (p.sectionId === sectionId ? reordered[i++] : p));
    });
    await reorderPagesAction(sectionId, orderedIds);
  }

  function handleBodySaved(pageId: string, body: string) {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, body, updatedAt: new Date().toISOString() } : p))
    );
  }

  async function handleDeletePage(pageId: string) {
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    if (selectedPageId === pageId) setSelectedPageId(null);
    await deletePageAction(pageId);
  }

  // Optimistic — the star should flip the instant it's clicked, not
  // wait on a round trip, same "patch local state, let the action
  // confirm in the background" shape every other handler here uses.
  async function handleTogglePinned(pageId: string) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, isPinned: !p.isPinned } : p)));
    await togglePagePinnedAction(pageId);
  }

  async function handleUpdateTags(pageId: string, tags: string[]) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, tags } : p)));
    await updatePageTagsAction(pageId, tags);
  }

  async function handleSetLinkedDisease(pageId: string, diseaseId: string | null) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, linkedDiseaseId: diseaseId } : p)));
    await setPageLinkedDiseaseAction(pageId, diseaseId);
  }

  // "Save as template" (Pass 4) already performed its own write
  // server-side (AtlasPageHeader.tsx's ⋯ menu calls the action
  // directly, since it needs the real created row back) — this just
  // folds the resulting new page into workspace state, same as
  // handleCreatePage does for an ordinary new page.
  function handleSavedAsTemplate(page: AtlasPage) {
    setPages((prev) => [...prev, page]);
  }

  return (
    // HANDBOOK-SPEC.md's three columns: index rail 268px, editor
    // (fluid, text capped at 680px), context rail 250px — stacked
    // below `lg` the same way the previous two-column layout was.
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-0">
      <AtlasIndex
        sections={sections}
        pages={pages}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onCreateSection={handleCreateSection}
        onRenameSection={handleRenameSection}
        onUpdateSectionColor={handleUpdateSectionColor}
        onDeleteSection={handleDeleteSection}
        onReorderSections={handleReorderSections}
        onCreatePage={handleCreatePage}
        onReorderPages={handleReorderPages}
        onTogglePinned={handleTogglePinned}
      />
      <AtlasEditor
        page={selectedPage}
        sections={sections}
        pages={pages}
        onRenamePage={handleRenamePage}
        onMovePage={handleMovePage}
        onDeletePage={handleDeletePage}
        onBodySaved={handleBodySaved}
        onUpdateTags={handleUpdateTags}
        onSetLinkedDisease={handleSetLinkedDisease}
        onSavedAsTemplate={handleSavedAsTemplate}
        onNavigateToPage={setSelectedPageId}
      />
    </div>
  );
}
