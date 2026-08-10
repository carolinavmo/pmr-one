// Achilles Tendinopathy — second Tendinopathy-family disease, authored
// starting exclusively from the Tendinopathy Template. Purpose: test
// whether the template actually accelerates authoring, not just
// whether the mechanism works (that was already smoke-tested).
//
// Same discipline as Plantar Fasciopathy: status 'draft' throughout,
// no fabricated review, no fabricated pearl attribution, numeric
// claims left unverified where confidence is genuinely limited.
//
// Usage: node db/seed/achilles-tendinopathy.mjs
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

const diseaseName = "Achilles Tendinopathy";
const diseaseSlug = slugify(diseaseName);

const diseaseId = await findOrCreate(pool, "disease", "canonical_name", diseaseName, {
  canonical_name: diseaseName,
  aliases: ["Achilles Tendinitis", "Achilles Tendinosis", "M76.6"],
  slug: diseaseSlug,
  status: "draft",
});
await pool.query(`UPDATE disease SET slug = $1 WHERE id = $2`, [diseaseSlug, diseaseId]);

// ---------- STEP 1: instantiate from the Tendinopathy Template ----------
// First use of instantiateTemplate against a real, permanent disease
// (not the throwaway scratch row in _test-instantiate.mjs). This gives
// the disease a real 25-block skeleton before any content exists.

const { rows: templateRows } = await pool.query(
  `SELECT id FROM editorial_template WHERE name = 'Tendinopathy Template'`
);
const templateId = templateRows[0].id;
const copiedCount = await instantiateTemplate(pool, templateId, diseaseId);
console.log(`Instantiated ${copiedCount} placeholder blocks from the Tendinopathy Template.`);

// ---------- Anatomy Structures ----------
// Achilles tendon and posterior calcaneal tuberosity are genuinely
// distinct from Plantar Fasciopathy's anatomy — new rows, correctly.
// Gastrocnemius-soleus complex is NOT distinct — reusing PF's exact
// row is the real test of whether findOrCreate delivers reuse in
// practice, not just in theory. See LESSONS_LEARNED.md for the result.

const achillesTendonId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Achilles tendon", {
  canonical_name: "Achilles tendon",
  region: "Posterior ankle/hindfoot",
});

const posteriorCalcanealTuberosityId = await findOrCreate(
  pool,
  "anatomy_structure",
  "canonical_name",
  "Posterior calcaneal tuberosity",
  { canonical_name: "Posterior calcaneal tuberosity", region: "Foot — hindfoot (calcaneus)" }
);

const gastrocSoleusId = await findOrCreate(
  pool,
  "anatomy_structure",
  "canonical_name",
  "Gastrocnemius-soleus complex",
  { canonical_name: "Gastrocnemius-soleus complex", region: "Posterior leg (calf)" }
);

// ---------- Examination Maneuvers ----------
// Thompson test is the safety-critical one here — not diagnostic OF
// tendinopathy, it rules OUT a complete rupture, which is a materially
// more urgent differential than anything Plantar Fasciopathy needed to
// represent. Reuses the same 'rules_out' relationship type, but the
// stakes are higher, and the template's placeholder_note ("reference
// the primary CONFIRMING maneuver(s)") doesn't prompt an author to
// think about this at all. See LESSONS_LEARNED.md.

const palpationId = await findOrCreate(
  pool,
  "examination_maneuver",
  "canonical_name",
  "Palpation of the Achilles tendon",
  {
    canonical_name: "Palpation of the Achilles tendon",
    technique:
      "Palpate along the length of the tendon from its insertion to the myotendinous junction, comparing to the contralateral side.",
    positive_finding:
      "Focal tenderness and/or fusiform thickening — location (2-6cm proximal to the insertion vs. directly at the insertion) distinguishes mid-portion from insertional tendinopathy.",
    anatomy_structure_id: achillesTendonId,
    status: "draft",
  }
);

const archSignId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Arc sign", {
  canonical_name: "Arc sign",
  technique: "Identify a palpable nodule or area of thickening, then actively dorsiflex and plantarflex the ankle.",
  positive_finding:
    "A nodule that moves with ankle motion localizes to the tendon itself (mid-portion tendinopathy); a nodule that stays fixed suggests retrocalcaneal or paratendinous pathology instead.",
  anatomy_structure_id: achillesTendonId,
  status: "draft",
});

const royalLondonId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Royal London Hospital test", {
  canonical_name: "Royal London Hospital test",
  technique: "Palpate the area of maximal tenderness with the ankle relaxed, then repeat with the ankle held in maximal active dorsiflexion.",
  positive_finding: "Tenderness present at rest that reduces or disappears with the tendon under tension on dorsiflexion.",
  anatomy_structure_id: achillesTendonId,
  status: "draft",
});

