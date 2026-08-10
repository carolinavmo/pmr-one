// Osteoarthritis Editorial Template.
//
// Fourth family template. Reference disease: Knee Osteoarthritis.
// This is the family spec §15A actually named as an example
// ("Tendinopathy, Peripheral Nerve Injury, Stroke, Spinal Cord Injury,
// Osteoarthritis") — first time one of the originally-named families
// has actually been built, rather than one inferred from taxonomy work.
//
//   - Pathophysiology AND Biomechanics both default in — the
//     Osteoarthritis Template is the first one where both matter
//     roughly equally, rather than one dominating (Tendinopathy leans
//     Biomechanics, Cranial Neuropathy/Peripheral Nerve Entrapment
//     lean Pathophysiology). Matches the founder's own "OA → both"
//     example from the section-taxonomy discussion two sessions ago.
//   - Diagnostic Imaging defaults to expecting a real positive
//     finding (imaging_findings block), not a "why we don't image"
//     paragraph — unlike the last two families, OA imaging (X-ray
//     grading) is genuinely central to diagnosis and staging.
//   - Outcome Measures defaults IN, as a paragraph — same resolution
//     as Electrodiagnostics on the Peripheral Nerve Entrapment
//     Template: no Knowledge Object type exists for standardized
//     instruments (WOMAC, KOOS) yet (LESSONS_LEARNED.md #10), so this
//     is narrative prose until that's built, not a missing section.
//   - Complications stays OPTIONAL, not defaulted — thin for the
//     non-surgical majority of patients, real only for the surgical
//     subset. Add ad hoc per-disease if a specific condition's
//     surgical complication profile earns it.
//
// Usage: node db/seed/templates/osteoarthritis.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, replaceTemplateBlocks } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const templateId = await findOrCreate(pool, "editorial_template", "name", "Osteoarthritis Template", {
  name: "Osteoarthritis Template",
  description:
    "Starting section sequence for osteoarthritis and degenerative joint conditions (e.g. knee OA, hip OA, hand OA). Both biomechanics and pathophysiology are typically load-bearing, unlike families where one dominates.",
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
    placeholderNote: "What the patient reports — pain pattern, stiffness duration and timing. Mentioning how this differs from an inflammatory pattern (e.g. prolonged morning stiffness) is often worth a sentence here.",
  },
  { blockType: "section_heading", placeholderNote: "Anatomy" },
  {
    blockType: "medical_illustration",
    placeholderNote: "The joint's compartments/structures relevant to this condition's typical pattern of involvement.",
  },
  { blockType: "section_heading", placeholderNote: "Pathophysiology" },
  {
    blockType: "paragraph",
    placeholderNote: "The tissue-level degenerative process — cartilage, subchondral bone, synovium, whichever apply.",
  },
  { blockType: "section_heading", placeholderNote: "Biomechanics" },
  {
    blockType: "paragraph",
    placeholderNote: "Malalignment, loading pattern, gait — usually as load-bearing as Pathophysiology for this family, not a secondary note.",
  },
  { blockType: "section_heading", placeholderNote: "Epidemiology" },
  {
    blockType: "paragraph",
    placeholderNote: "Epidemiology and risk factors together, woven into prose. Age and obesity recur across this family and others — check for an existing risk_factor row before creating a new one.",
  },
  { blockType: "section_heading", placeholderNote: "Exam" },
  {
    blockType: "examination_workflow",
    placeholderNote: "Reference the primary maneuver(s) — content_config.maneuver_ids. Not every maneuver needs to be confirms/rules_out — assesses_contributing_factor fits many biomechanical/structural findings in this family better than forcing a differential framing that isn't the real clinical relationship.",
  },
  { blockType: "section_heading", placeholderNote: "Diagnostic Imaging" },
  {
    blockType: "imaging_findings",
    placeholderNote: "Usually a real positive finding for this family (e.g. a grading system) — content_config.imaging_finding_ids. Unlike some other families, this is rarely a 'why we don't image' section.",
  },
  { blockType: "section_heading", placeholderNote: "Outcome Measures" },
  {
    blockType: "paragraph",
    placeholderNote: "Standardized patient-reported outcome instruments used for this condition. No Knowledge Object type exists yet for these — write as narrative prose describing what the instrument measures and how it's used, not a structured block.",
  },
  { blockType: "section_heading", placeholderNote: "Treatment" },
  {
    blockType: "treatment_algorithm",
    placeholderNote: "Conservative pathway. Add a second treatment_algorithm block for a surgical pathway if this condition has one — common for this family, but confirm it's genuinely a distinct escalation line, not just assumed because other diseases had two.",
  },
  { blockType: "section_heading", placeholderNote: "Rehab" },
  {
    blockType: "rehabilitation_progression",
    placeholderNote: "Reference the relevant strengthening/conditioning protocol.",
  },
  { blockType: "section_heading", placeholderNote: "Return to Activity" },
  {
    blockType: "paragraph",
    placeholderNote: "Activity modification guidance — for this family, the key message is often that staying active is protective, not something to avoid. Rename to 'Return to Sport' per-disease if the typical patient population is athletic.",
  },
  { blockType: "section_heading", placeholderNote: "Prognosis" },
  {
    blockType: "paragraph",
    placeholderNote: "Expected course and factors associated with faster/slower progression.",
  },
  { blockType: "section_heading", placeholderNote: "References" },
  { blockType: "reference_list", placeholderNote: "content_config.reference_ids for this disease's citations." },
]);

console.log("Osteoarthritis Template seeded.");
console.log({ templateId });

await pool.end();
