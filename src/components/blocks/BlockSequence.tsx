import type { EditorialBlock } from "@/lib/editorial-blocks";
import { BlockRenderer } from "./BlockRenderer";
import { BlockControls } from "@/components/disease-page/BlockControls";
import { ResizableRow } from "@/components/disease-page/ResizableRow";
import { SectionCard } from "@/components/disease-page/SectionCard";
import { EmptyBlockPrompt } from "@/components/disease-page/EmptyBlockPrompt";
import { EditableSection } from "@/components/disease-page/EditMode";
import { BlockDndProvider } from "@/components/disease-page/BlockDnd";
import { splitIntoSections } from "@/lib/sections";
import {
  ROW_ALIGN_SELF_CLASS,
  STANDALONE_WIDTH_CLASS,
  STANDALONE_ALIGN_CLASS,
} from "@/lib/block-alignment";

// 12 columns, not 6 — the smallest preset (Small Cards, 1/4 width)
// needs a divisor 6 columns can't give an integer span for.
const widthClass: Record<string, string> = {
  "1/4": "sm:col-span-3",
  "1/3": "sm:col-span-4",
  "1/2": "sm:col-span-6",
  "2/3": "sm:col-span-8",
  "3/4": "sm:col-span-9",
  full: "sm:col-span-12",
};

interface BlockGroup {
  row: string | null;
  blocks: EditorialBlock[];
}

// One horizontal slot within a row — a plain block (col unset) is its
// own single-block cell exactly like before; several row-mates sharing
// `col` collapse into one cell, stacked vertically (#132). A row whose
// members reduce to exactly one cell (regardless of how many blocks
// are stacked inside it) isn't rendered as a row at all — see the
// `cells.length <= 1` fallthrough below.
interface Cell {
  col: string | null;
  blocks: EditorialBlock[];
}

function partitionCells(blocks: EditorialBlock[]): Cell[] {
  const cells: Cell[] = [];
  for (const block of blocks) {
    const col = block.layout?.col ?? null;
    const last = cells[cells.length - 1];
    if (col && last?.col === col) {
      last.blocks.push(block);
    } else {
      cells.push({ col, blocks: [block] });
    }
  }
  return cells;
}

interface WorkspaceContext {
  diseaseSlug: string;
  savedPearlIds: Set<string>;
}

interface RenderGroupsArgs {
  blocks: EditorialBlock[];
  workspaceContext?: WorkspaceContext;
  diseaseId: string;
  diseaseSlug: string;
  contextHint?: string;
  isSignedIn: boolean;
}

// Groups consecutive blocks that share a display_config.layout.row into
// a horizontal grid; everything else renders full-width in sequence,
// exactly as before. Mobile always stacks to a single column — this
// platform's core context is one-thumb lookup, not desktop browsing.
// Shared by both the flat (edit-mode) and per-section (reading-mode
// accordion) render paths below — a "row" can never span a
// section_heading anyway (headings always start a fresh group, same as
// they always start a fresh section), so grouping per-section slice
// produces identical results to grouping the whole sequence at once.
function renderGroups({ blocks, workspaceContext, diseaseId, diseaseSlug, contextHint, isSignedIn }: RenderGroupsArgs) {
  const groups: BlockGroup[] = [];
  for (const block of blocks) {
    const row = block.layout?.row ?? null;
    const last = groups[groups.length - 1];
    if (row && last?.row === row) {
      last.blocks.push(block);
    } else {
      groups.push({ row, blocks: [block] });
    }
  }

  const renderMember = (block: EditorialBlock) => (
    <BlockControls key={block.id} diseaseId={diseaseId} block={block} contextHint={contextHint}>
      <BlockRenderer
        block={block}
        workspaceContext={workspaceContext}
        diseaseId={diseaseId}
        diseaseSlug={diseaseSlug}
        isSignedIn={isSignedIn}
      />
    </BlockControls>
  );

  // A cell with one block renders exactly as before; 2+ stacked blocks
  // get a plain vertical flex stack — no special divider between them
  // (unlike the row's own ResizableRow), since a stack's members are
  // reordered by dragging one directly onto another (BlockControls'
  // own stack-above/stack-below drop zones), not by resizing a split.
  const renderCell = (cell: Cell) =>
    cell.blocks.length === 1 ? (
      renderMember(cell.blocks[0])
    ) : (
      <div className="flex flex-col gap-3">{cell.blocks.map(renderMember)}</div>
    );

  return groups.map((group, index) => {
    const cells = group.row ? partitionCells(group.blocks) : [];

    if (group.row && cells.length === 2) {
      const [left, right] = cells;
      return (
        <ResizableRow
          key={`${group.row}-${index}`}
          leftIds={left.blocks.map((b) => b.id)}
          leftWidth={
            left.blocks[0].layout?.width && left.blocks[0].layout.width !== "full"
              ? left.blocks[0].layout.width
              : "1/2"
          }
          leftAlign={left.blocks[0].layout?.rowAlign}
          leftNode={renderCell(left)}
          rightIds={right.blocks.map((b) => b.id)}
          rightWidth={
            right.blocks[0].layout?.width && right.blocks[0].layout.width !== "full"
              ? right.blocks[0].layout.width
              : "1/2"
          }
          rightAlign={right.blocks[0].layout?.rowAlign}
          rightNode={renderCell(right)}
        />
      );
    }

    return group.row && cells.length >= 3 ? (
      <div key={`${group.row}-${index}`} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {cells.map((cell) => (
          <div
            key={cell.blocks[0].id}
            className={`${widthClass[cell.blocks[0].layout?.width ?? "full"]} ${
              cell.blocks[0].layout?.rowAlign ? ROW_ALIGN_SELF_CLASS[cell.blocks[0].layout.rowAlign] : ""
            }`}
          >
            {renderCell(cell)}
          </div>
        ))}
      </div>
    ) : (
      // No row, or a row that's degenerated to a single cell (nothing
      // beside it to be a "row" relative to — e.g. a lone stack, or
      // every other cell just got dragged away) — plain sequence,
      // identical to a block that never had `layout.row` at all.
      group.blocks.map((block) => {
        const controls = renderMember(block);
        // Standalone width/position — a block outside any row that's
        // been narrowed below "full" sits inside a percentage-width,
        // margin-positioned wrapper instead of stretching edge to
        // edge. Most blocks never set this, so this stays a no-op
        // (`full` renders with no wrapper at all) for the common case.
        const width = block.layout?.width;
        if (!width || width === "full") return controls;
        return (
          <div
            key={block.id}
            className={`${STANDALONE_WIDTH_CLASS[width]} ${
              STANDALONE_ALIGN_CLASS[block.layout?.align ?? "left"]
            }`}
          >
            {controls}
          </div>
        );
      })
    );
  });
}

