import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDiseaseBySlug } from "@/lib/disease-loader";
import { recordPageView, getSavedPearlIds, isDiseaseFavorited } from "@/lib/workspace";
import { getAnnotationsForDisease, type Annotation } from "@/lib/annotations";
import { estimateReadingMinutes } from "@/lib/reading-time";
import { getSectionSummaries } from "@/lib/sections";
import { getBreadcrumbPath, getAdjacentDiseases } from "@/lib/topics";
import { BlockSequence } from "@/components/blocks/BlockSequence";
import { Breadcrumbs } from "@/components/disease-page/Breadcrumbs";
import { OnThisPage } from "@/components/disease-page/OnThisPage";
import { AdjacentDiseaseNav } from "@/components/disease-page/AdjacentDiseaseNav";
import { BackToTop } from "@/components/disease-page/BackToTop";
import { DiseaseSnapshot, extractSnapshot } from "@/components/disease-page/DiseaseSnapshot";
import { DiseaseHeader } from "@/components/disease-page/DiseaseHeader";
import { WorkspacePanel } from "@/components/disease-page/WorkspacePanel";
import { EditModeProvider } from "@/components/disease-page/EditMode";
import { AnnotationProvider } from "@/components/annotations/AnnotationProvider";
import { categoryForRegions } from "@/lib/disease-icons";

interface DiseasePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function DiseasePage({ params }: DiseasePageProps) {
  const { slug, locale } = await params;
  const disease = await getDiseaseBySlug(slug, locale);
  if (!disease) notFound();

  // Only published diseases are publicly visible — editors/admins can
  // still view any status (that's what makes review possible at all).
  const session = await auth();
  const canSeeUnpublished = session?.user.role === "editor" || session?.user.role === "admin";
  if (disease.status !== "published" && !canSeeUnpublished) notFound();

  // Same check drives both — anyone who can review an unpublished
  // disease can also edit its prose (Author v1 Pass 1).
  const canEdit = canSeeUnpublished;
  // Stricter than canEdit — deleting the whole page is an admin-only
  // action, same gate as the /admin review queue's own delete button.
  const isAdmin = session?.user.role === "admin";

  const snapshot = extractSnapshot(disease.blocks);
  const bodyBlocks = snapshot ? snapshot.rest : disease.blocks;

  const sectionSummaries = getSectionSummaries(bodyBlocks);
  const [breadcrumbPath, adjacent] = await Promise.all([
    getBreadcrumbPath(slug),
    getAdjacentDiseases(slug, canSeeUnpublished),
  ]);

  // Personal Workspace is signed-in only — a visitor's layout and
  // rendering stay exactly as they were before this feature existed.
  let workspaceContext: { diseaseSlug: string; savedPearlIds: Set<string> } | undefined;
  let isFavorited = false;
  let annotations: Annotation[] = [];
  if (session) {
    await recordPageView(session.user.id, disease.id);
    workspaceContext = {
      diseaseSlug: disease.slug,
      savedPearlIds: await getSavedPearlIds(session.user.id),
    };
    isFavorited = await isDiseaseFavorited(session.user.id, disease.id);
    annotations = await getAnnotationsForDisease(session.user.id, disease.id);
  }

  const readingMinutes = estimateReadingMinutes(disease.blocks);

