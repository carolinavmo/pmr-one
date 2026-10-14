import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — adds the missing Section 7 (The Muscles) subsections to the
// Spine Anatomy page on production, from spine-muscles-missing-sections.md.
// Everything is placed by content anchors (never by hardcoded position, the
// page is edited live), all-or-nothing in one transaction, and each piece is
// skipped if it is already there. POST {dryRun:true} reports what would be
// done without writing. Remove this route once run.

const SLUG = "spine-anatomy";

type Block = { type: string; content: Record<string, unknown> };

const sub = (text: string): Block => ({ type: "subsection_heading", content: { text } });
const subsub = (text: string): Block => ({ type: "subsubsection_heading", content: { text } });
const para = (body: string): Block => ({ type: "paragraph", content: { body } });
const table = (columns: string[], rows: string[][]): Block => ({ type: "comparison_table", content: { columns, rows } });
const pearl = (text: string): Block => ({ type: "highlight_card", content: { label: "PM&R clinical pearl", color: "teal", text } });
const aid = (text: string): Block => ({ type: "highlight_card", content: { label: "Memory aid", color: "green", text } });

interface Piece {
  name: string;
  // Block the new blocks go directly after, found by content.
  anchor: (rows: Row[], start: number, end: number) => number;
  anchorGuard: (row: Row) => boolean;
  // A comparison_table containing this text means the piece is already there.
  marker: string;
  blocks: Block[];
}

interface Row {
  id: string;
  position: number;
  block_type: string;
  content_config: Record<string, unknown> | null;
}

const strip = (s: unknown) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const textOf = (r: Row) => strip(r.content_config?.text ?? r.content_config?.body);
const idxOf = (rows: Row[], from: number, to: number, test: (r: Row) => boolean) => {
  for (let i = from; i < to; i++) if (test(rows[i])) return i;
  return -1;
};

// ---------------------------------------------------------------- content

const SPLENII: Block[] = [
  subsub("Spinotransverse — the splenii"),
  para(
    "<p>The most superficial tier of the deep group. Fibres run from <strong>spinous processes upward and laterally to transverse processes</strong> — the <strong>opposite</strong> direction to the transversospinalis group beneath them.</p>"
  ),
  table(
    ["Muscle", "Origin", "Insertion", "Innervation"],
    [
      [
        "<strong>Splenius capitis</strong>",
        "Lower nuchal ligament, spinous processes <strong>C7–T3</strong>",
        "<strong>Mastoid process</strong> and lateral third of the superior nuchal line",
        "Dorsal rami of middle cervical nerves",
      ],
      [
        "<strong>Splenius cervicis</strong>",
        "Spinous processes <strong>T3–T6</strong>",
        "Posterior tubercles of the transverse processes of <strong>C1–C3</strong>",
        "Dorsal rami of lower cervical nerves",
      ],
    ]
  ),
  para(
    "<p><strong>Actions</strong></p><ul><li>Bilaterally → <strong>extend the head and neck</strong></li><li>Unilaterally → <strong>side-bend and rotate to the SAME side</strong></li></ul>"
  ),
  aid(
    "<strong>Two opposing diagonals in the neck.</strong> The splenii run <strong>up and OUT</strong> (spinous → transverse) and rotate to the <strong>same</strong> side. Transversospinalis runs <strong>up and IN</strong> (transverse → spinous) and rotates to the <strong>opposite</strong> side.<br>That is why <strong>splenius capitis and semispinalis capitis</strong>, which lie directly on top of one another, turn the head in opposite directions — and why they are described as a functional pair rather than synergists."
  ),
  pearl(
    "Splenius capitis is <strong>superficial to semispinalis capitis</strong>, and both lie deep to trapezius in the posterior neck. Much of what is palpated and labelled “trapezius tightness” is in fact one of these two.<br>The splenii are also commonly implicated in <strong>cervicogenic headache</strong> patterns and are part of the extensor group that becomes overactive when the <strong>deep cervical flexors are inhibited</strong> (see 7.5)."
  ),
];

