// Bell's Palsy — reference disease for the Cranial Neuropathy family,
// authored starting from the Cranial Neuropathy Template. First
// disease outside the Tendinopathy family — tests whether the
// template mechanism, the taxonomy, and the "no graph leakage" /
// relationship-taxonomy patterns established on two MSK diseases
// actually generalize to a CNS-adjacent condition, or were specific
// to that family.
//
// Same discipline throughout: status 'draft', no fabricated review,
// no fabricated pearl attribution, numeric claims hedged where
// confidence is genuinely limited.
//
// Usage: node db/seed/bells-palsy.mjs
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

const diseaseName = "Bell's Palsy";
const diseaseSlug = slugify(diseaseName);

const diseaseId = await findOrCreate(pool, "disease", "canonical_name", diseaseName, {
  canonical_name: diseaseName,
  aliases: ["Idiopathic Facial Nerve Palsy", "Acute Peripheral Facial Palsy", "G51.0"],
  slug: diseaseSlug,
  status: "draft",
});
await pool.query(`UPDATE disease SET slug = $1 WHERE id = $2`, [diseaseSlug, diseaseId]);

const { rows: templateRows } = await pool.query(
  `SELECT id FROM editorial_template WHERE name = 'Cranial Neuropathy Template'`
);
const templateId = templateRows[0].id;
const copiedCount = await instantiateTemplate(pool, templateId, diseaseId);
console.log(`Instantiated ${copiedCount} placeholder blocks from the Cranial Neuropathy Template.`);

// ---------- Anatomy Structures ----------
// Deliberately just ONE row (Facial nerve), not one row per branch —
// the branch-specific detail (why lesion location changes symptoms)
// lives in the illustration's annotations instead, the same pattern
// already used for Plantar Fasciopathy and Achilles Tendinopathy.
// Creating a separate anatomy_structure per branch would be exactly
// the "object type for something with only one referencing row"
// DATABASE_GUIDE.md warns against.

const facialNerveId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Facial nerve (CN VII)", {
  canonical_name: "Facial nerve (CN VII)",
  region: "Cranial nerve — face",
});

// ---------- Examination Maneuvers ----------
// Forehead sparing is the safety-critical one — same 'rules_out'
// pattern as Achilles' Thompson test, but the alternative diagnosis
// here (stroke) is even higher-stakes.

const foreheadSparingId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Forehead sparing test", {
  canonical_name: "Forehead sparing test",
  technique:
    "In a patient presenting with facial weakness, ask them to raise both eyebrows and wrinkle the forehead, comparing sides.",
  positive_finding:
    "Forehead movement is preserved on the weak side despite lower facial weakness (\"forehead sparing\") — suggests a central (upper motor neuron) lesion such as stroke rather than a peripheral facial nerve palsy, and should prompt urgent stroke workup rather than routine Bell's Palsy management.",
  anatomy_structure_id: facialNerveId,
  status: "draft",
});

const houseBrackmannId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "House-Brackmann grading", {
  canonical_name: "House-Brackmann grading",
  technique:
    "Observe and grade facial symmetry and movement at rest and with expression (forehead wrinkle, eye closure, smile), comparing to the unaffected side.",
  positive_finding:
    "Graded I (normal) to VI (complete paralysis) based on degree of weakness and any synkinesis — used both to characterize initial severity and to track recovery over time. Initial grade is also a recognized prognostic factor (see Prognosis).",
  anatomy_structure_id: facialNerveId,
  status: "draft",
});

const bellsPhenomenonId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Bell's phenomenon", {
  canonical_name: "Bell's phenomenon",
  technique: "Ask the patient to attempt to close the eyes.",
  positive_finding:
    "The eye on the affected side rolls upward but the eyelid fails to close completely (lagophthalmos) — a normal reflex made visible by the inability to close the eyelid, and the mechanism behind the corneal exposure risk that drives urgent eye protection (see Complications).",
  anatomy_structure_id: facialNerveId,
  status: "draft",
});

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: foreheadSparingId,
    disease_id: diseaseId,
    relationship_type: "rules_out",
    sensitivity: null,
    specificity: null,
    evidence_strength:
      "A positive (abnormal) result — sparing present — should prompt urgent reconsideration of the working diagnosis and stroke workup, not continued Bell's Palsy management.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: houseBrackmannId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Standard severity grading, not a binary diagnostic test.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: bellsPhenomenonId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Supports the diagnosis and directly identifies corneal exposure risk; not systematically studied as a standalone diagnostic test.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

