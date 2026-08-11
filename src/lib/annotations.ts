import { pool } from "@/lib/db";

// Private, per-member text-quote annotations — exam-study margin
// notes on disease prose, visible only to the member who made them.
// Same pool.query pattern as study-planner.ts: no ORM, ownership baked
// into every WHERE clause rather than checked separately. Unlike
// note.ts's single-scratchpad-per-disease shape, a disease can have
// many annotations, so there's no unique-per-(user,disease) upsert
// here — each is its own row, created/updated/deleted independently.

export interface Annotation {
  id: string;
  diseaseId: string;
  blockId: string;
  blockField: string;
  quotePrefix: string;
  quoteExact: string;
  quoteSuffix: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationInput {
  blockId: string;
  blockField: string;
  quotePrefix: string;
  quoteExact: string;
  quoteSuffix: string;
  body: string;
}

export interface AnnotationWithDisease extends Annotation {
  diseaseSlug: string;
  diseaseName: string;
}

function mapAnnotationRow(r: {
  id: string;
  disease_id: string;
  block_id: string;
  block_field: string;
  quote_prefix: string;
  quote_exact: string;
  quote_suffix: string;
  body: string;
  created_at: Date | string;
  updated_at: Date | string;
}): Annotation {
  return {
    id: r.id,
    diseaseId: r.disease_id,
    blockId: r.block_id,
    blockField: r.block_field,
    quotePrefix: r.quote_prefix,
    quoteExact: r.quote_exact,
    quoteSuffix: r.quote_suffix,
    body: r.body,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}

const ANNOTATION_COLUMNS = `
  id, disease_id, block_id, block_field, quote_prefix, quote_exact,
  quote_suffix, body, created_at, updated_at
`;

export async function getAnnotationsForDisease(
  userId: string,
  diseaseId: string,
): Promise<Annotation[]> {
  const { rows } = await pool.query(
    `SELECT ${ANNOTATION_COLUMNS} FROM annotation
     WHERE user_id = $1 AND disease_id = $2
     ORDER BY created_at ASC`,
    [userId, diseaseId],
  );
  return rows.map(mapAnnotationRow);
}

export async function getAllAnnotationsForUser(
  userId: string,
): Promise<AnnotationWithDisease[]> {
  const { rows } = await pool.query(
    `SELECT a.id, a.disease_id, a.block_id, a.block_field, a.quote_prefix, a.quote_exact,
            a.quote_suffix, a.body, a.created_at, a.updated_at,
            d.slug AS disease_slug, d.canonical_name AS disease_name
     FROM annotation a
     JOIN disease d ON d.id = a.disease_id
     WHERE a.user_id = $1
     ORDER BY d.canonical_name ASC, a.created_at ASC`,
    [userId],
  );
  return rows.map((r) => ({
    ...mapAnnotationRow(r),
    diseaseSlug: r.disease_slug,
    diseaseName: r.disease_name,
  }));
}

export async function createAnnotation(
  userId: string,
  diseaseId: string,
  input: AnnotationInput,
): Promise<Annotation> {
  const { rows } = await pool.query(
    `INSERT INTO annotation
       (user_id, disease_id, block_id, block_field, quote_prefix, quote_exact, quote_suffix, body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${ANNOTATION_COLUMNS}`,
    [
      userId,
      diseaseId,
      input.blockId,
      input.blockField,
      input.quotePrefix,
      input.quoteExact,
      input.quoteSuffix,
      input.body,
    ],
  );
  return mapAnnotationRow(rows[0]);
}

export async function updateAnnotationBody(
  userId: string,
  annotationId: string,
  body: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE annotation SET body = $3, updated_at = now()
     WHERE id = $1 AND user_id = $2`,
    [annotationId, userId, body],
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteAnnotation(userId: string, annotationId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM annotation WHERE id = $1 AND user_id = $2`,
    [annotationId, userId],
  );
  return (rowCount ?? 0) > 0;
}
