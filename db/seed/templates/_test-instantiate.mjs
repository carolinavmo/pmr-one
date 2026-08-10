// Reusable smoke test for instantiateTemplate's copy semantics — creates
// a throwaway disease, instantiates the given template into it, verifies
// the copy and the "no ongoing link" claim, then cleans up. Not part of
// the seed pipeline; run by hand whenever a template changes.
//
// Usage: node db/seed/templates/_test-instantiate.mjs "Tendinopathy Template"
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, instantiateTemplate } from "../lib/toolkit.mjs";

config({ path: ".env.local" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const templateName = process.argv[2] ?? "Tendinopathy Template";
const { rows: templateRows } = await pool.query(
  `SELECT id FROM editorial_template WHERE name = $1`,
  [templateName]
);
if (!templateRows[0]) {
  console.error(`No template named "${templateName}" found.`);
  process.exit(1);
}
const templateId = templateRows[0].id;

const scratchDiseaseId = await findOrCreate(pool, "disease", "slug", "test-instantiation-scratch", {
  canonical_name: "Test Instantiation Scratch Disease",
  slug: "test-instantiation-scratch",
  status: "draft",
});

const copiedCount = await instantiateTemplate(pool, templateId, scratchDiseaseId);

const { rows: blockRows } = await pool.query(
  `SELECT position, block_type FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
  [scratchDiseaseId]
);

console.log(`instantiateTemplate reported ${copiedCount} blocks copied.`);
console.log(`editorial_block actually has ${blockRows.length} rows for the scratch disease.`);
console.log("First 3:", blockRows.slice(0, 3));
console.log("Last 3:", blockRows.slice(-3));

// Now edit the template and confirm the scratch disease's already-copied
// blocks do NOT change — this is the actual "no ongoing link" claim.
await pool.query(
  `UPDATE editorial_template_block SET placeholder_note = 'MUTATED — should not appear in scratch disease' WHERE template_id = $1 AND position = 0`,
  [templateId]
);
const { rows: afterEdit } = await pool.query(
  `SELECT block_type FROM editorial_block WHERE disease_id = $1 AND position = 0`,
  [scratchDiseaseId]
);
console.log("Scratch disease's position-0 block after template edit:", afterEdit[0]);

// Revert the template mutation and clean up the scratch disease.
await pool.query(
  `UPDATE editorial_template_block SET placeholder_note = 'Disease name as the page title context.' WHERE template_id = $1 AND position = 0`,
  [templateId]
);
await pool.query(`DELETE FROM editorial_block WHERE disease_id = $1`, [scratchDiseaseId]);
await pool.query(`DELETE FROM disease WHERE id = $1`, [scratchDiseaseId]);

console.log("Cleaned up scratch disease and reverted template mutation.");

await pool.end();