const SEGMENTAL: Block[] = [
  table(
    ["Muscle", "Course", "Region", "Innervation"],
    [
      ["<strong>Interspinales</strong>", "Between adjacent <strong>spinous processes</strong>", "Best developed <strong>cervical and lumbar</strong>", "Dorsal rami"],
      [
        "<strong>Intertransversarii</strong>",
        "Between adjacent <strong>transverse processes</strong>",
        "Best developed <strong>cervical and lumbar</strong>",
        "Mostly dorsal rami; the <strong>anterior cervical</strong> ones are supplied by <strong>ventral rami</strong>",
      ],
      ["<strong>Levatores costarum</strong>", "Transverse process → the <strong>rib below</strong>", "<strong>Thoracic only</strong>", "Dorsal rami"],
    ]
  ),
  para(
    "<p><strong>What they actually do</strong></p><p>Very little movement. Like the rotatores above them, they are <strong>short, act within millimetres of the joint axis, and are densely populated with muscle spindles</strong>. The current view is that they function principally as <strong>proprioceptive transducers</strong>, reporting segmental position to the nervous system.</p>"
  ),
  aid(
    "<strong>The gradient completes here.</strong> Semispinalis (4–6 segments) moves. Multifidus (2–4) stiffens. Rotatores (1–2) sense. The segmental muscles (1) sense almost exclusively.<br><strong>The shorter the muscle, the more it senses and the less it moves.</strong>"
  ),
  pearl(
    "These muscles are <strong>not separately testable, palpable or treatable</strong>, and no rehabilitation programme targets them specifically. Their value is conceptual: they are the anatomical evidence that the deep spinal system exists for <strong>sensorimotor control rather than force production</strong> — which is the argument underlying motor control training and proprioceptive retraining."
  ),
];

const CERVICAL_FLEXORS: Block[] = [
  table(
    ["Muscle", "Origin → Insertion", "Innervation", "Action"],
    [
      [
        "<strong>Longus colli</strong>",
        "Anterior vertebral bodies and transverse processes, <strong>C1–T3</strong>; three parts (superior oblique, inferior oblique, vertical)",
        "Ventral rami <strong>C2–C6</strong>",
        "<strong>Craniocervical flexion</strong>; segmental control of the cervical lordosis",
      ],
      [
        "<strong>Longus capitis</strong>",
        "Transverse processes <strong>C3–C6</strong> → basilar part of the occiput",
        "Ventral rami <strong>C1–C3</strong>",
        "Craniocervical flexion",
      ],
      ["<strong>Rectus capitis anterior / lateralis</strong>", "C1 → occiput", "Ventral rami C1–C2", "Small; atlanto-occipital control"],
    ]
  ),
  pearl(
    "<strong>The deep cervical flexors are the cervical multifidus.</strong> They lie directly on the anterior vertebral bodies, produce the <strong>nod</strong> rather than the crunch, and stabilise the lordosis segmentally.<br>In neck pain they are <strong>inhibited and atrophic</strong>, while the superficial <strong>sternocleidomastoid and scalenes become overactive</strong> — a reciprocal pattern that is reproducible enough to be the basis of assessment.<br><strong>Test with the craniocervical flexion test</strong>, using a pressure biofeedback unit behind the neck: the patient performs a gentle nod at progressive pressure targets without superficial substitution. The common errors are jaw clenching, head retraction, breath-holding and visible SCM activity — and recognising those substitutions is most of the skill."
  ),
];

