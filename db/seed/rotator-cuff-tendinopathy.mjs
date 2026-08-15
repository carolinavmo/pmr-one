// Rotator Cuff Tendinopathy — third Tendinopathy-family disease. The
// row already existed in the DB (canonical_name "Rotator Cuff
// Tendinopathy", slug "rotator-cuff-tendinopathy", status 'draft')
// with a 4-block stub authored directly in the in-app editor
// ("Definition...." placeholder text) — this script replaces that stub
// with real content, instantiated from the Tendinopathy Template, same
// discipline as Plantar Fasciopathy and Achilles Tendinopathy: status
// 'draft' throughout, no fabricated review, no fabricated pearl
// attribution, numeric claims left unverified where confidence is
// genuinely limited.
//
// Usage: node db/seed/rotator-cuff-tendinopathy.mjs
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

const diseaseName = "Rotator Cuff Tendinopathy";
const diseaseSlug = slugify(diseaseName);

// The disease already has its own curated topic ("Rotator Cuff
// Pathology", distinct from the generic "Tendinopathies" topic
// Plantar Fasciopathy/Achilles share) — preserve it rather than
// overwrite with 'tendinopathies'.
const { rows: topicRows } = await pool.query(
  `SELECT id FROM topic WHERE slug = 'rotator-cuff-pathology'`
);
const topicId = topicRows[0]?.id ?? null;

const diseaseId = await findOrCreate(pool, "disease", "slug", diseaseSlug, {
  canonical_name: diseaseName,
  aliases: ["Subacromial Impingement Syndrome", "Rotator Cuff Related Shoulder Pain", "M75.1"],
  slug: diseaseSlug,
  status: "draft",
  topic_id: topicId,
});
if (topicId) {
  await pool.query(`UPDATE disease SET topic_id = $1 WHERE id = $2`, [topicId, diseaseId]);
}

// ---------- STEP 1: instantiate from the Tendinopathy Template ----------

const { rows: templateRows } = await pool.query(
  `SELECT id FROM editorial_template WHERE name = 'Tendinopathy Template'`
);
const templateId = templateRows[0].id;
const copiedCount = await instantiateTemplate(pool, templateId, diseaseId);
console.log(`Instantiated ${copiedCount} placeholder blocks from the Tendinopathy Template.`);

// ---------- Anatomy Structures ----------

const supraspinatusId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Supraspinatus tendon", {
  canonical_name: "Supraspinatus tendon",
  region: "Shoulder",
});

const subacromialBursaId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Subacromial bursa", {
  canonical_name: "Subacromial bursa",
  region: "Shoulder",
});

const acromionId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Acromion", {
  canonical_name: "Acromion",
  region: "Shoulder (scapula)",
});

const scapularStabilizersId = await findOrCreate(
  pool,
  "anatomy_structure",
  "canonical_name",
  "Scapular stabilizer muscles (serratus anterior, lower trapezius)",
  { canonical_name: "Scapular stabilizer muscles (serratus anterior, lower trapezius)", region: "Shoulder girdle" }
);

// ---------- Examination Maneuvers ----------
// Drop arm test is the safety-critical one here, same role Thompson
// test plays for Achilles Tendinopathy — not diagnostic OF
// tendinopathy, it raises concern for a full-thickness tear instead,
// a materially different (and sometimes surgical) trajectory.

const neerId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Neer test", {
  canonical_name: "Neer test",
  technique:
    "Stabilize the scapula and passively forward-flex the arm to end range while the arm is internally rotated.",
  positive_finding: "Reproduction of pain as the greater tuberosity approaches the anterior acromion.",
  anatomy_structure_id: supraspinatusId,
  status: "draft",
});

const hawkinsKennedyId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Hawkins-Kennedy test", {
  canonical_name: "Hawkins-Kennedy test",
  technique: "Passively flex the shoulder and elbow to 90°, then internally rotate the shoulder.",
  positive_finding: "Reproduction of pain, from the greater tuberosity impinging against the coracoacromial ligament.",
  anatomy_structure_id: supraspinatusId,
  status: "draft",
});

