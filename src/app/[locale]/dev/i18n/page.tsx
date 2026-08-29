import { TRANSLATABLE_FIELDS, collectTranslatableStrings } from "@/lib/translatable-fields";
import type { EditorialBlock } from "@/lib/editorial-blocks";

// Dev-only drift-check surface (mirrors /dev/blocks) — for each block
// type, shows exactly what translatable-fields.ts's walker actually
// extracts from a minimal sample of that type's content_config shape.
// The point isn't visual fidelity (unlike /dev/blocks, this never
// renders through BlockSequence) — it's catching an incomplete or
// wrong field-path spec the moment a block type's shape changes, on a
// page this project's own convention already says to check when
// adding a new block type, in a codebase with no test suite.

type SampleContentConfig = Record<EditorialBlock["type"], unknown>;

const SAMPLE_CONTENT: SampleContentConfig = {
  section_heading: { text: "Exam" },
  subsection_heading: { text: "Special tests" },
  subsubsection_heading: { text: "Hawkins-Kennedy test" },
  paragraph: {
    body: "Ask specifically about first-step pain.",
    learningObjective: "Recognize the classic presentation.",
    imageAlt: "Diagram of the plantar fascia",
    cardStyle: "accent",
    badges: [{ text: "High Yield", color: "rose" }],
  },
  self_check: {
    question: "What single history finding is most discriminating?",
    answer: "First-step pain in the morning.",
  },
  key_point: { text: "Load management is the cornerstone of treatment." },
  medical_illustration: {
    illustration: {
      title: "Shared illustration title (NOT translated here)",
      assetUrl: "https://example.com/image.png",
      altText: "Shared illustration alt text (NOT translated here)",
    },
    title: "Windlass mechanism",
    subtitle: "Toe dorsiflexion at push-off",
    caption: "Great toe dorsiflexion winds the fascia around the metatarsal head.",
    annotations: [{ label: "Medial calcaneal tubercle", x: 22, y: 60 }],
  },
  clinical_pearl: {
    pearl: { id: "p1", body: "Shared pearl body (NOT translated here)", attachmentCount: 1 },
  },
  treatment_algorithm: {
    algorithm: {
      id: "a1",
      name: "Shared algorithm name (NOT translated here)",
      steps: [{ id: "s1", order: 1, instruction: "Shared step instruction (NOT translated here)" }],
    },
  },
  rehabilitation_progression: {
    protocol: {
      id: "p1",
      name: "Shared protocol name (NOT translated here)",
      exercises: [{ id: "e1", order: 1, name: "Shared exercise name (NOT translated here)" }],
    },
  },
  examination_workflow: {
    maneuvers: [
      {
        id: "m1",
        name: "Shared maneuver name (NOT translated here)",
        technique: "Shared technique (NOT translated here)",
        positiveFinding: "Shared finding (NOT translated here)",
        relationship: "confirms",
      },
    ],
  },
  imaging_findings: {
    findings: [{ id: "f1", name: "Shared finding name (NOT translated here)", modality: "mri" }],
  },
  reference_list: {
    references: [{ id: "r1", title: "Bibliographic title (never translated)", authors: "Smith J" }],
  },
  citation_card: {
    kicker: "Landmark Study",
    reference: { id: "r1", title: "Bibliographic title (never translated)" },
  },
  comparison_table: {
    caption: "Typical vs atypical presentation",
    columns: ["Feature", "Typical"],
    rows: [["Onset", "Gradual"]],
  },
  risk_factor: { riskFactor: { id: "rf1", name: "Shared risk factor name (NOT translated here)", diseaseCount: 3 } },
  warning_pitfall: { text: "Avoid repeated high-volume corticosteroid injections." },
  learning_objective: { text: "Explain why fasciopathy replaced fasciitis." },
  timeline: {
    title: "Symptom timeline",
    subtitle: "Typical course",
    steps: [{ label: "Onset", description: "Insidious onset, no specific injury" }],
  },
  infographic: { tiles: [{ value: "~10%", label: "Lifetime prevalence" }] },
  tabs: {
    tabs: [
      {
        label: "Phase 1",
        sublabel: "Weeks 1-2",
        title: "Pain management",
        columns: [{ title: "Goals", items: ["Reduce pain", "Protect tissue"] }],
      },
    ],
  },
  media_tabs: {
    tabs: [
      {
        label: "Anterior view",
        sublabel: "Weight-bearing",
        imageUrl: "https://example.com/image.png",
        body: "Note the medial arch height compared to the contralateral side.",
      },
    ],
  },
  rich_table: {
    title: "Rehab phases",
    badgeColumnTitle: "Phase",
    columns: [
      { title: "Name", type: "text" },
      { title: "Difficulty", type: "scale" },
      { title: "Goals", type: "icon_list" },
    ],
    rows: [
      {
        cells: [
          "Phase 1",
          { label: "Easy", value: 1 },
          [{ icon: "check", label: "Reduce pain" }],
        ],
      },
    ],
  },
  evidence_summary: { tiers: [{ level: "strong", description: "Eccentric loading protocols." }] },
  stat_card: { variant: "stat", value: "90%", label: "Sensitivity", subtext: "Windlass test", linkLabel: "Read more" },
  image_comparison: {
    title: "Normal vs Pathological",
    left: { label: "Normal" },
    right: { label: "Pathological (thickened)" },
  },
  image_row: {
    images: [
      { id: "1", label: "Anterior view" },
      { id: "2", label: "Posterior view" },
      { id: "3", label: "Lateral view" },
    ],
  },
  callout_banner: { tone: "warning", text: "Avoid high-volume corticosteroid injections." },
  badge_row: { badges: [{ text: "High Yield", color: "rose" }] },
  icon_list: { title: "Aggravating Factors", color: "rose", items: [{ text: "First steps after rest" }] },
  photo_card_gallery: {
    items: [
      {
        id: "i1",
        title: "Medial Calcaneal Tenderness",
        description: "Direct palpation over the medial calcaneal tubercle.",
        metrics: [{ label: "Sensitivity", value: "90%" }],
      },
    ],
  },
  overview: {
    paragraph: "Plantar fasciopathy is a degenerative overuse condition.",
    keyTakeaway: "Load management and progressive loading are the cornerstones of treatment.",
  },
  simple_image: {
    imageUrl: "https://example.com/image.png",
    caption: "Weight-bearing lateral radiograph.",
  },
  highlight_card: {
    label: "Key Takeaway",
    text: "Load management and progressive loading are the cornerstones of effective treatment.",
  },
  icon_text: {
    title: "Presentation",
    icon: "person-standing",
    label: "Onset",
    description: "Insidious onset, no specific injury.",
    color: "accent",
  },
};

