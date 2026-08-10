// Plantar Fasciopathy — reference implementation seed script.
//
// Content status: 'draft' throughout. This is clinically-informed
// content (standard MSK teaching material) authored by an AI assistant,
// NOT content that has been through the platform's own Scientific
// Review stage (spec §7A). Nothing here is marked 'published', and
// nowhere is reviewed_by/reviewed_at set — that would misrepresent a
// review that didn't happen, which is exactly the kind of thing the
// Editorial Lifecycle exists to prevent. Numeric evidence claims
// (sensitivity/specificity, relative risk) are left unpopulated with
// an honest note rather than guessed at — see LESSONS_LEARNED.md.
//
// Usage: node db/seed/plantar-fasciopathy.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import {
  findOrCreate,
  upsertRelationship,
  linkIfNotExists,
  replaceBlocks,
  slugify,
} from "./lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------- Anatomy Structures ----------

const plantarFasciaId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Plantar fascia", {
  canonical_name: "Plantar fascia",
  region: "Foot — plantar hindfoot/midfoot",
});

const medialCalcanealTubercleId = await findOrCreate(
  pool,
  "anatomy_structure",
  "canonical_name",
  "Medial calcaneal tubercle",
  { canonical_name: "Medial calcaneal tubercle", region: "Foot — hindfoot (calcaneus)" }
);

const gastrocSoleusId = await findOrCreate(
  pool,
  "anatomy_structure",
  "canonical_name",
  "Gastrocnemius-soleus complex",
  { canonical_name: "Gastrocnemius-soleus complex", region: "Posterior leg (calf)" }
);

// ---------- Disease ----------

const diseaseName = "Plantar Fasciopathy";
const diseaseSlug = slugify(diseaseName);

const diseaseId = await findOrCreate(pool, "disease", "canonical_name", diseaseName, {
  canonical_name: diseaseName,
  aliases: ["Plantar Fasciitis", "Jogger's Heel", "M72.2"],
  slug: diseaseSlug,
  status: "draft",
});
// findOrCreate won't update slug on an already-existing row — patch it
// directly so reseeding after adding the slug column takes effect.
await pool.query(`UPDATE disease SET slug = $1 WHERE id = $2`, [diseaseSlug, diseaseId]);

// ---------- Examination Maneuvers ----------
// Deliberately exercises all three maneuver-disease relationship types
// (confirms / assesses_contributing_factor / rules_out) — the real test
// of whether the relationship taxonomy holds up, not just the object.

const windlassId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Windlass test", {
  canonical_name: "Windlass test",
  aliases: ["Passive dorsiflexion test"],
  technique:
    "With the patient seated or standing and weight-bearing, passively dorsiflex the great toe at the metatarsophalangeal joint while keeping the ankle in neutral.",
  positive_finding: "Reproduction of the patient's plantar heel pain during toe dorsiflexion.",
  anatomy_structure_id: plantarFasciaId,
  status: "draft",
});

const palpationId = await findOrCreate(
  pool,
  "examination_maneuver",
  "canonical_name",
  "Palpation of the medial plantar calcaneal region",
  {
    canonical_name: "Palpation of the medial plantar calcaneal region",
    technique:
      "Direct palpation over the medial calcaneal tubercle at the plantar fascia origin, with the ankle held in slight dorsiflexion to tension the fascia.",
    positive_finding: "Focal tenderness reproducing the patient's presenting pain.",
    anatomy_structure_id: medialCalcanealTubercleId,
    status: "draft",
  }
);

const silfverskioldId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Silfverskiöld test", {
  canonical_name: "Silfverskiöld test",
  technique:
    "Measure passive ankle dorsiflexion with the knee fully extended, then repeat with the knee flexed to 90°.",
  positive_finding:
    "Dorsiflexion improves substantially with the knee flexed, indicating isolated gastrocnemius tightness rather than a combined gastrocnemius-soleus contracture.",
  anatomy_structure_id: gastrocSoleusId,
  status: "draft",
});

