import pg from "pg";
import { randomUUID } from "crypto";
import { config } from "dotenv";
config({ path: ".env.local" });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function planBlockMove(diseaseId, blockId, targetBlockId, placement) {
  if (blockId === targetBlockId) return null;
  const { rows } = await pool.query(
    `SELECT id, display_config->'layout'->>'row' AS row, display_config->'layout'->>'col' AS col
     FROM editorial_block WHERE disease_id = $1 ORDER BY position`,
    [diseaseId]
  );
  const order = rows.map((r) => r.id);
  const rowById = new Map(rows.map((r) => [r.id, r.row]));
  const colById = new Map(rows.map((r) => [r.id, r.col]));
  if (!order.includes(blockId) || !order.includes(targetBlockId)) return null;

  const withoutDragged = order.filter((id) => id !== blockId);
  const targetIndex = withoutDragged.indexOf(targetBlockId);
  const insertAt = placement === "before" ? targetIndex : targetIndex + 1;
  const newOrder = [...withoutDragged.slice(0, insertAt), blockId, ...withoutDragged.slice(insertAt)];

  const myCellKey = rows.find((r) => r.id === blockId);
  const myCell = myCellKey?.row ? `${myCellKey.row}:${myCellKey.col ?? blockId}` : null;

  const cells = new Map();
  for (const r of rows) {
    if (!r.row) continue;
    const key = `${r.row}:${r.col ?? r.id}`;
    if (key === myCell) continue;
    const members = cells.get(key) ?? [];
    members.push(r.id);
    cells.set(key, members);
  }
  for (const members of cells.values()) {
    const indices = members.map((id) => newOrder.indexOf(id)).sort((a, b) => a - b);
    const contiguous = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
    if (!contiguous) return null;
  }
  return { newOrder, rowById, colById };
}

async function commitBlockOrder(newOrder) {
  for (let i = 0; i < newOrder.length; i++) {
    await pool.query(`UPDATE editorial_block SET position = $2 WHERE id = $1`, [newOrder[i], -(i + 1)]);
  }
  for (let i = 0; i < newOrder.length; i++) {
    await pool.query(`UPDATE editorial_block SET position = $2 WHERE id = $1`, [newOrder[i], (i + 1) * 10]);
  }
}

async function cleanupOrphanedRow(diseaseId, row) {
  const { rows } = await pool.query(
    `SELECT id, display_config->'layout'->>'col' AS col FROM editorial_block
     WHERE disease_id = $1 AND display_config->'layout'->>'row' = $2`,
    [diseaseId, row]
  );
  const cellKeys = new Set(rows.map((r) => r.col ?? r.id));
  if (cellKeys.size === 1) {
    for (const r of rows) {
      await pool.query(`UPDATE editorial_block SET display_config = display_config - 'layout' WHERE id = $1`, [r.id]);
    }
  }
}

async function stackBlockAction(diseaseId, blockId, targetBlockId, placement) {
  const { rows: typeRows } = await pool.query(`SELECT id, block_type FROM editorial_block WHERE id = ANY($1::uuid[])`, [[blockId, targetBlockId]]);
  if (typeRows.some((r) => r.block_type === "section_heading")) return "blocked-heading";

  const plan = await planBlockMove(diseaseId, blockId, targetBlockId, placement === "above" ? "before" : "after");
  if (!plan) return "rejected";
  const { newOrder, rowById, colById } = plan;
  const myRow = rowById.get(blockId) ?? null;
  const targetRow = rowById.get(targetBlockId) ?? null;
  const targetCol = colById.get(targetBlockId) ?? null;
  const row = targetRow ?? randomUUID();
  const col = targetCol ?? randomUUID();

  await commitBlockOrder(newOrder);

  const { rows: widthRows } = await pool.query(`SELECT display_config->'layout'->>'width' AS width FROM editorial_block WHERE id = $1`, [targetBlockId]);
  const width = widthRows[0]?.width ?? undefined;

  const cellIds = targetCol
    ? (await pool.query(`SELECT id FROM editorial_block WHERE disease_id = $1 AND display_config->'layout'->>'col' = $2`, [diseaseId, targetCol])).rows.map((r) => r.id)
    : [targetBlockId];

  await pool.query(
    `UPDATE editorial_block
     SET display_config = jsonb_set(
       display_config, ARRAY['layout'],
       COALESCE(display_config->'layout', '{}'::jsonb)
         || jsonb_build_object('row', $3::text, 'col', $4::text)
         || CASE WHEN $5::text IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('width', $5::text) END
     )
     WHERE id = ANY($1::uuid[]) OR id = $2`,
    [cellIds, blockId, row, col, width ?? null]
  );

  if (myRow && myRow !== row) await cleanupOrphanedRow(diseaseId, myRow);
  return "stacked";
}

async function reorderBlockAction(diseaseId, blockId, targetBlockId, placement) {
  const plan = await planBlockMove(diseaseId, blockId, targetBlockId, placement);
  if (!plan) return "rejected";
  const { newOrder, rowById, colById } = plan;
  const myRow = rowById.get(blockId) ?? null;
  const myCol = colById.get(blockId) ?? null;
  await commitBlockOrder(newOrder);
  if (myRow) {
    const newIndex = newOrder.indexOf(blockId);
    const leftId = newOrder[newIndex - 1];
    const rightId = newOrder[newIndex + 1];
    const stillAdjacent =
      (leftId && rowById.get(leftId) === myRow && (colById.get(leftId) ?? null) === myCol) ||
      (rightId && rowById.get(rightId) === myRow && (colById.get(rightId) ?? null) === myCol);
    if (!stillAdjacent) {
      await pool.query(
        `UPDATE editorial_block SET display_config = display_config
           #- '{layout,row}' #- '{layout,col}' #- '{layout,width}' #- '{layout,rowAlign}' #- '{layout,align}'
         WHERE id = $1`, [blockId]
      );
      await cleanupOrphanedRow(diseaseId, myRow);
    }
  }
  return "reordered";
}