const thompsonId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Thompson test", {
  canonical_name: "Thompson test",
  aliases: ["Simmonds test", "Calf squeeze test"],
  technique: "With the patient prone and the foot hanging off the edge of the table, squeeze the calf.",
  positive_finding:
    "Absent or markedly reduced plantarflexion of the foot — suggests a complete or high-grade partial Achilles tendon rupture rather than tendinopathy, and should prompt urgent reassessment rather than continued tendinopathy management.",
  status: "draft",
});

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: palpationId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Widely taught as the primary supportive finding; formal sensitivity/specificity not well established.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: archSignId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Helps localize mid-portion vs. non-tendinous pathology; not a standalone diagnostic test.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: royalLondonId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Reported sensitivity/specificity vary across small studies — needs citation verification before publishing.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: thompsonId,
    disease_id: diseaseId,
    relationship_type: "rules_out",
    sensitivity: null,
    specificity: null,
    evidence_strength: "A positive (abnormal) result should prompt urgent reconsideration of the working diagnosis — concern for tendon rupture, not tendinopathy.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

// ---------- Risk Factors ----------
// Obesity and reduced ankle dorsiflexion are shared with Plantar
// Fasciopathy — findOrCreate against the SAME canonical_name should
// find PF's existing rows rather than duplicate them. Verified in
// LESSONS_LEARNED.md, not just asserted here.

const obesityId = await findOrCreate(pool, "risk_factor", "canonical_name", "Obesity", {
  canonical_name: "Obesity",
  aliases: ["Elevated BMI"],
  status: "draft",
});

const reducedDorsiflexionId = await findOrCreate(
  pool,
  "risk_factor",
  "canonical_name",
  "Reduced ankle dorsiflexion (gastrocnemius-soleus tightness)",
  { canonical_name: "Reduced ankle dorsiflexion (gastrocnemius-soleus tightness)", status: "draft" }
);

const trainingLoadId = await findOrCreate(pool, "risk_factor", "canonical_name", "Sudden increase in training load", {
  canonical_name: "Sudden increase in training load",
  aliases: ["Training error"],
  status: "draft",
});

const fluoroquinoloneId = await findOrCreate(pool, "risk_factor", "canonical_name", "Fluoroquinolone antibiotic use", {
  canonical_name: "Fluoroquinolone antibiotic use",
  status: "draft",
});

const ageId = await findOrCreate(pool, "risk_factor", "canonical_name", "Increasing age", {
  canonical_name: "Increasing age",
  status: "draft",
});

