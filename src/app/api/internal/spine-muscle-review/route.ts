import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds a "muscles at a glance" review table at the end of the
// Spine Anatomy page's Muscles section on production. Placed by content
// anchor (the page is edited live), inserted once, and skipped if already
// present. POST {dryRun:true} reports what would be done without writing.
// Remove this route once run.

const SLUG = "spine-anatomy";
const MARKER = "Least clinically important back muscles";

const COLUMNS = ["Muscle", "Group", "Main action", "Innervation", "Key point"];

const ROWS: string[][] = [
  [
    "<strong>Trapezius, latissimus dorsi, rhomboids, levator scapulae</strong>",
    "Superficial (extrinsic)",
    "Move the scapula and humerus (upper limb), not the vertebrae",
    "Ventral rami (plus spinal accessory for trapezius)",
    "Limb muscles that happen to attach to the spine — <strong>not true back muscles</strong>",
  ],
  [
    "<strong>Serratus posterior superior and inferior</strong>",
    "Intermediate",
    "Conventionally described as accessory respiratory muscles",
    "Intercostal nerves (ventral rami)",
    "Least clinically important back muscles; respiratory function doubtful; not examinable or treatable as discrete muscles",
  ],
  [
    "<strong>Splenius capitis and cervicis</strong>",
    "Deep — spinotransverse",
    "Bilaterally: <strong>extend the head and neck</strong>. Unilaterally: side-bend and rotate to the <strong>SAME</strong> side",
    "Dorsal rami (cervical nerves)",
    "Fibres run up and <strong>OUT</strong>, opposite to transversospinalis; splenius capitis lies superficial to semispinalis capitis and they turn the head in opposite directions",
  ],
  [
    "<strong>Erector spinae</strong> (iliocostalis, longissimus, spinalis)",
    "Deep — erector spinae",
    "Bilaterally: extend the spine and control the return from flexion. Unilaterally: side-bend to the same side",
    "Dorsal rami",
    "Work mostly eccentrically, controlling forward flexion; they switch <strong>OFF</strong> at full flexion — that relaxation is lost in chronic low back pain",
  ],
  [
    "<strong>Semispinalis</strong> (thoracis, cervicis, capitis)",
    "Deep — transversospinalis",
    "Bilaterally: extension (capitis is a <strong>major neck extensor</strong>). Unilaterally: contralateral rotation",
    "Dorsal rami",
    "Most superficial of the group; spans <strong>4–6</strong> segments; the greater occipital nerve pierces capitis (occipital neuralgia, GON block site)",
  ],
  [
    "<strong>Multifidus</strong>",
    "Deep — transversospinalis",
    "Segmental control and stability; bilaterally assists extension; unilaterally assists contralateral rotation",
    "Medial branch of the dorsal ramus of the segment it arises from (strictly segmental)",
    "Spans <strong>2–4</strong> segments, thickest in the lumbar spine; a stabiliser, not a major trunk mover; atrophy is <strong>level-specific</strong>; medial branch radiofrequency denervates it",
  ],
  [
    "<strong>Rotatores</strong> (breves, longi)",
    "Deep — transversospinalis",
    "Classically extend (bilateral) and rotate to the opposite side (unilateral), but produce little gross movement — function as <strong>proprioceptive transducers</strong>",
    "Dorsal rami",
    "Span <strong>1</strong> (breves) or <strong>2</strong> (longi) segments; best developed in the thoracic spine; <strong>highest muscle spindle density</strong> of any muscle",
  ],
  [
    "<strong>Interspinales</strong>",
    "Deep — segmental",
    "Assist spinal extension; segmental control and proprioception",
    "Dorsal rami",
    "Between adjacent spinous processes; best developed cervical and lumbar",
  ],
  [
    "<strong>Intertransversarii</strong>",
    "Deep — segmental",
    "Assist ipsilateral lateral flexion; fine control and proprioception",
    "Mostly dorsal rami; the anterior cervical ones are supplied by <strong>ventral rami</strong>",
    "Between adjacent transverse processes; best developed cervical and lumbar; poorly developed or often absent in the thoracic region",
  ],
  [
    "<strong>Levatores costarum</strong>",
    "Deep — segmental",
    "—",
    "Dorsal rami",
    "Transverse process → the rib below; <strong>thoracic only</strong>",
  ],
  [
    "<strong>Suboccipital muscles</strong> (rectus capitis posterior major and minor, obliquus capitis superior and inferior)",
    "Deep — suboccipital",
    "Head extension; ipsilateral rotation (rectus capitis posterior major; obliquus capitis inferior rotates C1 on C2); obliquus capitis superior also ipsilateral lateral flexion",
    "Suboccipital nerve (dorsal ramus of C1)",
    "Extraordinarily high spindle density — principally <strong>proprioceptive</strong>; the suboccipital triangle contains the <strong>vertebral artery</strong>",
  ],
  [
    "<strong>Longus colli</strong>",
    "Deep cervical flexors",
    "<strong>Craniocervical flexion</strong>; segmental control of the cervical lordosis",
    "Ventral rami C2–C6",
    "The <strong>cervical equivalent of multifidus</strong>: inhibited and atrophic in neck pain while SCM and scalenes become overactive; assessed with the craniocervical flexion test",
  ],
  [
    "<strong>Longus capitis</strong>",
    "Deep cervical flexors",
    "Craniocervical flexion",
    "Ventral rami C1–C3",
    "Transverse processes C3–C6 → basilar part of the occiput; lies on the anterior vertebral bodies with longus colli",
  ],
  [
    "<strong>Rectus capitis anterior / lateralis</strong>",
    "Deep cervical flexors",
    "Small; atlanto-occipital control",
    "Ventral rami C1–C2",
    "C1 → occiput; short prevertebral muscles stabilising the atlanto-occipital region",
  ],
  [
    "<strong>External oblique</strong>",
    "Anterior / lateral trunk",
    "Flexion; rotation to the <strong>OPPOSITE</strong> side",
    "Ventral rami (T7–T11, T12, L1)",
    "Fibres run inferomedially (“hands in pockets”); with the opposite internal oblique it forms the <strong>oblique couple</strong> that rotates the trunk — lumbar facets allow only about 2° per segment",
  ],
  [
    "<strong>Internal oblique</strong>",
    "Anterior / lateral trunk",
    "Flexion; rotation to the <strong>SAME</strong> side",
    "Ventral rami (T7–T11, T12, L1)",
    "Fibres run superomedially, perpendicular to external oblique; <strong>forced rotation damages the annulus</strong>",
  ],
  [
    "<strong>Transversus abdominis</strong>",
    "Anterior / lateral trunk",
    "Compresses the abdomen; <strong>raises intra-abdominal pressure</strong>; tensions the thoracolumbar fascia",
    "Ventral rami (T7–T11, T12, L1)",
    "The abdominal muscle that acts on the spine (via the lateral raphe); <strong>delayed anticipatory activation</strong> in low back pain — a timing deficit, not strength",
  ],
  [
    "<strong>Rectus abdominis</strong>",
    "Anterior / lateral trunk",
    "Trunk <strong>flexion</strong>",
    "Ventral rami (T7–T11, T12, L1)",
    "Vertical fibres; in diastasis recti assess whether the patient can generate tension across the midline, not just the gap",
  ],
  [
    "<strong>Quadratus lumborum</strong>",
    "Anterior / lateral trunk",
    "<strong>Lateral flexion</strong> of the lumbar spine; bilaterally assists extension; <strong>fixes the 12th rib</strong> during inspiration",
    "Ventral rami — subcostal (T12) and L1–L4",
    "Respiratory as well as spinal (stable base for the diaphragm); a source of unilateral deep lumbar pain; overactive where gluteus medius is weak",
  ],
  [
    "<strong>Psoas major</strong>",
    "Anterior / lateral trunk",
    "Hip flexion; on the lumbar spine probably <strong>compressive and stabilising</strong>",
    "Ventral rami of <strong>L1–L3 directly</strong> (not the femoral nerve)",
    "Attaches to every lumbar vertebral body and disc; hip flexion may be relatively preserved in a femoral nerve lesion; a psoas haematoma or abscess can compress the femoral nerve",
  ],
  [
    "<strong>Scalenus anterior, medius, posterior</strong>",
    "Cervical (superficial)",
    "Lateral flexion; elevate the 1st rib (anterior and medius) or 2nd rib (posterior) — accessory inspiration",
    "Ventral rami (anterior C4–C6; medius C3–C8; posterior C6–C8)",
    "Scalenus anterior and medius with the 1st rib bound the <strong>interscalene triangle</strong> (brachial plexus and subclavian artery) — the basis of thoracic outlet syndrome",
  ],
  [
    "<strong>Sternocleidomastoid</strong>",
    "Cervical (superficial)",
    "Unilaterally: <strong>contralateral rotation + ipsilateral side-bend</strong>. Bilaterally: flexion of the lower cervical spine with extension of the upper",
    "Spinal accessory (CN XI) + C2–C3 proprioceptive",
    "Involved in congenital muscular torticollis; the principal overactive muscle in the forward head pattern",
  ],
];