const TLF: Block[] = [
  para(
    "<p>The thoracolumbar fascia is not a passive wrapping. It is the <strong>connective tissue hub of the lumbar spine</strong> — the structure through which muscles that never touch the spine still act on it.</p>"
  ),
  table(
    ["Layer", "Position", "Attachments"],
    [
      [
        "<strong>Posterior</strong>",
        "Superficial to erector spinae",
        "Spinous processes medially; iliac crest and sacrum below. <strong>Receives latissimus dorsi and gluteus maximus</strong>",
      ],
      [
        "<strong>Middle</strong>",
        "Between erector spinae and quadratus lumborum",
        "Transverse process tips laterally. <strong>Receives transversus abdominis</strong>",
      ],
      ["<strong>Anterior</strong>", "Anterior to quadratus lumborum", "Transverse processes; continuous with the psoas fascia"],
    ]
  ),
  para(
    "<p>The posterior and middle layers fuse laterally at the <strong>lateral raphe</strong>, where transversus abdominis and internal oblique attach. <strong>That fusion point is the mechanical crux</strong>: when transversus abdominis contracts, it pulls on the raphe and tensions the whole posterior layer.</p>"
  ),
  pearl(
    "<strong>The thoracolumbar fascia lets distant muscles act on the spine.</strong><br>Its posterior layer receives <strong>latissimus dorsi on one side and the contralateral gluteus maximus</strong> on the other, their fibres crossing the midline:<br><strong>Latissimus dorsi (shoulder) → posterior layer → contralateral gluteus maximus (hip)</strong> — a continuous diagonal band from arm to opposite leg.<br>This is the anatomical basis of <strong>force closure across the sacroiliac joint</strong>. It is why gluteal and latissimus strengthening belong in SIJ and pelvic girdle programmes, and why <strong>contralateral arm–leg patterns</strong> (opposite arm and leg reaching, walking, running) are mechanically coherent rather than arbitrary exercise choices.<br>Biceps femoris contributes through its continuity with the <strong>sacrotuberous ligament</strong>, extending the sling into the hamstring.<br><strong>The fascia is also densely innervated</strong> — particularly the posterior layer and the overlying subcutaneous tissue — and contains both nociceptors and mechanoreceptors. It is increasingly regarded as a <strong>pain generator in its own right</strong>, which is worth remembering when imaging shows nothing to explain a patient's symptoms."
  ),
];

const TWO_COL = ["", "Detail"];

