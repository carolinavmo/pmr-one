// Knee Osteoarthritis — reference disease for the Osteoarthritis
// family, authored from a new template. Last disease from the
// original five-disease stress-test list (Plantar Fasciopathy,
// Stroke, Bell's Palsy, Carpal Tunnel Syndrome, Knee Osteoarthritis —
// Stroke was deliberately substituted with Bell's Palsy as a smaller
// first CNS-adjacent test).
//
// Two things specifically under test: the Outcome Measures gap
// (WOMAC/KOOS — flagged since the taxonomy review, now hit for real
// for the first time) resolved the same way as Electrodiagnostics —
// narrative prose, no new object type, on a first occurrence. And a
// genuine positive imaging finding (Kellgren-Lawrence grading),
// unlike the last two diseases where imaging was mostly about when
// NOT to order it.
//
// Same discipline throughout: status 'draft', no fabricated review,
// no fabricated pearl attribution, numeric claims hedged where
// confidence is genuinely limited.
//
// Usage: node db/seed/knee-osteoarthritis.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import {
  findOrCreate,
  upsertRelationship,
  linkIfNotExists,
  replaceBlocks,
  instantiateTemplate,
  slugify,
} from "./lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------- Disease ----------

const diseaseName = "Knee Osteoarthritis";
const diseaseSlug = slugify(diseaseName);

const diseaseId = await findOrCreate(pool, "disease", "canonical_name", diseaseName, {
  canonical_name: diseaseName,
  aliases: ["Degenerative Joint Disease of the Knee", "Gonarthrosis", "M17"],
  slug: diseaseSlug,
  status: "draft",
});
await pool.query(`UPDATE disease SET slug = $1 WHERE id = $2`, [diseaseSlug, diseaseId]);

const { rows: templateRows } = await pool.query(
  `SELECT id FROM editorial_template WHERE name = 'Osteoarthritis Template'`
);
const templateId = templateRows[0].id;
const copiedCount = await instantiateTemplate(pool, templateId, diseaseId);
console.log(`Instantiated ${copiedCount} placeholder blocks from the Osteoarthritis Template.`);

// ---------- Anatomy Structures ----------

const tibiofemoralJointId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Tibiofemoral joint", {
  canonical_name: "Tibiofemoral joint",
  region: "Knee — medial and lateral compartments",
});

const patellofemoralJointId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Patellofemoral joint", {
  canonical_name: "Patellofemoral joint",
  region: "Knee — anterior compartment",
});

// ---------- Examination Maneuvers ----------
// Deliberately no rules_out maneuver here — not every disease needs
// one, and forcing one onto McMurray's (which assesses a commonly
// CO-EXISTING, not competing, pathology in OA knees) would misrepresent
// the actual clinical relationship just to repeat an earlier pattern.

const varusValgusId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Varus/valgus stress test", {
  canonical_name: "Varus/valgus stress test",
  technique: "Apply gentle varus and valgus stress at the knee with the joint in slight flexion.",
  positive_finding: "Pain localizing to the medial compartment with valgus stress, or the lateral compartment with varus stress, consistent with compartment-specific joint line pathology.",
  anatomy_structure_id: tibiofemoralJointId,
  status: "draft",
});

const mcmurrayId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "McMurray's test", {
  canonical_name: "McMurray's test",
  technique: "With the knee fully flexed, rotate the tibia while extending the knee, palpating the joint line.",
  positive_finding: "A palpable or audible click with pain suggests a meniscal tear — a frequently co-existing, not competing, pathology in osteoarthritic knees.",
  anatomy_structure_id: tibiofemoralJointId,
  status: "draft",
});

const effusionId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Effusion assessment (patellar tap / bulge sign)", {
  canonical_name: "Effusion assessment (patellar tap / bulge sign)",
  technique: "Assess for joint effusion via patellar tap or the bulge sign.",
  positive_finding: "A palpable effusion suggests active synovial inflammation.",
  anatomy_structure_id: tibiofemoralJointId,
  status: "draft",
});