async function combineWithAdjacentBlockAction(diseaseId, blockId, direction) {
  const { rows: mineRows } = await pool.query(`SELECT position, block_type, display_config->'layout'->>'row' AS row FROM editorial_block WHERE id = $1`, [blockId]);
  const mine = mineRows[0];
  if (!mine || mine.block_type === "section_heading") return "skip";
  const { rows: neighborRows } = await pool.query(
    `SELECT id, block_type, display_config->'layout' AS layout FROM editorial_block
     WHERE disease_id = $1 AND position ${direction === "next" ? ">" : "<"} $2
     ORDER BY position ${direction === "next" ? "ASC" : "DESC"} LIMIT 1`,
    [diseaseId, mine.position]
  );
  const neighbor = neighborRows[0];
  if (!neighbor || neighbor.block_type === "section_heading") return "skip";
  const neighborLayout = neighbor.layout;
  const neighborHasRow = Boolean(neighborLayout?.row);
  const row = neighborLayout?.row ?? mine.row ?? randomUUID();
  const EQUAL_WIDTH = { 2: "1/2", 3: "1/3", 4: "1/4" };

  if (neighborHasRow) {
    const { rows: memberRows } = await pool.query(
      `SELECT id, display_config->'layout'->>'col' AS col FROM editorial_block WHERE disease_id = $1 AND display_config->'layout'->>'row' = $2`,
      [diseaseId, row]
    );
    const cellCount = new Set(memberRows.map((r) => r.col ?? r.id)).size;
    const targetSize = cellCount + 1;
    if (targetSize > 4) return "capped";
    const width = EQUAL_WIDTH[targetSize];
    await pool.query(
      `UPDATE editorial_block SET display_config = jsonb_set(display_config, ARRAY['layout'],
         COALESCE(display_config->'layout', '{}'::jsonb) || jsonb_build_object('row', $3::text, 'width', $4::text))
       WHERE id = ANY($1::uuid[]) OR id = $2`,
      [memberRows.map((r) => r.id), blockId, row, width]
    );
    return `grew-to-${targetSize}-cells`;
  } else {
    await pool.query(
      `UPDATE editorial_block SET display_config = jsonb_set(display_config, ARRAY['layout'],
         COALESCE(display_config->'layout', '{}'::jsonb) || jsonb_build_object('row', $3::text, 'width', '1/2'))
       WHERE id = $1 OR id = $2`,
      [blockId, neighbor.id, row]
    );
    return "new-row-of-2-cells";
  }
}

// --- Setup ---
const { rows: diseaseRows } = await pool.query(`SELECT id FROM disease WHERE slug = 'plantar-fasciopathy'`);
const diseaseId = diseaseRows[0].id;
const ids = [];
for (let i = 0; i < 5; i++) {
  const { rows } = await pool.query(
    `INSERT INTO editorial_block (disease_id, block_type, position, content_config, display_config)
     VALUES ($1, 'paragraph', $2, $3, '{}'::jsonb) RETURNING id`,
    [diseaseId, 99900 + i, JSON.stringify({ body: `TEMP ${["PARA", "KEYPT", "IMG", "THIRD", "FOURTH"][i]}` })]
  );
  ids.push(rows[0].id);
}
const [PARA, KEYPT, IMG, THIRD, FOURTH] = ids;

async function dump() {
  const { rows } = await pool.query(
    `SELECT content_config->>'body' AS body, position,
       display_config->'layout'->>'row' AS row, display_config->'layout'->>'col' AS col,
       display_config->'layout'->>'width' AS width
     FROM editorial_block WHERE id = ANY($1::uuid[]) ORDER BY position`,
    [ids]
  );
  return rows.map(r => `${r.body}(row=${r.row ? r.row.slice(0,4) : '-'},col=${r.col ? r.col.slice(0,4) : '-'},w=${r.width ?? '-'})`).join(' ');
}

console.log("Initial:", await dump());

console.log("\n1. Reorder IMG right after PARA:", await reorderBlockAction(diseaseId, IMG, PARA, "after"));
console.log("  ", await dump());
console.log("   Combine PARA+IMG side by side:", await combineWithAdjacentBlockAction(diseaseId, IMG, "previous"));
console.log("  ", await dump());

console.log("\n2. Stack KEYPT below PARA (should join PARA's cell, matching PARA's width):", await stackBlockAction(diseaseId, KEYPT, PARA, "below"));
console.log("  ", await dump());

console.log("\n3. Try to insert THIRD directly between PARA and KEYPT (splitting the stack) - should be REJECTED:", await reorderBlockAction(diseaseId, THIRD, PARA, "after"));
console.log("  ", await dump());

console.log("\n4. Combine THIRD as a new 3rd cell (2 existing cells -> 3, width should become 1/3 each):", await combineWithAdjacentBlockAction(diseaseId, THIRD, "previous"));
console.log("  ", await dump());

console.log("\n5. Stack FOURTH above IMG (new col on IMG, both get IMG's current width):", await stackBlockAction(diseaseId, FOURTH, IMG, "above"));
console.log("  ", await dump());

console.log("\n6. Reorder KEYPT out of the PARA stack entirely (drag far away):", await reorderBlockAction(diseaseId, KEYPT, THIRD, "after"));
console.log("  ", await dump());

await pool.query(`DELETE FROM editorial_block WHERE id = ANY($1::uuid[])`, [ids]);
console.log("\nCleaned up.");
await pool.end();