const END_OF_SECTION: Block[] = [
  // ------------------------------------------------ 7.7 anterior / lateral
  sub("7.7 The anterior and lateral trunk"),
  para(
    "<p>The back muscles are only half of the trunk. The abdominal wall, quadratus lumborum and psoas act on the lumbar spine directly, and all are supplied by <strong>ventral rami</strong>.</p>"
  ),
  subsub("The abdominal wall"),
  table(
    ["Muscle", "Origin → Insertion", "Fibre direction", "Action"],
    [
      [
        "<strong>External oblique</strong>",
        "Outer surface of <strong>ribs 5–12</strong> → iliac crest, linea alba, inguinal ligament",
        "<strong>Inferomedially</strong> — “hands in pockets”",
        "Flexion; <strong>rotation to the OPPOSITE side</strong>",
      ],
      [
        "<strong>Internal oblique</strong>",
        "Thoracolumbar fascia, iliac crest, inguinal ligament → <strong>ribs 10–12</strong>, linea alba",
        "<strong>Superomedially</strong> — perpendicular to external oblique",
        "Flexion; <strong>rotation to the SAME side</strong>",
      ],
      [
        "<strong>Transversus abdominis</strong>",
        "Thoracolumbar fascia, iliac crest, inguinal ligament, costal cartilages 7–12 → linea alba via aponeurosis",
        "<strong>Horizontal</strong>",
        "Compresses the abdomen; <strong>raises intra-abdominal pressure</strong>; tensions the thoracolumbar fascia",
      ],
      [
        "<strong>Rectus abdominis</strong>",
        "Pubic crest and symphysis → costal cartilages <strong>5–7</strong> and xiphoid",
        "Vertical",
        "Trunk <strong>flexion</strong>",
      ],
    ]
  ),
  para(
    "<p><strong>Innervation:</strong> ventral rami — thoracoabdominal nerves <strong>T7–T11</strong>, subcostal <strong>T12</strong>, and <strong>L1</strong> (iliohypogastric and ilioinguinal) for the lowest fibres.</p>"
  ),
  pearl(
    "<strong>The obliques are the trunk rotators — not the back muscles.</strong><br>The sagittal lumbar facets permit only about <strong>2° of rotation per segment</strong>, so the lumbar spine itself contributes almost nothing to trunk rotation. What actually rotates the trunk is the <strong>oblique couple</strong>:<ul><li><strong>Rotation to the LEFT</strong> = <strong>right external oblique + left internal oblique</strong></li><li><strong>Rotation to the RIGHT</strong> = <strong>left external oblique + right internal oblique</strong></li></ul>This matters clinically in two ways. It explains why rotational trunk strengthening is an abdominal task rather than a back task — and it is why <strong>forced rotation damages the annulus</strong>: the obliques can generate rotational torque that the facets are built to block, so the disc absorbs what the facets refuse to allow."
  ),
  pearl(
    "<strong>Transversus abdominis is the one that acts on the spine.</strong><br>Its horizontal fibres attach into the <strong>lateral raphe</strong>, where the posterior and middle layers of the thoracolumbar fascia fuse. When it contracts it pulls on that raphe and <strong>tensions the fascia</strong>, converting intra-abdominal pressure into <strong>segmental lumbar stiffness</strong> (see 7.6).<br>It is also the muscle that, with multifidus, shows <strong>delayed anticipatory activation</strong> in low back pain — normally firing a fraction of a second <em>before</em> limb movement, and arriving late in people with back pain. The deficit is <strong>timing, not strength</strong>."
  ),
  para(
    "<p><strong>Diastasis recti</strong> — separation at the linea alba, common postpartum and with obesity. Assess the <strong>inter-recti distance</strong> and, more usefully, whether the patient can generate tension across the midline rather than simply measuring the gap. Management is load-graded abdominal training, not avoidance.</p>"
  ),
  subsub("Quadratus lumborum"),
  table(TWO_COL, [
    ["<strong>Origin</strong>", "Iliac crest and iliolumbar ligament"],
    ["<strong>Insertion</strong>", "<strong>12th rib</strong> and transverse processes of <strong>L1–L4</strong>"],
    ["<strong>Innervation</strong>", "<strong>Ventral rami</strong> — subcostal (T12) and L1–L4"],
    ["<strong>Action</strong>", "<strong>Lateral flexion</strong> of the lumbar spine; bilaterally assists extension; <strong>fixes the 12th rib</strong> during inspiration"],
  ]),
  pearl(
    "<strong>Quadratus lumborum is a respiratory muscle as well as a spinal one.</strong><br>By anchoring the 12th rib it gives the <strong>diaphragm a stable base</strong> to pull against. That is the anatomical link between breathing pattern and lumbopelvic control, and part of why a patient who cannot breathe normally while holding a position has a <strong>control problem rather than a strength problem</strong>.<br>Clinically it is a genuine source of <strong>unilateral deep lumbar pain</strong>, often with tenderness between the 12th rib and the iliac crest, and it is frequently overactive where the <strong>gluteus medius is weak</strong> — the hip hitching pattern."
  ),
  subsub("Psoas major"),
  table(TWO_COL, [
    ["<strong>Origin</strong>", "<strong>T12–L5</strong> vertebral bodies, transverse processes and <strong>intervertebral discs</strong>"],
    ["<strong>Insertion</strong>", "<strong>Lesser trochanter</strong> of the femur (with iliacus, as iliopsoas)"],
    ["<strong>Innervation</strong>", "<strong>Ventral rami of L1–L3 directly</strong> — not through the femoral nerve"],
    ["<strong>Action</strong>", "Hip flexion; its action on the lumbar spine is debated — probably <strong>compressive and stabilising</strong> rather than lordosis-producing"],
  ]),
  pearl(
    "<strong>Psoas is a spine muscle, not just a hip flexor.</strong> It attaches to every lumbar vertebral body and disc, which makes it the direct mechanical link between the hip and the lumbar spine.<br>Two consequences:<ul><li><strong>Hip flexion contracture</strong> drives anterior pelvic tilt and lumbar extension, loading the posterior elements. This is part of the hip–spine interaction, and it is why hip extension mobility appears in facet-pain programmes.</li><li>Its <strong>separate innervation</strong> is diagnostically useful: psoas is supplied directly by the <strong>L1–L3 ventral rami</strong>, while iliacus is supplied by the <strong>femoral nerve</strong>. So <strong>hip flexion may be relatively preserved in a femoral nerve lesion</strong> — weak knee extension with preserved hip flexion points to the femoral nerve, whereas both weak points higher, to the plexus or the roots.</li></ul>A <strong>psoas haematoma or abscess</strong> (retroperitoneal, classically in anticoagulated patients) can compress the femoral nerve within the iliacus compartment. The presentation is a painful hip held in flexion with quadriceps weakness and anteromedial thigh numbness — easy to miss and important not to."
  ),

  // ------------------------------------------------ 7.8 cervical counterparts
  sub("7.8 The cervical counterparts"),
  para(
    "<p>The neck has the same deep-versus-superficial pattern as the lumbar spine, and the same reciprocal behaviour in pain. The deep flexors are covered in 7.5; the superficial ones follow here.</p>"
  ),
  subsub("The scalenes and sternocleidomastoid"),
  table(
    ["Muscle", "Origin → Insertion", "Innervation", "Action"],
    [
      [
        "<strong>Scalenus anterior</strong>",
        "Transverse processes <strong>C3–C6</strong> → <strong>scalene tubercle</strong> of the 1st rib",
        "Ventral rami C4–C6",
        "Lateral flexion; elevates the 1st rib (accessory inspiration)",
      ],
      [
        "<strong>Scalenus medius</strong>",
        "Transverse processes <strong>C2–C7</strong> → 1st rib, behind the subclavian groove",
        "Ventral rami C3–C8",
        "As above",
      ],
      [
        "<strong>Scalenus posterior</strong>",
        "Transverse processes <strong>C4–C6</strong> → <strong>2nd rib</strong>",
        "Ventral rami C6–C8",
        "As above",
      ],
      [
        "<strong>Sternocleidomastoid</strong>",
        "Manubrium and medial clavicle → <strong>mastoid</strong> and superior nuchal line",
        "<strong>Spinal accessory (CN XI)</strong> + C2–C3 proprioceptive",
        "Unilaterally: <strong>contralateral rotation + ipsilateral side-bend</strong>. Bilaterally: flexion of the lower cervical spine with extension of the upper",
      ],
    ]
  ),
  pearl(
    "<strong>The interscalene triangle</strong> — bounded by <strong>scalenus anterior in front, scalenus medius behind, and the 1st rib below</strong> — transmits the <strong>brachial plexus and the subclavian artery</strong>. The subclavian <strong>vein</strong> passes <strong>anterior</strong> to scalenus anterior, outside the triangle.<br>That anatomy is the basis of <strong>thoracic outlet syndrome</strong>, and the position of the vein explains why venous TOS presents differently from neurogenic TOS.<br>A <strong>cervical rib</strong>, arising from an elongated C7 transverse process in about 0.5–1% of people, narrows the triangle further and is a recognised cause of <strong>true neurogenic TOS</strong>.<br><strong>Sternocleidomastoid</strong> is the muscle involved in <strong>congenital muscular torticollis</strong> (ipsilateral side-bend with contralateral rotation) and is the principal overactive muscle in the forward head pattern."
  ),

  // ------------------------------------------------ 7.9 assessing
  sub("7.9 Assessing the trunk muscles"),
  para(
    "<p>Trunk <strong>endurance</strong> discriminates between people with and without low back pain considerably better than trunk <strong>strength</strong> does. These are the practical bedside measures.</p>"
  ),
  table(
    ["Test", "Position", "What it measures", "Rough normative time"],
    [
      [
        "<strong>Biering-Sørensen</strong>",
        "Prone, trunk unsupported beyond the edge of the plinth, pelvis and legs strapped; hold the trunk horizontal",
        "<strong>Extensor endurance</strong>",
        "~100–150 s in healthy adults; considerable variation by age, sex and study",
      ],
      [
        "<strong>Flexor endurance</strong>",
        "Seated, trunk supported at <strong>60°</strong>, feet fixed; support removed and the position held",
        "<strong>Flexor endurance</strong>",
        "~100–150 s",
      ],
      [
        "<strong>Side bridge</strong>",
        "Side-lying, propped on elbow and feet, hips lifted; both sides",
        "<strong>Lateral endurance</strong> and left–right symmetry",
        "~75–95 s",
      ],
    ]
  ),
  para(
    "<p><strong>McGill's ratios</strong> are often more useful than the absolute times, because they describe <strong>balance</strong> rather than capacity:</p><ul><li>Flexion : extension <strong>&lt; 1.0</strong></li><li>Side bridge : extension <strong>&lt; 0.75</strong></li><li>Right : left side bridge within about <strong>5%</strong></li></ul>"
  ),
  pearl(
    "<strong>Reduced extensor endurance is associated with low back pain, and has some prospective predictive value — but be honest about its limits.</strong> Normative values vary widely between studies and populations, the tests are effort-dependent and pain-limited, and a poor result in a painful patient may reflect pain rather than deconditioning.<br>Use them as a <strong>repeatable within-patient measure</strong> to track change over time, not as a diagnostic threshold."
  ),
  subsub("Imaging the paraspinal muscles"),
  para(
    "<p><strong>Ultrasound</strong> is the practical tool for <strong>multifidus</strong>: measure cross-sectional area in the parasagittal plane, compare sides at the symptomatic level, and use it for <strong>real-time biofeedback</strong> during retraining — which is arguably its more valuable application, since patients find deep segmental activation genuinely hard to feel.</p>"
  ),
  para(
    "<p><strong>MRI</strong> is best assessed on <strong>axial T2</strong>. Look for:</p><ul><li><strong>Asymmetry</strong> in cross-sectional area between sides at the same level</li><li><strong>Fatty infiltration</strong>, appearing as bright streaking within the muscle</li></ul><p>Fatty infiltration is commonly graded with a <strong>Goutallier-type scale</strong> adapted from the rotator cuff literature.</p>"
  ),
  pearl(
    "<strong>Interpret paraspinal muscle imaging cautiously.</strong> Fatty infiltration correlates with <strong>age and BMI as well as with pain</strong>, so it is not a specific marker. It is a reasonable indicator of <strong>chronicity</strong> and a useful thing to show a patient when explaining a retraining programme — but it does not establish causation, and it should not be presented as the explanation for their pain."
  ),
];