  // The disease header/snapshot gets its own edit boundary — a small
  // per-region toggle (#136), same idea as each body section below,
  // rather than tying title/status edits to any one section or
  // reviving the old single page-wide "Edit page" button.
  const headerContent = snapshot ? (
    <DiseaseSnapshot
      diseaseId={disease.id}
      diseaseSlug={disease.slug}
      diseaseName={disease.canonicalName}
      status={disease.status}
      regions={disease.regions}
      evidenceBased={disease.evidenceBased}
      boardRelevance={disease.boardRelevance}
      updatedAt={disease.updatedAt.toISOString()}
      readingMinutes={readingMinutes}
      isSignedIn={Boolean(session)}
      isFavorited={isFavorited}
      illustration={snapshot.illustration}
      canEdit={canEdit}
      isAdmin={isAdmin}
      blockCount={disease.blocks.length}
    />
  ) : (
    <DiseaseHeader
      diseaseId={disease.id}
      diseaseSlug={disease.slug}
      diseaseName={disease.canonicalName}
      status={disease.status}
      category={categoryForRegions(disease.regions)}
      evidenceBased={disease.evidenceBased}
      boardRelevance={disease.boardRelevance}
      updatedAt={disease.updatedAt.toISOString()}
      readingMinutes={readingMinutes}
      isSignedIn={Boolean(session)}
      isFavorited={isFavorited}
      canEdit={canEdit}
      isAdmin={isAdmin}
      blockCount={disease.blocks.length}
    />
  );

  const readingContent = (
    <>
      <Breadcrumbs path={breadcrumbPath} />
      {canEdit ? <EditModeProvider>{headerContent}</EditModeProvider> : headerContent}
      <OnThisPage sections={sectionSummaries} diseaseId={disease.id} canEdit={canEdit} />
      <BlockSequence
        blocks={bodyBlocks}
        workspaceContext={workspaceContext}
        diseaseId={disease.id}
        diseaseSlug={disease.slug}
        canEdit={canEdit}
        isSignedIn={Boolean(session)}
      />
      <AdjacentDiseaseNav adjacent={adjacent} />
      <BackToTop />
    </>
  );

  // Contents used to live in a floating right-side ContentsRail; now
  // superseded by the sidebar's own Index tree (site-wide breadcrumbs/
  // navigation) plus the inline OnThisPage card rendered as a normal
  // member of the reading column (in `readingContent`, not a `fixed`
  // sibling here) — so the reading column is this row's only real
  // member again, taking the full width `main` gives it. WorkspacePanel
  // is unrelated (Notes/Saved Pearls/Recently Viewed) and stays as its
  // own floating sibling.
  //
  // gap-4 (16px, down from gap-6/24px — compaction request, the page
  // read as too airy) is the uniform gap between every block in the
  // reading column; section_heading's own larger mt-8 is what still
  // makes a new section read as more separated than two blocks within
  // one. Tightening this gap directly (rather than a negative margin
  // scoped to headings) also works identically in edit mode, where
  // BlockControls wraps each block in its own div and a heading-scoped
  // negative margin would be trapped inside that wrapper instead of
  // reaching the outer flex gap.
  const readingColumn = (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-transparent p-3">
      {/* No single page-wide EditModeProvider anymore (#136) — the
          header and every body section (SectionCard/EditableSection)
          each mount their own, so editing toggles per region instead
          of the whole page turning editable at once. A visitor or
          non-editor never mounts any Provider at all, anywhere in
          this tree — useEditMode()'s default (editing: false) stays
          the only possible state, not just a hidden one. */}
      {readingContent}
    </div>
  );

  return (
    <main className="flex items-start px-3 py-6">
      {session ? (
        // One AnnotationProvider wraps both the reading column (where
        // AnnotatableProse instances relocate/render markers) and the
        // Workspace drawer (whose management-list card needs the same
        // locatedIds/allAnnotations) — the drawer can't independently
        // probe the reading column's DOM itself (some fields, e.g. a
        // SelfCheckBlock's answer, aren't even mounted until "Show
        // answer" is clicked), so a shared Context is the only single
        // source of truth for both. Same composition shape as
        // `{canEdit ? <EditModeProvider>{headerContent}</EditModeProvider> : headerContent}`
        // above — a Server Component passing a Server Component as
        // `children` into a Client Component, already proven in this
        // file.
        <AnnotationProvider diseaseId={disease.id} initialAnnotations={annotations}>
          {readingColumn}
          <WorkspacePanel userId={session.user.id} diseaseId={disease.id} diseaseSlug={disease.slug} />
        </AnnotationProvider>
      ) : (
        readingColumn
      )}
    </main>
  );
}
