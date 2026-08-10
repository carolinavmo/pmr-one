// Tendinopathy Editorial Template.
//
// Starting block sequence for the Tendinopathy/overuse-MSK disease
// family (spec §15A). Refined from the spec's original example using
// what Sprint 3's reference implementation (Plantar Fasciopathy) and
// the section-taxonomy review actually found:
//   - "Clinical Presentation" added as its own section — LESSONS_LEARNED
//     #8 found history/symptom content had no home distinct from the
//     Exam section in the original Plantar Fasciopathy build.
//   - No "Worth Knowing" pearls rail — Plantar Fasciopathy proved all
//     three of its pearls had a better contextual home near the section
//     they explain (Overview, Exam, Treatment) than a generic rail
//     would give them; matches Tier 2's own contextual-attachment
//     principle. Authors add pearls per-disease, not from the template.
//   - No Outcome Measures section — still has a real gap blocking it
//     (LESSONS_LEARNED #10: no Knowledge Object type exists for it
//     yet). A template pointing at something nothing can render yet
//     is worse than not offering it.
//   - Diagnostic Imaging, Return to Sport, and Prognosis added after
//     the fact (LESSONS_LEARNED #13) — the stress test that found
//     these gaps was run against the disease instance first; this
//     template went stale until fixed here.
//   - Correction (LESSONS_LEARNED #14): "refined from Plantar
//     Fasciopathy" above overclaims. Biomechanics was never actually
//     a standalone section in PF's real build — its biomechanics
//     content was thin enough to fold into Epidemiology. The
//     Biomechanics section here is kept because Achilles Tendinopathy
//     (the second disease authored from this template) genuinely
//     needed it standalone. Whether to fold or split is a legitimate
//     per-disease call, not something this template should force
//     either way — that's why it stays here as an available slot,
//     not a mandatory one.
//
// Usage: node db/seed/templates/tendinopathy.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, replaceTemplateBlocks } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const templateId = await findOrCreate(pool, "editorial_template", "name", "Tendinopathy Template", {
  name: "Tendinopathy Template",
  description:
    "Starting section sequence for tendinopathy and overuse-MSK conditions (e.g. plantar fasciopathy, lateral epicondylosis, rotator cuff tendinopathy). Biomechanics-heavy, per spec §15A.",
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
    placeholderNote: "What the patient reports — symptom pattern, timing, aggravating/relieving factors. Distinct from Exam: this is history, not objective findings.",
  },
  { blockType: "section_heading", placeholderNote: "Anatomy" },
  {
    blockType: "medical_illustration",
    placeholderNote: "Primary anatomy illustration for the affected structure and its origin/insertion.",
  },
  { blockType: "section_heading", placeholderNote: "Biomechanics" },
  {
    blockType: "medical_illustration",
    placeholderNote: "OPTIONAL — only if a distinct diagram adds real value beyond the Anatomy illustration above. Skipping this and going straight to the paragraph below is a normal, expected choice, not a shortcut.",
  },
  {
    blockType: "paragraph",
    placeholderNote: "Explain the mechanical loading pattern driving the pathology — this is the signature section for this family.",
  },
  { blockType: "section_heading", placeholderNote: "Epidemiology" },
  {
    blockType: "paragraph",
    placeholderNote: "Epidemiology and risk factors together, woven into prose. Only split Risk Factors into its own section if the list is long enough to need one.",
  },
  { blockType: "section_heading", placeholderNote: "Exam" },
  {
    blockType: "examination_workflow",
    placeholderNote: "Reference the primary maneuver(s) — content_config.maneuver_ids. Don't stop at confirming maneuvers: if there's a safety-critical maneuver that rules out a more urgent differential (e.g. a rupture/fracture test), include it too, and consider a key_point above this block calling it out explicitly.",
  },
  { blockType: "section_heading", placeholderNote: "Diagnostic Imaging" },
  {
    blockType: "imaging_findings",
    placeholderNote: "Reference the imaging finding(s) that support diagnosis — content_config.imaging_finding_ids. Note when imaging is NOT required for typical presentations, if that's true for this condition.",
  },
  { blockType: "section_heading", placeholderNote: "Treatment" },
  {
    blockType: "treatment_algorithm",
    placeholderNote: "First-line conservative pathway. Add a second treatment_algorithm block for escalation/procedural pathways if this condition has one.",
  },
  { blockType: "section_heading", placeholderNote: "Rehab" },
  {
    blockType: "rehabilitation_progression",
    placeholderNote: "Reference the stretching/strengthening protocol for this condition.",
  },
  { blockType: "section_heading", placeholderNote: "Return to Sport" },
  {
    blockType: "paragraph",
    placeholderNote: "Graduated return-to-activity criteria, if relevant to this condition's typical patient population. Skip this section entirely if it doesn't apply — not every tendinopathy is sport-associated.",
  },
  { blockType: "section_heading", placeholderNote: "Prognosis" },
  {
    blockType: "paragraph",
    placeholderNote: "Expected natural history and timeline, plus factors associated with a slower or faster course (duration before treatment, comorbidities, etc.).",
  },
  { blockType: "section_heading", placeholderNote: "References" },
  { blockType: "reference_list", placeholderNote: "content_config.reference_ids for this disease's citations." },
]);

console.log("Tendinopathy Template seeded.");
console.log({ templateId });

await pool.end();