// ---------------------------------------------------------------- pieces

const PIECES: Piece[] = [
  {
    name: "A: splenii (end of 7.1, after the Deep group)",
    anchor: (rows, s, e) => {
      const h = idxOf(rows, s, e, (r) => r.block_type === "subsection_heading" && /^7\.2\s+erector spinae/i.test(textOf(r)));
      return h < 0 ? -1 : h - 1;
    },
    anchorGuard: (r) => r.block_type === "paragraph" && textOf(r).includes("supplied by dorsal rami"),
    marker: "Dorsal rami of middle cervical nerves",
    blocks: SPLENII,
  },
  {
    name: "B: segmental muscles table, aid and pearl",
    anchor: (rows, s, e) => {
      const h = idxOf(rows, s, e, (r) => r.block_type === "subsubsection_heading" && /^suboccipital muscles$/i.test(textOf(r)));
      return h < 0 ? -1 : h - 1;
    },
    anchorGuard: (r) => r.block_type === "simple_image",
    marker: "Between adjacent <strong>spinous processes</strong>",
    blocks: SEGMENTAL,
  },
  {
    name: "C: deep cervical flexors table and pearl",
    anchor: (rows, s, e) => {
      const h = idxOf(rows, s, e, (r) => r.block_type === "subsection_heading" && /^7\.6\s+the thoracolumbar fascia/i.test(textOf(r)));
      return h < 0 ? -1 : h - 1;
    },
    anchorGuard: (r) => r.block_type === "simple_image",
    marker: "Anterior vertebral bodies and transverse processes, <strong>C1–T3</strong>",
    blocks: CERVICAL_FLEXORS,
  },
  {
    name: "D: thoracolumbar fascia expansion",
    anchor: (rows, s, e) => {
      const h = idxOf(rows, s, e, (r) => r.block_type === "subsubsection_heading" && /^the canister model$/i.test(textOf(r)));
      return h < 0 ? -1 : h - 1;
    },
    anchorGuard: (r) => r.block_type === "simple_image",
    marker: "Receives latissimus dorsi and gluteus maximus",
    blocks: TLF,
  },
  {
    name: "E: new 7.7, 7.8, 7.9 at the end of Section 7",
    anchor: (rows, s, e) => e - 1,
    anchorGuard: (r) => r.block_type === "highlight_card" && textOf(r).includes("Core stability is a coordinated function"),
    marker: "hands in pockets",
    blocks: END_OF_SECTION,
  },
];

