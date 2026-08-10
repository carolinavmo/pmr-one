// Carpal Tunnel Syndrome — reference disease for the Peripheral Nerve
// Entrapment family, authored from the new template. Two specific
// things under test here, beyond the usual process:
//   1. Electrodiagnostics — this family's primary diagnostic modality
//      has no Knowledge Object or Editorial Block type yet. Resolved
//      as narrative prose, deliberately not building new
//      infrastructure on a single occurrence (same discipline as
//      warning_pitfall).
//   2. Cross-FAMILY reuse, not just cross-disease within one family —
//      Diabetes mellitus and Pregnancy were created for Bell's Palsy
//      (Cranial Neuropathy family); Obesity was created for Plantar
//      Fasciopathy/Achilles Tendinopathy (Tendinopathy family). All
//      three are genuinely risk factors for CTS too. Reusing them
//      here is a materially stronger test than the within-family
//      reuse already proven — see LESSONS_LEARNED.md for the result.
//
// Same discipline throughout: status 'draft', no fabricated review,
// no fabricated pearl attribution, numeric claims hedged where
// confidence is genuinely limited.
//
// Usage: node db/seed/carpal-tunnel-syndrome.mjs
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

const diseaseName = "Carpal Tunnel Syndrome";
const diseaseSlug = slugify(diseaseName);

const diseaseId = await findOrCreate(pool, "disease", "canonical_name", diseaseName, {
  canonical_name: diseaseName,
  aliases: ["Median Nerve Entrapment at the Wrist", "G56.0"],
  slug: diseaseSlug,
  status: "draft",
});
await pool.query(`UPDATE disease SET slug = $1 WHERE id = $2`, [diseaseSlug, diseaseId]);

const { rows: templateRows } = await pool.query(
  `SELECT id FROM editorial_template WHERE name = 'Peripheral Nerve Entrapment Template'`
);
const templateId = templateRows[0].id;
const copiedCount = await instantiateTemplate(pool, templateId, diseaseId);
console.log(`Instantiated ${copiedCount} placeholder blocks from the Peripheral Nerve Entrapment Template.`);

// ---------- Anatomy Structures ----------

const medianNerveId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Median nerve", {
  canonical_name: "Median nerve",
  region: "Wrist/hand",
});

const carpalTunnelId = await findOrCreate(pool, "anatomy_structure", "canonical_name", "Carpal tunnel", {
  canonical_name: "Carpal tunnel",
  region: "Wrist — osteofibrous canal bounded by the carpal bones and transverse carpal ligament",
});

// ---------- Examination Maneuvers ----------

const phalenId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Phalen's test", {
  canonical_name: "Phalen's test",
  technique: "Hold the wrist in maximal flexion (or oppose the dorsal surfaces of both hands) for 60 seconds.",
  positive_finding: "Reproduction of numbness or tingling in the median nerve distribution (thumb, index, middle, and radial half of the ring finger).",
  anatomy_structure_id: medianNerveId,
  status: "draft",
});

const tinelWristId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Tinel's sign at the wrist", {
  canonical_name: "Tinel's sign at the wrist",
  technique: "Percuss over the median nerve at the volar wrist crease.",
  positive_finding: "Tingling or paresthesia radiating into the median nerve distribution.",
  anatomy_structure_id: medianNerveId,
  status: "draft",
});

const durkanId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Durkan's compression test", {
  canonical_name: "Durkan's compression test",
  aliases: ["Carpal compression test"],
  technique: "Apply direct thumb pressure over the carpal tunnel for approximately 30 seconds.",
  positive_finding: "Reproduction of numbness or tingling in the median nerve distribution.",
  anatomy_structure_id: medianNerveId,
  status: "draft",
});

const spurlingId = await findOrCreate(pool, "examination_maneuver", "canonical_name", "Spurling's test", {
  canonical_name: "Spurling's test",
  aliases: ["Cervical foraminal compression test"],
  technique: "With the patient's neck extended and laterally flexed toward the symptomatic side, apply gentle axial compression to the head.",
  positive_finding:
    "Reproduction of arm symptoms suggests cervical radiculopathy (e.g. C6) as an alternative or contributing diagnosis rather than isolated carpal tunnel syndrome, and should prompt cervical spine evaluation.",
  status: "draft",
});

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: phalenId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Widely taught as a supportive finding; reported sensitivity/specificity vary considerably across studies — needs citation verification before publishing.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: tinelWristId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Widely taught as a supportive finding; generally considered less sensitive than Phalen's or Durkan's — needs citation verification before publishing.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: durkanId,
    disease_id: diseaseId,
    relationship_type: "confirms",
    sensitivity: null,
    specificity: null,
    evidence_strength: "Some studies report better accuracy than Phalen's/Tinel's — needs citation verification before publishing.",
    confidence: "unverified",
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