const tinelId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Tinel's sign at the tarsal tunnel", {
  canonical_name: "Tinel's sign at the tarsal tunnel",
  technique: "Percuss over the posterior tibial nerve as it passes posterior to the medial malleolus.",
  positive_finding: "Tingling or paresthesia radiating into the plantar foot.",
  status: "draft",
});

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: windlassId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength:
      "Reported sensitivity/specificity vary across small single-site studies — needs citation verification before publishing.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: palpationId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Widely taught as a supportive finding; formal sensitivity/specificity not well established.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: silfverskioldId,
    disease_id: diseaseId,
    relationship_type: "assesses_contributing_factor",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Assesses gastrocnemius tightness as a contributing factor, not diagnostic of plantar fasciopathy itself.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: tinelId,
    disease_id: diseaseId,
    relationship_type: "rules_out",
    sensitivity: null,
    specificity: null,
    evidence_strength: "A positive result should prompt consideration of tarsal tunnel syndrome as an alternative or coexisting diagnosis.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

// ---------- Imaging Findings ----------
// Closes the gap found while reviewing the section taxonomy against
// this disease (LESSONS_LEARNED.md): Diagnostic Imaging was a real
// missing section. Kept consistent with the existing key_point below
// (imaging isn't required for typical presentations) rather than
// contradicting it — typical_use says exactly when it's reserved for.

const fasciaThickeningId = await findOrCreate(
  pool,
  "imaging_finding",
  "canonical_name",
  "Plantar fascia thickening on ultrasound",
  {
    canonical_name: "Plantar fascia thickening on ultrasound",
    modality: "ultrasound",
    description:
      "Diffuse hypoechoic thickening of the proximal plantar fascia at its calcaneal origin, sometimes with adjacent perifascial fluid or loss of the normal fibrillar echotexture.",
    status: "draft",
  }
);

await upsertRelationship(
  pool,
  "imaging_finding_disease_relationship",
  {
    imaging_finding_id: fasciaThickeningId,
    disease_id: diseaseId,
    relationship_type: "suggests",
    typical_use:
      "Reserved for atypical presentations, when the diagnosis is unclear, or to exclude a plantar fascia tear — not required for typical presentations.",
    reference_id: null,
  },
  ["imaging_finding_id", "disease_id"]
);

// ---------- Risk Factors ----------

const obesityId = await findOrCreate(pool, "risk_factor", "canonical_name", "Obesity", {
  canonical_name: "Obesity",
  aliases: ["Elevated BMI"],
  status: "draft",
});

const standingOccupationId = await findOrCreate(
  pool,
  "risk_factor",
  "canonical_name",
  "Prolonged weight-bearing occupation",
  { canonical_name: "Prolonged weight-bearing occupation", status: "draft" }
);

const reducedDorsiflexionId = await findOrCreate(
  pool,
  "risk_factor",
  "canonical_name",
  "Reduced ankle dorsiflexion (gastrocnemius-soleus tightness)",
  { canonical_name: "Reduced ankle dorsiflexion (gastrocnemius-soleus tightness)", status: "draft" }
);

const footTypeId = await findOrCreate(pool, "risk_factor", "canonical_name", "Pes planus or pes cavus foot type", {
  canonical_name: "Pes planus or pes cavus foot type",
  status: "draft",
});