const gaitObservationId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Gait observation", {
  canonical_name: "Gait observation",
  technique: "Observe the patient's gait for a varus thrust or antalgic pattern.",
  positive_finding: "A varus thrust (lateral knee wobble during stance) suggests medial compartment overload and progressive malalignment.",
  anatomy_structure_id: tibiofemoralJointId,
  status: "draft",
});

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: varusValgusId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Helps localize compartment-specific pathology; not a standalone diagnostic test for osteoarthritis itself.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: mcmurrayId,
    disease_id: diseaseId,
    relationship_type: "assesses_contributing_factor",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Identifies a commonly co-existing meniscal component rather than confirming or excluding osteoarthritis itself.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: effusionId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Supports an active/inflammatory component; effusion is not present in all symptomatic OA knees.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: gaitObservationId,
    disease_id: diseaseId,
    relationship_type: "assesses_contributing_factor",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Identifies a biomechanical contributor to disease progression, not a diagnostic finding on its own.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

// ---------- Risk Factors ----------
// Obesity and Increasing age are reused from earlier diseases —
// fourth disease, third family sharing Obesity specifically. Female
// sex and prior knee injury are new, genuinely specific to this
// disease.

const obesityId = await findOrCreate(pool, "risk_factor", "canonical_name", "Obesity", {
  canonical_name: "Obesity",
  aliases: ["Elevated BMI"],
  status: "draft",
});

const ageId = await findOrCreate(pool, "risk_factor", "canonical_name", "Increasing age", {
  canonical_name: "Increasing age",
  status: "draft",
});

const priorInjuryId = await findOrCreate(pool, "risk_factor", "canonical_name", "Prior knee injury (e.g. ACL or meniscal tear)", {
  canonical_name: "Prior knee injury (e.g. ACL or meniscal tear)",
  status: "draft",
});

const femaleSexId = await findOrCreate(pool, "risk_factor", "canonical_name", "Female sex", {
  canonical_name: "Female sex",
  status: "draft",
});

const occupationalKneelingId = await findOrCreate(pool, "risk_factor", "canonical_name", "Occupational kneeling or squatting", {
  canonical_name: "Occupational kneeling or squatting",
  status: "draft",
});

for (const riskFactorId of [obesityId, ageId, priorInjuryId, femaleSexId, occupationalKneelingId]) {
  await upsertRelationship(
    pool,
    "risk_factor_disease_relationship",
    {
      risk_factor_id: riskFactorId,
      disease_id: diseaseId,
      relationship_type: "increases_risk_of",
      relative_risk: null,
      odds_ratio: null,
      evidence_strength: "Consistently reported direction of effect across studies; pooled estimate needs citation before publishing.",
      reference_id: null,
    },
    ["risk_factor_id", "disease_id"]
  );
}

// ---------- Imaging Finding ----------
// A genuine positive finding this time, unlike Bell's Palsy/CTS —
// properly exercises the imaging_findings block with real content.

const jointSpaceNarrowingId = await findOrCreate(
  pool,
  "imaging_finding",
  "canonical_name",
  "Joint space narrowing and osteophytes on weight-bearing radiograph",
  {
    canonical_name: "Joint space narrowing and osteophytes on weight-bearing radiograph",
    modality: "radiograph",
    description:
      "Asymmetric joint space narrowing (most often medial compartment), marginal osteophytes, subchondral sclerosis, and in later stages subchondral cysts — graded by the Kellgren-Lawrence system (grades 0-4).",
    status: "draft",
  }
);

await upsertRelationship(
  pool,
  "imaging_finding_disease_relationship",
  {
    imaging_finding_id: jointSpaceNarrowingId,
    disease_id: diseaseId,
    relationship_type: "suggests",
    typical_use:
      "Weight-bearing (standing) views are essential — non-weight-bearing films underestimate joint space narrowing. Radiographic severity correlates imperfectly with symptom severity, so imaging findings should inform, not override, clinical assessment.",
    reference_id: null,
  },
  ["imaging_finding_id", "disease_id"]
);

// ---------- Procedure ----------

const kneeInjectionId = await findOrCreate(
  pool,
  "procedure",
  "canonical_name",
  "Intra-articular corticosteroid injection, knee",
  {
    canonical_name: "Intra-articular corticosteroid injection, knee",
    indication: "Symptomatic flare not adequately controlled with oral/topical agents and exercise therapy.",
    technique: "Injection into the knee joint, typically via a lateral or medial patellar approach, with or without ultrasound guidance.",
    anatomy_structure_id: tibiofemoralJointId,
    status: "draft",
  }
);

// ---------- Treatment Algorithms ----------

const conservativeAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Conservative management pathway",
  { canonical_name: "Conservative management pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [conservativeAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, $6)`,
  [
    conservativeAlgorithmId,
    "Initiate weight loss counseling (if applicable) and a structured quadriceps-strengthening and low-impact conditioning program.",
    "Add topical or oral NSAIDs as needed for symptom control; consider a trial of an alternative analgesic if NSAIDs are contraindicated.",
    "Consider an intra-articular corticosteroid injection for a symptomatic flare not controlled by the above.",
    "inadequate symptom control despite exercise therapy and analgesics",
    kneeInjectionId,
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: conservativeAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "First-line",
    recommendation_strength: "Supported by clinical practice guidelines (e.g. OARSI) for exercise and weight management specifically",
    guideline_reference_id: null,
    patient_subgroup: null,
  },
  ["treatment_algorithm_id", "disease_id"]
);

const surgicalAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Surgical pathway",
  { canonical_name: "Surgical pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [surgicalAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL)`,
  [
    surgicalAlgorithmId,
    "Confirm advanced radiographic disease with persistent, functionally limiting symptoms despite a full trial of conservative management.",
    "Refer for consideration of partial or total knee arthroplasty, depending on the pattern and extent of compartment involvement.",
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: surgicalAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "Second-line",
    recommendation_strength: "Consensus-based",
    guideline_reference_id: null,
    patient_subgroup: "Advanced disease with functionally limiting symptoms refractory to conservative management",
  },
  ["treatment_algorithm_id", "disease_id"]
);

// ---------- Rehabilitation Protocol ----------

const rehabProtocolId = await findOrCreate(
  pool,
  "rehabilitation_protocol",
  "canonical_name",
  "Quadriceps strengthening and low-impact conditioning progression",
  { canonical_name: "Quadriceps strengthening and low-impact conditioning progression", status: "draft" }
);

const exercises = [
  {
    name: "Straight leg raises",
    instructions: "Quadriceps activation without loading the joint through range — a starting point for patients with significant pain or effusion.",
  },
  {
    name: "Closed-chain quadriceps strengthening",
    instructions: "Mini-squats, step-ups, and leg press progressions within a pain-free range, advancing load and range gradually.",
  },
  {
    name: "Low-impact aerobic conditioning",
    instructions: "Cycling, swimming, or elliptical training — sustained low-impact activity to support weight management and overall conditioning without high joint loading.",
  },
];

const exerciseIds = [];
for (const exercise of exercises) {
  const id = await findOrCreate(pool, "exercise", "canonical_name", exercise.name, {
    canonical_name: exercise.name,
    instructions: exercise.instructions,
    anatomy_structure_id: tibiofemoralJointId,
    status: "draft",
  });
  exerciseIds.push(id);
}

for (const [index, exerciseId] of exerciseIds.entries()) {
  await upsertRelationship(
    pool,
    "rehabilitation_protocol_exercise",
    { rehabilitation_protocol_id: rehabProtocolId, exercise_id: exerciseId, step_order: index + 1 },
    ["rehabilitation_protocol_id", "exercise_id"]
  );
}

await linkIfNotExists(pool, "rehabilitation_protocol_treats_disease", {
  rehabilitation_protocol_id: rehabProtocolId,
  disease_id: diseaseId,
});

// ---------- Clinical Pearls ----------

const pearl1Body =
  "Radiographic severity correlates imperfectly with symptom severity — a patient can have severe imaging findings with mild symptoms, or the reverse. Treat the patient in front of you, not the X-ray.";
const pearl2Body =
  "Staying active is protective, not harmful — activity modification and low-impact exercise are first-line, evidence-supported management, not something to avoid out of fear of \"wearing out\" the joint.";
const pearl3Body =
  "Weight loss has an outsized effect on knee loading — each pound of body weight is estimated to translate into several times that load across the knee during walking (commonly cited estimates are around 4x), making even modest weight loss meaningfully impactful.";

const pearl1Id = await findOrCreate(pool, "clinical_pearl_editorial", "body", pearl1Body, {
  body: pearl1Body,
  evidence_level: "Clinical teaching point",
  status: "draft",
});
const pearl2Id = await findOrCreate(pool, "clinical_pearl_editorial", "body", pearl2Body, {
  body: pearl2Body,
  evidence_level: "Clinical teaching point",
  status: "draft",
});
const pearl3Id = await findOrCreate(pool, "clinical_pearl_editorial", "body", pearl3Body, {
  body: pearl3Body,
  evidence_level: "Clinical teaching point",
  status: "draft",
});

