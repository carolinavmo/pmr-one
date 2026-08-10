import { BlockSequence } from "@/components/blocks/BlockSequence";
import type { EditorialBlock } from "@/lib/editorial-blocks";

// Dev-only visual QA surface for the block rendering engine (Sprint 2)
// — mirrors /dev/components. Mock data stands in for the real Plantar
// Fasciopathy seed content that ships in Sprint 3.

const blocks: EditorialBlock[] = [
  { type: "section_heading", id: "b1", text: "Overview" },
  {
    type: "paragraph",
    id: "b2",
    body: "Plantar fasciopathy is a degenerative overuse condition of the plantar fascia origin at the medial calcaneal tubercle, most often presenting as sharp, localized heel pain that is worst with the first steps after rest.",
    learningObjective: "Recognize the classic presentation on history alone",
    callout: true,
  },
  {
    type: "key_point",
    id: "b3",
    text: "\"Plantar fasciitis\" is a misnomer for chronic presentations — histology shows degenerative change, not active inflammation, which is why the field has shifted to \"fasciopathy.\"",
  },
  { type: "section_heading", id: "b4", text: "Anatomy" },
  {
    type: "medical_illustration",
    id: "b5",
    illustration: {
      title: "Plantar fascia anatomy, medial view",
      assetUrl:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&h=500&fit=crop",
      altText: "Diagram of plantar fascia anatomy, medial view of the foot",
    },
    caption: "Plantar fascia origin at the medial calcaneal tubercle.",
    annotations: [
      { label: "Medial calcaneal tubercle (origin)", x: 22, y: 60 },
      { label: "Central band", x: 55, y: 68 },
    ],
  },
  { type: "section_heading", id: "b6", text: "Exam" },
  {
    type: "examination_workflow",
    id: "b7",
    maneuvers: [
      {
        id: "m1",
        name: "Windlass test",
        technique: "Passive dorsiflexion of the great toe with the patient weight-bearing or seated.",
        positiveFinding: "Reproduction of plantar heel pain.",
        relationship: "confirms",
        sensitivity: 0.99,
        specificity: 0.28,
      },
      {
        id: "m2",
        name: "Silfverskiöld test",
        technique: "Compare ankle dorsiflexion with the knee extended vs. flexed.",
        positiveFinding: "Reduced dorsiflexion with knee extended suggests gastrocnemius tightness.",
        relationship: "assesses_contributing_factor",
      },
    ],
  },
  {
    type: "clinical_pearl",
    id: "b8",
    pearl: {
      id: "pearl-b8",
      body: "Ask specifically about first-step pain in the morning — it's the single most discriminating history finding, more reliable than palpation alone.",
      attachmentCount: 1,
      attribution: "Dr. A. Costa, PM&R",
    },
  },
  { type: "section_heading", id: "b9", text: "Treatment" },
  {
    type: "treatment_algorithm",
    id: "b10",
    algorithm: {
      id: "algo-mock",
      name: "Conservative-first treatment pathway",
      lineOfTherapy: "First-line",
      steps: [
        { id: "s1", order: 1, instruction: "Plantar fascia and gastroc-soleus stretching, 3x daily." },
        { id: "s2", order: 2, instruction: "Prefabricated orthoses or heel cups." },
        {
          id: "s3",
          order: 3,
          instruction: "Consider corticosteroid injection.",
          branchCondition: "no improvement at 6 weeks",
        },
      ],
    },
  },
  { type: "section_heading", id: "b11", text: "Rehab" },
  {
    type: "rehabilitation_progression",
    id: "b12",
    protocol: {
      id: "protocol-mock",
      name: "Plantar fascia-specific stretching progression",
      exercises: [
        { id: "e1", order: 1, name: "Seated plantar fascia stretch", instructions: "10 reps, hold 10s, 3x daily." },
        { id: "e2", order: 2, name: "Standing gastroc-soleus stretch", instructions: "30s hold x 3, both legs." },
        { id: "e3", order: 3, name: "Towel scrunches", instructions: "2 sets of 15, once tolerated pain-free." },
      ],
    },
  },
  { type: "section_heading", id: "b13a", text: "Layout demo — 2-up row" },
  {
    type: "paragraph",
    id: "b13b",
    body: "Obesity roughly doubles the odds of plantar fasciopathy across multiple studies.",
    callout: true,
    layout: { row: "risk-factors-demo", width: "1/2" },
  },
  {
    type: "paragraph",
    id: "b13c",
    body: "Reduced ankle dorsiflexion from gastrocnemius-soleus tightness increases strain at the fascia's origin.",
    callout: true,
    layout: { row: "risk-factors-demo", width: "1/2" },
  },
  { type: "section_heading", id: "b13cc", text: "Risk Factor block demo (Knowledge Object)" },
  {
    type: "risk_factor",
    id: "b13cd",
    riskFactor: { id: "rf-demo", name: "Pes planus or pes cavus foot type", diseaseCount: 3 },
  },
  { type: "section_heading", id: "b13ce", text: "Warning / Pitfall and Learning Objective demo" },
  {
    type: "warning_pitfall",
    id: "b13cf",
    text: "Repeated corticosteroid injections into the plantar fascia are linked to fascia rupture and fat pad atrophy — avoid more than 1-2 total.",
  },
  {
    type: "learning_objective",
    id: "b13cg",
    text: "Explain why \"fasciopathy\" has replaced \"fasciitis\" in current literature.",
  },
  { type: "section_heading", id: "b13d", text: "Layout demo — 3-up row, with icons" },
  {
    type: "paragraph",
    id: "b13e",
    body: "Prolonged standing occupations",
    callout: true,
    icon: "briefcase",
    layout: { row: "triple-demo", width: "1/3" },
  },
  {
    type: "paragraph",
    id: "b13f",
    body: "Pes planus or pes cavus foot type",
    callout: true,
    icon: "footprints",
    layout: { row: "triple-demo", width: "1/3" },
  },
  {
    type: "paragraph",
    id: "b13g",
    body: "Bilateral involvement in ~30% of cases",
    callout: true,
    icon: "gauge",
    layout: { row: "triple-demo", width: "1/3" },
  },
  { type: "section_heading", id: "b13g2", text: "Simple Image demo" },
  {
    type: "simple_image",
    id: "b13g3",
    imageUrl:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&h=500&fit=crop",
    caption: "Plantar fascia origin at the medial calcaneal tubercle.",
    layout: { width: "1/2", align: "center" },
  },
  { type: "section_heading", id: "b13h", text: "Table demo" },
  {
    type: "comparison_table",
    id: "b13i",
    caption: "Example weekly schedule, phase 2-3",
    columns: ["", "Mon", "Tue", "Wed", "Thu", "Fri"],
    rows: [
      ["Focus", "Strength", "Mobility", "Strength", "Endurance", "Strength + Balance"],
      ["Example", "Eccentric calf raise 3x15", "Calf stretch 3x45s", "Heel raises 3x15", "Bike/swim 30-40 min", "Single-leg balance 3x30s"],
    ],
  },
  { type: "section_heading", id: "b13", text: "References" },
  {
    type: "reference_list",
    id: "b14",
    references: [
      {
        id: "r1",
        authors: "Riddle DL, Schappert SM",
        title: "Volume of ambulatory care visits and patterns of care for patients diagnosed with plantar fasciitis",
        journal: "Foot Ankle Int",
        year: 2004,
      },
      {
        id: "r2",
        authors: "Cutts S, et al.",
        title: "Plantar fasciitis",
        journal: "Ann R Coll Surg Engl",
        year: 2012,
      },
    ],
  },
];

export default function BlockShowcase() {
  return (
    <main className="mx-auto flex max-w-reading flex-col gap-8 px-6 py-16">
      <BlockSequence blocks={blocks} diseaseId="dev-mock" diseaseSlug="dev-mock" branchColor={null} canEdit={false} />
    </main>
  );
}