// ---------------------------------------------------------------- handler

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: d } = await client.query<{ id: string }>(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
    const diseaseId = d[0]?.id;
    if (!diseaseId) throw new Error("disease not found");

    // Lock the page's blocks so a live edit can't shift positions mid-run.
    const { rows } = await client.query<Row>(
      `SELECT id, position, block_type::text AS block_type, content_config FROM editorial_block WHERE disease_id = $1 ORDER BY position FOR UPDATE`,
      [diseaseId]
    );

    const start = idxOf(rows, 0, rows.length, (r) => r.block_type === "section_heading" && /muscles/i.test(textOf(r)));
    if (start < 0) throw new Error("Muscles section not found");
    let end = idxOf(rows, start + 1, rows.length, (r) => r.block_type === "section_heading");
    if (end < 0) end = rows.length;

    const plan: { name: string; skipped?: string; anchorPosition?: number; anchorPreview?: string; count: number }[] = [];
    const ops: { piece: Piece; anchorPosition: number }[] = [];

    for (const piece of PIECES) {
      const already = rows.find((r) => r.block_type === "comparison_table" && JSON.stringify(r.content_config).includes(piece.marker));
      if (already) {
        plan.push({ name: piece.name, skipped: `already present (table at position ${already.position})`, count: 0 });
        continue;
      }
      const i = piece.anchor(rows, start, end);
      if (i < 0) throw new Error(`${piece.name}: anchor heading not found`);
      if (!piece.anchorGuard(rows[i])) throw new Error(`${piece.name}: anchor block (position ${rows[i].position}, ${rows[i].block_type}) is not what was expected`);
      plan.push({ name: piece.name, anchorPosition: rows[i].position, anchorPreview: textOf(rows[i]).slice(0, 60), count: piece.blocks.length });
      ops.push({ piece, anchorPosition: rows[i].position });
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan, totalBlocks: ops.reduce((n, o) => n + o.piece.blocks.length, 0) });
    }

    // Highest anchor first, so shifting for a later piece never moves the
    // anchor of an earlier one. Same two-pass shift insertBlockAction's
    // makeRoomAfter uses (the unique constraint rules out a single UPDATE).
    ops.sort((a, b) => b.anchorPosition - a.anchorPosition);
    const inserted: { piece: string; ids: string[] }[] = [];
    for (const op of ops) {
      const n = op.piece.blocks.length;
      await client.query(`UPDATE editorial_block SET position = -(position + $3) WHERE disease_id = $1 AND position > $2`, [diseaseId, op.anchorPosition, n]);
      await client.query(`UPDATE editorial_block SET position = -position WHERE disease_id = $1 AND position < 0`, [diseaseId]);
      const ids: string[] = [];
      for (let k = 0; k < n; k++) {
        const b = op.piece.blocks[k];
        const { rows: ins } = await client.query<{ id: string }>(
          `INSERT INTO editorial_block (disease_id, position, block_type, content_config) VALUES ($1, $2, $3::editorial_block_type, $4) RETURNING id`,
          [diseaseId, op.anchorPosition + 1 + k, b.type, JSON.stringify(b.content)]
        );
        ids.push(ins[0].id);
      }
      inserted.push({ piece: op.piece.name, ids });
    }

    await client.query("COMMIT");
    revalidatePath("/[locale]/conditions/[slug]", "page");
    return NextResponse.json({ ok: true, plan, inserted: inserted.map((i) => ({ piece: i.piece, count: i.ids.length, firstId: i.ids[0], lastId: i.ids[i.ids.length - 1] })) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
