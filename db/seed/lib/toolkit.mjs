// Mirrors src/lib/slugify.ts — duplicated rather than shared because
// this script runs as plain Node (no TS build step, matching
// scripts/create-user.mjs), while the app side is TypeScript.
export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Table/column identifiers below are always developer-written literals in
// trusted seed scripts, never user input — string interpolation for
// identifiers is safe in this context (pg can only parameterize values,
// not identifiers, so this is the standard shape for a generic helper
// like this one).

// Looks up an existing row by a natural key (canonical_name, title, ...)
// before inserting. Without this, re-running a seed script duplicates
// every row, and a second disease authored later has no way to reuse an
// object the first disease already created — see LESSONS_LEARNED.md #2.
export async function findOrCreate(pool, table, matchColumn, matchValue, insertColumns) {
  const existing = await pool.query(
    `SELECT id FROM ${table} WHERE ${matchColumn} = $1`,
    [matchValue]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const columns = Object.keys(insertColumns);
  const values = Object.values(insertColumns);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await pool.query(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`,
    values
  );
  return rows[0].id;
}

// Relationship/join rows have no natural key to findOrCreate against —
// upsert on the table's real primary key instead so reseeding updates
// evidence metadata in place rather than erroring on a duplicate PK.
export async function upsertRelationship(pool, table, columns, conflictColumns) {
  const keys = Object.keys(columns);
  const values = Object.values(columns);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const updates = keys
    .filter((k) => !conflictColumns.includes(k))
    .map((k) => `${k} = EXCLUDED.${k}`)
    .join(", ");

  await pool.query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})
     ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET ${updates}`,
    values
  );
}

// Pure junction tables (pearl_attachment, citation, illustration_usage,
// illustration_depicts_anatomy) have no non-key columns to update on
// conflict — upsertRelationship's "ON CONFLICT DO UPDATE SET ..." would
// generate invalid SQL (an empty SET list) for these, so they get their
// own simple insert-or-skip.
export async function linkIfNotExists(pool, table, columns) {
  const keys = Object.keys(columns);
  const values = Object.values(columns);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  await pool.query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})
     ON CONFLICT DO NOTHING`,
    values
  );
}

// Replaces this disease's editorial_block rows wholesale on every
// reseed — blocks are an ordered sequence authored as a unit, so
// findOrCreate's row-by-row matching doesn't fit; easier to treat the
// whole sequence as replaceable, same as re-saving a document.
export async function replaceBlocks(pool, diseaseId, blocks) {
  await pool.query(`DELETE FROM editorial_block WHERE disease_id = $1`, [diseaseId]);

  for (const [index, block] of blocks.entries()) {
    await pool.query(
      `INSERT INTO editorial_block
         (disease_id, position, block_type, referenced_object_type, referenced_object_id, display_config, content_config, authored_content, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        diseaseId,
        index,
        block.blockType,
        block.referencedObjectType ?? null,
        block.referencedObjectId ?? null,
        JSON.stringify(block.displayConfig ?? {}),
        JSON.stringify(block.contentConfig ?? {}),
        block.authoredContent ?? null,
        block.status ?? "draft",
      ]
    );
  }
}

// Same replace-wholesale reasoning as replaceBlocks, applied to a
// template's own block sequence.
export async function replaceTemplateBlocks(pool, templateId, blocks) {
  await pool.query(`DELETE FROM editorial_template_block WHERE template_id = $1`, [templateId]);

  for (const [index, block] of blocks.entries()) {
    await pool.query(
      `INSERT INTO editorial_template_block
         (template_id, position, block_type, default_display_config, placeholder_note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        templateId,
        index,
        block.blockType,
        JSON.stringify(block.defaultDisplayConfig ?? {}),
        block.placeholderNote ?? null,
      ]
    );
  }
}

// Copy semantics (spec §15A): instantiating a disease from a template
// duplicates its block structure once, with no ongoing link — editing
// the template afterward must never retroactively change a disease
// that already instantiated it. Placeholder blocks land empty
// (content_config: {}, no referenced object) since the template only
// carries structural guidance, not real content — an author fills
// each one in afterward, same as any other editorial_block edit.
export async function instantiateTemplate(pool, templateId, diseaseId) {
  const { rows: templateBlocks } = await pool.query(
    `SELECT position, block_type, default_display_config FROM editorial_template_block
     WHERE template_id = $1 ORDER BY position`,
    [templateId]
  );

  await replaceBlocks(
    pool,
    diseaseId,
    templateBlocks.map((block) => ({
      blockType: block.block_type,
      displayConfig: block.default_display_config,
      contentConfig: {},
      status: "draft",
    }))
  );

  return templateBlocks.length;
}
