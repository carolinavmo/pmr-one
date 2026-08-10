// Cranial Neuropathy Editorial Template.
//
// First template built from scratch (not adapted from Tendinopathy) —
// Bell's Palsy is the reference disease. Deliberately a different
// shape from the Tendinopathy Template, not a copy with renamed
// headings:
//   - Pathophysiology is a DEFAULT slot here, unlike Tendinopathy
//     (where it was thin enough to fold into Biomechanics). Cranial
//     neuropathies are usually explained by a specific mechanism
//     (compression, ischemia, viral reactivation) central enough to
//     the disease's story to default in.
//   - Complications is a DEFAULT slot here, unlike Tendinopathy. This
//     family tends to carry safety-critical sequelae (e.g. corneal
//     exposure) load-bearing enough to default into the template
//     rather than being added ad hoc per disease — matches the
//     family-conditional rule from the section-taxonomy review.
//   - No Biomechanics, no Return to Sport — neither concept applies
//     to this family. Not every template needs every building block.
//
// Usage: node db/seed/templates/cranial-neuropathy.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, replaceTemplateBlocks } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const templateId = await findOrCreate(pool, "editorial_template", "name", "Cranial Neuropathy Template", {
  name: "Cranial Neuropathy Template",
  description:
    "Starting section sequence for cranial nerve palsies (e.g. Bell's palsy). Anatomy-critical — lesion location along the nerve typically explains the symptom pattern, more so than in most other families.",
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
    placeholderNote: "What the patient reports — onset pattern, associated symptoms. Distinct from Exam: this is history, not objective findings.",
  },
  { blockType: "section_heading", placeholderNote: "Anatomy" },
  {
    blockType: "medical_illustration",
    placeholderNote: "The nerve's course and branches, annotated at each clinically relevant point — for this family, lesion LOCATION usually explains the symptom pattern directly, so this illustration tends to carry more diagnostic weight than in other families, not just supporting context.",
  },
  { blockType: "section_heading", placeholderNote: "Pathophysiology" },
  {
    blockType: "paragraph",
    placeholderNote: "The mechanism — compression, ischemia, viral reactivation, demyelination, whichever applies. This is usually central to this family's story, not optional.",
  },
  { blockType: "section_heading", placeholderNote: "Epidemiology" },
  {
    blockType: "paragraph",
    placeholderNote: "Epidemiology and risk factors together, woven into prose. Only split Risk Factors into its own section if the list is long enough to need one.",
  },
  { blockType: "section_heading", placeholderNote: "Exam" },
  {
    blockType: "examination_workflow",
    placeholderNote: "Reference the primary maneuver(s) — content_config.maneuver_ids. If there's a maneuver that distinguishes this condition from a more urgent central/structural cause, include it, and consider a key_point above this block calling it out explicitly.",
  },
  { blockType: "section_heading", placeholderNote: "Diagnostic Imaging" },
  {
    blockType: "paragraph",
    placeholderNote: "Use a plain paragraph if the main point is when imaging is/isn't indicated (common for this family — many cranial neuropathies are clinical diagnoses). Only use an imaging_findings block if there's an actual positive finding the diagnosis hinges on — the imaging_finding_disease_relationship type is 'suggests'-only, which doesn't fit a 'here's why we don't image typical cases' point.",
  },
  { blockType: "section_heading", placeholderNote: "Treatment" },
  {
    blockType: "treatment_algorithm",
    placeholderNote: "Time-sensitivity often matters more than escalation lines for this family — a single algorithm capturing the time-critical steps may fit better than the first-line/second-line pair common in other families. Don't force a second algorithm if there isn't a genuine escalation pathway.",
  },
  { blockType: "section_heading", placeholderNote: "Complications" },
  {
    blockType: "paragraph",
    placeholderNote: "Safety-critical sequelae — if there's a preventable complication (e.g. exposure injury from incomplete eyelid closure), this is often as important as the Treatment section itself. Don't undersell it here.",
  },
  { blockType: "section_heading", placeholderNote: "Rehab" },
  {
    blockType: "rehabilitation_progression",
    placeholderNote: "Reference the relevant retraining/therapy protocol, if one exists for this condition.",
  },
  { blockType: "section_heading", placeholderNote: "Prognosis" },
  {
    blockType: "paragraph",
    placeholderNote: "Expected recovery trajectory and factors associated with better/worse outcomes — for this family, initial severity grading is often itself a prognostic factor worth naming explicitly.",
  },
  { blockType: "section_heading", placeholderNote: "References" },
  { blockType: "reference_list", placeholderNote: "content_config.reference_ids for this disease's citations." },
]);

console.log("Cranial Neuropathy Template seeded.");
console.log({ templateId });

await pool.end();
