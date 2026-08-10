// Peripheral Nerve Entrapment Editorial Template.
//
// Third family template. Reference disease: Carpal Tunnel Syndrome.
// Other conditions expected to fit this family later: cubital tunnel
// syndrome, tarsal tunnel syndrome, radial tunnel syndrome, meralgia
// paresthetica.
//
// Deliberately sits BETWEEN the other two templates in which building
// blocks it defaults in — proof the catalog is genuinely modular, not
// just two fixed alternatives:
//   - Pathophysiology: default in (like Cranial Neuropathy) — nerve
//     compression/ischemia mechanism is central to this family's story.
//   - Biomechanics: default in (like Tendinopathy) — repetitive
//     strain/positioning genuinely drives this family, unlike Cranial
//     Neuropathy where it doesn't apply at all.
//   - Complications: OPTIONAL, not defaulted — this family's
//     complications (recurrence, pillar pain) are real but not
//     acutely safety-critical the way Cranial Neuropathy's are
//     (corneal injury). Family-conditional rule from the taxonomy
//     review, applied as a genuine judgment call, not a copy of
//     either prior template.
//   - Return to Work: default in, using the controlled per-template
//     label-variant idea from two sessions ago ("Return to Function,"
//     worded per family) for the first time in practice.
//   - No Electrodiagnostics section/block type — first time this
//     family's primary diagnostic modality has been needed, and
//     there's no Knowledge Object or Editorial Block type for it yet.
//     Per the same discipline just reaffirmed for warning_pitfall:
//     one occurrence isn't evidence enough to build new infrastructure.
//     Represented as a plain paragraph for now — see LESSONS_LEARNED.md.
//
// Usage: node db/seed/templates/peripheral-nerve-entrapment.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, replaceTemplateBlocks } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const templateId = await findOrCreate(pool, "editorial_template", "name", "Peripheral Nerve Entrapment Template", {
  name: "Peripheral Nerve Entrapment Template",
  description:
    "Starting section sequence for peripheral nerve entrapment/compression conditions (e.g. carpal tunnel syndrome, cubital tunnel syndrome, tarsal tunnel syndrome). Anatomy-critical, biomechanics-relevant, and diagnostically dependent on electrodiagnostic testing rather than imaging.",
});

await replaceTemplateBlocks(pool, templateId, [
  { blockType: "section_heading", placeholderNote: "Disease name as the page title context." },
  {
    blockType: "paragraph",
    placeholderNote: "Overview — one-paragraph definition and framing. Keep to what a resident needs in five seconds.",
  },
  { blockType: "section_heading", placeholderNote: "Clinical Presentation" },
  {
    blockType: "paragraph",
    placeholderNote: "What the patient reports — symptom distribution, timing (e.g. nocturnal symptoms are classic for several conditions in this family). Distinct from Exam: this is history, not objective findings.",
  },
  { blockType: "section_heading", placeholderNote: "Anatomy" },
  {
    blockType: "medical_illustration",
    placeholderNote: "The nerve's course through the entrapment site, and where sensory/motor branches take off relative to it — for this family, branch location relative to the entrapment point often explains which findings are present or absent.",
  },
  { blockType: "section_heading", placeholderNote: "Pathophysiology" },
  {
    blockType: "paragraph",
    placeholderNote: "The compression/ischemia mechanism — usually central to this family's story, not optional.",
  },
  { blockType: "section_heading", placeholderNote: "Biomechanics" },
  {
    blockType: "paragraph",
    placeholderNote: "Repetitive positioning, vibration, or strain patterns that increase pressure at the entrapment site.",
  },
  { blockType: "section_heading", placeholderNote: "Epidemiology" },
  {
    blockType: "paragraph",
    placeholderNote: "Epidemiology and risk factors together, woven into prose. Systemic conditions (diabetes, thyroid disease, pregnancy) recur across this family — check whether the risk factor already exists before creating a new one.",
  },
  { blockType: "section_heading", placeholderNote: "Exam" },
  {
    blockType: "examination_workflow",
    placeholderNote: "Reference the primary maneuver(s) — content_config.maneuver_ids. If there's a maneuver that distinguishes this condition from a proximal (e.g. cervical radiculopathy) or more diffuse cause, include it as a rules_out relationship.",
  },
  { blockType: "section_heading", placeholderNote: "Electrodiagnostics" },
  {
    blockType: "paragraph",
    placeholderNote: "Nerve conduction studies/EMG findings — the primary diagnostic modality for this family, not imaging. No Knowledge Object or Editorial Block type exists for this yet (LESSONS_LEARNED.md) — write this as narrative prose, not a structured block, until that's built.",
  },
  { blockType: "section_heading", placeholderNote: "Diagnostic Imaging" },
  {
    blockType: "paragraph",
    placeholderNote: "Usually secondary to electrodiagnostics for this family. Use an imaging_findings block only if there's a genuine positive finding (e.g. nerve cross-sectional area on ultrasound); use a plain paragraph if the point is mainly when imaging is/isn't indicated.",
  },
  { blockType: "section_heading", placeholderNote: "Treatment" },
  {
    blockType: "treatment_algorithm",
    placeholderNote: "First-line conservative pathway. Add a second treatment_algorithm block for a surgical/escalation pathway if this condition has one — many, but not all, conditions in this family do.",
  },
  { blockType: "section_heading", placeholderNote: "Rehab" },
  {
    blockType: "rehabilitation_progression",
    placeholderNote: "Nerve gliding/tendon gliding exercises are common in this family, alongside general strengthening.",
  },
  { blockType: "section_heading", placeholderNote: "Return to Work" },
  {
    blockType: "paragraph",
    placeholderNote: "Occupational/ergonomic return-to-activity criteria — this family skews occupational rather than sport-related, unlike Tendinopathy. Rename to 'Return to Sport' or 'Return to Activity' per-disease if that fits better; same underlying section, different label.",
  },
  { blockType: "section_heading", placeholderNote: "Prognosis" },
  {
    blockType: "paragraph",
    placeholderNote: "Expected recovery trajectory and factors associated with better/worse outcomes.",
  },
  { blockType: "section_heading", placeholderNote: "References" },
  { blockType: "reference_list", placeholderNote: "content_config.reference_ids for this disease's citations." },
]);

console.log("Peripheral Nerve Entrapment Template seeded.");
console.log({ templateId });

await pool.end();