for (const riskFactorId of [obesityId, reducedDorsiflexionId, trainingLoadId, fluoroquinoloneId, ageId]) {
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

// ---------- Imaging Findings ----------

const neovascularizationId = await findOrCreate(
  pool,
  "imaging_finding",
  "canonical_name",
  "Achilles tendon thickening and neovascularization on ultrasound",
  {
    canonical_name: "Achilles tendon thickening and neovascularization on ultrasound",
    modality: "ultrasound",
    description:
      "Fusiform tendon thickening with hypoechoic, disorganized fibrillar pattern; Doppler may show neovascularization within or adjacent to the tendon, particularly in symptomatic areas.",
    status: "draft",
  }
);

await upsertRelationship(
  pool,
  "imaging_finding_disease_relationship",
  {
    imaging_finding_id: neovascularizationId,
    disease_id: diseaseId,
    relationship_type: "suggests",
    typical_use:
      "Useful to confirm the diagnosis, distinguish mid-portion from insertional involvement, and assess tendon integrity when partial tearing is suspected — not required when the clinical presentation is classic and Thompson test is normal.",
    reference_id: null,
  },
  ["imaging_finding_id", "disease_id"]
);

// ---------- Treatment Algorithms ----------
// Deliberately does NOT reuse Plantar Fasciopathy's corticosteroid
// injection pattern — that would be a real clinical error here (see
// LESSONS_LEARNED.md). No Procedure object is created for this
// disease at all; the "don't inject" point is handled as an authored
// warning instead.

const eccentricLoadingAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Eccentric loading-first pathway",
  { canonical_name: "Eccentric loading-first pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [eccentricLoadingAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, NULL)`,
  [
    eccentricLoadingAlgorithmId,
    "Begin a structured heavy-load eccentric calf-loading program (see Rehab), typically over 12 weeks.",
    "Use short-term NSAIDs or activity modification for symptom relief; these do not treat the underlying tendinopathy.",
    "Reassess adherence and progress at 12 weeks.",
    "no meaningful improvement after a full 12-week eccentric loading program",
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: eccentricLoadingAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "First-line",
    recommendation_strength: "Consensus-based, supported by RCT evidence for eccentric loading specifically",
    guideline_reference_id: null,
    patient_subgroup: null,
  },
  ["treatment_algorithm_id", "disease_id"]
);

const recalcitrantAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Recalcitrant Achilles tendinopathy pathway",
  { canonical_name: "Recalcitrant Achilles tendinopathy pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [recalcitrantAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, NULL)`,
  [
    recalcitrantAlgorithmId,
    "Confirm a full, adherent trial of eccentric loading has genuinely failed before escalating.",
    "Consider extracorporeal shockwave therapy (ESWT) or platelet-rich plasma (PRP) — evidence is mixed and evolving for both.",
    "Refer for consideration of surgical debridement.",
    "ESWT/PRP unsuccessful or unavailable, and symptoms remain significantly limiting",
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: recalcitrantAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "Second-line",
    recommendation_strength: "Consensus-based; evidence quality for ESWT/PRP specifically is mixed",
    guideline_reference_id: null,
    patient_subgroup: "Symptoms recalcitrant to a full trial of eccentric loading",
  },
  ["treatment_algorithm_id", "disease_id"]
);

// ---------- Rehabilitation Protocol ----------

const rehabProtocolId = await findOrCreate(
  pool,
  "rehabilitation_protocol",
  "canonical_name",
  "Alfredson heavy-load eccentric calf-loading protocol",
  { canonical_name: "Alfredson heavy-load eccentric calf-loading protocol", status: "draft" }
);

const exercises = [
  {
    name: "Straight-knee eccentric heel drop",
    instructions:
      "Rise onto the toes of both feet, shift weight onto the affected leg, then lower slowly (eccentric phase) with the knee straight, targeting the gastrocnemius. 3 sets of 15, twice daily.",
    anatomyStructureId: gastrocSoleusId,
  },
  {
    name: "Bent-knee eccentric heel drop",
    instructions:
      "Same movement with the knee bent throughout the lowering phase, targeting the soleus. 3 sets of 15, twice daily.",
    anatomyStructureId: gastrocSoleusId,
  },
  {
    name: "Load progression",
    instructions:
      "Add external weight (e.g. a weighted backpack) once the bodyweight exercises become pain-free, progressing over approximately 12 weeks.",
    anatomyStructureId: achillesTendonId,
  },
];

const exerciseIds = [];
for (const exercise of exercises) {
  const id = await findOrCreate(pool, "exercise", "canonical_name", exercise.name, {
    canonical_name: exercise.name,
    instructions: exercise.instructions,
    anatomy_structure_id: exercise.anatomyStructureId,
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
  "Distinguish insertional from mid-portion tendinopathy before prescribing loading exercises — for insertional disease, avoid loading into full dorsiflexion, since deep dorsiflexion compresses the tendon insertion against the calcaneus and can aggravate rather than help.";
const pearl2Body =
  "Avoid corticosteroid injection directly into or immediately around the Achilles tendon. Unlike some other tendinopathies, this carries a real, well-recognized risk of tendon rupture, and is generally avoided in favor of eccentric loading as first-line management.";
const pearl3Body =
  "Ask specifically about recent fluoroquinolone antibiotic use — it's a recognized, sometimes overlooked risk factor for tendinopathy and even spontaneous rupture, and is easy to miss unless asked about directly.";

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
// Kept to two — both high-confidence, foundational, commonly-cited —
// rather than padding to match Plantar Fasciopathy's count.

const references = [
  {
    authors: "Alfredson H, Pietilä T, Jonsson P, Lorentzon R",
    title: "Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis",
    journal: "American Journal of Sports Medicine",
    publication_year: 1998,
    evidence_type: "RCT",
  },
  {
    authors: "Maffulli N, Sharma P, Luscombe KL",
    title: "Achilles tendinopathy: aetiology and management",
    journal: "Journal of the Royal Society of Medicine",
    publication_year: 2004,
    evidence_type: "Review",
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

// ---------- Medical Illustrations ----------

const anatomyIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Achilles tendon anatomy, posterior view",
  {
    title: "Achilles tendon anatomy, posterior view",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram of the Achilles tendon, posterior view, showing the gastrocnemius-soleus confluence, the hypovascular watershed zone, and the insertion at the posterior calcaneal tuberosity.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: anatomyIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

for (const anatomyId of [achillesTendonId, posteriorCalcanealTuberosityId]) {
  await linkIfNotExists(pool, "illustration_depicts_anatomy", {
    medical_illustration_id: anatomyIllustrationId,
    anatomy_structure_id: anatomyId,
  });
}

// Second and third illustrations, and the risk-factor card treatment —
// applying the same editorial rhythm work proven on Plantar
// Fasciopathy. This also resolves the open question this file's own
// earlier comment left hanging ("skipped the Biomechanics illustration
// slot... see LESSONS_LEARNED.md for whether that's true in general or
// just for this disease") — it wasn't true in general, just true before
// the illustration/layout/table tools existed.

const loadingIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Eccentric loading pattern at the Achilles watershed zone",
  {
    title: "Eccentric loading pattern at the Achilles watershed zone",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram showing eccentric loading forces concentrated at the hypovascular watershed zone of the Achilles tendon during activities like running and jumping, particularly with rapid increases in training load.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: loadingIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

await linkIfNotExists(pool, "illustration_depicts_anatomy", {
  medical_illustration_id: loadingIllustrationId,
  anatomy_structure_id: achillesTendonId,
});

const heelDropIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Eccentric heel drop, starting position",
  {
    title: "Eccentric heel drop, starting position",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Photograph or diagram of the eccentric heel drop exercise: standing on the edge of a step with heels raised, about to lower slowly with the affected leg.",
    style: "photographic",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: heelDropIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

console.log("Knowledge Objects seeded.");

// ---------- Editorial Blocks ----------
// Follows the Tendinopathy Template's order where it fits, and departs
// from it where Achilles Tendinopathy's actual story needs something
// the template didn't offer:
//   - "Pathophysiology" gets its own section (NOT in the template) —
//     the watershed-zone vascular story is substantial enough that
//     folding it into Biomechanics, the way Plantar Fasciopathy's
//     thin pathophysiology was, would have buried it.
//   - Biomechanics illustration slot is skipped — a paragraph carries
//     it fine; a second illustration beyond Anatomy didn't earn its
//     place here. See LESSONS_LEARNED.md for whether that's true in
//     general or just for this disease.
//   - No standalone Differential Diagnosis section (not in the
//     template, and that open question — spec #3 — is still
//     unresolved) — the Thompson test / rupture safety point is
//     surfaced as a key_point inside Exam instead, where a resident
//     will actually see it at the moment it matters.

await replaceBlocks(pool, diseaseId, [
  { blockType: "section_heading", contentConfig: { text: "Overview" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Achilles tendinopathy is a degenerative overuse condition of the Achilles tendon, most often affecting its relatively hypovascular mid-portion (2-6cm proximal to the calcaneal insertion) or, less commonly, the insertion itself. It presents as gradual-onset posterior heel or ankle pain, classically worse with running, jumping, or hill activity.",
      callout: true,
      learningObjective: "Distinguish mid-portion from insertional Achilles tendinopathy on history and exam.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Clinical Presentation" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Patients typically report gradual-onset posterior heel or ankle pain and stiffness, worse with the first steps in the morning and at the start of activity, often easing somewhat with continued movement (\"warm-up phenomenon\") before returning after activity or the next morning. Mid-portion disease presents with pain and thickening 2-6cm above the insertion; insertional disease presents with pain directly at the back of the heel, often aggravated by shoe heel counters.",
    },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "How do you distinguish mid-portion from insertional Achilles tendinopathy on history?",
      answer: "Mid-portion disease presents with pain and thickening 2-6cm above the insertion; insertional disease presents with pain directly at the back of the heel, often aggravated by shoe heel counters.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Anatomy" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: anatomyIllustrationId,
    contentConfig: {
      caption: "Achilles tendon anatomy, posterior view.",
      annotations: [
        { label: "Gastrocnemius-soleus confluence", x: 50, y: 25 },
        { label: "Hypovascular watershed zone (2-6cm proximal to insertion)", x: 50, y: 55 },
        { label: "Insertion at the posterior calcaneal tuberosity", x: 50, y: 85 },
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Pathophysiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The Achilles tendon's mid-portion has a relatively poor blood supply (the \"watershed zone\"), making it particularly vulnerable to degenerative change under repetitive load. As with plantar fasciopathy, histopathology in chronic cases shows collagen disorganization and fibroblast proliferation rather than an acute inflammatory process — a degenerative, not primarily inflammatory, mechanism.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Biomechanics" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: loadingIllustrationId,
    contentConfig: {
      caption: "Repetitive eccentric loading concentrates strain at the watershed zone — the same region most vulnerable due to poor blood supply.",
      annotations: [
        { label: "Watershed zone (2-6cm proximal to insertion)", x: 50, y: 50 },
        { label: "Eccentric loading during push-off/landing", x: 70, y: 25 },
        { label: "Reduced ankle dorsiflexion increases strain", x: 30, y: 80 },
      ],
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Repetitive eccentric loading of the tendon — particularly with rapid increases in running volume or intensity, hill running, or jumping sports — is the primary mechanical driver. Reduced ankle dorsiflexion from gastrocnemius-soleus tightness increases strain on the tendon during push-off, compounding the load.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Epidemiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Achilles tendinopathy is common among runners and jumping-sport athletes, but also occurs in non-athletic, typically older populations. The contributing factors below share a common thread: increased mechanical or biological strain on an already vulnerable tendon.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Obesity", callout: true, icon: "scale" },
    displayConfig: { layout: { row: "achilles-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Reduced ankle dorsiflexion", callout: true, icon: "gauge" },
    displayConfig: { layout: { row: "achilles-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Sudden increase in training load", callout: true, icon: "zap" },
    displayConfig: { layout: { row: "achilles-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Recent fluoroquinolone antibiotic use", callout: true, icon: "alert-triangle" },
    displayConfig: { layout: { row: "achilles-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Increasing age", callout: true, icon: "clock" },
    displayConfig: { layout: { row: "achilles-risk-factors", width: "1/2" } },
  },
  { blockType: "section_heading", contentConfig: { text: "Exam" } },
  {
    blockType: "key_point",
    contentConfig: {
      text: "Always perform a Thompson test. A positive (abnormal) result — absent plantarflexion with calf squeeze — suggests tendon rupture, not tendinopathy, and changes management entirely. Don't skip this because the presentation looks classic for tendinopathy.",
    },
  },
  {
    blockType: "examination_workflow",
    contentConfig: { maneuver_ids: [palpationId, archSignId, royalLondonId, thompsonId] },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl1Id,
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "An abnormal (positive) Thompson test suggests what, and how should it change management?",
      answer: "Suggests a complete or high-grade partial Achilles tendon rupture, not tendinopathy — this should prompt urgent reassessment rather than continuing routine tendinopathy management.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Diagnostic Imaging" } },
  {
    blockType: "imaging_findings",
    contentConfig: { imaging_finding_ids: [neovascularizationId] },
  },
  { blockType: "section_heading", contentConfig: { text: "Treatment" } },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl2Id,
  },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: eccentricLoadingAlgorithmId,
  },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: recalcitrantAlgorithmId,
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "Why should corticosteroid injection generally be avoided for Achilles tendinopathy, unlike some other tendinopathies (e.g. plantar fasciopathy)?",
      answer: "It carries a real, well-recognized risk of tendon rupture — eccentric loading is preferred as first-line management instead.",
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl3Id,
  },
  { blockType: "section_heading", contentConfig: { text: "Rehab" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: heelDropIllustrationId,
    contentConfig: {
      caption: "Eccentric heel drop, starting position — rise on both feet, then lower slowly on the affected leg alone.",
    },
  },
  {
    blockType: "rehabilitation_progression",
    referencedObjectType: "rehabilitation_protocol",
    referencedObjectId: rehabProtocolId,
  },
  { blockType: "section_heading", contentConfig: { text: "Return to Sport" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Graduated return to running or jumping sport is appropriate once the patient can complete daily activities and the eccentric loading program pain-free. Single-leg heel-raise endurance and hop tests, compared to the uninjured side, are useful functional benchmarks before resuming full training — return should be gradual (e.g. no more than 10% weekly volume increase), not all-at-once.",
    },
  },
  {
    blockType: "comparison_table",
    contentConfig: {
      caption: "Example graduated return-to-running progression, once daily activities and the loading program are pain-free.",
      columns: ["Week", "Focus", "Notes"],
      rows: [
        ["1-2", "Continue eccentric loading; light jogging only if pain-free", "Stop if posterior heel pain returns"],
        ["3-4", "Increase running volume, ~50-70% of prior mileage", "Flat surfaces, avoid hills"],
        ["5-6", "Reintroduce hills and moderate-intensity efforts", "Single-leg heel-raise endurance should approach the uninjured side"],
        ["7+", "Reintroduce jumping/plyometric activity, full training load", "Progress plyometrics last, not first"],
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Prognosis" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Most patients improve substantially with a structured eccentric loading program over 3 to 6 months, though recovery can take longer, particularly for insertional disease or long-standing symptoms. A minority of patients do not respond adequately to conservative management and require escalation — the strength of specific prognostic factors needs citation verification before publishing.",
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