interface Row {
  id: string;
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}

const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const textOf = (r: Row) => strip(r.content_config?.text ?? r.content_config?.body);

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
    const diseaseId = d[0]?.id;
    if (!diseaseId) throw new Error("disease not found");

    const { rows } = await client.query<Row>(
      `SELECT id, position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const start = rows.findIndex((r) => r.block_type === "section_heading" && /muscles/i.test(textOf(r)));
    if (start < 0) throw new Error("Muscles section not found");
    let end = rows.findIndex((r, i) => i > start && r.block_type === "section_heading");
    if (end < 0) end = rows.length;

    const already = rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config).includes(MARKER));
    if (already) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: true, existingPosition: already.position });
    }

    const anchor = rows[end - 1];
    if (!anchor || anchor.position <= rows[start].position) throw new Error("no block at the end of the Muscles section");
    const plan = {
      anchorPosition: anchor.position,
      anchorType: anchor.block_type,
      anchorPreview: textOf(anchor).slice(0, 80),
      nextAfter: textOf(rows[end] ?? ({ content_config: null } as unknown as Row)).slice(0, 40),
      rowsInTable: ROWS.length,
    };
    if (!/The interscalene triangle/.test(textOf(anchor))) {
      throw new Error(`end-of-section anchor is not the expected block: ${JSON.stringify(plan)}`);
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    // Same two-pass shift insertBlockAction's makeRoomAfter uses (the
    // unique constraint rules out a single UPDATE).
    await client.query(`UPDATE editorial_block SET position = -(position + 2) WHERE disease_id = $1 AND position > $2`, [diseaseId, anchor.position]);
    await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
    const ids: string[] = [];
    const heading = await client.query<{ id: string }>(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'subsection_heading', $3) RETURNING id`,
      [diseaseId, anchor.position + 1, JSON.stringify({ text: "7.9 Review — the muscles at a glance" })]
    );
    ids.push(heading.rows[0].id);
    const tbl = await client.query<{ id: string }>(
      `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, 'comparison_table', $3) RETURNING id`,
      [diseaseId, anchor.position + 2, JSON.stringify({ columns: COLUMNS, rows: ROWS })]
    );
    ids.push(tbl.rows[0].id);

    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, plan, ids });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