// diseaseId/diseaseSlug are always passed (every disease page has
// both) — BlockControls only ever uses them once edit mode is on, but
// needs them ready. Grouped blocks (a card grid's individual cards)
// get BlockControls too, same as any other block — move/delete just
// operates on the flat `position` column regardless of which visual
// row a block happens to render in, so no separate mechanism was
// needed once Card Grid/Large Cards/Small Cards made "manage one card
// inside a row" a real, not hypothetical, need.
//
// Reading mode groups the sequence into one visually distinct card
// per section_heading via SectionCard (originally a collapse/expand
// accordion — founder later asked to drop that interaction and keep
// just the visual grouping). #136: each SectionCard now owns its own
// edit toggle and EditModeProvider — replacing the single page-wide
// "Edit page" button — so an editor opens exactly the section(s) they
// mean to change instead of the whole page turning editable at once.
export function BlockSequence({
  blocks,
  workspaceContext,
  diseaseId,
  diseaseSlug,
  canEdit,
  isSignedIn,
}: {
  blocks: EditorialBlock[];
  workspaceContext?: WorkspaceContext;
  diseaseId: string;
  diseaseSlug: string;
  canEdit: boolean;
  isSignedIn: boolean;
}) {
  if (blocks.length === 0) {
    return <EmptyBlockPrompt diseaseId={diseaseId} canEdit={canEdit} />;
  }

  const sections = splitIntoSections(blocks);
  // Numbers only the headed sections, in the same order OnThisPage's
  // getSectionSummaries does (it skips the headerless leading group
  // entirely) — so a heading's own "3." always matches its row in the
  // "On this page" list, without threading a second data source
  // through here.
  let headedCount = 0;
  const sectionNumbers = sections.map((section) => (section.headingBlock ? ++headedCount : null));

  return (
    <BlockDndProvider diseaseId={diseaseId}>
      {sections.map((section, index) => {
        const contextHint = section.headingBlock?.text;

        if (!section.headingBlock) {
          return (
            <EditableSection key={`preamble-${index}`} canEdit={canEdit}>
              {renderGroups({
                blocks: section.blocks,
                workspaceContext,
                diseaseId,
                diseaseSlug,
                contextHint,
                isSignedIn,
              })}
            </EditableSection>
          );
        }

        const heading = (
          <BlockControls diseaseId={diseaseId} block={section.headingBlock} contextHint={contextHint}>
            <BlockRenderer
              block={section.headingBlock}
              workspaceContext={workspaceContext}
              diseaseId={diseaseId}
              diseaseSlug={diseaseSlug}
            />
          </BlockControls>
        );

        return (
          <SectionCard
            key={section.headingBlock.id ?? `section-${index}`}
            heading={heading}
            sectionNumber={sectionNumbers[index]}
            canEdit={canEdit}
            isSignedIn={isSignedIn}
          >
            {renderGroups({
              blocks: section.blocks,
              workspaceContext,
              diseaseId,
              diseaseSlug,
              contextHint,
              isSignedIn,
            })}
          </SectionCard>
        );
      })}
    </BlockDndProvider>
  );
}