for (const pearlId of [pearl1Id, pearl2Id, pearl3Id]) {
  await linkIfNotExists(pool, "pearl_attachment", {
    clinical_pearl_id: pearlId,
    target_type: "disease",
    target_id: diseaseId,
  });
}

// ---------- References ----------

const references = [
  {
    authors: "Kellgren JH, Lawrence JS",
    title: "Radiological assessment of osteo-arthrosis",
    journal: "Annals of the Rheumatic Diseases",
    publication_year: 1957,
    evidence_type: "Foundational / grading system",
  },
  {
    authors: "Bannuru RR, Osani MC, Vaysbrot EE, et al.",
    title: "OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis",
    journal: "Osteoarthritis and Cartilage",
    publication_year: 2019,
    evidence_type: "Guideline",
  },
];

const referenceIds = [];
for (const reference of references) {
  const id = await findOrCreate(pool, "reference", "title", reference.title, reference);
  referenceIds.push(id);
}

for (const referenceId of referenceIds) {
  await linkIfNotExists(pool, "citation", {
    source_type: "disease",
    source_id: diseaseId,
    reference_id: referenceId,
  });
}

// ---------- Medical Illustration ----------

const kneeIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Knee joint anatomy and compartments",
  {
    title: "Knee joint anatomy and compartments",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram of the knee joint showing the medial and lateral tibiofemoral compartments, the patellofemoral joint, articular cartilage, and menisci.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: kneeIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

for (const anatomyId of [tibiofemoralJointId, patellofemoralJointId]) {
  await linkIfNotExists(pool, "illustration_depicts_anatomy", {
    medical_illustration_id: kneeIllustrationId,
    anatomy_structure_id: anatomyId,
  });
}

console.log("Knowledge Objects seeded.");

// ---------- Editorial Blocks ----------
// Follows the Osteoarthritis Template's order. Outcome Measures is
// reader-facing clinical prose describing WOMAC/KOOS — the "no object
// type exists yet" observation stays in this comment and
// LESSONS_LEARNED.md, never in content_config.body itself. Putting an
// implementation note on the actual page would be exactly the kind of
// graph leakage Tier 1 principle #6 forbids.

await replaceBlocks(pool, diseaseId, [
  { blockType: "section_heading", contentConfig: { text: "Overview" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Knee osteoarthritis is a degenerative joint condition characterized by progressive cartilage loss, subchondral bone remodeling, and secondary synovial inflammation. It's the most common form of arthritis and a leading cause of chronic pain and disability, typically presenting with activity-related pain and stiffness that develops gradually over years.",
      callout: true,
      learningObjective: "Distinguish the degenerative pain pattern of OA from an inflammatory arthritis pattern on history.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Clinical Presentation" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Patients typically report activity-related knee pain that worsens with use and improves with rest, along with morning stiffness or stiffness after inactivity that resolves within about 30 minutes — a pattern that helps distinguish OA from inflammatory arthritis, where morning stiffness classically lasts an hour or more. Crepitus, intermittent swelling, and a sense of instability or \"giving way\" are also common.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Anatomy" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: kneeIllustrationId,
    contentConfig: {
      caption: "Knee joint compartments — medial and lateral tibiofemoral, and patellofemoral.",
      annotations: [
        { label: "Medial tibiofemoral compartment (most commonly affected)", x: 30, y: 50 },
        { label: "Lateral tibiofemoral compartment", x: 70, y: 50 },
        { label: "Patellofemoral joint", x: 50, y: 20 },
        { label: "Articular cartilage", x: 50, y: 60 },
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Pathophysiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Progressive breakdown of articular cartilage exposes and remodels subchondral bone, producing sclerosis, osteophyte formation, and eventually subchondral cysts. Low-grade synovial inflammation, driven partly by cartilage breakdown products, contributes to pain and can produce intermittent effusions — osteoarthritis is increasingly understood as a whole-joint disease, not a purely \"wear and tear\" cartilage problem.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Biomechanics" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Malalignment — most often varus (bow-legged), which increases load through the medial compartment — accelerates focal cartilage loss and disease progression. Gait patterns that increase peak medial joint loading, and prior injury that alters joint mechanics (e.g. ACL or meniscal injury), are significant contributors alongside the biological degenerative process.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Epidemiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Knee osteoarthritis is the most common form of arthritis and a leading cause of disability. The risk factors below combine biological predisposition with cumulative mechanical load on the joint.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Obesity", callout: true, icon: "scale" },
    displayConfig: { layout: { row: "knee-oa-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Increasing age", callout: true, icon: "clock" },
    displayConfig: { layout: { row: "knee-oa-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Prior knee injury (e.g. ACL or meniscal tear)", callout: true, icon: "zap" },
    displayConfig: { layout: { row: "knee-oa-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Female sex", callout: true, icon: "user" },
    displayConfig: { layout: { row: "knee-oa-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Occupational kneeling or squatting", callout: true, icon: "briefcase" },
    displayConfig: { layout: { row: "knee-oa-risk-factors", width: "1/2" } },
  },
  { blockType: "section_heading", contentConfig: { text: "Exam" } },
  {
    blockType: "examination_workflow",
    contentConfig: { maneuver_ids: [varusValgusId, mcmurrayId, effusionId, gaitObservationId] },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "A patient with knee osteoarthritis has a positive McMurray's test. Does this confirm the osteoarthritis diagnosis?",
      answer: "No — a positive McMurray's identifies a commonly co-existing meniscal component, not a competing or confirming finding for osteoarthritis itself. The two frequently occur together without one causing the other.",
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl1Id,
  },
  { blockType: "section_heading", contentConfig: { text: "Diagnostic Imaging" } },
  {
    blockType: "imaging_findings",
    contentConfig: { imaging_finding_ids: [jointSpaceNarrowingId] },
  },
  {
    blockType: "comparison_table",
    contentConfig: {
      caption: "Kellgren-Lawrence grading of knee osteoarthritis severity on weight-bearing radiograph.",
      columns: ["Grade", "Description"],
      rows: [
        ["0", "No radiographic features of osteoarthritis"],
        ["1", "Doubtful joint space narrowing; possible osteophytic lipping"],
        ["2", "Definite osteophytes; possible joint space narrowing"],
        ["3", "Multiple osteophytes; definite joint space narrowing; some sclerosis; possible bony deformity"],
        ["4", "Large osteophytes; marked joint space narrowing; severe sclerosis; definite bony deformity"],
      ],
    },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "A patient has Kellgren-Lawrence grade 3 changes on radiograph but reports only mild pain. How should this be interpreted?",
      answer: "Radiographic severity correlates imperfectly with symptom severity — a patient can have advanced imaging findings with mild symptoms, or the reverse. Treat the patient's actual pain and function, not the grade on the film.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Outcome Measures" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The WOMAC (Western Ontario and McMaster Universities Osteoarthritis Index) and KOOS (Knee injury and Osteoarthritis Outcome Score) are the most widely used patient-reported outcome instruments for knee osteoarthritis, covering pain, stiffness, and physical function. They're used both to characterize baseline severity and to track response to treatment over time, and are the standard outcome measures in most knee OA clinical trials.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Treatment" } },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: conservativeAlgorithmId,
  },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: surgicalAlgorithmId,
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl3Id,
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "Why does even modest weight loss have an outsized effect on knee osteoarthritis symptoms?",
      answer: "Each pound of body weight is estimated to translate into several times that load across the knee during walking (commonly cited estimates are around 4x) — so a modest reduction in body weight meaningfully reduces joint loading with every step.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Rehab" } },
  {
    blockType: "rehabilitation_progression",
    referencedObjectType: "rehabilitation_protocol",
    referencedObjectId: rehabProtocolId,
  },
  { blockType: "section_heading", contentConfig: { text: "Return to Activity" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Encourage continued low-impact activity rather than avoidance — activity modification (e.g. favoring cycling or swimming over running, or reducing but not eliminating higher-impact activity) is generally preferable to stopping activity altogether, which contributes to deconditioning, weight gain, and worse long-term outcomes.",
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl2Id,
  },
  { blockType: "section_heading", contentConfig: { text: "Prognosis" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Knee osteoarthritis typically follows a slowly progressive course, though the rate varies considerably between patients. Malalignment, higher BMI, and higher baseline pain/functional limitation are associated with faster progression — the specific strength of these prognostic factors needs citation verification before publishing. Many patients maintain reasonable function for years with conservative management alone.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "References" } },
  {
    blockType: "reference_list",
    contentConfig: { reference_ids: referenceIds },
  },
]);

console.log("Editorial Blocks composed.");
console.log({ diseaseId, diseaseSlug });

await pool.end();