for (const riskFactorId of [obesityId, standingOccupationId, reducedDorsiflexionId, footTypeId]) {
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

// ---------- Procedure ----------

const corticosteroidInjectionId = await findOrCreate(
  pool,
  "procedure",
  "canonical_name",
  "Corticosteroid injection, plantar fascia",
  {
    canonical_name: "Corticosteroid injection, plantar fascia",
    indication: "Persistent plantar fasciopathy symptoms after an adequate trial (typically 6-8 weeks) of conservative management.",
    technique: "Ultrasound-guided injection at the plantar fascia origin, posteromedial in-plane approach to avoid direct fascial puncture and fat pad injury.",
    anatomy_structure_id: plantarFasciaId,
    status: "draft",
  }
);

// ---------- Treatment Algorithms ----------
// Two algorithms for one disease (conservative vs. escalation), per
// spec §11A's explicit example of why line_of_therapy lives on the
// relationship rather than the algorithm.

const conservativeAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Conservative-first treatment pathway",
  { canonical_name: "Conservative-first treatment pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [conservativeAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, $6)`,
  [
    conservativeAlgorithmId,
    "Initiate plantar fascia-specific and gastrocnemius-soleus stretching, performed several times daily for at least 6-8 weeks.",
    "Add over-the-counter heel cushions, prefabricated arch-support insoles, or night splints as adjuncts.",
    "Consider a single ultrasound-guided corticosteroid injection into the plantar fascia origin.",
    "no meaningful improvement at 6-8 weeks",
    corticosteroidInjectionId,
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: conservativeAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "First-line",
    recommendation_strength: "Consensus-based",
    guideline_reference_id: null,
    patient_subgroup: null,
  },
  ["treatment_algorithm_id", "disease_id"]
);

const recalcitrantAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Recalcitrant plantar fasciopathy pathway",
  { canonical_name: "Recalcitrant plantar fasciopathy pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [recalcitrantAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, NULL)`,
  [
    recalcitrantAlgorithmId,
    "Confirm an adequate trial (typically 6+ months) of conservative management has failed.",
    "Consider extracorporeal shockwave therapy (ESWT).",
    "Refer for consideration of plantar fascia release (open or endoscopic).",
    "ESWT unsuccessful or unavailable",
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: recalcitrantAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "Second-line",
    recommendation_strength: "Consensus-based",
    guideline_reference_id: null,
    patient_subgroup: "Symptoms recalcitrant to first-line conservative management",
  },
  ["treatment_algorithm_id", "disease_id"]
);

// ---------- Rehabilitation Protocol ----------

const rehabProtocolId = await findOrCreate(
  pool,
  "rehabilitation_protocol",
  "canonical_name",
  "Plantar fascia-specific stretching and strengthening progression",
  { canonical_name: "Plantar fascia-specific stretching and strengthening progression", status: "draft" }
);

const exercises = [
  {
    name: "Seated plantar fascia stretch",
    instructions:
      "Cross the affected foot over the opposite knee; grasp the toes and pull them toward the shin until a stretch is felt along the arch. Hold 10 seconds, repeat 10 times, before first steps in the morning and periodically through the day.",
  },
  {
    name: "Standing gastrocnemius-soleus wall stretch",
    instructions:
      "Facing a wall, step the affected leg back with the knee straight (gastrocnemius), then slightly bent (soleus); lean forward until a stretch is felt in the calf. Hold 30 seconds x 3 in each position.",
  },
  {
    name: "Towel or marble scrunches",
    instructions: "Use the toes to scrunch a towel or pick up marbles from the floor. 2 sets of 15.",
  },
  {
    name: "Frozen bottle roll",
    instructions: "Roll the arch of the foot over a frozen water bottle for 5-10 minutes for symptomatic relief, particularly useful acutely.",
  },
];

const exerciseIds = [];
for (const exercise of exercises) {
  const id = await findOrCreate(pool, "exercise", "canonical_name", exercise.name, {
    canonical_name: exercise.name,
    instructions: exercise.instructions,
    anatomy_structure_id: plantarFasciaId,
    status: "draft",
  });
  exerciseIds.push(id);
}

for (const [index, exerciseId] of exerciseIds.entries()) {
  await upsertRelationship(
    pool,
    "rehabilitation_protocol_exercise",
    {
      rehabilitation_protocol_id: rehabProtocolId,
      exercise_id: exerciseId,
      step_order: index + 1,
    },
    ["rehabilitation_protocol_id", "exercise_id"]
  );
}

await linkIfNotExists(pool, "rehabilitation_protocol_treats_disease", {
  rehabilitation_protocol_id: rehabProtocolId,
  disease_id: diseaseId,
});

// ---------- Clinical Pearls ----------
// No fabricated attribution — these are synthesized from general
// clinical teaching, not quoting a specific named person.

const pearl1Body =
  "Ask specifically about pain with the first steps in the morning or after prolonged sitting — this \"first-step pain\" pattern is one of the most reliable discriminating features in the history, often more useful than exam findings alone.";
const pearl2Body =
  "The term \"fasciitis\" is increasingly considered a misnomer for chronic cases — histopathology typically shows degenerative changes (collagen disorganization, fibroblast proliferation) rather than an acute inflammatory infiltrate, which is why \"fasciopathy\" is the preferred term in current literature.";
const pearl3Body =
  "Avoid multiple or high-volume corticosteroid injections into the plantar fascia — case reports link repeated injections to plantar fascia rupture and fat pad atrophy, both of which can produce worse long-term pain than the original condition.";

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
// Standard, commonly-cited foot/ankle literature. DOI/PMID left blank
// rather than guessed — a fabricated-but-plausible identifier is worse
// than none. Verify full citation details during Scientific Review.

const references = [
  {
    authors: "Riddle DL, Schappert SM",
    title: "Volume of ambulatory care visits and patterns of care for patients diagnosed with plantar fasciitis: a national study of medical doctors",
    journal: "Foot & Ankle International",
    publication_year: 2004,
    evidence_type: "Epidemiological / cross-sectional",
  },
  {
    authors: "Buchbinder R",
    title: "Clinical practice. Plantar fasciitis",
    journal: "New England Journal of Medicine",
    publication_year: 2004,
    evidence_type: "Review",
  },
  {
    authors: "Cutts S, Obi N, Pasapula C, Chan W",
    title: "Plantar fasciitis",
    journal: "Annals of the Royal College of Surgeons of England",
    publication_year: 2012,
    evidence_type: "Review",
  },
  {
    authors: "DiGiovanni BF, Nawoczenski DA, et al.",
    title: "Tissue-specific plantar fascia-stretching exercise enhances outcomes in patients with chronic heel pain",
    journal: "Journal of Bone and Joint Surgery (American)",
    publication_year: 2003,
    evidence_type: "RCT",
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
// No illustration production pipeline exists yet (spec: Visual Asset
// Production is a named-but-unbuilt lifecycle stage) — placeholder
// asset, honestly labeled as pending. See LESSONS_LEARNED.md.

const anatomyIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Plantar fascia anatomy, medial view",
  {
    title: "Plantar fascia anatomy, medial view",
    asset_url: "/placeholder-illustration.svg",
    alt_text: "Diagram of plantar fascia anatomy, medial view of the foot, showing the origin at the medial calcaneal tubercle.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: anatomyIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

for (const anatomyId of [plantarFasciaId, medialCalcanealTubercleId]) {
  await linkIfNotExists(pool, "illustration_depicts_anatomy", {
    medical_illustration_id: anatomyIllustrationId,
    anatomy_structure_id: anatomyId,
  });
}

// Second and third illustrations — editorial rhythm fix, not new
// infrastructure. Every disease so far has had exactly one
// illustration (Anatomy) and nothing else, producing long text
// stretches with no visual break. See LESSONS_LEARNED.md.

const windlassIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Windlass mechanism of the plantar fascia",
  {
    title: "Windlass mechanism of the plantar fascia",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram of the windlass mechanism: as the great toe dorsiflexes during the push-off phase of gait, the plantar fascia winds around the metatarsal head, shortening and tensioning the fascia and raising the medial longitudinal arch.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: windlassIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

await linkIfNotExists(pool, "illustration_depicts_anatomy", {
  medical_illustration_id: windlassIllustrationId,
  anatomy_structure_id: plantarFasciaId,
});

const stretchIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Seated plantar fascia stretch, starting position",
  {
    title: "Seated plantar fascia stretch, starting position",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Photograph or diagram of the seated plantar fascia stretch: the affected foot crossed over the opposite knee, toes grasped and pulled toward the shin.",
    style: "photographic",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: stretchIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

await linkIfNotExists(pool, "illustration_depicts_anatomy", {
  medical_illustration_id: stretchIllustrationId,
  anatomy_structure_id: plantarFasciaId,
});

console.log("Knowledge Objects seeded.");

// ---------- Editorial Blocks ----------
// The ordered sequence that composes the actual Disease Page from the
// objects above. Every embedding block references an object created
// above by ID — nothing here duplicates content (spec §15).

await replaceBlocks(pool, diseaseId, [
  { blockType: "section_heading", contentConfig: { text: "Overview" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar fasciopathy is a degenerative overuse condition of the plantar fascia at its origin on the medial calcaneal tubercle. It typically presents as sharp, localized heel pain that is worst with the first steps after rest and tends to ease, then return, with continued activity.",
      callout: true,
      learningObjective: "Recognize the classic presentation on history alone.",
    },
  },
  // No section_heading here — the illustration immediately follows the
  // Overview paragraph so the Disease Snapshot module (VISUAL_IDENTITY.md
  // §3) can extract this exact [heading, paragraph, illustration] prefix
  // and render it as the arrival hero, ahead of the reading flow below.
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: anatomyIllustrationId,
    contentConfig: {
      caption: "Plantar fascia origin at the medial calcaneal tubercle.",
      annotations: [
        { label: "Medial calcaneal tubercle (origin)", x: 25, y: 55 },
        { label: "Central band of the plantar fascia", x: 55, y: 65 },
      ],
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl2Id,
  },
  {
    blockType: "key_point",
    contentConfig: {
      text: "Plantar fasciopathy is a clinical diagnosis. Imaging is not required for typical presentations and should be reserved for atypical cases or when the diagnosis is unclear.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Clinical Presentation" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Patients typically describe a gradual onset of sharp or aching pain at the bottom of the heel, most severe with the very first steps in the morning or after any period of prolonged sitting or rest (\"start-up pain\"), then partially easing with continued walking before worsening again later in the day or after activity. Pain is usually unilateral, though bilateral presentations occur, particularly with systemic risk factors.",
    },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "What single history finding is most discriminating for plantar fasciopathy?",
      answer: "\"First-step pain\" — sharp heel pain with the very first steps in the morning or after prolonged sitting, which partially eases with continued walking before returning later.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Epidemiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar fasciopathy is one of the most common causes of heel pain seen in ambulatory care. The contributing factors below share a common thread: increased mechanical load or strain on the fascia's origin.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Obesity", callout: true, icon: "scale" },
    displayConfig: { layout: { row: "pf-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Occupations involving prolonged standing or walking", callout: true, icon: "briefcase" },
    displayConfig: { layout: { row: "pf-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Reduced ankle dorsiflexion from gastrocnemius-soleus tightness", callout: true, icon: "gauge" },
    displayConfig: { layout: { row: "pf-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Pes planus or pes cavus foot type", callout: true, icon: "footprints" },
    displayConfig: { layout: { row: "pf-risk-factors", width: "1/2" } },
  },
  { blockType: "section_heading", contentConfig: { text: "Biomechanics" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: windlassIllustrationId,
    contentConfig: {
      caption: "The windlass mechanism: toe dorsiflexion during push-off winds the fascia around the metatarsal head, tensioning it and raising the arch.",
      annotations: [
        { label: "Great toe dorsiflexion at push-off", x: 75, y: 40 },
        { label: "Fascia winds around the metatarsal head", x: 55, y: 60 },
        { label: "Arch rises as the fascia shortens", x: 30, y: 45 },
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Exam" } },
  {
    blockType: "examination_workflow",
    contentConfig: { maneuver_ids: [windlassId, palpationId, silfverskioldId, tinelId] },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl1Id,
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "A positive Tinel's sign at the tarsal tunnel during a plantar fasciopathy workup should make you think of what?",
      answer: "Tarsal tunnel syndrome as an alternative or coexisting diagnosis — this finding should redirect the differential, not just be treated as another confirming test.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Diagnostic Imaging" } },
  {
    blockType: "imaging_findings",
    contentConfig: { imaging_finding_ids: [fasciaThickeningId] },
  },
  { blockType: "section_heading", contentConfig: { text: "Treatment" } },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: conservativeAlgorithmId,
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl3Id,
  },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: recalcitrantAlgorithmId,
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "Why is repeated or high-volume corticosteroid injection into the plantar fascia risky?",
      answer: "It's linked to plantar fascia rupture and fat pad atrophy — both of which can leave the patient with worse long-term pain than the original condition.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Rehab" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: stretchIllustrationId,
    contentConfig: {
      caption: "Seated plantar fascia stretch — the starting position for the first exercise below.",
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
      body: "For athletic patients, particularly runners, a graduated return-to-running program is appropriate once morning pain has substantially resolved and daily activities are pain-free. A reasonable approach is to resume at reduced volume and intensity, increasing gradually (e.g. no more than 10% per week) while monitoring for recurrence of start-up pain — a recurrence should prompt a temporary step back rather than pushing through it.",
    },
  },
  {
    blockType: "comparison_table",
    contentConfig: {
      caption: "Example graduated return-to-running progression, once daily activities are pain-free.",
      columns: ["Week", "Volume", "Notes"],
      rows: [
        ["1-2", "Run-walk intervals, ~50% of prior weekly mileage", "Stop for the day if start-up pain returns"],
        ["3-4", "Continuous easy running, ~70% of prior weekly mileage", "Flat surfaces, avoid hills/speed work"],
        ["5-6", "~85-90% of prior weekly mileage", "Reintroduce one moderate-effort session"],
        ["7+", "Full prior training load", "Resume speed work/hills last, not first"],
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Prognosis" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar fasciopathy is generally self-limited: most patients improve substantially within 6 to 12 months with consistent conservative management, and the large majority do not require procedural or surgical intervention. Longer symptom duration before starting treatment, higher BMI, and bilateral involvement are commonly cited as associated with a slower course — the strength of these specific associations needs citation verification before publishing.",
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