// ---------- Risk Factors ----------
// None of these overlap with Plantar Fasciopathy/Achilles Tendinopathy
// — genuinely different family, genuinely different risk factors. No
// findOrCreate reuse to test here, and manufacturing an artificial
// overlap would be dishonest. Reuse happens when it's genuinely true,
// not on demand.

const diabetesId = await findOrCreate(pool, "risk_factor", "canonical_name", "Diabetes mellitus", {
  canonical_name: "Diabetes mellitus",
  status: "draft",
});

const pregnancyId = await findOrCreate(pool, "risk_factor", "canonical_name", "Pregnancy (particularly third trimester or postpartum)", {
  canonical_name: "Pregnancy (particularly third trimester or postpartum)",
  status: "draft",
});

const viralIllnessId = await findOrCreate(pool, "risk_factor", "canonical_name", "Recent viral illness or upper respiratory infection", {
  canonical_name: "Recent viral illness or upper respiratory infection",
  status: "draft",
});

for (const riskFactorId of [diabetesId, pregnancyId, viralIllnessId]) {
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

// ---------- Treatment Algorithm ----------
// Deliberately ONE algorithm, not the two-algorithm (first-line/
// second-line) pattern both tendinopathies used. Bell's Palsy's
// treatment logic is time-critical-single-pathway, not escalation
// across lines — forcing a second algorithm here just to match the
// earlier pattern would misrepresent the actual clinical reasoning.

const acuteManagementAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Acute management pathway",
  { canonical_name: "Acute management pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [acuteManagementAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, NULL, NULL),
   ($1, 4, $5, $6, NULL)`,
  [
    acuteManagementAlgorithmId,
    "Initiate oral corticosteroids within 72 hours of symptom onset — early initiation is associated with better recovery odds.",
    "Consider adding an antiviral in addition to steroids for more severe presentations; evidence for added benefit over steroids alone is less consistent.",
    "Reassess at 2-3 weeks; most improvement begins within this window.",
    "Further workup (e.g. MRI) to exclude other causes and consider referral to a facial nerve specialist.",
    "no improvement by 3 months",
  ]
);

await upsertRelationship(
  pool,
  "algorithm_treats_disease",
  {
    treatment_algorithm_id: acuteManagementAlgorithmId,
    disease_id: diseaseId,
    line_of_therapy: "First-line",
    recommendation_strength: "Supported by RCT evidence for corticosteroids specifically; antiviral benefit less consistent",
    guideline_reference_id: null,
    patient_subgroup: null,
  },
  ["treatment_algorithm_id", "disease_id"]
);

// ---------- Rehabilitation Protocol ----------

const rehabProtocolId = await findOrCreate(
  pool,
  "rehabilitation_protocol",
  "canonical_name",
  "Facial neuromuscular retraining",
  { canonical_name: "Facial neuromuscular retraining", status: "draft" }
);

const exercises = [
  {
    name: "Mirror-guided facial symmetry exercises",
    instructions:
      "Small, slow, symmetric facial movements performed in front of a mirror, focusing on control rather than maximal effort — the goal is to retrain coordinated movement and reduce the risk of synkinesis, not to build strength quickly.",
  },
  {
    name: "Facial soft tissue massage",
    instructions:
      "Gentle massage of the affected side, particularly useful in the chronic phase and for managing synkinesis and tightness.",
  },
];

const exerciseIds = [];
for (const exercise of exercises) {
  const id = await findOrCreate(pool, "exercise", "canonical_name", exercise.name, {
    canonical_name: exercise.name,
    instructions: exercise.instructions,
    anatomy_structure_id: facialNerveId,
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
  "Always check forehead movement in a patient with facial weakness — sparing of the forehead points to a central lesion (stroke) rather than Bell's Palsy, and is one of the highest-yield distinctions in all of neurology.";
const pearl2Body =
  "Ask about eye symptoms and inspect for lagophthalmos at every visit until eye closure recovers — corneal injury is a preventable complication, not an inevitable one.";
const pearl3Body =
  "\"Crocodile tears\" syndrome — gustatory lacrimation triggered by eating, from aberrant reinnervation of the greater petrosal nerve during recovery — is a real, if uncommon, late finding that can alarm patients who aren't warned about it in advance.";

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
    authors: "Sullivan FM, Swan IR, Donnan PT, et al.",
    title: "Early treatment with prednisolone or acyclovir in Bell's palsy",
    journal: "New England Journal of Medicine",
    publication_year: 2007,
    evidence_type: "RCT",
  },
  {
    authors: "Gronseth GS, Paduga R",
    title: "Evidence-based guideline update: steroids and antivirals for Bell palsy",
    journal: "Neurology",
    publication_year: 2012,
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

const facialNerveIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Facial nerve anatomy and branches",
  {
    title: "Facial nerve anatomy and branches",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram of the facial nerve (CN VII) from the brainstem through the temporal bone and parotid gland to its peripheral branches, showing the geniculate ganglion, greater petrosal nerve, nerve to stapedius, chorda tympani, and the peripheral motor branches.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: facialNerveIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

await linkIfNotExists(pool, "illustration_depicts_anatomy", {
  medical_illustration_id: facialNerveIllustrationId,
  anatomy_structure_id: facialNerveId,
});

const eyeProtectionIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Eye protection technique for lagophthalmos",
  {
    title: "Eye protection technique for lagophthalmos",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Diagram showing eye protection for incomplete eyelid closure: lubricating drops during the day, and ointment with taping or a moisture chamber at night.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: eyeProtectionIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

console.log("Knowledge Objects seeded.");

// ---------- Editorial Blocks ----------
// Follows the Cranial Neuropathy Template's order. Diagnostic Imaging
// uses a plain paragraph, not an imaging_findings block — Bell's
// Palsy's imaging story is "why we don't image typical cases," which
// doesn't fit the imaging_finding_disease_relationship's 'suggests'-
// only shape. No ad hoc sections needed this time — unlike Achilles,
// this disease's story fit the template's default shape exactly,
// which is itself worth noting alongside the times it hasn't.

await replaceBlocks(pool, diseaseId, [
  { blockType: "section_heading", contentConfig: { text: "Overview" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Bell's palsy is an acute, idiopathic peripheral facial nerve palsy — sudden-onset unilateral facial weakness affecting the entire side of the face, including the forehead. It's the most common cause of acute facial paralysis, and a diagnosis of exclusion: the most important initial task is confirming the pattern is peripheral, not central.",
      callout: true,
      learningObjective: "Distinguish peripheral (Bell's palsy) from central (stroke) facial weakness on exam.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Clinical Presentation" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Patients typically report rapid onset (over hours, sometimes overnight) of unilateral facial weakness, often first noticed as difficulty closing the eye, drooping of the mouth, or drooling. Post-auricular pain frequently precedes or accompanies the weakness. Associated symptoms can include altered taste on the anterior two-thirds of the tongue, hyperacusis (sound sensitivity), and reduced tearing — which branch is affected determines which of these accompany the facial weakness.",
    },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "What key exam finding distinguishes central (stroke) facial weakness from peripheral (Bell's Palsy) facial weakness?",
      answer: "Forehead sparing. If forehead movement is preserved despite lower facial weakness, the lesion is central — most importantly stroke. If the forehead is also weak, the pattern is peripheral, consistent with Bell's Palsy.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Anatomy" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: facialNerveIllustrationId,
    contentConfig: {
      caption: "Facial nerve course and branches — lesion location determines which associated symptoms accompany the facial weakness.",
      annotations: [
        { label: "Geniculate ganglion", x: 20, y: 15 },
        { label: "Greater petrosal nerve (lacrimation)", x: 65, y: 20 },
        { label: "Nerve to stapedius (hyperacusis)", x: 25, y: 45 },
        { label: "Chorda tympani (anterior 2/3 tongue taste)", x: 70, y: 55 },
        { label: "Peripheral motor branches (facial expression)", x: 45, y: 85 },
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Pathophysiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The leading theory is reactivation of latent herpes simplex virus (HSV-1) within the geniculate ganglion, causing inflammation and edema of the facial nerve as it travels through the narrow, bony fallopian canal of the temporal bone. Because the canal doesn't allow room for swelling, the nerve becomes compressed within its own bony housing — this compression, not a primary destructive process, is what produces the deficit, which is part of why most patients recover.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Epidemiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Bell's palsy is the most common cause of acute facial paralysis. The risk factors below are consistent with the viral-reactivation mechanism above.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Diabetes mellitus", callout: true, icon: "droplet" },
    displayConfig: { layout: { row: "bells-risk-factors", width: "1/3" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Pregnancy (third trimester or postpartum)", callout: true, icon: "baby" },
    displayConfig: { layout: { row: "bells-risk-factors", width: "1/3" } },
  },
  {
    blockType: "paragraph",
    contentConfig: { body: "Recent viral illness or upper respiratory infection", callout: true, icon: "thermometer" },
    displayConfig: { layout: { row: "bells-risk-factors", width: "1/3" } },
  },
  { blockType: "section_heading", contentConfig: { text: "Exam" } },
  {
    blockType: "key_point",
    contentConfig: {
      text: "Always check forehead movement. Forehead sparing (movement preserved despite lower facial weakness) points to a central lesion — most importantly stroke — not Bell's Palsy, and should redirect the workup entirely.",
    },
  },
  {
    blockType: "examination_workflow",
    contentConfig: { maneuver_ids: [foreheadSparingId, houseBrackmannId, bellsPhenomenonId] },
  },
  {
    blockType: "comparison_table",
    contentConfig: {
      caption: "House-Brackmann grading scale.",
      columns: ["Grade", "Description"],
      rows: [
        ["I", "Normal facial function in all areas"],
        ["II", "Mild dysfunction — slight weakness on close inspection; normal symmetry at rest"],
        ["III", "Moderate dysfunction — obvious but not disfiguring weakness; complete eye closure with effort; normal symmetry at rest"],
        ["IV", "Moderately severe dysfunction — obvious weakness and/or asymmetry; incomplete eye closure"],
        ["V", "Severe dysfunction — barely perceptible motion; asymmetry present at rest"],
        ["VI", "Total paralysis — no movement"],
      ],
    },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "What does Bell's phenomenon demonstrate, and why does it matter clinically?",
      answer: "It shows the normal reflex of the eye rolling upward on attempted closure — the failure of the eyelid to close over it (lagophthalmos) is what creates the corneal exposure risk that drives urgent eye protection.",
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl1Id,
  },
  { blockType: "section_heading", contentConfig: { text: "Diagnostic Imaging" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Bell's palsy is a clinical diagnosis. Imaging (MRI) is not required for a typical presentation and should be reserved for atypical features — gradual onset, other cranial neuropathies, or failure to improve — where a structural cause (tumor, stroke) needs to be excluded.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Treatment" } },
  {
    blockType: "treatment_algorithm",
    referencedObjectType: "treatment_algorithm",
    referencedObjectId: acuteManagementAlgorithmId,
  },
  { blockType: "section_heading", contentConfig: { text: "Complications" } },
  {
    blockType: "key_point",
    contentConfig: {
      text: "Assess for lagophthalmos (Bell's phenomenon) immediately. If present, start eye protection the same day — lubricating drops during the day, ointment and taping or a moisture chamber at night — regardless of other treatment decisions. Corneal injury is a preventable complication and shouldn't wait on the steroid-timing discussion.",
    },
  },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: eyeProtectionIllustrationId,
    contentConfig: {
      caption: "Eye protection for lagophthalmos — lubricating drops by day, ointment with taping or a moisture chamber at night.",
    },
  },
  {
    blockType: "self_check",
    contentConfig: {
      question: "Why should eye protection start the same day, regardless of the steroid-timing decision?",
      answer: "Corneal injury from lagophthalmos is a preventable complication, not an inevitable one — it doesn't need to wait on any other treatment decision.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Beyond corneal exposure, longer-term complications include synkinesis (involuntary co-contraction from aberrant nerve regeneration — e.g. the eye closing when the patient smiles), incomplete recovery, and rarely \"crocodile tears\" syndrome (gustatory lacrimation from aberrant reinnervation of the greater petrosal nerve).",
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl2Id,
  },
  { blockType: "section_heading", contentConfig: { text: "Rehab" } },
  {
    blockType: "rehabilitation_progression",
    referencedObjectType: "rehabilitation_protocol",
    referencedObjectId: rehabProtocolId,
  },
  { blockType: "section_heading", contentConfig: { text: "Prognosis" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The majority of patients — commonly cited around 70% — recover fully without treatment, and outcomes improve further with early corticosteroid treatment. Recognized prognostic factors include the completeness of paralysis at onset (complete vs. incomplete), initial House-Brackmann grade, age, and presence of diabetes — the specific strength of each factor needs citation verification before publishing.",
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl3Id,
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