await upsertRelationship(
  pool,
  "maneuver_disease_relationship",
  {
    examination_maneuver_id: spurlingId,
    disease_id: diseaseId,
    relationship_type: "rules_out",
    sensitivity: null,
    specificity: null,
    evidence_strength: "A positive result should prompt consideration of cervical radiculopathy as an alternative or coexisting diagnosis.",
    confidence: null,
    reference_id: null,
  },
  ["examination_maneuver_id", "disease_id", "relationship_type"]
);

// ---------- Risk Factors ----------
// Deliberately reusing three risk factors created for OTHER families —
// Diabetes mellitus and Pregnancy from Bell's Palsy (Cranial
// Neuropathy), Obesity from Plantar Fasciopathy/Achilles Tendinopathy
// (Tendinopathy). If findOrCreate resolves all three to the existing
// rows, that's cross-family reuse proven, not just cross-disease
// within one family. Verified empirically below, not just asserted.

const diabetesId = await findOrCreate(pool, "risk_factor", "canonical_name", "Diabetes mellitus", {
  canonical_name: "Diabetes mellitus",
  status: "draft",
});

const pregnancyId = await findOrCreate(pool, "risk_factor", "canonical_name", "Pregnancy (particularly third trimester or postpartum)", {
  canonical_name: "Pregnancy (particularly third trimester or postpartum)",
  status: "draft",
});

const obesityId = await findOrCreate(pool, "risk_factor", "canonical_name", "Obesity", {
  canonical_name: "Obesity",
  aliases: ["Elevated BMI"],
  status: "draft",
});

const hypothyroidismId = await findOrCreate(pool, "risk_factor", "canonical_name", "Hypothyroidism", {
  canonical_name: "Hypothyroidism",
  status: "draft",
});

const repetitiveWristMotionId = await findOrCreate(
  pool,
  "risk_factor",
  "canonical_name",
  "Repetitive wrist motion or vibration exposure",
  { canonical_name: "Repetitive wrist motion or vibration exposure", status: "draft" }
);

for (const riskFactorId of [diabetesId, pregnancyId, obesityId, hypothyroidismId, repetitiveWristMotionId]) {
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
  "Corticosteroid injection, carpal tunnel",
  {
    canonical_name: "Corticosteroid injection, carpal tunnel",
    indication: "Persistent symptoms despite an adequate trial of splinting and activity modification.",
    technique: "Injection into the carpal tunnel, typically ulnar to the palmaris longus tendon (or ultrasound-guided), avoiding direct nerve puncture.",
    anatomy_structure_id: carpalTunnelId,
    status: "draft",
  }
);

// ---------- Treatment Algorithms ----------

const conservativeAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Conservative-first pathway",
  { canonical_name: "Conservative-first pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [conservativeAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL),
   ($1, 3, $4, $5, $6)`,
  [
    conservativeAlgorithmId,
    "Initiate night splinting in a neutral wrist position, and address ergonomic/activity contributors.",
    "Reassess at approximately 6 weeks.",
    "Consider a corticosteroid injection into the carpal tunnel.",
    "no meaningful improvement at 6 weeks",
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
    patient_subgroup: "Mild to moderate symptoms, no significant motor involvement",
  },
  ["treatment_algorithm_id", "disease_id"]
);

const surgicalAlgorithmId = await findOrCreate(
  pool,
  "treatment_algorithm",
  "canonical_name",
  "Surgical release pathway",
  { canonical_name: "Surgical release pathway", status: "draft" }
);

await pool.query(`DELETE FROM treatment_algorithm_step WHERE algorithm_id = $1`, [surgicalAlgorithmId]);
await pool.query(
  `INSERT INTO treatment_algorithm_step (algorithm_id, step_order, instruction, branch_condition, procedure_id) VALUES
   ($1, 1, $2, NULL, NULL),
   ($1, 2, $3, NULL, NULL)`,
  [
    surgicalAlgorithmId,
    "Confirm persistent symptoms despite conservative management, or the presence of thenar weakness/atrophy indicating more significant nerve compromise.",
    "Refer for carpal tunnel release (open or endoscopic).",
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
    patient_subgroup: "Persistent symptoms after conservative management, or significant motor involvement at presentation",
  },
  ["treatment_algorithm_id", "disease_id"]
);

// ---------- Rehabilitation Protocol ----------

const rehabProtocolId = await findOrCreate(
  pool,
  "rehabilitation_protocol",
  "canonical_name",
  "Post-release nerve and tendon gliding progression",
  { canonical_name: "Post-release nerve and tendon gliding progression", status: "draft" }
);

const exercises = [
  {
    name: "Median nerve gliding exercises",
    instructions: "A sequence of wrist/finger positions that progressively glide the median nerve through the carpal tunnel, performed gently and without forcing through pain.",
  },
  {
    name: "Tendon gliding exercises",
    instructions: "A sequence of hand positions (straight, hook, fist, tabletop, full fist) that glide the flexor tendons through their full range.",
  },
  {
    name: "Progressive grip strengthening",
    instructions: "Introduced once acute post-procedural or post-surgical tenderness has resolved, progressing gradually.",
  },
];

const exerciseIds = [];
for (const exercise of exercises) {
  const id = await findOrCreate(pool, "exercise", "canonical_name", exercise.name, {
    canonical_name: exercise.name,
    instructions: exercise.instructions,
    anatomy_structure_id: medianNerveId,
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
  "Thenar eminence wasting or weakness is a late, concerning sign indicating more significant or chronic nerve compression — don't wait for motor findings before starting treatment.";
const pearl2Body =
  "Electrodiagnostic severity doesn't always correlate closely with symptom severity — treat the patient's symptoms and exam, not the study result in isolation.";
const pearl3Body =
  "Consider cervical radiculopathy and thoracic outlet syndrome in atypical presentations, especially when symptoms don't map cleanly onto the median nerve distribution.";

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
    authors: "Atroshi I, Gummesson C, Johnsson R, et al.",
    title: "Prevalence of carpal tunnel syndrome in a general population",
    journal: "JAMA",
    publication_year: 1999,
    evidence_type: "Epidemiological / cross-sectional",
  },
  {
    authors: "Gerritsen AA, de Vet HC, Scholten RJ, et al.",
    title: "Splinting vs surgery in the treatment of carpal tunnel syndrome: a randomized controlled trial",
    journal: "JAMA",
    publication_year: 2002,
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

// ---------- Medical Illustration ----------

const medianNerveIllustrationId = await findOrCreate(
  pool,
  "medical_illustration",
  "title",
  "Median nerve anatomy at the wrist",
  {
    title: "Median nerve anatomy at the wrist",
    asset_url: "/placeholder-illustration.svg",
    alt_text:
      "Cross-sectional diagram of the carpal tunnel showing the median nerve, flexor tendons, and transverse carpal ligament, with the recurrent motor branch to the thenar muscles annotated.",
    style: "line_diagram",
    status: "draft",
  }
);

await linkIfNotExists(pool, "illustration_usage", {
  medical_illustration_id: medianNerveIllustrationId,
  target_type: "disease",
  target_id: diseaseId,
});

for (const anatomyId of [medianNerveId, carpalTunnelId]) {
  await linkIfNotExists(pool, "illustration_depicts_anatomy", {
    medical_illustration_id: medianNerveIllustrationId,
    anatomy_structure_id: anatomyId,
  });
}

console.log("Knowledge Objects seeded.");

// ---------- Editorial Blocks ----------
// Follows the Peripheral Nerve Entrapment Template's order.
// Electrodiagnostics is a plain paragraph, matching the template's own
// guidance — no Knowledge Object exists for structured EMG/NCS
// findings yet. "Return to Work" kept as-is (not renamed) — this
// disease's typical patient population genuinely is occupational, not
// athletic, so the template's default label fit without needing the
// per-disease override the label-variant design allows for.

await replaceBlocks(pool, diseaseId, [
  { blockType: "section_heading", contentConfig: { text: "Overview" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Carpal tunnel syndrome is a compressive neuropathy of the median nerve as it passes through the carpal tunnel at the wrist. It's the most common entrapment neuropathy, presenting with numbness, tingling, and eventually weakness in the median nerve distribution — thumb, index, middle, and radial half of the ring finger.",
      callout: true,
      learningObjective: "Recognize the median nerve distribution and distinguish it from a cervical or more diffuse process.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Clinical Presentation" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Patients classically report nocturnal numbness and tingling in the thumb, index, and middle fingers, often waking them from sleep and improving with shaking the hand (\"flick sign\"). Symptoms are frequently worse with sustained wrist flexion or extension — gripping a steering wheel, holding a phone, or typing. As compression progresses, weakness and clumsiness with fine motor tasks (e.g. buttoning a shirt) can develop.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Anatomy" } },
  {
    blockType: "medical_illustration",
    referencedObjectType: "medical_illustration",
    referencedObjectId: medianNerveIllustrationId,
    contentConfig: {
      caption: "Median nerve anatomy at the wrist — cross-section through the carpal tunnel.",
      annotations: [
        { label: "Median nerve", x: 50, y: 30 },
        { label: "Transverse carpal ligament (roof of the tunnel)", x: 25, y: 55 },
        { label: "Flexor tendons", x: 70, y: 60 },
        { label: "Recurrent motor branch to thenar muscles", x: 50, y: 85 },
      ],
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Pathophysiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Increased pressure within the carpal tunnel — from tenosynovial thickening, fluid retention, or a smaller anatomic canal — compresses the median nerve against the transverse carpal ligament. Sustained pressure above capillary perfusion pressure produces nerve ischemia, initially causing intermittent, positionally-provoked symptoms and, if prolonged, progressive demyelination and axonal injury.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Biomechanics" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Repetitive or sustained wrist flexion and extension, forceful grip, and vibration exposure (e.g. power tool use) increase intracarpal pressure and are recognized occupational contributors. Wrist positioning during typing, driving, or manual work is a common, modifiable factor.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Epidemiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Carpal tunnel syndrome is the most common entrapment neuropathy. Recognized risk factors include diabetes mellitus, hypothyroidism, pregnancy (particularly the third trimester, from fluid retention), obesity, and repetitive wrist motion or vibration exposure — several of these (diabetes, obesity) are shared risk factors with other conditions in this platform, reflecting genuinely overlapping systemic contributors rather than coincidence.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Exam" } },
  {
    blockType: "examination_workflow",
    contentConfig: { maneuver_ids: [phalenId, tinelWristId, durkanId, spurlingId] },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl1Id,
  },
  { blockType: "section_heading", contentConfig: { text: "Electrodiagnostics" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Nerve conduction studies are the primary confirmatory test, typically showing prolonged distal motor and sensory latencies across the wrist, and in more severe cases reduced amplitudes or active denervation on needle EMG of thenar muscles. Electrodiagnostic testing is particularly useful when the diagnosis is uncertain, symptoms are atypical, or surgery is being considered — it is not required to initiate conservative treatment in a classic presentation.",
    },
  },
  {
    blockType: "clinical_pearl",
    referencedObjectType: "clinical_pearl_editorial",
    referencedObjectId: pearl2Id,
  },
  { blockType: "section_heading", contentConfig: { text: "Diagnostic Imaging" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Imaging is not required for a typical presentation. Ultrasound can show an enlarged median nerve cross-sectional area at the wrist and is sometimes used as a supportive or alternative test to electrodiagnostics; MRI is reserved for atypical cases or when a structural mass lesion is suspected.",
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
  { blockType: "section_heading", contentConfig: { text: "Rehab" } },
  {
    blockType: "rehabilitation_progression",
    referencedObjectType: "rehabilitation_protocol",
    referencedObjectId: rehabProtocolId,
  },
  { blockType: "section_heading", contentConfig: { text: "Return to Work" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Ergonomic modification (neutral wrist positioning, activity breaks, equipment adjustment) should be addressed alongside medical treatment, not deferred until after it. Following surgical release, most patients return to light activity within days to a few weeks and to unrestricted manual work over 6-12 weeks, depending on occupational demands.",
    },
  },
  { blockType: "section_heading", contentConfig: { text: "Prognosis" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Outcomes are generally good, particularly with early treatment before significant motor involvement develops. Surgical release has high rates of symptom improvement, though sensory recovery can lag behind pain relief, and long-standing severe compression with thenar atrophy carries a less complete recovery — the specific strength of these prognostic factors needs citation verification before publishing.",
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