const emptyCanId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Empty can test (Jobe test)", {
  canonical_name: "Empty can test (Jobe test)",
  aliases: ["Jobe test", "Supraspinatus test"],
  technique:
    "Elevate the arms to 90° in the scapular plane, thumbs pointing down (as if emptying a can), then apply downward resistance.",
  positive_finding: "Pain and/or weakness relative to the contralateral side, localizing to the supraspinatus.",
  anatomy_structure_id: supraspinatusId,
  status: "draft",
});

const painfulArcId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Painful arc test", {
  canonical_name: "Painful arc test",
  technique: "Actively abduct the arm through full range and note where in the arc pain occurs.",
  positive_finding:
    "Pain roughly between 60° and 120° of abduction, easing above and below that range — localizes the problem to the subacromial space.",
  status: "draft",
});

const dropArmId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Drop arm test", {
  canonical_name: "Drop arm test",
  technique: "Passively abduct the arm to 90°, then ask the patient to slowly lower it back to the side.",
  positive_finding:
    "Inability to control the descent — the arm drops or the patient substitutes with shoulder shrug — raises concern for a full-thickness rotator cuff tear rather than tendinopathy alone.",
  status: "draft",
});

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: neerId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "High sensitivity, low specificity — a good screening test, not a standalone diagnostic one.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: hawkinsKennedyId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "High sensitivity, low specificity — most useful combined with other provocative tests.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: emptyCanId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Reasonably specific for supraspinatus involvement; reported sensitivity/specificity vary across studies.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: painfulArcId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Classic supporting finding for subacromial pathology; not specific to tendinopathy over other subacromial causes.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: dropArmId,
    disease_id: diseaseId,
    relationship_type: "rules_out",
    sensitivity: null,
    specificity: null,
    evidence_strength: "A positive (abnormal) result should prompt urgent reconsideration of the working diagnosis — concern for a full-thickness tear, not tendinopathy alone.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

// ---------- Risk Factors ----------
// Increasing age and Diabetes mellitus already exist from prior
// diseases — findOrCreate should reuse those exact rows rather than
// duplicate them.

const ageId = await findOrCreate(pool, "risk_factor", "canonical_name", "Increasing age", {
  canonical_name: "Increasing age",
  status: "draft",
});

const diabetesId = await findOrCreate(pool, "risk_factor", "canonical_name", "Diabetes mellitus", {
  canonical_name: "Diabetes mellitus",
  status: "draft",
});

const overheadActivityId = await findOrCreate(
  pool,
  "risk_factor",
  "canonical_name",
  "Repetitive overhead activity or occupation",
  { canonical_name: "Repetitive overhead activity or occupation", aliases: ["Overhead athlete", "Overhead work"], status: "draft" }
);

const scapularDyskinesisId = await findOrCreate(
  pool,
  "risk_factor",
  "canonical_name",
  "Poor scapular mechanics (scapular dyskinesis)",
  { canonical_name: "Poor scapular mechanics (scapular dyskinesis)", status: "draft" }
);

const smokingId = await findOrCreate(pool, "risk_factor", "canonical_name", "Smoking", {
  canonical_name: "Smoking",
  status: "draft",
});

