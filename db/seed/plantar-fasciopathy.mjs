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

// Matched by slug, not canonical_name: "plantar-fasciopathy-v2" has the
// same canonical_name ("Plantar Fasciopathy") as this disease, so
// matching on canonical_name would silently grab v2's row and overwrite
// its blocks. slug is the only key that actually distinguishes the two.
const diseaseId = await findOrCreate(pool, "disease", "slug", diseaseSlug, {
  canonical_name: diseaseName,
  aliases: ["Plantar Fasciitis", "Jogger's Heel", "M72.2"],
  slug: diseaseSlug,
  status: "draft",
});

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
// Rebuilt from the "Plantar Fasciopathy — Resident Teaching Module"
// docx, restricted to exactly four block types at the founder's
// explicit request: section_heading, paragraph, highlight_card (the
// module's own "Key takeaways" boxes), and rich_table (the module's
// three genuine tables: exam maneuvers, differential diagnosis, and
// the treatment ladder). The Knowledge Objects/relationships created
// above are untouched and still available to re-embed later.
const KEY_TAKEAWAY_COLOR = "insight";

await replaceBlocks(pool, diseaseId, [
  // ---- 1. Overview (source: "Plantar Fasciopathy in 60 Seconds") ----
  { blockType: "section_heading", contentConfig: { text: "Overview" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar fasciopathy is the most common cause of inferior heel pain. Despite the old name \"fasciitis,\" it is a degenerative overload disorder of the plantar aponeurosis at its origin on the medial calcaneal tuberosity — not true inflammation.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Think load exceeding tissue capacity. In the sedentary middle-aged patient the driver is high BMI and prolonged standing; in the athlete it is running volume and training error. Reduced ankle dorsiflexion (a tight calf) is a key modifiable contributor.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The history is classic: first-step pain — sharp inferomedial heel pain with the first steps in the morning or after rest, easing as the patient warms up and returning after prolonged standing. On exam: focal tenderness at the fascial origin and a positive windlass test.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Diagnosis is clinical. Image only if atypical, bilateral, or refractory (ultrasound: fascia > 4 mm). Management is stepwise and conservative: education and load management, plantar-fascia and calf stretching, foot orthoses, night splints, and progressive loading. Reserve shockwave for chronic cases, corticosteroid injection for short-term rescue (used sparingly), and surgery for the ~5% who fail 6-12 months of good care.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Reassure the patient: 80-90% recover within 12 months. Red flag — bilateral or inflammatory heel pain in a young patient should prompt a search for spondyloarthropathy.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Degenerative enthesopathy of the plantar fascia at the medial calcaneal origin — not an \"-itis.\"",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Hallmark = first-step pain + focal medial heel tenderness + positive windlass test; diagnosis is clinical.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Treat with stepwise conservative care built on load management and progressive loading; most recover within a year.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 2. Definition & Terminology ----
  { blockType: "section_heading", contentConfig: { text: "Definition & Terminology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar fasciopathy is a painful degenerative disorder of the plantar aponeurosis (plantar fascia), most often affecting its proximal insertion (enthesis) at the medial calcaneal tuberosity. It is the single most common cause of inferior heel pain in adults.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The traditional term \"plantar fasciitis\" implies inflammation, but histology of chronic cases shows a non-inflammatory, degenerative picture — collagen disorganisation, mucoid degeneration, microtears and angiofibroblastic hyperplasia, with few or no acute inflammatory cells. For this reason \"plantar fasciopathy\" or \"plantar fasciosis\" are more accurate, paralleling the move from \"tendinitis\" to \"tendinopathy.\" Some low-grade inflammatory signalling probably occurs early, so it is best seen as a spectrum weighted toward degeneration.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Distinguish the terms: \"plantar heel pain\" is the broad umbrella that includes plantar fasciopathy and its mimics (fat-pad atrophy, Baxter neuropathy, calcaneal stress fracture). Teaching residents this distinction early prevents labelling every inferior heel pain as \"fasciitis.\"",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "It is a degenerative enthesopathy, so the accurate term is fasciopathy/fasciosis rather than fasciitis.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The name matters clinically: a degenerative process responds to loading, not to anti-inflammatory cure.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "\"Plantar heel pain\" is the umbrella term; fasciopathy is its commonest — but not only — cause.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 3. Epidemiology ----
  { blockType: "section_heading", contentConfig: { text: "Epidemiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Affects roughly 10% of people across a lifetime; the commonest cause of plantar heel pain and of over 1 million clinical visits per year in the United States.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Peak incidence is 40-60 years in the general population; it is also one of the most frequent overuse injuries in runners (roughly 8-17% of running injuries).",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Two risk profiles emerge: body mass and prolonged standing dominate in non-athletes (high BMI is a strong risk factor), while training load and errors dominate in athletes, where the BMI association disappears.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Bilateral involvement occurs in up to a third of cases. Bilateral, young, or inflammatory presentations should raise suspicion of a seronegative spondyloarthropathy.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Extremely common — expect to see it regularly in any musculoskeletal clinic.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The dominant risk factor shifts from body mass (non-athletes) to training load (athletes).",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Bilateral or inflammatory heel pain in a young patient should prompt screening for spondyloarthropathy.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 4. Relevant Anatomy ----
  { blockType: "section_heading", contentConfig: { text: "Relevant Anatomy" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The plantar aponeurosis is a strong sheet of longitudinally arranged type-I collagen running from the calcaneus to the forefoot, described in three bands. The central band is thickest and clinically most important: it arises from the medial process of the calcaneal tuberosity and splits distally into five slips inserting into the plantar plates, flexor sheaths, and bases of the proximal phalanges. The medial band is thin and overlies abductor hallucis; the lateral band overlies abductor digiti minimi and is variable in thickness.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Key relations for the differential diagnosis: the fascia is continuous with the Achilles tendon via the calcaneal periosteum and paratenon, so calf tightness raises fascial load; deep to the medial origin lie the first branch of the lateral plantar nerve (the Baxter nerve) and the calcaneal fat pad. The \"heel spur\" is a traction enthesophyte in the flexor digitorum brevis origin — usually an incidental finding, not the pain source.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The central band from the medial calcaneal tuberosity is the structure that hurts.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Achilles-fascia continuity explains why a tight calf drives plantar fasciopathy — and why calf stretching helps.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The heel spur is usually incidental; do not attribute the pain to it.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 5. Biomechanics ----
  { blockType: "section_heading", contentConfig: { text: "Biomechanics" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The plantar fascia is the main passive stabiliser of the medial longitudinal arch. Its function is best understood through the windlass mechanism (Hicks, 1954): at push-off, dorsiflexion of the toes (metatarsophalangeal joints) winds the fascia around the metatarsal heads, shortening the calcaneus-to-forefoot distance, raising the arch, and converting the foot into a rigid lever for efficient propulsion.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "With each step the fascia absorbs ground-reaction forces reaching multiples of body weight, with peak tensile strain at the calcaneal enthesis — exactly where symptoms arise. Factors that increase fascial strain include reduced ankle dorsiflexion (gastrocsoleus/Achilles tightness, i.e. equinus), excessive or prolonged pronation, pes cavus (a rigid, poorly shock-absorbing arch), and reduced first-metatarsophalangeal extension.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Clinical corollary: the windlass is both the mechanism of injury and a therapeutic tool — loading exercises performed with the toes dorsiflexed deliberately recruit the windlass to strengthen the fascia.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The windlass mechanism tensions the fascia at push-off; peak strain sits at the calcaneal enthesis.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Limited ankle dorsiflexion and abnormal foot posture raise fascial load — both are modifiable targets.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The same windlass is used therapeutically: load with the toes dorsiflexed to build fascial capacity.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 6. Pathophysiology ----
  { blockType: "section_heading", contentConfig: { text: "Pathophysiology" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The central mechanism is repetitive microtrauma with failed healing. Cyclical tensile overload produces microtears at the enthesis; when mechanical load chronically exceeds the tissue's reparative capacity, damage accumulates instead of resolving.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Histology of chronic disease shows degeneration, not inflammation — four features worth memorising: collagen disorganisation, meaning loss of the tight parallel fibre architecture and of tensile strength; myxoid (mucoid) degeneration, an accumulation of ground substance that makes the tissue appear gelatinous; angiofibroblastic hyperplasia, fibroblast proliferation with disorganised neovascularisation as a failed, chronic repair response; and a relative absence of acute inflammatory cells in chronic cases — hence \"not a true itis.\"",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The neovessels drag nociceptive nerve fibres in with them (neural ingrowth), helping explain persistent pain in chronic disease. The unifying model is a load-capacity mismatch: symptoms appear when cumulative load (body mass, standing hours, running, tight calf, foot posture) outstrips current tissue capacity. This directly justifies management — offload transiently, then rebuild capacity with progressive loading; anti-inflammatories relieve symptoms but do not repair the tissue.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "It is failed healing and degeneration, not active inflammation.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Frame it as load exceeding tissue capacity — the model that explains both cause and cure.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Because the tissue must be rebuilt, progressive loading — not anti-inflammation — is the definitive treatment.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 7. Clinical Presentation ----
  { blockType: "section_heading", contentConfig: { text: "Clinical Presentation" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Insidious sharp, localised inferomedial heel pain over the medial calcaneal tuberosity. The classic \"first-step\" pain (post-static dyskinesia) is worst with the first steps after waking or after prolonged sitting, easing after a few minutes as the fascia warms and lengthens.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Pain returns and worsens with prolonged standing or activity later in the day (a \"U-shaped\" daily pattern); it is aggravated by barefoot walking, hard surfaces, tip-toe, and stairs.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Presentation is usually unilateral; chronic cases may ache or burn. Night pain, numbness, or paraesthesia point away from fasciopathy and toward a neural or other cause.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "First-step pain that eases with warm-up and returns after prolonged standing is the signature history.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Pain is focal and inferomedial at the fascial origin, usually unilateral.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Numbness, tingling, or night pain should redirect you to the differential diagnosis.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 8. Physical Examination ----
  { blockType: "section_heading", contentConfig: { text: "Physical Examination" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The exam confirms the diagnosis and, just as importantly, excludes mimics.",
    },
  },
  {
    blockType: "rich_table",
    contentConfig: {
      title: "Examination maneuvers",
      columns: [
        { title: "Test / manoeuvre", type: "text" },
        { title: "How to perform", type: "text" },
        { title: "Positive / relevant finding", type: "text" },
      ],
      rows: [
        { cells: ["Focal palpation", "Palpate the medial calcaneal tuberosity and proximal fascia.", "Reproduces the patient's maximal pain at the fascial origin."] },
        { cells: ["Windlass test", "Passively dorsiflex the first MTP joint — ideally weight-bearing with the toe on a step edge.", "Reproduction of heel pain; specific, though not highly sensitive."] },
        { cells: ["Ankle dorsiflexion (Silfverskiöld)", "Compare dorsiflexion with the knee extended vs flexed.", "Limited dorsiflexion / gastrocnemius equinus — a modifiable driver."] },
        { cells: ["Tinel over Baxter nerve", "Tap over the first branch of the lateral plantar nerve (inferomedial heel).", "Radiating/burning paraesthesia → neural entrapment, not fasciopathy."] },
        { cells: ["Calcaneal squeeze", "Medial-lateral compression of the calcaneus.", "Pain → suspect calcaneal stress fracture instead."] },
        { cells: ["Foot posture & gait", "Assess pronation/pes planus/pes cavus and footwear wear pattern.", "Identifies biomechanical contributors to target in rehab."] },
      ],
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Point tenderness at the fascial origin plus a positive windlass test is the core positive exam.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Always test ankle dorsiflexion — equinus is common, modifiable, and drives recurrence.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Use Tinel and calcaneal squeeze to actively rule out Baxter neuropathy and calcaneal stress fracture.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 9. Diagnosis, Imaging & Differential ----
  { blockType: "section_heading", contentConfig: { text: "Diagnosis, Imaging & Differential" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar fasciopathy is a clinical diagnosis. The 2023 CPG diagnostic cluster: medial heel pain worst with the first steps and after prolonged weight-bearing, a recent increase in weight-bearing activity, tenderness at the proximal fascia, a positive windlass test, negative tarsal-tunnel tests, limited ankle dorsiflexion, abnormal foot posture, and — in non-athletes — high BMI.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Reserve imaging for diagnostic uncertainty, atypical features (bilateral, young, systemic symptoms, trauma), or failure of at least six months of conservative care. Ultrasound is first-line: hypoechoic, thickened fascia, with a proximal thickness greater than 4 mm supporting the diagnosis (normal roughly 3-4 mm or less); it may show hypoechoic foci or Doppler neovascularity. MRI is reserved for refractory or unclear cases — fascial thickening with increased T2/STIR signal and perifascial or marrow oedema — and is best for detecting rupture, stress fracture, or tumour. Radiographs are not diagnostic; a plantar spur is common in both symptomatic and asymptomatic feet, and radiographs are used mainly to exclude bony pathology.",
    },
  },
  {
    blockType: "rich_table",
    contentConfig: {
      title: "Differential diagnosis",
      columns: [
        { title: "Category", type: "text" },
        { title: "Consider", type: "text" },
      ],
      rows: [
        { cells: ["Soft tissue", "Fat-pad atrophy/contusion; plantar fascia rupture; plantar fibromatosis (Ledderhose); FHL/Achilles tendinopathy."] },
        { cells: ["Bone", "Calcaneal stress fracture; calcaneal apophysitis (Sever disease, children); subtalar arthritis; tumour/cyst."] },
        { cells: ["Neurological", "Baxter neuropathy; tarsal tunnel syndrome; S1 radiculopathy; peripheral neuropathy."] },
        { cells: ["Systemic / inflammatory", "Seronegative spondyloarthropathies (reactive, psoriatic, ankylosing spondylitis) — suspect if bilateral/young/inflammatory."] },
      ],
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Diagnose clinically using the history and exam cluster; negative tarsal-tunnel tests are part of it.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Image only for atypical or refractory cases — ultrasound first (fascia > 4 mm).",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Keep the four differential buckets in mind: soft tissue, bone, nerve, and systemic.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 10. Treatment — Overview & Medical Management ----
  { blockType: "section_heading", contentConfig: { text: "Treatment — Overview & Medical Management" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Management is stepwise and predominantly conservative. Because most cases are self-limiting, first-line care combines education, load management, and mechanical support; escalation is reserved for persistent symptoms. Set expectations early — recovery is measured in months.",
    },
  },
  {
    blockType: "rich_table",
    contentConfig: {
      title: "Treatment ladder",
      columns: [
        { title: "Tier", type: "text" },
        { title: "Interventions", type: "text" },
        { title: "Notes / evidence", type: "text" },
      ],
      rows: [
        { cells: ["1. First line (0-6 wk)", "Education & relative rest; activity/load modification; plantar-fascia + calf stretching; supportive footwear; taping; short-course NSAIDs/ice.", "Foundation of care; stretching has strong CPG support. Analgesia controls symptoms only."] },
        { cells: ["2. Second line (6 wk-6 mo)", "Foot orthoses (prefabricated or custom); night splints; progressive/high-load strength training; manual therapy.", "Mechanical support plus capacity building. Orthoses best combined with exercise, not alone."] },
        { cells: ["3. Third line (≥3-6 mo)", "Extracorporeal shockwave therapy (ESWT); corticosteroid injection; PRP (selected).", "ESWT is best-supported for chronic disease. Steroid is short-term only, risks fat-pad atrophy/rupture."] },
        { cells: ["4. Fourth line (>6-12 mo)", "Gastrocnemius recession (if equinus) or partial plantar fasciotomy.", "Only the refractory ~5%. Avoid complete release — it destabilises the arch."] },
      ],
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Extracorporeal shockwave therapy is the best-supported option for recalcitrant disease; it improves pain and function versus placebo and, in recent meta-analysis, matches or exceeds corticosteroid injection with a more durable effect and few adverse events.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Ultrasound-guided corticosteroid injection gives effective short-term relief (up to roughly 4-6 weeks) but no sustained benefit, and risks plantar fat-pad atrophy and fascial rupture — use sparingly.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Platelet-rich plasma (PRP) may be more durable than corticosteroid in some trials, but evidence is heterogeneous; botulinum toxin and prolotherapy remain investigational.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Surgery is reserved for the small refractory minority after at least six to twelve months of good conservative care: gastrocnemius recession when equinus is the driver, or partial (not complete) plantar fasciotomy.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Follow the ladder: most patients improve on tiers 1-2 combined over 3-6 months.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "ESWT is the preferred procedure for chronic cases; corticosteroid is a sparingly-used short-term rescue.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Re-examine every non-responder for a missed diagnosis before escalating to injection or surgery.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 11. Rehabilitation Program ----
  { blockType: "section_heading", contentConfig: { text: "Rehabilitation Program — Prescription for the Physical Therapist" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "This chapter is written as a PM&R physician's referral to physiotherapy: a phased, criteria-based programme built on the best-supported interventions — education, stretching, progressive loading, manual therapy, orthoses/night splints. Progress by clinical milestones, not fixed dates. The two evidence anchors are the DiGiovanni plantar-fascia-specific stretch and the Rathleff high-load strength-training protocol.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Overall goals: reduce pain and restore normal weight-bearing and gait; restore ankle dorsiflexion and first-MTP extension to reduce fascial load; rebuild plantar-fascia and calf/intrinsic muscle capacity so the tissue tolerates daily and sport loads; and correct modifiable drivers — footwear, training error, body mass — to prevent recurrence.",
    },
  },

  { blockType: "section_heading", contentConfig: { text: "Phase 1 — Pain-Dominant / Offload (approx. weeks 0-2+)" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Goals: settle pain, protect the tissue, begin gentle stretching. Education and load management: explain the benign, self-limiting, load-related nature; reduce (do not abolish) aggravating loads; relative rest from provocative running or standing.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar-fascia-specific stretch (DiGiovanni): seated, cross the affected foot over the opposite knee; pull the toes back into dorsiflexion until a stretch is felt in the arch; verify the taut band. Hold 10 seconds x 10 repetitions, three times a day — critically, before the first steps in the morning and before standing after rest. Pair with a gastrocnemius-soleus stretch (wall/step stretch, knee straight and knee bent), 30 seconds x 3, two to three times a day.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Manual therapy (therapist-delivered): soft-tissue mobilisation of the calf/plantar tissues and talocrural/subtalar joint mobilisation to restore dorsiflexion. Symptom control: ice or rolling a cold bottle under the arch after activity; supportive, cushioned footwear; antipronation taping (rigid or elastic) for short-term relief. A night splint — holding the ankle in slight dorsiflexion overnight for a one-to-three-month course — is useful if morning first-step pain is prominent.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Milestone to advance: morning pain and first-step pain clearly improving, able to tolerate arch loading without a flare.",
    },
  },

  { blockType: "section_heading", contentConfig: { text: "Phase 2 — Loading / Capacity-Building (from ~week 2-3 onward)" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Goals: rebuild fascial and calf capacity with progressive high-load exercise — the core of recovery.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "High-load strength training (Rathleff protocol): unilateral standing heel-raise on a step with a rolled towel under the toes, which maximises MTP dorsiflexion and recruits the windlass. Tempo: 3 seconds up, 2 seconds hold at the top, 3 seconds down; performed every second day. Progress load in a backpack — weeks 1-2 at 3 sets of 12RM, weeks 3-4 at 4 sets of 10RM, from week 5 at 5 sets of 8RM. Some discomfort is acceptable; sharp pain is not.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Intrinsic foot strengthening (the \"short-foot\" exercise and toe-flexion work such as towel scrunches and toe-spread) supports the arch. Progressive calf strengthening moves from bilateral to unilateral heel raises through full range, adding seated (soleus-biased) raises. Continue Phase 1 stretching and address hip/kinetic-chain deficits and balance/proprioception as needed. Instrument-assisted soft-tissue mobilisation (for example Graston or ART) or trigger-point work may aid pain in the short term as an optional adjunct to loading.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Milestone to advance: minimal pain with daily loading, pain-free single-leg heel raises, restored dorsiflexion.",
    },
  },

  { blockType: "section_heading", contentConfig: { text: "Phase 3 — Return to Activity & Prevention (typically after ~6-12 weeks)" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Goals: reintroduce impact and sport, and lock in maintenance. Graded return to running or impact: increase volume gradually (no more than roughly 10% per week); introduce plyometrics or hopping only once strength and pain-free loading allow.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Maintenance: continue heel-raise strengthening and calf/fascia stretching two to three times a week long-term; retain orthoses or supportive footwear if helpful. Relapse prevention: monitor training load, footwear condition, dorsiflexion, and body mass; resume loading promptly at early symptom return.",
    },
  },

  { blockType: "section_heading", contentConfig: { text: "Sample Physiotherapy Referral" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Dx: Plantar fasciopathy (M72.2). Confirmed clinically (first-step pain, focal medial calcaneal tenderness, positive windlass). Goals: reduce pain; restore ankle dorsiflexion; rebuild fascial/calf capacity; return to walking/standing/running as appropriate; prevent recurrence.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Rx: Phased, criteria-based programme — education and load management; DiGiovanni plantar-fascia stretch plus calf stretch; manual therapy; taping with or without a night splint; then the Rathleff high-load heel-raise progression (alternate days) plus intrinsic/calf strengthening; graded return to impact.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Dose: home programme daily; supervised sessions roughly once a week for six to twelve weeks; progress by milestones, not dates. Precautions: no sharp pain during loading; avoid using ultrasound to enhance stretching; reassess if no progress by 6-8 weeks (consider ESWT, re-imaging, or reconsidering the diagnosis).",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The programme is phased and milestone-driven: offload and settle pain first, then progressively load to rebuild capacity, then return to sport.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Two evidence anchors: the DiGiovanni plantar-fascia-specific stretch (10s x 10, 3x/day, before first steps) and the Rathleff alternate-day high-load heel-raise with a towel under the toes.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Correct the drivers — calf tightness, footwear, training load, body mass — and prescribe long-term maintenance to prevent relapse.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 12. Prognosis ----
  { blockType: "section_heading", contentConfig: { text: "Prognosis" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Favourable and largely self-limiting: about 80-90% recover within 12 months with conservative care (StatPearls cites roughly 75% resolving spontaneously within a year).",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "A minority become chronic, beyond 12 months; longer symptom duration and higher BMI predict slower recovery. Only about 5% ultimately require surgery.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Recurrence is possible; maintenance loading, stretching, weight control, and good footwear reduce the risk.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Reassure: the large majority recover within a year with good conservative care.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Longer duration and higher BMI predict slower recovery and warrant closer follow-up.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Prevent relapse with ongoing loading, stretching, and attention to footwear and load.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 13. Clinical Practice Guidelines & Key Takeaways ----
  { blockType: "section_heading", contentConfig: { text: "Clinical Practice Guidelines & Key Takeaways" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "A note on sources for the physiatrist: there is no clinical practice guideline issued specifically by a Physical Medicine & Rehabilitation society for plantar fasciopathy. The physician-authored guidance below therefore draws on the AAPM&R (PM&R KnowledgeNow) physiatric monograph and the physician-authored ACFAS graded clinical practice guideline, complemented by NICE guidance for procedures. The widely cited APTA/JOSPT \"Heel Pain — Plantar Fasciitis\" CPG is authored by physical therapists and is deliberately not used as the basis here, although its intervention recommendations largely overlap.",
    },
  },

  { blockType: "section_heading", contentConfig: { text: "AAPM&R (PM&R KnowledgeNow) — the Physiatric Approach" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The AAPM&R monograph frames plantar fasciitis as a degenerative, largely self-limiting condition (roughly 90% resolve without surgery) and organises physiatric care into phases anchored by a whole-kinetic-chain assessment. Acute (0-4 wk): plantar-fascia plus gastrocnemius/soleus stretching; manual massage or frozen-bottle rolling; ice; NSAIDs or acetaminophen; heel cushions/cups, arch supports, and OTC or custom orthoses (equally effective initially); intrinsic-foot and lower-limb strengthening.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Subacute (4-12 wk): instrument-assisted soft-tissue techniques (for example Graston or ART); corticosteroid injection if conservative care fails (roughly one month of relief); footwear/motion-control management. Chronic or stable (>3 mo): night splints (roughly 5° dorsiflexion); ESWT (significant pain/function gain versus sham at 3-6 months); PRP, botulinum toxin, or prolotherapy as selected options; surgery only after 12 months of aggressive conservative care.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Cross-cutting principles: assess the ankle-knee-hip-core chain and tibialis posterior (a dynamic arch stabiliser); correct equinus, pes planus/cavus, forefoot varus, and leg-length discrepancy; track outcomes with the FFI, FHSQ, AOFAS hindfoot, and FAAM scales.",
    },
  },

  { blockType: "section_heading", contentConfig: { text: "ACFAS — Physician Clinical Practice Guideline" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The American College of Foot & Ankle Surgeons \"Diagnosis and Treatment of Heel Pain\" CPG gives a clean, physician-oriented stepwise pathway, graded A (strong), B (fair/moderate), C (weak), or I (insufficient/expert opinion).",
    },
  },
  {
    blockType: "rich_table",
    contentConfig: {
      title: "ACFAS graded pathway",
      columns: [
        { title: "Tier (expected response)", type: "text" },
        { title: "Recommended treatments (ACFAS grade)", type: "text" },
      ],
      rows: [
        { cells: ["Tier 1 — initial (by ~6 wk)", "Padding/strapping (B); therapeutic orthotic insoles (B); Achilles + plantar-fascia stretching (B); corticosteroid injection (B); NSAIDs (I); plus activity modification, ice, footwear advice."] },
        { cells: ["Tier 2 — if insufficient (response in 85-90% by 2-3 mo)", "Prefabricated or custom orthoses (B); night splint (B); repeat corticosteroid injection (B); physical therapy (I); botulinum toxin (I); cast/walking-boot immobilisation 4-6 wk (C); weight management if high BMI."] },
        { cells: ["Tier 3 — refractory", "ESWT (B); minimally invasive/endoscopic plantar fasciotomy (B); bipolar radiofrequency (C). Overall ~90-95% resolve within one year on this pathway."] },
      ],
    },
  },

  { blockType: "section_heading", contentConfig: { text: "NICE — Procedural Guidance" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Extracorporeal shockwave therapy for refractory plantar fasciitis (IPG311): may be used for recalcitrant cases — evidence of efficacy is adequate and there are no major safety concerns; a reasonable option before surgery.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Physician guidance converges on a stepwise, mostly conservative pathway: stretching, orthoses/footwear, night splints, and load management first; procedures only for refractory disease.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "The physiatric distinctive is the whole-kinetic-chain assessment (equinus, foot posture, tibialis posterior, hip/core) and progressive strengthening — not just local treatment of the heel.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Orthoses (custom or OTC) are similarly effective initially; corticosteroid injection gives only short-term relief and is used judiciously.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "For chronic/refractory cases the escalation is ESWT (ACFAS grade B; NICE-endorsed), then PRP/other injectables, with surgery reserved until after at least 12 months of good conservative care.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "No PM&R-society-specific CPG exists; anchor physician practice to the AAPM&R physiatric monograph plus the physician-authored ACFAS graded CPG, and NICE for ESWT.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "All physician sources agree on a stepwise conservative pathway; the physiatric value-add is kinetic-chain assessment and progressive loading, not isolated heel treatment.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Escalate refractory disease to ESWT before surgery; reserve fasciotomy/gastrocnemius recession for failure of at least 12 months of conservative care.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 14. Summary ----
  { blockType: "section_heading", contentConfig: { text: "Summary" } },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "Plantar fasciopathy is a degenerative overload enthesopathy of the plantar aponeurosis at the medial calcaneal origin — the commonest cause of inferior heel pain. The mechanism is a load-capacity mismatch producing failed healing and tissue degeneration rather than true inflammation, driven by the tensile demands of the windlass mechanism and worsened by calf tightness, abnormal foot posture, high body mass, and training error.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "It presents with first-step medial heel pain and focal tenderness at the fascial origin with a positive windlass test; diagnosis is clinical, with imaging reserved for atypical or refractory cases. Management is stepwise and conservative, built on education and load management, plantar-fascia and calf stretching, foot orthoses, night splints, and — the engine of recovery — progressive high-load strengthening. ESWT is the preferred procedure for chronic disease; corticosteroid injection is a sparing short-term rescue; surgery is reserved for the refractory ~5%.",
    },
  },
  {
    blockType: "paragraph",
    contentConfig: {
      body: "The prognosis is good — 80-90% recover within a year. The PM&R physician's highest-value contributions are an accurate clinical diagnosis (excluding mimics), correction of modifiable drivers through kinetic-chain assessment, and a well-structured, criteria-based rehabilitation prescription aligned with the physiatric (AAPM&R) and ACFAS guidance.",
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Degenerative load-related enthesopathy → treat by offloading then rebuilding capacity, not by suppressing inflammation.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Clinical diagnosis: first-step pain, focal tenderness, and a positive windlass test — rule out the mimics.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },
  {
    blockType: "highlight_card",
    contentConfig: {
      label: "Key Takeaway",
      text: "Structured, phased rehabilitation is the core PM&R deliverable; most patients recover within a year.",
      color: KEY_TAKEAWAY_COLOR,
    },
  },

  // ---- 15. References ----
  { blockType: "section_heading", contentConfig: { text: "References" } },
  {
    blockType: "rich_table",
    contentConfig: {
      title: "References",
      columns: [{ title: "Citation", type: "text" }],
      rows: [
        { cells: ["American Academy of Physical Medicine and Rehabilitation. Plantar Fasciitis. PM&R KnowledgeNow (AAPM&R). now.aapmr.org (physiatric monograph)."] },
        { cells: ["Thomas JL, Christensen JC, Kravitz SR, et al. The diagnosis and treatment of heel pain: a clinical practice guideline — revision 2010. J Foot Ankle Surg. 2010;49(3 Suppl):S1-S19. (ACFAS)."] },
        { cells: ["National Institute for Health and Care Excellence. Extracorporeal shockwave therapy for refractory plantar fasciitis. NICE Interventional Procedures Guidance IPG311; 2009."] },
        { cells: ["Buchanan BK, Sina RE, Kushner D. Plantar Fasciitis. StatPearls. Treasure Island (FL): StatPearls Publishing; 2024."] },
        { cells: ["Trojian T, Tucker AK. Plantar Fasciitis. Am Fam Physician. 2019;99(12):744-750."] },
        { cells: ["Plantar fasciopathy: a current concepts review. EFORT Open Rev. 2018;3(8):457-467. (PMID 30237906)."] },
        { cells: ["DiGiovanni BF, Nawoczenski DA, Lintal ME, et al. Tissue-specific plantar fascia-stretching exercise enhances outcomes in patients with chronic heel pain: a prospective, randomized study. J Bone Joint Surg Am. 2003;85(7):1270-1277."] },
        { cells: ["Rathleff MS, Mølgaard CM, Fredberg U, et al. High-load strength training improves outcome in patients with plantar fasciitis: a randomized controlled trial with 12-month follow-up. Scand J Med Sci Sports. 2015;25(3):e292-e300."] },
        { cells: ["Cortés-Pérez I, Moreno-Montilla L, Ibáñez-Vera AJ, et al. Efficacy of extracorporeal shockwave therapy compared to corticosteroid injections on pain, plantar fascia thickness and foot function in plantar fasciitis: a systematic review and meta-analysis. Clin Rehabil. 2024;38(9):1179-1194. (PMID 38738305)."] },
        { cells: ["Hicks JH. The mechanics of the foot. II. The plantar aponeurosis and the arch. J Anat. 1954;88(1):25-30."] },
        { cells: ["Draghi F, Gitto S, Bortolotto C, et al. Imaging of plantar fascia disorders: findings on plain radiography, ultrasound and MRI. Insights Imaging. 2017;8(1):69-78."] },
        { cells: ["Lim AT, How CH, Tan B. Management of plantar fasciitis in the outpatient setting. Singapore Med J. 2016;57(4):168-171."] },
      ],
    },
  },
]);

console.log("Editorial Blocks composed.");
console.log({ diseaseId, diseaseSlug });

await pool.end();
