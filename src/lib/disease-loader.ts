import { pool } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import type {
  BlockLayout,
  CardColor,
  EditorialBlock,
  HighlightCardBlock,
  ImageRowBlock,
  ManeuverRelationship,
  MedicalIllustrationBlock,
  OverviewBlock,
  ParagraphBlock,
  SimpleImageBlock,
} from "@/lib/editorial-blocks";

export interface DiseaseData {
  id: string;
  canonicalName: string;
  slug: string;
  status: string;
  blocks: EditorialBlock[];
  regions: (string | null)[];
  evidenceBased: boolean;
  boardRelevance: number | null;
  updatedAt: Date;
}

interface BlockRow {
  id: string;
  position: number;
  block_type: string;
  referenced_object_type: string | null;
  referenced_object_id: string | null;
  content_config: Record<string, unknown>;
  display_config: Record<string, unknown>;
}

export async function getDiseaseBySlug(slug: string): Promise<DiseaseData | null> {
  const { rows: diseaseRows } = await pool.query(
    `SELECT d.id, d.canonical_name, d.slug, d.status,
      d.evidence_based, d.board_relevance, d.updated_at,
      (
        SELECT array_agg(DISTINCT a.region)
        FROM illustration_usage iu
        JOIN illustration_depicts_anatomy ida ON ida.medical_illustration_id = iu.medical_illustration_id
        JOIN anatomy_structure a ON a.id = ida.anatomy_structure_id
        WHERE iu.target_type = 'disease' AND iu.target_id = d.id
      ) AS regions
     FROM disease d WHERE d.slug = $1`,
    [slug]
  );
  const disease = diseaseRows[0];
  if (!disease) return null;

  const { rows: blockRows } = await pool.query<BlockRow>(
    `SELECT id, position, block_type, referenced_object_type, referenced_object_id, content_config, display_config
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [disease.id]
  );

  const resolved = await Promise.all(
    blockRows.map(async (row): Promise<EditorialBlock | null> => {
      const block = await resolveBlock(disease.id, row);
      if (!block) return null;
      const layout = row.display_config?.layout as BlockLayout | undefined;
      return { ...block, position: row.position, ...(layout ? { layout } : {}) };
    })
  );

  return {
    id: disease.id,
    canonicalName: disease.canonical_name,
    slug: disease.slug,
    status: disease.status,
    blocks: resolved.filter((block): block is EditorialBlock => block !== null),
    regions: disease.regions ?? [],
    evidenceBased: disease.evidence_based,
    boardRelevance: disease.board_relevance,
    updatedAt: disease.updated_at,
  };
}

export interface SectionIndexEntry {
  id: string;
  heading: string;
}

export interface SectionIndex {
  diseaseSlug: string;
  sections: SectionIndexEntry[];
}

// Was a one-disease trial (`plantar-fasciopathy-v2` only, hardcoded)
// before entry #125 — now works for any disease, called on demand
// (see /api/disease-sections/[slug]) for whichever page is actually
// open, rather than pre-fetched for one fixed slug on every request.
// Deliberately a narrow, cheap query (heading text only, no
// `resolveBlock`/joins) rather than reusing getDiseaseBySlug's full
// resolution — that would be a much heavier fetch just to read
// heading text. `id` is computed with the exact same `slugify`
// sections.ts uses, so it matches the `id` SectionHeadingBlockView
// renders and `#id` links resolve correctly. `includeUnpublished`
// mirrors the same editor/admin visibility check every other topic-
// tree/disease-page query already applies — a draft disease's section
// titles shouldn't leak to a signed-out visitor via this route any
// more than via the tree or the page itself.
export async function getSectionIndex(
  diseaseSlug: string,
  includeUnpublished = false
): Promise<SectionIndex | null> {
  const { rows } = await pool.query<{ text: string }>(
    `SELECT eb.content_config->>'text' AS text
     FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = $1 AND eb.block_type = 'section_heading'
       AND (d.status = 'published' OR $2)
     ORDER BY eb.position`,
    [diseaseSlug, includeUnpublished]
  );
  if (rows.length === 0) return null;

  // Mirrors DiseaseSnapshot.tsx's extractSnapshot() exactly: when the
  // page's first three blocks are a "Overview" section_heading, a
  // paragraph, and a medical_illustration, that heading is consumed
  // into the page header (rendered as the intro/hero, never as a body
  // section) rather than passed through to BlockSequence — so it has
  // no anchor and no OnThisPage row on the real page. This is a
  // second, independent query (rather than reusing extractSnapshot,
  // which needs fully resolved blocks) specifically to keep this
  // route's own "heading text only, no resolveBlock" cheapness intact;
  // it only ever reads 3 rows.
  const { rows: firstThree } = await pool.query<{ block_type: string }>(
    `SELECT eb.block_type
     FROM editorial_block eb
     JOIN disease d ON d.id = eb.disease_id
     WHERE d.slug = $1 AND (d.status = 'published' OR $2)
     ORDER BY eb.position
     LIMIT 3`,
    [diseaseSlug, includeUnpublished]
  );
  const isSnapshotHeading =
    rows[0]?.text === "Overview" &&
    firstThree[0]?.block_type === "section_heading" &&
    firstThree[1]?.block_type === "paragraph" &&
    firstThree[2]?.block_type === "medical_illustration";

  const sectionRows = isSnapshotHeading ? rows.slice(1) : rows;
  if (sectionRows.length === 0) return null;
  return {
    diseaseSlug,
    sections: sectionRows.map((row) => ({ id: slugify(row.text), heading: row.text })),
  };
}

// Every object-embedding block type needs its own fetch-then-map case
// here — there's no shared abstraction across them yet. Manageable for
// 9 block types by hand; see LESSONS_LEARNED.md on whether that holds
// as more block types get built out.
async function resolveBlock(diseaseId: string, row: BlockRow): Promise<EditorialBlock | null> {
  const cc = row.content_config ?? {};

  switch (row.block_type) {
    case "section_heading":
      return { type: "section_heading", id: row.id, text: cc.text as string };

    case "subsection_heading":
      return { type: "subsection_heading", id: row.id, text: cc.text as string };

    case "paragraph":
      return {
        type: "paragraph",
        id: row.id,
        body: cc.body as string,
        callout: cc.callout as boolean | undefined,
        learningObjective: cc.learningObjective as string | undefined,
        expandable: cc.expandable as boolean | undefined,
        icon: cc.icon as string | undefined,
        cardStyle: cc.cardStyle as ParagraphBlock["cardStyle"],
        badges: cc.badges as ParagraphBlock["badges"],
        imageUrl: cc.imageUrl as string | undefined,
        imageAlt: cc.imageAlt as string | undefined,
      };

    case "comparison_table":
      return {
        type: "comparison_table",
        id: row.id,
        caption: cc.caption as string | undefined,
        columns: (cc.columns as string[]) ?? [],
        rows: (cc.rows as string[][]) ?? [],
      };

    case "key_point":
      return {
        type: "key_point",
        id: row.id,
        text: cc.text as string,
        color: cc.color as CardColor | undefined,
      };

    case "self_check":
      return {
        type: "self_check",
        id: row.id,
        question: cc.question as string,
        answer: cc.answer as string,
      };

    case "timeline":
      return {
        type: "timeline",
        id: row.id,
        title: cc.title as string | undefined,
        subtitle: cc.subtitle as string | undefined,
        orientation: cc.orientation as "horizontal" | "vertical" | undefined,
        steps: (cc.steps as { label: string; description?: string; icon?: string }[]) ?? [],
      };

    case "infographic":
      return {
        type: "infographic",
        id: row.id,
        tiles: (cc.tiles as { value: string; label: string }[]) ?? [],
      };

    case "tabs":
      return {
        type: "tabs",
        id: row.id,
        tabs:
          (cc.tabs as {
            icon?: string;
            label: string;
            sublabel?: string;
            title?: string;
            columns: { title: string; items: string[] }[];
          }[]) ?? [],
      };

    case "media_tabs":
      return {
        type: "media_tabs",
        id: row.id,
        tabs:
          (cc.tabs as {
            icon?: string;
            label: string;
            sublabel?: string;
            imageUrl?: string;
            body: string;
          }[]) ?? [],
      };

    case "rich_table":
      return {
        type: "rich_table",
        id: row.id,
        title: cc.title as string | undefined,
        badgeColumnTitle: cc.badgeColumnTitle as string | undefined,
        columns:
          (cc.columns as { title: string; type: "text" | "icon_list" | "scale" }[]) ?? [],
        rows:
          (cc.rows as {
            badgeIcon?: string;
            cells: (string | { icon?: string; label: string }[] | { label: string; value: number })[];
          }[]) ?? [],
      };

    case "evidence_summary":
      return {
        type: "evidence_summary",
        id: row.id,
        tiers:
          (cc.tiers as { level: "strong" | "moderate" | "limited"; description: string }[]) ?? [],
      };

    case "stat_card":
      return {
        type: "stat_card",
        id: row.id,
        variant:
          (cc.variant as "stat" | "stat_horizontal" | "metric" | "progress_linear" | "progress_circular") ??
          "stat",
        icon: cc.icon as string | undefined,
        value: (cc.value as string) ?? "",
        label: (cc.label as string) ?? "",
        subtext: cc.subtext as string | undefined,
        progress: cc.progress as number | undefined,
        linkUrl: cc.linkUrl as string | undefined,
        linkLabel: cc.linkLabel as string | undefined,
        color: cc.color as CardColor | undefined,
      };

    case "medical_illustration": {
      // referenced_object_id can be NULL — an author removed the image
      // without deleting the block (see MedicalIllustrationBlock's
      // `illustration?` comment). Unlike every other referenced-object
      // type, a missing reference here isn't a data problem to hide the
      // block for; it's a valid, render-it-with-an-empty-state case.
      const illustrationRow = row.referenced_object_id
        ? (
            await pool.query(
              `SELECT title, asset_url, alt_text FROM medical_illustration WHERE id = $1`,
              [row.referenced_object_id]
            )
          ).rows[0]
        : undefined;
      return {
        type: "medical_illustration",
        id: row.id,
        illustration: illustrationRow
          ? {
              title: illustrationRow.title,
              assetUrl: illustrationRow.asset_url,
              altText: illustrationRow.alt_text,
            }
          : undefined,
        title: cc.title as string | undefined,
        subtitle: cc.subtitle as string | undefined,
        caption: cc.caption as string | undefined,
        imageWidth: cc.imageWidth as MedicalIllustrationBlock["imageWidth"],
        annotations: cc.annotations as { label: string; x: number; y: number }[] | undefined,
        legendPosition: cc.legendPosition as MedicalIllustrationBlock["legendPosition"],
      };
    }

    case "clinical_pearl": {
      const { rows } = await pool.query(
        `SELECT body, attribution FROM clinical_pearl_editorial WHERE id = $1`,
        [row.referenced_object_id]
      );
      const pearl = rows[0];
      if (!pearl) return null;
      const { rows: attachmentRows } = await pool.query(
        `SELECT count(*) FROM pearl_attachment WHERE clinical_pearl_id = $1`,
        [row.referenced_object_id]
      );
      return {
        type: "clinical_pearl",
        id: row.id,
        pearl: {
          id: row.referenced_object_id as string,
          body: pearl.body,
          attachmentCount: Number(attachmentRows[0]?.count ?? 1),
          attribution: pearl.attribution ?? undefined,
        },
        color: cc.color as CardColor | undefined,
      };
    }

    case "treatment_algorithm": {
      const { rows: algoRows } = await pool.query(
        `SELECT canonical_name FROM treatment_algorithm WHERE id = $1`,
        [row.referenced_object_id]
      );
      const algorithm = algoRows[0];
      if (!algorithm) return null;

      const { rows: relRows } = await pool.query(
        `SELECT line_of_therapy FROM algorithm_treats_disease WHERE treatment_algorithm_id = $1 AND disease_id = $2`,
        [row.referenced_object_id, diseaseId]
      );
      const { rows: stepRows } = await pool.query(
        `SELECT id, step_order, instruction, branch_condition, icon, next_step_if_true, next_step_if_false
         FROM treatment_algorithm_step
         WHERE algorithm_id = $1 ORDER BY step_order`,
        [row.referenced_object_id]
      );

      return {
        type: "treatment_algorithm",
        id: row.id,
        algorithm: {
          id: row.referenced_object_id as string,
          name: algorithm.canonical_name,
          lineOfTherapy: relRows[0]?.line_of_therapy ?? undefined,
          steps: stepRows.map((step) => ({
            id: step.id,
            order: step.step_order,
            instruction: step.instruction,
            branchCondition: step.branch_condition ?? undefined,
            icon: step.icon ?? undefined,
            nextStepIfTrue: step.next_step_if_true ?? undefined,
            nextStepIfFalse: step.next_step_if_false ?? undefined,
          })),
        },
      };
    }

    case "rehabilitation_progression": {
      const { rows: protocolRows } = await pool.query(
        `SELECT canonical_name FROM rehabilitation_protocol WHERE id = $1`,
        [row.referenced_object_id]
      );
      const protocol = protocolRows[0];
      if (!protocol) return null;

      const { rows: exerciseRows } = await pool.query(
        `SELECT e.id, rpe.step_order, e.canonical_name, e.instructions
         FROM rehabilitation_protocol_exercise rpe
         JOIN exercise e ON e.id = rpe.exercise_id
         WHERE rpe.rehabilitation_protocol_id = $1
         ORDER BY rpe.step_order`,
        [row.referenced_object_id]
      );

      return {
        type: "rehabilitation_progression",
        id: row.id,
        protocol: {
          id: row.referenced_object_id as string,
          name: protocol.canonical_name,
          exercises: exerciseRows.map((exercise) => ({
            id: exercise.id,
            order: exercise.step_order,
            name: exercise.canonical_name,
            instructions: exercise.instructions ?? undefined,
          })),
        },
      };
    }

    case "examination_workflow": {
      const maneuverIds = (cc.maneuver_ids as string[]) ?? [];
      if (maneuverIds.length === 0) {
        return { type: "examination_workflow", id: row.id, maneuvers: [] };
      }

      const { rows } = await pool.query(
        `SELECT em.id, em.canonical_name, em.technique, em.positive_finding,
                r.relationship_type, r.sensitivity, r.specificity
         FROM examination_maneuver em
         JOIN maneuver_disease_relationship r
           ON r.examination_maneuver_id = em.id AND r.disease_id = $2
         WHERE em.id = ANY($1::uuid[])`,
        [maneuverIds, diseaseId]
      );
      const byId = new Map(rows.map((r) => [r.id as string, r]));

      return {
        type: "examination_workflow",
        id: row.id,
        maneuvers: maneuverIds
          .map((id) => byId.get(id))
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .map((r) => ({
            id: r.id,
            name: r.canonical_name,
            technique: r.technique,
            positiveFinding: r.positive_finding,
            relationship: r.relationship_type as ManeuverRelationship,
            sensitivity: r.sensitivity != null ? Number(r.sensitivity) : undefined,
            specificity: r.specificity != null ? Number(r.specificity) : undefined,
          })),
      };
    }

    case "photo_card_gallery":
      // Fully owns-content — no Knowledge Graph join needed, unlike
      // every other case in this function. `content_config.items` is
      // already exactly the shape the component wants.
      return {
        type: "photo_card_gallery",
        id: row.id,
        items:
          (cc.items as {
            id: string;
            title: string;
            description: string;
            illustrationUrl?: string;
            metrics: { label: string; value: string }[];
          }[]) ?? [],
      };

    case "imaging_findings": {
      const findingIds = (cc.imaging_finding_ids as string[]) ?? [];
      if (findingIds.length === 0) {
        return { type: "imaging_findings", id: row.id, findings: [] };
      }

      const { rows } = await pool.query(
        `SELECT f.id, f.canonical_name, f.modality, f.description, r.typical_use
         FROM imaging_finding f
         JOIN imaging_finding_disease_relationship r
           ON r.imaging_finding_id = f.id AND r.disease_id = $2
         WHERE f.id = ANY($1::uuid[])`,
        [findingIds, diseaseId]
      );
      const byId = new Map(rows.map((r) => [r.id as string, r]));

      return {
        type: "imaging_findings",
        id: row.id,
        findings: findingIds
          .map((id) => byId.get(id))
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .map((r) => ({
            id: r.id,
            name: r.canonical_name,
            modality: r.modality,
            description: r.description ?? undefined,
            typicalUse: r.typical_use ?? undefined,
          })),
      };
    }

    case "warning_pitfall":
      return {
        type: "warning_pitfall",
        id: row.id,
        text: cc.text as string,
        color: cc.color as CardColor | undefined,
      };

    case "learning_objective":
      return {
        type: "learning_objective",
        id: row.id,
        text: cc.text as string,
        color: cc.color as CardColor | undefined,
      };

    case "highlight_card":
      return {
        type: "highlight_card",
        id: row.id,
        label: (cc.label as string) ?? "Key Takeaway",
        text: (cc.text as string) ?? "",
        color: cc.color as CardColor | undefined,
        imageUrl: cc.imageUrl as string | undefined,
        imageAlt: cc.imageAlt as string | undefined,
        imagePosition: cc.imagePosition as HighlightCardBlock["imagePosition"],
        imageWidth: cc.imageWidth as HighlightCardBlock["imageWidth"],
        imageFocalPoint: cc.imageFocalPoint as HighlightCardBlock["imageFocalPoint"],
        imageFit: cc.imageFit as HighlightCardBlock["imageFit"],
      };

    case "icon_text":
      return {
        type: "icon_text",
        id: row.id,
        title: cc.title as string | undefined,
        icon: cc.icon as string | undefined,
        label: (cc.label as string) ?? "",
        description: cc.description as string | undefined,
        color: cc.color as CardColor | undefined,
        titleLayout: cc.titleLayout as "above" | "beside" | undefined,
      };

    case "risk_factor": {
      const { rows } = await pool.query(
        `SELECT rf.id, rf.canonical_name,
           (SELECT count(*) FROM risk_factor_disease_relationship WHERE risk_factor_id = rf.id) AS disease_count
         FROM risk_factor rf WHERE rf.id = $1`,
        [row.referenced_object_id]
      );
      const riskFactor = rows[0];
      if (!riskFactor) return null;
      return {
        type: "risk_factor",
        id: row.id,
        riskFactor: {
          id: riskFactor.id,
          name: riskFactor.canonical_name,
          diseaseCount: Number(riskFactor.disease_count),
        },
      };
    }

    case "reference_list": {
      const referenceIds = (cc.reference_ids as string[]) ?? [];
      if (referenceIds.length === 0) {
        return { type: "reference_list", id: row.id, references: [] };
      }

      const { rows } = await pool.query(
        `SELECT id, authors, title, journal, publication_year, url FROM reference WHERE id = ANY($1::uuid[])`,
        [referenceIds]
      );
      const byId = new Map(rows.map((r) => [r.id as string, r]));

      return {
        type: "reference_list",
        id: row.id,
        references: referenceIds
          .map((id) => byId.get(id))
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .map((r) => ({
            id: r.id,
            authors: r.authors ?? undefined,
            title: r.title,
            journal: r.journal ?? undefined,
            year: r.publication_year ?? undefined,
            url: r.url ?? undefined,
          })),
      };
    }

    case "citation_card": {
      const { rows } = await pool.query(
        `SELECT id, authors, title, journal, publication_year, url FROM reference WHERE id = $1`,
        [row.referenced_object_id]
      );
      const reference = rows[0];
      if (!reference) return null;
      return {
        type: "citation_card",
        id: row.id,
        kicker: (cc.kicker as string) ?? "Reference",
        reference: {
          id: reference.id,
          authors: reference.authors ?? undefined,
          title: reference.title,
          journal: reference.journal ?? undefined,
          year: reference.publication_year ?? undefined,
          url: reference.url ?? undefined,
        },
        color: cc.color as CardColor | undefined,
      };
    }

    case "image_comparison":
      return {
        type: "image_comparison",
        id: row.id,
        title: cc.title as string | undefined,
        left: (cc.left as { assetUrl?: string; label: string }) ?? { label: "" },
        right: (cc.right as { assetUrl?: string; label: string }) ?? { label: "" },
      };

    case "image_row":
      // Fully owns-content, same as photo_card_gallery — no Knowledge
      // Graph join, content_config.images is already the shape the
      // component wants.
      return {
        type: "image_row",
        id: row.id,
        images: (cc.images as ImageRowBlock["images"]) ?? [],
        rowHeight: cc.rowHeight as ImageRowBlock["rowHeight"],
      };

    case "overview":
      return {
        type: "overview",
        id: row.id,
        imageUrl: cc.imageUrl as string | undefined,
        imageWidth: cc.imageWidth as OverviewBlock["imageWidth"],
        imagePosition: cc.imagePosition as OverviewBlock["imagePosition"],
        paragraph: (cc.paragraph as string) ?? "",
        keyTakeaway: (cc.keyTakeaway as string) ?? "",
      };

    case "simple_image":
      return {
        type: "simple_image",
        id: row.id,
        imageUrl: cc.imageUrl as string | undefined,
        caption: cc.caption as string | undefined,
        imageWidth: cc.imageWidth as SimpleImageBlock["imageWidth"],
        imageFocalPoint: cc.imageFocalPoint as SimpleImageBlock["imageFocalPoint"],
        imageFit: cc.imageFit as SimpleImageBlock["imageFit"],
      };

    case "callout_banner":
      return {
        type: "callout_banner",
        id: row.id,
        tone: (cc.tone as "info" | "success" | "warning" | "error") ?? "info",
        text: (cc.text as string) ?? "",
      };

    case "badge_row":
      return {
        type: "badge_row",
        id: row.id,
        badges: (cc.badges as { text: string; color: CardColor; icon?: string }[]) ?? [],
      };

    case "icon_list":
      return {
        type: "icon_list",
        id: row.id,
        title: cc.title as string | undefined,
        color: (cc.color as CardColor) ?? "neutral",
        transparentIcons: (cc.transparentIcons as boolean | undefined) ?? false,
        items: (cc.items as { icon?: string; text: string }[]) ?? [],
      };

    default:
      return null;
  }
}