const BLOCK_TYPES = Object.keys(TRANSLATABLE_FIELDS) as EditorialBlock["type"][];

export default function I18nDriftCheckPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="font-reading text-2xl text-primary">i18n translatable-fields drift check</h1>
        <p className="mt-1 font-ui text-sm text-secondary">
          Dev-only. For each of the {BLOCK_TYPES.length} block types, shows exactly what{" "}
          <code>collectTranslatableStrings()</code> extracts from a minimal sample — check this page
          after adding or reshaping a block type in editorial-blocks.ts.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {BLOCK_TYPES.map((type) => {
          const spec = TRANSLATABLE_FIELDS[type];
          const sample = SAMPLE_CONTENT[type];
          const extracted = collectTranslatableStrings(type, sample);
          return (
            <div key={type} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-ui text-sm font-semibold text-primary">{type}</span>
                <span className="font-ui text-xs text-secondary">
                  {spec.fields.length} field path{spec.fields.length === 1 ? "" : "s"}
                </span>
              </div>
              {spec.reason ? (
                <p className="mt-2 font-ui text-xs text-secondary italic">{spec.reason}</p>
              ) : extracted.length === 0 ? (
                <p className="mt-2 font-ui text-xs text-warning">
                  No strings extracted — check the sample or the field paths for this type.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {extracted.map((text, index) => (
                    <li key={index} className="truncate font-ui text-xs text-secondary">
                      &ldquo;{text}&rdquo;
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