for (const riskFactorId of [ageId, overheadActivityId, scapularDyskinesisId, smokingId, diabetesId]) {
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

const tendinosisId = await findOrCreate(
  pool,
  "imaging_finding",
  "canonical_name",
  "Supraspinatus tendinosis with subacromial-subdeltoid bursitis on MRI/ultrasound",
  {
    canonical_name: "Supraspinatus tendinosis with subacromial-subdeltoid bursitis on MRI/ultrasound",
    modality: "MRI or ultrasound",
    description:
      "Tendon thickening with intrasubstance signal change/heterogeneity on MRI, or a hypoechoic, disorganized fibrillar pattern on ultrasound; associated subacromial-subdeltoid bursal fluid/thickening is common. Either modality can also grade an associated partial- or full-thickness tear when one is present.",
    status: "draft",
  }
);

await upsertRelationship(
  pool,
  "imaging_finding_disease_relationship",
  {
    imaging_finding_id: tendinosisId,
    disease_id: diseaseId,
    relationship_type: "suggests",
    typical_use:
      "Not required when the presentation and exam are classic and there is no concern for a tear. Obtain when symptoms are recalcitrant to a structured trial of conservative management, or sooner if the drop arm test or strength testing raises concern for a full-thickness tear.",
    reference_id: null,
  },
  ["imaging_finding_id", "disease_id"]
);

// ---------- Treatment Algorithms ----------

const exerciseFirstAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Exercise-first pathway",
  { canonical_name: "Exercise-first pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [exerciseFirstAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, NULL)`,
  [
    exerciseFirstAlgorithmId,
    "Activity modification away from provocative overhead activity, with short-term NSAIDs for symptom control.",
    "Begin a structured physical therapy program emphasizing rotator cuff strengthening and scapular stabilization (see Rehab), typically over 6-12 weeks.",
    "Reassess adherence and progress at 6-12 weeks.",
    "persistent, function-limiting pain despite an adherent 6-12 week trial of structured physical therapy",
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: exerciseFirstAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "First-line",
    recommendation_strength: "Consensus-based, supported by RCT evidence for structured exercise therapy specifically",
    guideline_reference_id: null,
    patient_subgroup: null,
  },
  ["treatment_algorithm_id", "disease_id"]
);

const recalcitrantAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Recalcitrant rotator cuff tendinopathy pathway",
  { canonical_name: "Recalcitrant rotator cuff tendinopathy pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [recalcitrantAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, NULL)`,
  [
    recalcitrantAlgorithmId,
    "Obtain MRI or ultrasound if not already done, to characterize tendinosis vs. a partial- or full-thickness tear.",
    "Consider a single subacromial corticosteroid injection to help facilitate participation in rehabilitation, used judiciously given concerns about tendon quality with repeated injections.",
    "Refer for orthopedic/surgical evaluation.",
    "a full-thickness tear is identified, or symptoms remain significantly limiting despite injection and continued rehabilitation",
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: recalcitrantAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "Second-line",
    recommendation_strength: "Consensus-based; evidence quality for subacromial injection specifically is mixed",
    guideline_reference_id: null,
    patient_subgroup: "Symptoms recalcitrant to a full trial of exercise-first management, or a suspected tear",
  },
  ["treatment_algorithm_id", "disease_id"]
);

// ---------- Rehabilitation Protocol ----------

const rehabProtocolId = await findOrCreate(
  pool,
  "rehabilitation_protocol",
  "canonical_name",
  "Progressive rotator cuff and scapular stabilization protocol",
  { canonical_name: "Progressive rotator cuff and scapular stabilization protocol", status: "draft" }
);

const exercises = [
  {
    name: "Pain-free active-assisted range of motion",
    instructions:
      "Pendulum swings and wand-assisted forward elevation within a pain-free range, to maintain mobility while acute symptoms settle. Daily.",
    anatomyStructureId: supraspinatusId,
  },
  {
    name: "Scapular stabilization (retraction and low rows)",
    instructions:
      "Scapular retraction and low-row exercises targeting the serratus anterior and lower trapezius, to restore normal scapulohumeral rhythm before loading the rotator cuff directly. 3 sets of 12-15.",
    anatomyStructureId: scapularStabilizersId,
  },
  {
    name: "Progressive rotator cuff strengthening",
    instructions:
      "Resisted internal and external rotation with the elbow at the side, progressing toward functional and overhead loading patterns as symptoms allow. 3 sets of 10-15, progressing resistance over 8-12 weeks.",
    anatomyStructureId: supraspinatusId,
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
  "Don't stop at a provocative-test-positive exam. Weakness on resisted testing (especially external rotation or abduction) and a positive drop arm test both raise concern for a full-thickness tear rather than tendinopathy alone — obtain imaging and consider surgical referral rather than continuing an empiric conservative trial.";
const pearl2Body =
  "Use subacromial corticosteroid injections judiciously — they can help symptom control and participation in rehabilitation, but repeated injections raise concerns about tendon quality, so frequency should be limited rather than repeated on demand.";
const pearl3Body =
  "Acute, dramatic weakness after a fall or a forceful eccentric load in an older adult is a different clinical picture from the gradual-onset presentation typical of tendinopathy — it should raise concern for an acute-on-chronic full-thickness tear, a distinctly different, potentially urgent, surgical trajectory.";

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
    authors: "Kuhn JE",
    title: "Exercise in the treatment of rotator cuff impingement: a systematic review and a synthesized evidence-based rehabilitation protocol",
    journal: "Journal of Shoulder and Elbow Surgery",
    publication_year: 2009,
    evidence_type: "Systematic Review",
  },
  {
    authors: "Diercks R, Bron C, Dorrestijn O, et al.",
    title: "Guideline for diagnosis and treatment of subacromial pain syndrome",
    journal: "Acta Orthopaedica",
    publication_year: 2014,
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

// ---------- Medical Illustrations ----------

const anatomyIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Rotator cuff and subacromial anatomy, anterior view",
  {
    title: "Rotator cuff and subacromial anatomy, anterior view",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram of the shoulder, anterior view, showing the supraspinatus tendon passing beneath the acromion, the subacromial bursa, and the surrounding subacromial space.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: anatomyIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

for (const anatomyId of [supraspinatusId, subacromialBursaId, acromionId]) {
  await linkIfNotExists(pool, "illustration_depicts_anatomy", {
    medical_illustration_id: anatomyIllustrationId,
    anatomy_structure_id: anatomyId,
  });
}

const impingementIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Impingement mechanism during overhead elevation",
  {
    title: "Impingement mechanism during overhead elevation",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram showing the supraspinatus tendon narrowing against the acromion during overhead elevation, particularly with poor scapular mechanics or a reduced subacromial space.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: impingementIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

for (const anatomyId of [supraspinatusId, acromionId]) {
  await linkIfNotExists(pool, "illustration_depicts_anatomy", {
    medical_illustration_id: impingementIllustrationId,
    anatomy_structure_id: anatomyId,
  });
}

const strengtheningIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Resisted external rotation exercise, starting position",
  {
    title: "Resisted external rotation exercise, starting position",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Photograph or diagram of resisted external rotation with a band, elbow held at the side, starting position before rotating outward.",
    style: "photographic",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: strengtheningIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

console.log("Knowledge Objects seeded.");

// ---------- Editorial Blocks ----------
// Same rhythm and section order as Achilles Tendinopathy — this
// disease's own story doesn't need a deviation from that shape.

await replaceBlocks(pool, diseaseId, [
  { blockType: "section_heading", contentConfig: { text: "Overview" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Rotator cuff tendinopathy is a degenerative overuse condition of the rotator cuff tendons — most often the supraspinatus — as they pass through the subacromial space. It presents as gradual-onset lateral or anterior shoulder pain, classically worse with overhead activity, and is a common cause of shoulder pain seen in both primary care and sports medicine settings.",
      callout: true,
      learningObjective: "Recognize the classic presentation of rotator cuff tendinopathy and distinguish it from a full-thickness tear.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Clinical Presentation" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Patients typically report gradual-onset lateral or anterior shoulder pain, worse with overhead reaching, lifting, or sleeping on the affected side. Pain classically localizes to a painful arc between roughly 60° and 120° of abduction. Weakness, when present, is usually mild and pain-limited rather than the profound weakness seen with a complete tear.",
    },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "What is the classic \"painful arc\" range for subacromial pathology, and what does pain outside that range suggest?",
      answer: "Roughly 60-120° of abduction. Pain outside that range, or pain unrelieved throughout the full arc, should prompt consideration of other shoulder pathology (e.g. AC joint, glenohumeral) rather than assuming subacromial tendinopathy.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Anatomy" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: anatomyIllustrationId,
    contentConfig: {
      caption: "Rotator cuff and subacromial anatomy, anterior view.",
      annotations: [
        { label: "Supraspinatus tendon", x: 50, y: 30 },
        { label: "Subacromial bursa", x: 50, y: 50 },
        { label: "Acromion", x: 65, y: 20 },
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Pathophysiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "As with other tendinopathies, chronic rotator cuff disease is primarily a degenerative process — collagen disorganization and fibroblast proliferation — rather than an acute inflammatory one. The supraspinatus tendon has a relatively hypovascular \"critical zone\" near its insertion, making it particularly vulnerable to degenerative change under repetitive subacromial loading.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Biomechanics" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: impingementIllustrationId,
    contentConfig: {
      caption: "Repetitive overhead elevation narrows the subacromial space, concentrating mechanical strain on the supraspinatus tendon — particularly with poor scapular mechanics.",
      annotations: [
        { label: "Narrowed subacromial space during elevation", x: 50, y: 40 },
        { label: "Supraspinatus tendon under compressive load", x: 50, y: 60 },
        { label: "Poor scapular mechanics increases impingement", x: 25, y: 80 },
      ],
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Repetitive overhead activity narrows the subacromial space during elevation, mechanically loading the supraspinatus tendon against the undersurface of the acromion. Poor scapular mechanics (scapular dyskinesis) compounds this by reducing the space available during arm elevation, so scapular control is a direct treatment target, not just an incidental finding.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Epidemiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Rotator cuff tendinopathy is common in both overhead athletes and non-athletic, typically older populations, and its prevalence increases with age. The contributing factors below share a common thread: increased mechanical strain on the subacromial space, or reduced tendon quality.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Increasing age", callout: true, icon: "clock" },
    displayConfig: { layout: { row: "rotator-cuff-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Repetitive overhead activity or occupation", callout: true, icon: "zap" },
    displayConfig: { layout: { row: "rotator-cuff-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Poor scapular mechanics", callout: true, icon: "gauge" },
    displayConfig: { layout: { row: "rotator-cuff-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Smoking", callout: true, icon: "alert-triangle" },
    displayConfig: { layout: { row: "rotator-cuff-risk-factors", width: "1/2" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Diabetes mellitus", callout: true, icon: "scale" },
    displayConfig: { layout: { row: "rotator-cuff-risk-factors", width: "1/2" } },
  },
  { blockType: "section_heading", contentConfig: { text: "Exam" } },
  {
    blockType: "key_point",
    contentConfig: {
      text: "Always test resisted strength and perform a drop arm test. Significant weakness or an abnormal (positive) drop arm test raises concern for a full-thickness tear, not tendinopathy, and changes management — don't skip this because the presentation looks classic for tendinopathy.",
    },
  },
  {
    blockType: "examination_workflow",
    contentConfig: { maneuver_ids: [neerId, hawkinsKennedyId, emptyCanId, painfulArcId, dropArmId] },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl1Id,
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "A patient can't control the descent of their arm during a drop arm test. What does this suggest, and how should it change management?",
      answer: "Raises concern for a full-thickness rotator cuff tear rather than tendinopathy alone — obtain imaging and consider surgical referral rather than continuing an empiric conservative trial.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Diagnostic Imaging" } },
  {
    blockType: "imaging_findings",
    contentConfig: { imaging_finding_ids: [tendinosisId] },
  },
  { blockType: "section_heading", contentConfig: { text: "Treatment" } },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: exerciseFirstAlgorithmId,
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl2Id,
  },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: recalcitrantAlgorithmId,
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "Why should subacromial corticosteroid injections be used judiciously rather than repeated on demand?",
      answer: "Repeated injections raise concerns about tendon quality — they're useful for symptom control and to help participation in rehabilitation, but frequency should be limited.",
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
    referencedObjectId: strengtheningIllustrationId,
    contentConfig: {
      caption: "Resisted external rotation, starting position — elbow held at the side, rotating outward against band resistance.",
    },
  },
  {
    blockType: "rehabilitation_progression",
    referencedObjectType: "rehabilitation_protocol",
    referencedObjectId: rehabProtocolId,
  },
  { blockType: "section_heading", contentConfig: { text: "Prognosis" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Most patients improve substantially with a structured exercise program emphasizing rotator cuff and scapular strengthening over 6 to 12 weeks, though recovery can take longer for higher-grade tendinopathy or in the presence of a partial-thickness tear. A minority of patients, particularly those with a full-thickness tear, do not respond adequately to conservative management and require surgical evaluation — the strength of specific prognostic factors needs citation verification before publishing.",
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
