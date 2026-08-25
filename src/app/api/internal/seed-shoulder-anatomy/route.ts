import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Temporary, one-shot content-seeding route — same pattern as the
// earlier migrate-0048/fix-sample-position routes: hardcoded, idempotent
// SQL only, no user input, deleted right after it's triggered once.
// Inserts the "Shoulder Anatomy" reference page (already verified in
// local dev) into production's Anatomy folder.

function heading(text: string) {
  return { block_type: "section_heading", content_config: { text } };
}
function para(body: string) {
  return { block_type: "paragraph", content_config: { body } };
}
function table(title: string, columnTitles: string[], rows: string[][]) {
  return {
    block_type: "rich_table",
    content_config: {
      title,
      columns: columnTitles.map((t) => ({ title: t, type: "text" })),
      rows: rows.map((cells) => ({ cells })),
    },
  };
}
function card(label: string, text: string, color: string) {
  return { block_type: "highlight_card", content_config: { label, text, color } };
}
function selfCheck(question: string, answer: string) {
  return { block_type: "self_check", content_config: { question, answer } };
}

const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const ol = (items: string[]) => `<ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;

const SLUG = "shoulder-anatomy";

const blocks = [
  heading("How to Use This Chapter"),
  para(
    `This is pure anatomy. Biomechanics — scapulohumeral rhythm, force couples, kinematics, instability mechanics — belongs to the next chapter, kept out here except where a structure cannot be understood without a sentence of function.<br><br>But this is not anatomy for its own sake. Everything here is selected because a physiatrist needs it: to localize a lesion on needle EMG, to place a needle under ultrasound, to interpret an MRI report, to explain to a patient why their pain is where it is, or to write a rehabilitation prescription that respects tissue healing.<br><br>Read it once linearly. Then use the tables and the clinical boxes as reference.`
  ),

  heading("The Shoulder Is a Complex, Not a Joint"),
  para(
    `The first conceptual correction to make with every resident: when a patient says "my shoulder hurts," they have not localized anything. The shoulder complex comprises <strong>four articulations plus one functional interface</strong>, and pathology in any of them presents as "shoulder pain."`
  ),
  table(
    "The five components of the shoulder complex",
    ["Articulation", "Type", "Comment"],
    [
      ["Glenohumeral (GH)", "Synovial, ball-and-socket (spheroidal), 3 degrees of freedom", "The one everyone thinks of; the least intrinsically stable joint in the body"],
      ["Acromioclavicular (AC)", "Synovial, plane, with fibrocartilaginous disc", "Small, superficial, high load, frequently symptomatic"],
      ["Sternoclavicular (SC)", "Synovial, saddle, with complete intra-articular disc", "The only true bony articulation between the upper limb and the axial skeleton"],
      ["Scapulothoracic", "Not a true joint — a musculofascial gliding interface", "No capsule, no cartilage; two bursal layers; dysfunction here drives much of “impingement”"],
      ["Subacromial / subdeltoid space", "Functional “pseudo-joint” (Codman's “second shoulder joint”)", "Not an articulation; a bursal gliding plane under the coracoacromial arch"],
    ]
  ),
  card(
    "Teaching Point",
    "The upper limb hangs from the axial skeleton by a single small saddle joint (SC) and is otherwise suspended by muscle. This is an architecture that trades stability for range. Every clinical problem in this region is a consequence of that trade.",
    "accent"
  ),

  heading("Osteology"),
  heading("Clavicle"),
  para(
    `An S-shaped strut: the <strong>medial two-thirds are convex anteriorly</strong>, the <strong>lateral third is concave anteriorly</strong>. The transition between these two curvatures is the mechanical weak point.`
  ),
  para(
    `<strong>Developmental facts with clinical weight:</strong>` +
      ul([
        "First bone in the body to ossify (~5th intrauterine week) and the <strong>last epiphysis to fuse</strong> — the medial (sternal) epiphysis closes around age 22–25. In a 20-year-old with an “SC dislocation,” suspect a <strong>physeal (Salter-Harris) injury</strong>, not a true dislocation.",
        "Ossifies largely by <strong>intramembranous</strong> ossification (the shaft), with secondary endochondral centres at both ends.",
        "No true medullary cavity — relevant to fixation and to marrow-signal interpretation on MRI.",
      ])
  ),
  table(
    "Clavicle attachments (medial → lateral)",
    ["Surface", "Structure"],
    [
      ["Superomedial", "Sternocleidomastoid (clavicular head)"],
      ["Inferomedial", "Costoclavicular (rhomboid) ligament, at the rhomboid fossa"],
      ["Inferior, middle third", "Subclavius, in the subclavian groove"],
      ["Anteromedial", "Pectoralis major (clavicular head)"],
      ["Inferolateral", "Conoid tubercle (posteroinferior) and trapezoid ridge (anterolateral) — the coracoclavicular ligaments"],
      ["Anterolateral", "Anterior deltoid"],
      ["Posterolateral", "Trapezius"],
    ]
  ),
  para(
    `<strong>Clinical:</strong> ~80% of clavicle fractures occur in the middle third. The classic deformity — medial fragment up, lateral fragment down and medial — is explained entirely by the attachments above: sternocleidomastoid elevates the medial fragment; the weight of the limb plus pectoralis major depress and medialize the lateral fragment. The subclavius and its fascia form a partial barrier protecting the underlying subclavian vessels and brachial plexus, which is why neurovascular injury is uncommon despite the proximity.`
  ),

  heading("Scapula"),
  para(
    `A flat triangular bone lying over ribs 2–7, oriented in the <strong>scapular plane</strong>: internally rotated roughly <strong>30–45° anterior to the coronal plane</strong>, tilted anteriorly ~10–20°, and upwardly rotated ~5–10° at rest. Remember this orientation — "scaption" (elevation in the scapular plane) is defined by it, and so is correct patient positioning for imaging and injection.`
  ),
  para(
    `<strong>Key features:</strong>` +
      ul([
        "<strong>Body</strong>: thin, translucent centrally (a normal finding easily overmarked as a lesion on radiograph). Thickened along the borders and the spine.",
        "<strong>Spine</strong>: divides supraspinous and infraspinous fossae; continues laterally as the acromion.",
        "<strong>Acromion</strong>: overhangs the glenohumeral joint; articulates with the clavicle. Morphology matters (see the Coracoacromial Arch section).",
        "<strong>Coracoid process</strong>: the “lighthouse of the shoulder” — the surgeon's landmark, because everything medial to it is neurovascular. Attachments: pectoralis minor (medial border), coracobrachialis and short head of biceps (conjoint tendon, apex), coracoacromial, coracoclavicular (conoid + trapezoid), and coracohumeral ligaments.",
        "<strong>Glenoid fossa</strong>: pear-shaped, narrower superiorly. Covers only about one-third of the humeral head; the articular surface arc ratio (glenoid : humeral head) is roughly 1:3 to 1:4. Retroversion ~5–7° relative to the scapular body (normal range approximately +2° anteversion to −10° retroversion). Superior tilt (inclination) ~5° — contributes to inferior stability.",
        "<strong>Suprascapular notch</strong>: on the superior border, medial to the coracoid base, bridged by the superior transverse scapular ligament. The suprascapular nerve passes beneath the ligament; the suprascapular artery passes above it. Mnemonic: “Army (artery) over, Navy (nerve) under the bridge.”",
        "<strong>Spinoglenoid notch</strong>: lateral to the base of the spine, bridged variably by the inferior transverse (spinoglenoid) ligament; the nerve turns around it to reach infraspinatus.",
        "<strong>Borders and angles</strong>: superior, medial (vertebral), lateral (axillary); superior, inferior, and lateral angles. The superior angle is the classic tender point of levator scapulae; the inferior angle and superomedial angle are the sites of snapping scapula.",
      ])
  ),

  heading("Proximal Humerus"),
  para(
    ul([
      "<strong>Head</strong>: about one-third of a sphere; retroverted 20–30° relative to the transepicondylar axis (with wide normal variation, roughly 10–55°). Neck–shaft angle 130–140°.",
      "<strong>Anatomic neck</strong>: the shallow groove at the articular margin — the capsular attachment line.",
      "<strong>Surgical neck</strong>: the constriction distal to the tuberosities — a fracture site, and the location where the axillary nerve and posterior circumflex humeral vessels lie against the bone.",
      "<strong>Greater tuberosity</strong>, with three facets — memorize these, because MRI reports and cuff-repair operative notes use them: superior facet → supraspinatus; middle facet → infraspinatus; inferior facet → teres minor.",
      "<strong>Lesser tuberosity</strong> → subscapularis.",
      "<strong>Bicipital (intertubercular) groove</strong>: between the tuberosities, roofed by the transverse humeral ligament and, more importantly, by the biceps pulley. The floor of the groove receives the latissimus dorsi insertion; pectoralis major inserts on the lateral lip, teres major on the medial lip. Mnemonic for the three: “a Lady between two Majors” — latissimus dorsi in the groove, pectoralis major lateral, teres major medial.",
      "<strong>Deltoid tuberosity</strong>: mid-lateral shaft.",
      "<strong>Radial (spiral) groove</strong>: posterior, transmitting the radial nerve and profunda brachii — remember this when a humeral shaft fracture presents with a wrist drop.",
    ])
  ),

  heading("Sternoclavicular Joint"),
  para(
    `<strong>Type.</strong> Saddle-shaped synovial joint. A detail that surprises residents: the articular surfaces are covered by <strong>fibrocartilage, not hyaline cartilage</strong> — the only joint in the upper limb, along with the AC joint, where this is true.<br><br><strong>Disc.</strong> A complete intra-articular fibrocartilaginous disc divides the joint into two separate compartments. It attaches superiorly to the clavicle and inferiorly to the first costal cartilage, and acts as a checkrein against medial clavicular displacement.`
  ),
  para(
    `<strong>Ligaments (in order of functional importance):</strong>` +
      ol([
        "<strong>Costoclavicular (rhomboid) ligament</strong> — the principal stabilizer. Two laminae (anterior fibres resist upward rotation and lateral displacement; posterior fibres resist downward rotation and medial displacement).",
        "<strong>Posterior sternoclavicular ligament</strong> — the strongest capsular restraint, resisting anterior and posterior translation.",
        "<strong>Anterior sternoclavicular ligament</strong>.",
        "<strong>Interclavicular ligament</strong> — spans the suprasternal notch; resists excessive depression.",
      ])
  ),
  para(
    `<strong>Motion available (approximate).</strong> 30–35° elevation, 30–35° anterior/posterior translation, 45–50° of axial rotation. All of it is coupled to scapular motion — but that discussion belongs to the biomechanics chapter.`
  ),
  card(
    "Clinical Box",
    `Why posterior SC dislocation is an emergency: immediately posterior to the SC joint lie the brachiocephalic vein, subclavian and common carotid arteries, trachea, oesophagus, and vagus/recurrent laryngeal nerves. A posterior dislocation may present with dysphagia, dyspnoea, hoarseness, venous congestion, or upper limb ischaemia. This is a CT-angiogram-and-call-the-surgeon situation, not a rehabilitation problem. Anterior dislocation, by contrast, is far more common and usually managed non-operatively.<br><br>Also note: the SC joint is a frequent site of degenerative arthropathy in older women, of septic arthritis in people who inject drugs, and of involvement in SAPHO syndrome / chronic recurrent multifocal osteomyelitis — worth remembering when a swollen, tender medial clavicle presents to a physiatry clinic.`,
    "red"
  ),

  heading("Acromioclavicular Joint and the Coracoacromial Arch"),
  heading("The AC Joint"),
  para(
    `<strong>Type.</strong> Plane synovial joint, again with fibrocartilaginous articular surfaces, containing an incomplete fibrocartilaginous disc (meniscoid) that degenerates progressively and is often functionally absent by the fourth decade. The joint line is oriented obliquely, usually with the clavicle slightly overriding the acromion.<br><br><strong>Stabilizers</strong> — a two-tier system that maps directly onto the Rockwood classification:`
  ),
  table(
    "AC joint stabilizers",
    ["Ligament", "Fibres", "Primary restraint"],
    [
      ["Acromioclavicular ligaments (superior, inferior, anterior, posterior; superior is strongest, reinforced by deltotrapezial fascia)", "Short, capsular", "Horizontal (anteroposterior) translation"],
      ["Coracoclavicular ligaments", "Conoid — medial and posterior, fan-shaped, vertically oriented; Trapezoid — lateral and anterior, quadrilateral", "Vertical (superior) translation"],
    ]
  ),
  para(
    `The normal coracoclavicular distance is roughly <strong>11–13 mm</strong>; a >25–50% increase relative to the contralateral side signals coracoclavicular ligament disruption.<br><br><strong>Innervation:</strong> lateral pectoral, suprascapular, and axillary nerves — which is why AC pathology refers pain to the anterolateral shoulder and trapezius region rather than staying local.`
  ),
  card(
    "Clinical Box",
    `AC joint in the PM&R clinic:` +
      ul([
        "<strong>Localization:</strong> pain pointed to with one finger over the joint; pain at end-range cross-body adduction; pain on the far end of overhead elevation (170–180°), whereas subacromial pain typically peaks in the mid-arc.",
        "<strong>Distal clavicular osteolysis</strong> in weightlifters — marrow oedema on MRI at the clavicular side only.",
        "<strong>Injection:</strong> the joint is small (capacity ~1 mL, often less). Enter from the superior or anterosuperior aspect, about 1–1.5 cm medial to the lateral edge of the clavicle, angling slightly medially and posteriorly. Ultrasound guidance markedly improves accuracy; blind injection accuracy is poor.",
      ]),
    "accent"
  ),

  heading("Coracoacromial Arch"),
  para(
    `A rigid osteoligamentous roof over the humeral head, formed by the acromion posterolaterally, the coracoacromial ligament (a strong triangular/quadrangular band from the lateral border of the coracoid to the anteroinferior acromion — often bilaminar with anterolateral and posteromedial bands), and the coracoid process anteriorly.<br><br>Beneath it run the supraspinatus tendon, the long head of biceps, the superior capsule, and the subacromial–subdeltoid bursa.`
  ),
  para(
    `<strong>Acromial morphology (Bigliani):</strong> Type I flat, Type II curved, Type III hooked (a Type IV, convex undersurface, is sometimes added). Type III is over-represented in full-thickness cuff tears — but be careful with causality here; current evidence favours acromial shape as partly a consequence of enthesopathic traction and ageing rather than a purely congenital cause. Related morphometric measures seen on reports: the acromion index, the critical shoulder angle (>35° associated with cuff tears; <30° with glenohumeral osteoarthritis), and lateral acromial angle.`
  ),
  para(
    `<strong>Os acromiale</strong> — failure of fusion of an acromial ossification centre (normally fused by age 25); present in roughly 8% of people, bilateral in about 60%. Classified by the unfused segment: pre-, meso- (most common), meta-, and basi-acromion. Often incidental, but can be a pain generator and matters greatly if the patient is heading for surgery.`
  ),
  para(
    `<strong>Subacromial space</strong> measured on a true AP radiograph (acromiohumeral interval) is normally <strong>7–14 mm</strong>. Narrowing below 7 mm implies superior migration of the humeral head and, in practice, a large or massive cuff tear.`
  ),

  heading("Glenohumeral Joint"),
  heading("Articular Surfaces and the Labrum"),
  para(
    `The glenoid is a shallow, pear-shaped socket articulating with a much larger humeral head — the mismatch that defines the joint. Two features compensate.<br><br><strong>Articular cartilage geometry.</strong> Glenoid cartilage is thinner centrally and thicker peripherally, which deepens the socket beyond what the subchondral bone suggests. (A central thinning on MRI is therefore normal and should not be called a cartilage defect.)`
  ),
  para(
    `<strong>The glenoid labrum.</strong> A fibrocartilaginous rim — mostly dense fibrous tissue with a fibrocartilaginous transition zone at the bony attachment — that:` +
      ul([
        "roughly doubles the effective depth of the socket (from ~2.5 mm to ~5 mm in the superoinferior plane; ~2.5 to ~5 mm AP),",
        "increases humeral head contact area,",
        "serves as the anchor for the glenohumeral ligaments and the long head of biceps,",
        "contributes to the “suction cup” concentric-compression effect maintained by negative intra-articular pressure.",
      ])
  ),
  para(
    `<strong>Regional differences to know before reading an MR arthrogram report:</strong>` +
      ul([
        "The inferior labrum (3 to 9 o'clock via 6) is firmly and continuously attached to the glenoid rim. Detachment here is pathological.",
        "The superior and anterosuperior labrum (roughly 11 to 3 o'clock) is more loosely attached, more mobile, meniscoid in shape, and the site of most normal variants.",
        "Vascular supply is peripheral (from suprascapular, circumflex scapular, and posterior circumflex humeral vessels); the inner/free edge is essentially avascular, which is why labral tears heal poorly.",
      ])
  ),

  heading("Capsule"),
  para(
    `The capsule attaches medially to the glenoid neck (variably — beyond the labrum), and laterally to the anatomic neck of the humerus, except medially where it descends 1–2 cm onto the shaft.<br><br>Its surface area is roughly twice that of the humeral head — redundant by design. Redundancy permits range; it also means the capsule is intrinsically lax and depends on ligamentous thickenings and muscular control for stability.`
  ),
  para(
    `<strong>Recesses and openings:</strong>` +
      ul([
        "<strong>Subscapular recess (bursa of Weitbrecht)</strong> — between SGHL and MGHL, communicating with the joint in most people; lies deep to the subscapularis tendon.",
        "<strong>Axillary recess (pouch)</strong> — the inferior redundancy; obliterated and contracted in adhesive capsulitis.",
        "<strong>Foramen of Weitbrecht</strong> — between SGHL and MGHL.",
        "<strong>Foramen of Rouvière</strong> — between MGHL and IGHL.",
        "<strong>Biceps tendon sheath</strong> — a synovial extension into the bicipital groove, continuous with the joint. This is why a glenohumeral effusion may present as fluid around the biceps on ultrasound, and why a biceps sheath injection can inadvertently be an intra-articular injection.",
      ])
  ),

  heading("The Glenohumeral Ligaments"),
  para(
    `These are capsular thickenings, not discrete cords, and they are best understood by the position in which each becomes taut.`
  ),
  table(
    "Glenohumeral ligaments",
    ["Ligament", "Course", "Taut when", "Notes"],
    [
      ["Superior GHL (SGHL)", "Supraglenoid tubercle / anterosuperior labrum → superior aspect of lesser tuberosity, just medial to the bicipital groove", "Adduction, neutral or external rotation", "Primary static restraint to inferior translation of the adducted arm (the sulcus sign). Part of the biceps pulley. Present in ~90%+"],
      ["Middle GHL (MGHL)", "Anterosuperior labrum / supraglenoid tubercle → base of lesser tuberosity, deep to subscapularis", "Mid-range abduction (~45°) with external rotation", "The most variable GH ligament: absent or vestigial in up to 30%; may be cord-like"],
      ["Inferior GHL complex (IGHLC)", "A hammock: anterior band, posterior band, and the interposed axillary pouch", "90° abduction; anterior band in external rotation, posterior band in internal rotation", "The most important static stabilizer in the functional (overhead/throwing) position. Its anterior band is the structure avulsed in a Bankart lesion"],
      ["Coracohumeral ligament (CHL)", "Lateral base of coracoid → greater and lesser tuberosities, straddling the rotator interval and the biceps", "Adduction, external rotation; inferior translation", "Thickened, fibrotic, and contracted in adhesive capsulitis — the key structure in “frozen shoulder,” together with the rotator interval"],
    ]
  ),

  heading("The Rotator Interval and the Biceps Pulley"),
  para(
    `<strong>Rotator interval.</strong> A triangular capsular region between the anterior border of supraspinatus (superiorly) and the superior border of subscapularis (inferiorly), with the base at the coracoid and the apex at the transverse humeral ligament / bicipital groove.<br><br>Contents and layers: capsule, CHL (superficially), SGHL (deep), and the intra-articular long head of biceps passing through.`
  ),
  para(
    `<strong>Biceps reflection pulley.</strong> The sling that holds the long head of biceps in the groove as it makes its turn from intra-articular to extra-articular. It is formed by:` +
      ul([
        "SGHL (medial floor — the key component),",
        "CHL (superficial roof, with medial and lateral limbs),",
        "superficial fibres of the subscapularis tendon (medial wall),",
        "anterior fibres of the supraspinatus tendon (lateral wall).",
      ])
  ),
  card(
    "Clinical Box",
    `Three high-yield consequences:` +
      ol([
        "<strong>Pulley lesions</strong> produce medial biceps subluxation/dislocation. A dislocated long head of biceps is nearly always accompanied by a subscapularis tendon lesion — if the report says “medially dislocated biceps,” look hard at the subscapularis.",
        "<strong>Adhesive capsulitis</strong> begins as a synovitis/fibrosis of the rotator interval and CHL, then progresses to axillary pouch contraction. Anatomically, this explains the pattern of restriction: external rotation is lost first and most (CHL/rotator interval), then abduction (axillary pouch), then internal rotation. Recognizing this “capsular pattern” at the bedside is anatomy in action.",
        "Hydrodilatation and intra-articular injection deliver fluid into the axillary recess and rotator interval — the anatomical target of the intervention.",
      ]),
    "accent"
  ),

  heading("The Long Head of the Biceps Brachii"),
  para(
    ul([
      "<strong>Origin:</strong> supraglenoid tubercle and the superior labrum. The relative contribution varies: roughly half of people have a predominantly posterior labral contribution, with the remainder mixed or predominantly anterior. This origin is the anatomical basis of the SLAP lesion.",
      "<strong>Course:</strong> intra-articular but extrasynovial — it runs inside the capsule, invested by a synovial reflection, and exits through the rotator interval into the bicipital groove.",
      "<strong>Length intra-articular:</strong> roughly 3 cm.",
      "<strong>Innervation/nociception:</strong> richly innervated with sympathetic and sensory fibres — a genuinely potent pain generator, and a reason biceps tenotomy/tenodesis relieves pain effectively.",
    ])
  ),

  heading("Normal Anatomical Variants of the Anterosuperior Labrum"),
  para(
    `These matter because misreading them as pathology leads to unnecessary surgical referral. All occur in the 11 to 3 o'clock region.`
  ),
  table(
    "Anterosuperior labral variants",
    ["Variant", "Description", "Frequency"],
    [
      ["Sublabral foramen (hole)", "Unattached anterosuperior labrum with an underlying opening communicating with the subscapular recess", "~11–12%"],
      ["Sublabral recess (sulcus)", "A recess between superior labrum and glenoid at the biceps anchor; follows the glenoid contour, smooth margins, extends medially — distinguishing it from a SLAP tear (which extends laterally, has irregular margins)", "Common"],
      ["Buford complex", "Absent anterosuperior labrum + cord-like MGHL attaching directly to the superior labrum at the biceps root", "~1.5–6.5%"],
      ["Meniscoid labrum", "Mobile, free superior labral edge overlying cartilage", "Common"],
    ]
  ),
  card(
    "Teaching Point",
    "A resident who knows the Buford complex will not panic when a report describes “absent anterosuperior labrum with a thick cord-like structure.” Conversely, a Buford complex must never be surgically “repaired” to the glenoid — doing so restricts external rotation.",
    "insight"
  ),

  heading("Scapulothoracic Articulation"),
  para(
    `Not a synovial joint — a gliding interface between the concave anterior surface of the scapula (covered by subscapularis) and the convex posterolateral thoracic wall (covered by serratus anterior), separated by loose areolar tissue and bursae.`
  ),
  para(
    `<strong>Layers, from deep to superficial:</strong>` +
      ol([
        "Chest wall (ribs 2–7, intercostals)",
        "Serratus anterior",
        "Infraserratus (scapulothoracic) bursa — between serratus and chest wall",
        "Subscapularis",
        "Supraserratus (subscapularis) bursa — between subscapularis and serratus",
        "Scapula",
        "Posterior scapular muscles, trapezius, rhomboids, levator scapulae",
      ])
  ),
  para(
    `<strong>Named bursae</strong> (variable, and the terminology in the literature is inconsistent): two major/anatomic bursae — infraserratus and supraserratus, as above — plus adventitial bursae, which are acquired: at the superomedial angle and at the inferior angle of the scapula. These are the usual culprits in snapping scapula syndrome and scapulothoracic bursitis.`
  ),
  para(
    `<strong>Structural causes of snapping/crepitus to look for:</strong> Luschka's tubercle (a bony prominence at the superomedial angle), osteochondroma, malunited rib or scapular fracture, scapular hooking from thoracic kyphosis, and reactive bursitis.`
  ),

  heading("Bursae of the Shoulder"),
  table(
    "Bursae of the shoulder",
    ["Bursa", "Location", "Clinical relevance"],
    [
      ["Subacromial–subdeltoid (SASD)", "Beneath the acromion and deltoid, above supraspinatus and greater tuberosity; the subacromial and subdeltoid components communicate in >95% and are best regarded as one structure", "The largest bursa in the body. Site of “subacromial bursitis.” Under normal conditions it does not communicate with the glenohumeral joint — fluid within it plus fluid in the joint suggests a full-thickness cuff tear"],
      ["Subcoracoid", "Between coracoid/conjoint tendon and subscapularis", "May communicate with SASD; implicated in subcoracoid impingement"],
      ["Subscapular recess", "Beneath subscapularis tendon", "Technically a recess of the joint, not an independent bursa — it communicates with the GH joint normally"],
      ["Scapulothoracic (infra-/supraserratus)", "See the Scapulothoracic Articulation section", "Snapping scapula"],
      ["Coracoclavicular, supra-acromial, others", "Variable", "Rarely of clinical significance"],
    ]
  ),
  card(
    "Clinical Box",
    "The SASD bursa is where most of your needles go. The bursa is a thin, potential space (a few millimetres) lined by synovium and richly innervated. Blind subacromial injection accuracy in published series is roughly 50–70%; ultrasound guidance raises it above 90%. On ultrasound, look for the hypoechoic bursal fluid sandwiched between two hyperechoic peribursal fat layers, superficial to the supraspinatus tendon.<br><br><strong>Posterolateral approach:</strong> enter 1–2 cm inferior to the posterolateral corner of the acromion, directing the needle anteromedially and slightly superiorly, keeping the needle under the acromial undersurface.",
    "accent"
  ),

  heading("Muscles"),
  para(
    `Muscles are best learned in three functional groups rather than by textbook order — it maps directly onto the EMG needle sequence and onto the rehabilitation prescription.`
  ),

  heading("Group 1 — Axioscapular (Scapulothoracic) Muscles: They Position the Scapula"),
  table(
    "Axioscapular muscles",
    ["Muscle", "Origin", "Insertion", "Innervation", "Roots"],
    [
      ["Trapezius — upper", "External occipital protuberance, nuchal ligament, C1–C6", "Lateral third of clavicle", "Spinal accessory (CN XI), with C3–C4 sensory/proprioceptive (and some motor) contribution", "CN XI, C3–C4"],
      ["Trapezius — middle", "C7–T3 spinous processes", "Acromion, scapular spine", "Same", "Same"],
      ["Trapezius — lower", "T4–T12 spinous processes", "Medial scapular spine (tubercle)", "Same", "Same"],
      ["Serratus anterior", "Outer surfaces of ribs 1–8/9", "Costal surface of medial scapular border (lower digitations concentrated at inferior angle)", "Long thoracic", "C5, C6, C7"],
      ["Rhomboid major", "T2–T5 spinous processes", "Medial border below the spine", "Dorsal scapular", "C4–C5"],
      ["Rhomboid minor", "C7–T1 spinous processes, lower nuchal ligament", "Medial border at the spine root", "Dorsal scapular", "C4–C5"],
      ["Levator scapulae", "Transverse processes C1–C4", "Superior angle to spine root", "Dorsal scapular (C5) + direct C3–C4 branches", "C3–C5"],
      ["Pectoralis minor", "Ribs 3–5", "Medial border/superior surface of coracoid", "Medial pectoral", "C8–T1"],
      ["Subclavius", "1st rib/costal cartilage junction", "Inferior surface of middle clavicle", "Nerve to subclavius", "C5–C6"],
    ]
  ),
  card(
    "Clinical Box",
    `The three winging patterns — pure anatomy questions dressed as clinical ones:` +
      ul([
        "<strong>Long thoracic palsy → serratus anterior:</strong> medial winging (inferior angle rotates medially/toward the spine), worse on forward flexion and wall push-up. Loss of upward rotation and protraction.",
        "<strong>Spinal accessory palsy → trapezius:</strong> lateral winging (inferior angle translates laterally), with shoulder droop, asymmetric neckline, and loss of the upper trapezius contour, worse on abduction. Classic iatrogenic cause: posterior cervical triangle lymph node biopsy, because the nerve is extremely superficial there.",
        "<strong>Dorsal scapular palsy → rhomboids:</strong> subtle lateral winging with the scapula slightly abducted and inferiorly translated; often overlooked.",
      ]),
    "red"
  ),

  heading("Group 2 — Scapulohumeral Muscles: They Act Across the Glenohumeral Joint"),
  table(
    "Scapulohumeral muscles",
    ["Muscle", "Origin", "Insertion", "Innervation", "Roots"],
    [
      ["Supraspinatus", "Supraspinous fossa", "Superior facet of greater tuberosity (+ a slip onto middle facet and the capsule)", "Suprascapular", "C5, C6"],
      ["Infraspinatus", "Infraspinous fossa", "Middle facet of greater tuberosity", "Suprascapular", "C5, C6"],
      ["Teres minor", "Upper–middle lateral (axillary) border", "Inferior facet of greater tuberosity + surgical neck", "Axillary (posterior branch)", "C5, C6"],
      ["Subscapularis", "Subscapular fossa", "Lesser tuberosity; upper ~60% tendinous, lower portion muscular, inserting onto the metaphysis", "Upper and lower subscapular", "C5, C6, (C7)"],
      ["Deltoid — anterior", "Lateral third of clavicle", "Deltoid tuberosity", "Axillary (anterior branch)", "C5, C6"],
      ["Deltoid — middle", "Acromion", "Deltoid tuberosity", "Axillary", "C5, C6"],
      ["Deltoid — posterior", "Scapular spine", "Deltoid tuberosity", "Axillary (posterior branch)", "C5, C6"],
      ["Teres major", "Dorsal surface of inferior angle / lower lateral border", "Medial lip of bicipital groove", "Lower subscapular", "C5, C6, C7"],
      ["Coracobrachialis", "Coracoid apex (with short head biceps)", "Medial humeral shaft, mid", "Musculocutaneous", "C5, C6, C7"],
    ]
  ),

  heading("Group 3 — Axiohumeral and Spanning Muscles"),
  table(
    "Axiohumeral and spanning muscles",
    ["Muscle", "Origin", "Insertion", "Innervation", "Roots"],
    [
      ["Pectoralis major — clavicular head", "Medial half of clavicle", "Lateral lip of bicipital groove (clavicular fibres insert inferiorly — the fibres “fold”)", "Lateral pectoral", "C5–C7"],
      ["Pectoralis major — sternocostal head", "Sternum, costal cartilages 1–6, external oblique aponeurosis", "Lateral lip, superiorly", "Medial (and lateral) pectoral", "C8–T1"],
      ["Latissimus dorsi", "T7–L5 spinous processes, thoracolumbar fascia, iliac crest, ribs 9–12, ± inferior angle of scapula", "Floor of bicipital groove", "Thoracodorsal", "C6, C7, C8"],
      ["Biceps brachii — long head", "Supraglenoid tubercle + superior labrum", "Radial tuberosity, bicipital aponeurosis", "Musculocutaneous", "C5, C6"],
      ["Biceps brachii — short head", "Coracoid apex", "Same", "Musculocutaneous", "C5, C6"],
      ["Triceps — long head", "Infraglenoid tubercle of scapula", "Olecranon", "Radial", "C6–C8"],
    ]
  ),
  card(
    "Teaching Point",
    "The pectoralis major “twist”: the clavicular fibres pass deep and inferior to the sternocostal fibres at the insertion, so the tendon is bilaminar and twisted. This anatomy explains why sternocostal-head ruptures (eccentric bench press) can present with a preserved anterior axillary fold contour despite a substantial tear, and why the ruptured muscle belly retracts medially, producing the visible “web” deformity.",
    "insight"
  ),

  heading("The Rotator Cuff in Detail"),
  heading("Footprints"),
  para(
    `The four tendons insert not as points but as broad footprints, blending with each other and with the capsule. Approximate dimensions:` +
      ul([
        "<strong>Supraspinatus:</strong> anteroposterior length ~23–25 mm; medial–lateral footprint width ~12–16 mm at the anterior edge, tapering posteriorly. The tendon has an anterior portion that is thick, tubular and takes most of the load, and a thin, flat posterior portion.",
        "<strong>Infraspinatus:</strong> the largest posterior footprint, wrapping anteriorly onto the superior facet — meaning the supraspinatus footprint is smaller than most people assume, and part of what is called “supraspinatus” on MRI is infraspinatus.",
        "<strong>Teres minor:</strong> inferior facet, elongated vertically.",
        "<strong>Subscapularis:</strong> superoinferior extent ~35–40 mm on the lesser tuberosity; the superior 60% is tendinous (and the part that tears), the inferior portion is muscular.",
      ])
  ),
  para(
    `The tendons interdigitate before insertion, forming a continuous "cuff" — which is why isolated single-tendon tears are less common than the reports suggest, and why tears propagate.`
  ),

  heading("The Rotator Cable and Crescent (Burkhart)"),
  para(
    `A thickened band of fibres, continuous with a deep extension of the coracohumeral ligament, runs perpendicular to the supraspinatus and infraspinatus fibres, arcing from just posterior to the biceps anteriorly to the inferior border of infraspinatus posteriorly.<br><br><strong>Cable</strong> = the thick arch. <strong>Crescent</strong> = the thinner, avascular tissue lateral to the cable, extending to the greater tuberosity insertion.`
  ),
  para(
    `The arrangement is a suspension bridge: load is transmitted through the cable to its anterior and posterior attachments. Anatomically, this explains why some crescent tears are surprisingly well tolerated (the cable is intact and still transmits load) while tears that disrupt the cable attachments are functionally devastating. This is anatomy that predicts which patient does well with conservative rehabilitation.`
  ),

  heading("Vascularity — the Critical Zone"),
  para(
    `Codman's critical zone lies approximately 1 cm proximal to the supraspinatus insertion, at the watershed between the osseous supply (from the greater tuberosity) and the muscular/tendinous supply (from the suprascapular and anterior/posterior humeral circumflex arteries).<br><br>This region is relatively hypovascular — historically described as the substrate for degenerative tearing. Note the modern caveat: contrast-enhanced and laser Doppler studies show the zone is hypovascular but not avascular, and adduction/tension of the arm further reduces perfusion there. It remains a useful concept; treat it as a contributing factor rather than a sole explanation.`
  ),

  heading("Nerve Entry Points"),
  para(
    `Surgically and clinically relevant: the suprascapular nerve enters supraspinatus and infraspinatus from their deep surfaces; the axillary nerve enters deltoid from its deep surface. Motor branches enter the cuff muscles medially, roughly 1.5–3 cm from the glenoid rim. Excessive medial mobilization of a retracted cuff in repair risks nerve traction injury — an explanation occasionally needed when a post-operative patient fails to recover strength.`
  ),

  heading("Neuroanatomy"),
  heading("Brachial Plexus — the Parts Relevant to the Shoulder"),
  para(
    `The shoulder girdle is supplied almost entirely from C5 and C6, with contributions from C4, C7, C8 and T1. Nerves arising proximally are the diagnostic keys in EMG.`
  ),
  table(
    "Brachial plexus — nerves relevant to the shoulder",
    ["Level", "Nerve", "Roots", "Supplies"],
    [
      ["Roots", "Dorsal scapular", "C4–C5", "Rhomboids, levator scapulae"],
      ["Roots", "Long thoracic", "C5, C6, C7", "Serratus anterior"],
      ["Upper trunk", "Nerve to subclavius", "C5–C6", "Subclavius"],
      ["Upper trunk (“Erb's point”)", "Suprascapular", "C5, C6 (± C4 in ~20%)", "Supraspinatus, infraspinatus + articular sensory"],
      ["Lateral cord", "Lateral pectoral", "C5–C7", "Pectoralis major (clavicular) + articular sensory"],
      ["Lateral cord", "Musculocutaneous", "C5–C7", "Coracobrachialis, biceps, brachialis"],
      ["Medial cord", "Medial pectoral", "C8–T1", "Pectoralis minor, pectoralis major (sternocostal)"],
      ["Posterior cord", "Upper subscapular", "C5–C6", "Subscapularis (upper)"],
      ["Posterior cord", "Thoracodorsal", "C6–C7, C8", "Latissimus dorsi"],
      ["Posterior cord", "Lower subscapular", "C5–C6", "Subscapularis (lower), teres major"],
      ["Posterior cord", "Axillary", "C5, C6", "Deltoid, teres minor + superior lateral cutaneous nerve of arm"],
    ]
  ),
  card(
    "Clinical Box",
    "The single most useful EMG principle in this region: to separate a C5–C6 radiculopathy from an upper trunk plexopathy, examine muscles innervated by nerves that leave before the trunk — the rhomboids (dorsal scapular, off the root) and serratus anterior (long thoracic, off the roots). Abnormalities there point above the trunk, toward the root. Add the cervical paraspinals — abnormal paraspinals localize to the root level (intraspinal), since the posterior primary ramus leaves immediately. Normal paraspinals do not exclude radiculopathy, but abnormal ones are strong evidence.",
    "accent"
  ),

  heading("Suprascapular Nerve — the Physiatrist's Nerve"),
  para(
    `<strong>Course.</strong> Upper trunk → posteriorly across the posterior triangle → deep to trapezius and omohyoid → through the suprascapular notch beneath the superior transverse scapular ligament → supraspinous fossa (motor branches to supraspinatus, plus articular branches) → around the spinoglenoid notch, deep to the inferior transverse ligament → infraspinous fossa (motor to infraspinatus).`
  ),
  para(
    `<strong>Sensory.</strong> No cutaneous territory. It supplies articular branches to the posterior and superior glenohumeral joint capsule, the AC joint, the subacromial bursa, and the coracoclavicular ligament — accounting for roughly 70% of the sensory innervation of the shoulder joint. This is the anatomical rationale for the suprascapular nerve block.`
  ),
  para(`<strong>Two distinct entrapment syndromes — distinguished purely by anatomy:</strong>`),
  table(
    "Suprascapular nerve entrapment sites",
    ["Site", "Muscles affected", "Typical cause"],
    [
      ["Suprascapular notch", "Both supraspinatus and infraspinatus", "Ligament ossification/hypertrophy, narrow notch morphology, traction, ganglion"],
      ["Spinoglenoid notch", "Infraspinatus only (isolated posterior fossa atrophy)", "Paralabral ganglion cyst (frequently associated with a posterior labral tear), repetitive overhead activity — volleyball, tennis, baseball"],
    ]
  ),
  para(
    `<strong>Notch morphology (Rengachary types I–VI)</strong> ranges from a wide U-shaped depression to a completely ossified foramen; the narrow V-shaped and ossified variants are over-represented in entrapment.`
  ),
  card(
    "Clinical Box",
    `Isolated infraspinatus atrophy: a patient with visible hollowing of the infraspinous fossa, weak external rotation with the arm at the side, and normal supraspinatus function has a spinoglenoid-level lesion until proven otherwise. Order an MRI looking for a paralabral cyst and a posterior labral tear, and confirm with needle EMG showing denervation in infraspinatus with a normal supraspinatus. Consider also Parsonage–Turner syndrome (neuralgic amyotrophy), which classically strikes the suprascapular, long thoracic and axillary nerves in a patchy, painful-then-weak pattern after a viral illness, vaccination, or surgery.`,
    "red"
  ),

  heading("Axillary Nerve"),
  para(
    `<strong>Course.</strong> Posterior cord → passes anterior to subscapularis → travels inferiorly and posteriorly through the quadrangular space, in close contact with the inferior GH capsule → divides.`
  ),
  para(
    `<strong>Quadrangular (quadrilateral) space boundaries:</strong> superior — teres minor (and subscapularis/GH capsule anteriorly); inferior — teres major; medial — long head of triceps; lateral — surgical neck of humerus. <strong>Contents:</strong> axillary nerve + posterior circumflex humeral artery.`
  ),
  para(
    `<strong>Terminal branches:</strong>` +
      ul([
        "<strong>Anterior branch</strong> — wraps around the surgical neck deep to deltoid, supplying anterior and middle deltoid. It lies approximately 5–7 cm distal to the lateral acromion — the anatomical limit of a safe deltoid-splitting approach and of deep deltoid needle placement.",
        "<strong>Posterior branch</strong> — supplies teres minor and continues as the superior lateral cutaneous nerve of the arm (the “regimental badge” area over the lateral deltoid).",
        "<strong>Articular branches</strong> to the inferior/anteroinferior capsule.",
      ])
  ),
  para(
    `<strong>Vulnerability.</strong> Anterior glenohumeral dislocation, surgical neck fracture, iatrogenic injury during shoulder surgery, prolonged crutch use, and quadrilateral space syndrome (posterior shoulder pain, paraesthesia in a non-dermatomal lateral arm distribution, teres minor atrophy — often the only MRI finding).`
  ),
  card(
    "Clinical Box",
    "Always document sensation over the lateral deltoid (“regimental badge”) and deltoid contraction before and after reducing a shoulder dislocation. And on MRI of a painful shoulder, look specifically at teres minor — isolated teres minor fatty atrophy is a distinctive marker of axillary nerve pathology.",
    "accent"
  ),

  heading("Other Nerves Worth Knowing Precisely"),
  para(
    ul([
      "<strong>Long thoracic (C5–C7):</strong> roots pierce the scalenus medius, then the nerve descends superficial to serratus anterior on the lateral chest wall — long, superficial, and tethered, which is why it is so vulnerable to traction, mastectomy/axillary node dissection, and first-rib resection.",
      "<strong>Spinal accessory (CN XI):</strong> exits the jugular foramen, descends deep to sternocleidomastoid, then crosses the posterior cervical triangle within the superficial investing fascia, only a few millimetres deep to skin. Iatrogenic injury from node biopsy is the classic cause.",
      "<strong>Dorsal scapular (C4–C5):</strong> pierces scalenus medius, descends deep to levator scapulae along the medial scapular border with the dorsal scapular artery.",
      "<strong>Musculocutaneous (C5–C7):</strong> pierces coracobrachialis ~5–8 cm distal to the coracoid — a landmark, and an entrapment site.",
      "<strong>Lateral pectoral (C5–C7):</strong> pierces the clavipectoral fascia. Gives articular branches to the anterosuperior joint and AC joint — an emerging target in shoulder denervation procedures.",
    ])
  ),

  heading("Sensory Innervation of the Shoulder Joint Itself"),
  para(
    `Applying Hilton's law (the nerve supplying a muscle crossing a joint also supplies the joint and the overlying skin):`
  ),
  table(
    "Sensory innervation of the shoulder joint",
    ["Region of joint", "Nerve supply"],
    [
      ["Posterior and superior capsule, AC joint, subacromial bursa", "Suprascapular (dominant, ~70%)"],
      ["Inferior and anteroinferior capsule", "Axillary"],
      ["Anterior and anterosuperior capsule, AC joint", "Lateral pectoral, subscapular nerves"],
      ["Skin over the “cape” and superior shoulder", "Supraclavicular nerves (C3–C4) — from the cervical plexus, not the brachial plexus"],
      ["Skin over lateral deltoid", "Superior lateral cutaneous nerve of arm (axillary, C5)"],
    ]
  ),
  card(
    "Clinical Box",
    `Why shoulder pain is so often not from the shoulder:` +
      ul([
        "The skin over the top of the shoulder is C3–C4. The diaphragm is C3–C5. Hence diaphragmatic irritation refers to the shoulder tip (Kehr's sign — splenic rupture, subphrenic collection, post-laparoscopic gas).",
        "C5 radiculopathy refers to the lateral shoulder and deltoid region, often with no neck pain, and can perfectly mimic rotator cuff disease. Distinguish with a careful scapular-nerve motor exam, Spurling's test, and EMG.",
        "Cardiac, gallbladder, and apical lung (Pancoast) pathology all refer here. In a physiatry clinic, a shoulder that hurts at rest, at night, without any positional or resisted-movement provocation, and with a normal examination, deserves a broader differential.",
      ]),
    "accent"
  ),

  heading("Vascular Anatomy"),
  heading("Axillary Artery"),
  para(
    `The subclavian artery becomes the axillary artery at the lateral border of the first rib, and the brachial artery at the inferior border of teres major. It is divided into three parts by the pectoralis minor — with a memorable rule: the number of branches equals the number of the part.`
  ),
  table(
    "Axillary artery parts and branches",
    ["Part", "Relation to pectoralis minor", "Branches"],
    [
      ["1", "Proximal (medial)", "Superior thoracic"],
      ["2", "Deep (posterior)", "Thoracoacromial (pectoral, acromial, clavicular, deltoid branches); lateral thoracic"],
      ["3", "Distal (lateral)", "Subscapular (→ circumflex scapular + thoracodorsal); anterior circumflex humeral; posterior circumflex humeral"],
    ]
  ),

  heading("Blood Supply of the Humeral Head"),
  para(
    `Traditionally attributed to the arcuate artery of Laing — the terminal continuation of the ascending branch of the anterior circumflex humeral artery, running in the lateral bicipital groove.<br><br><strong>Update this, because it changed.</strong> Contrast-enhanced MRI and quantitative perfusion studies show that the posterior circumflex humeral artery supplies the majority (roughly 64%) of the humeral head, with the anterior circumflex contributing about a third. Both are relevant. Clinically: the risk of avascular necrosis after proximal humeral fracture rises with a short (<8 mm) metaphyseal head extension, a disrupted medial hinge, and four-part patterns — anatomical criteria referenced in the surgical decision.`
  ),

  heading("The Scapular Anastomosis"),
  para(
    `A rich collateral network around the scapula connecting the subclavian and axillary systems:` +
      ul([
        "Suprascapular artery (from thyrocervical trunk)",
        "Dorsal scapular artery (from subclavian or transverse cervical)",
        "Circumflex scapular artery (from subscapular, off the axillary)",
      ])
  ),
  para(
    `Because of this anastomosis, ligation or occlusion of the axillary artery between the first rib and the subscapular branch can be tolerated, with flow reversing through the network to reach the distal limb. This is also the vascular basis for scapular and parascapular flaps.`
  ),

  heading("The Three Posterior Spaces (Learn Them as One Unit)"),
  table(
    "The three posterior spaces",
    ["Space", "Boundaries", "Contents"],
    [
      ["Quadrangular", "Teres minor (sup), teres major (inf), long head triceps (med), humerus (lat)", "Axillary nerve, posterior circumflex humeral artery"],
      ["Triangular space", "Teres minor (sup), teres major (inf), long head triceps (lat)", "Circumflex scapular artery"],
      ["Triangular interval", "Teres major (sup), long head triceps (med), humeral shaft (lat)", "Radial nerve, profunda brachii artery"],
    ]
  ),

  heading("Surface Anatomy and Applied Landmarks"),
  heading("Palpation Sequence"),
  para(
    `A fixed anticlockwise sequence so nothing is missed:` +
      ol([
        "<strong>Sternoclavicular joint</strong> → follow the clavicle laterally.",
        "<strong>Clavicle shaft</strong> — assess for callus, step-off, tenderness.",
        "<strong>Acromioclavicular joint</strong> — palpate the step; compare sides.",
        "<strong>Acromion</strong> — anterior, lateral, and posterolateral corner (the injection landmark).",
        "<strong>Greater tuberosity</strong> — just distal to the lateral acromion; with the arm in extension and internal rotation the supraspinatus footprint rotates anteriorly and becomes accessible.",
        "<strong>Bicipital groove</strong> — approximately 3–5 cm distal to the anterior acromion; rotate the arm and feel the groove pass beneath your finger. In the anatomical position the groove faces slightly anteromedially; externally rotating ~10° brings it anteriorly.",
        "<strong>Coracoid process</strong> — 2–3 cm inferomedial to the AC joint, deep to the anterior deltoid. Tender in most normal people; interpret with caution.",
        "<strong>Spine of the scapula</strong>, supraspinous and infraspinous fossae — assess for atrophy (compare fossae side to side; this is the single most under-performed part of the shoulder exam).",
        "<strong>Superomedial angle</strong> (levator scapulae), medial border (rhomboids), inferior angle.",
        "<strong>Axilla</strong> — anterior fold (pectoralis major), posterior fold (latissimus dorsi/teres major), and the lateral wall.",
      ])
  ),

  heading("Ultrasound Anatomy — the Standard Sequence"),
  para(
    `Ultrasound is now core physiatry practice. The standard scanning protocol maps directly onto the anatomy above.`
  ),
  table(
    "Ultrasound scanning sequence",
    ["Window", "Position", "What you see"],
    [
      ["Long head of biceps", "Arm in neutral, elbow flexed 90°, forearm supinated on thigh", "Short-axis: the ovoid hyperechoic tendon in the bicipital groove, between greater and lesser tuberosities. Start every exam here — it is the anatomical anchor"],
      ["Subscapularis", "Same, then externally rotate the arm", "Long-axis: the tendon glides medially over the lesser tuberosity"],
      ["Supraspinatus", "Modified Crass (hand in back pocket, palm on iliac crest, elbow flexed and posterior) — better tolerated than the full Crass position", "Long-axis “beak/parrot's beak” over the greater tuberosity; assess the critical zone and the footprint"],
      ["Subacromial–subdeltoid bursa", "With supraspinatus views", "Thin hypoechoic layer between two hyperechoic fat planes; dynamic assessment during passive abduction"],
      ["AC joint", "Neutral, coronal probe over the joint", "Joint capsule bulging, osteophytes, effusion; cross-body adduction is dynamic testing"],
      ["Posterior glenohumeral / infraspinatus", "Probe below and parallel to the scapular spine", "Glenoid, labrum (hyperechoic triangle), humeral head, infraspinatus. Best window for joint effusion, posterior labral cysts, and to confirm dislocation/reduction"],
    ]
  ),
  card(
    "Teaching Point",
    "Anatomical pitfall on ultrasound: anisotropy. Tendon fibres appear hypoechoic (falsely “torn”) if the beam is not perpendicular. Before calling a tear, toggle the probe angle and confirm the finding in two planes.",
    "insight"
  ),

  heading("Injection Targets — Anatomy First"),
  table(
    "Injection targets",
    ["Target", "Approach", "Anatomical rationale"],
    [
      ["Subacromial–subdeltoid bursa", "Posterolateral, 1–2 cm inferior to the posterolateral acromial corner, angled anteromedially under the acromion", "Bursa is largest anterolaterally; posterior entry avoids the deltoid's neurovascular supply"],
      ["Glenohumeral joint (posterior approach)", "2 cm inferior and 1 cm medial to the posterolateral acromion, needle directed toward the coracoid", "Enters through the deltoid–infraspinatus interval into the posterior joint; the axillary nerve is well inferior"],
      ["AC joint", "Superior/anterosuperior, ~1 cm medial to the lateral clavicular edge, slight medial and posterior angulation", "Tiny capacity — use small volumes and image guidance"],
      ["Biceps tendon sheath", "Short-axis at the groove, in-plane from lateral", "Remember: the sheath communicates with the joint"],
      ["Suprascapular nerve block", "Ultrasound at the floor of the supraspinous fossa, between the suprascapular notch and spinoglenoid notch (Meier/subomohyoid variants exist)", "Targets ~70% of joint sensory supply; risk of pneumothorax with the older blind “notch” technique makes ultrasound the standard"],
    ]
  ),

  heading("Anatomical Variants — a Consolidated List"),
  table(
    "Anatomical variants",
    ["Variant", "Prevalence", "Why it matters"],
    [
      ["Os acromiale", "~8% (bilateral ~60%)", "Pain generator; alters surgical planning; do not mistake for fracture"],
      ["Sublabral foramen", "~11%", "Mistaken for a labral tear"],
      ["Buford complex", "~1.5–6.5%", "Mistaken for a labral tear; must not be repaired"],
      ["Absent/cord-like MGHL", "Up to 30%", "Normal; alters arthroscopic appearance"],
      ["Sublabral recess at the biceps anchor", "Common", "The main differential for a SLAP I/II lesion"],
      ["Narrow or ossified suprascapular notch (Rengachary III–VI)", "Variable", "Predisposes to entrapment"],
      ["Langer's axillary arch (achselbogen)", "~7%", "A muscular slip from latissimus dorsi to pectoralis major crossing the axilla; can cause neurovascular compression and complicates axillary node dissection"],
      ["Accessory subscapularis / accessory heads", "Uncommon", "Occasional cause of impingement or nerve compression"],
      ["Glenoid dysplasia / hypoplasia", "Uncommon", "Posterior instability, misread as a labral abnormality"],
      ["Luschka's tubercle (superomedial scapular angle)", "Variable", "Snapping scapula"],
      ["Third head of biceps", "~10% in some series", "Anatomical curiosity, occasional surgical relevance"],
    ]
  ),

  heading("Twelve Pearls to Carry Into Clinic"),
  para(
    ol([
      "<strong>Five articulations, not one.</strong> Localize before you treat.",
      "<strong>The SC joint is the only bony link to the axial skeleton</strong> — and posterior dislocation is a surgical emergency.",
      "<strong>AC ligaments resist horizontal, coracoclavicular ligaments resist vertical</strong> translation. The Rockwood classification is that sentence with radiographs attached.",
      "<strong>The labrum doubles glenoid depth</strong>; the inferior labrum is firmly attached and the anterosuperior labrum is where the variants live.",
      "<strong>The rotator interval + coracohumeral ligament is the anatomy of frozen shoulder</strong> — which is why external rotation goes first.",
      "<strong>A dislocated long head of biceps means a subscapularis lesion</strong> until proven otherwise.",
      "<strong>Superior facet = supraspinatus, middle = infraspinatus, inferior = teres minor, lesser tuberosity = subscapularis.</strong> Rehearse it until it is automatic.",
      "<strong>Acromiohumeral interval &lt;7 mm = superior migration = large/massive cuff tear.</strong>",
      "<strong>Suprascapular notch lesion = both fossae atrophy; spinoglenoid notch lesion = infraspinatus only</strong> — and go looking for the paralabral cyst.",
      "<strong>Rhomboids, serratus anterior, and cervical paraspinals separate root from trunk</strong> on EMG. This is the highest-yield localization principle in the upper limb.",
      "<strong>Check the regimental badge and deltoid before and after reducing a dislocation.</strong> Then check teres minor on the MRI.",
      "<strong>Skin over the shoulder tip is C3–C4, the same as the diaphragm.</strong> A shoulder that hurts without any mechanical provocation may not be a shoulder at all.",
    ])
  ),

  heading("Self-Assessment"),
  selfCheck(
    "A 34-year-old volleyball player has posterior shoulder pain, weak external rotation with the arm at the side, and a visible hollow below the scapular spine. Supraspinatus strength and bulk are normal. Where is the lesion, what is the most likely cause, and what two investigations confirm it?",
    "The lesion is at the spinoglenoid notch, distal to the branch supplying supraspinatus, so infraspinatus alone is denervated. The most likely cause is a paralabral ganglion cyst (often associated with a posterior labral tear) from repetitive overhead activity. Confirm with MRI (looking for the cyst and a posterior labral tear) and needle EMG (denervation in infraspinatus with normal supraspinatus)."
  ),
  selfCheck(
    "Which structures form the biceps reflection pulley, and what tendon tear should you suspect when the biceps is medially dislocated?",
    "The pulley is formed by the SGHL (medial floor — the key component), the CHL (superficial roof), superficial fibres of subscapularis (medial wall), and anterior fibres of supraspinatus (lateral wall). A medially dislocated long head of biceps is nearly always accompanied by a subscapularis tendon lesion."
  ),
  selfCheck(
    "A patient has lateral (rather than medial) scapular winging with a drooping shoulder after a neck lymph node biopsy. Which nerve, which muscle, and why is that nerve so vulnerable at that site?",
    "The spinal accessory nerve (CN XI) has been injured, producing trapezius palsy. It is vulnerable in the posterior cervical triangle because it runs there within the superficial investing fascia, only a few millimetres deep to the skin — exactly where a node biopsy is performed."
  ),
  selfCheck(
    "Name the boundaries and contents of the quadrangular space, the triangular space, and the triangular interval.",
    "Quadrangular space: teres minor (superior), teres major (inferior), long head of triceps (medial), humeral surgical neck (lateral) — contains the axillary nerve and posterior circumflex humeral artery. Triangular space: teres minor (superior), teres major (inferior), long head of triceps (lateral) — contains the circumflex scapular artery. Triangular interval: teres major (superior), long head of triceps (medial), humeral shaft (lateral) — contains the radial nerve and profunda brachii artery."
  ),
  selfCheck(
    "An MR arthrogram reports an “absent anterosuperior labrum with a cord-like middle glenohumeral ligament.” What is this, how common is it, and what must not be done about it?",
    "This is a Buford complex, a normal anatomical variant present in roughly 1.5–6.5% of people. It must never be surgically repaired to the glenoid — doing so restricts external rotation."
  ),
  selfCheck(
    "Which glenohumeral ligament is the primary restraint to inferior translation with the arm adducted, and which becomes the key restraint at 90° of abduction with external rotation?",
    "The superior glenohumeral ligament (SGHL) is the primary static restraint to inferior translation of the adducted arm (the sulcus sign). The inferior glenohumeral ligament complex — specifically its anterior band, tensioned in external rotation — is the key stabilizer at 90° abduction with external rotation."
  ),
  selfCheck(
    "Explain, anatomically, why a patient with a subphrenic abscess complains of shoulder pain.",
    "By Hilton's law, the skin over the top of the shoulder (the “cape” area) and the diaphragm share the same C3–C4 segmental innervation. Irritation of the diaphragm from a subphrenic abscess is therefore referred to the shoulder tip — Kehr's sign."
  ),
  selfCheck(
    "You are performing needle EMG on a patient with C5-distribution weakness. Which three muscles best distinguish a C5 root lesion from an upper trunk plexopathy, and why?",
    "The rhomboids (dorsal scapular nerve, off the root), serratus anterior (long thoracic nerve, off the roots), and cervical paraspinals (posterior primary rami, leaving the spine immediately) are all innervated proximal to the brachial plexus trunks. Abnormalities in these muscles localize the lesion to the root level; if they are spared, the lesion is more likely at or distal to the upper trunk."
  ),
  selfCheck(
    "Where does the anterior branch of the axillary nerve lie relative to the lateral acromion, and what practical constraint does this impose?",
    "It lies approximately 5–7 cm distal to the lateral acromion as it wraps around the surgical neck deep to deltoid. This distance is the anatomical safe limit for a deltoid-splitting surgical approach and for deep deltoid needle placement."
  ),
  selfCheck(
    "Why does fluid in both the glenohumeral joint and the subacromial–subdeltoid bursa suggest a full-thickness rotator cuff tear?",
    "Under normal conditions the SASD bursa does not communicate with the glenohumeral joint. Fluid present in both simultaneously implies a communication has formed between them, which only happens when the intervening rotator cuff tendon is torn full-thickness."
  ),

  heading("Suggested Further Reading"),
  para(
    ul([
      "<strong>Standring S.</strong> <em>Gray's Anatomy: The Anatomical Basis of Clinical Practice</em> — pectoral girdle and upper limb chapters.",
      "<strong>Rockwood &amp; Matsen.</strong> <em>The Shoulder</em> — the reference text for shoulder anatomy and pathology.",
      "<strong>Cuéllar R, Ruiz-Ibán MA, Cuéllar A.</strong> Anatomy and biomechanics of the unstable shoulder. <em>Open Orthop J.</em>",
      "<strong>Burkhart SS.</strong> The rotator crescent and rotator cable — original description of the suspension-bridge concept.",
      "<strong>Preston DC &amp; Shapiro BE.</strong> <em>Electromyography and Neuromuscular Disorders</em> — for the EMG localization principles.",
      "<strong>Jacobson JA.</strong> <em>Fundamentals of Musculoskeletal Ultrasound</em> — for the scanning protocol.",
      "<strong>Bianchi S &amp; Martinoli C.</strong> <em>Ultrasound of the Musculoskeletal System</em> — shoulder chapter.",
    ])
  ),
];

export async function GET() {
  const existing = await pool.query(`SELECT id FROM disease WHERE slug = $1`, [SLUG]);
  if (existing.rows.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Disease "${SLUG}" already exists`, id: existing.rows[0].id },
      { status: 409 }
    );
  }

  const topicRows = await pool.query(
    `SELECT id, slug FROM topic WHERE name = 'Anatomy' AND kind = 'topic' AND parent_id IS NULL`
  );
  if (topicRows.rows.length !== 1) {
    return NextResponse.json(
      { ok: false, error: "Expected exactly one root-level 'Anatomy' topic", candidates: topicRows.rows },
      { status: 409 }
    );
  }
  const anatomyTopicId = topicRows.rows[0].id as string;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO disease (canonical_name, slug, topic_id, status, evidence_based, source_locale, aliases)
       VALUES ($1, $2, $3, 'published', true, 'en', $4)
       RETURNING id`,
      ["Shoulder Anatomy", SLUG, anatomyTopicId, ["Anatomy of the Shoulder Complex", "Shoulder Complex Anatomy"]]
    );
    const diseaseId = rows[0].id as string;

    let position = 10;
    for (const block of blocks) {
      await client.query(
        `INSERT INTO editorial_block (disease_id, position, block_type, content_config, status, source_locale)
         VALUES ($1, $2, $3, $4, 'published', 'en')`,
        [diseaseId, position, block.block_type, block.content_config]
      );
      position += 10;
    }
    await client.query("COMMIT");

    return NextResponse.json({ ok: true, diseaseId, topicId: anatomyTopicId, blocksInserted: blocks.length, slug: SLUG });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
}
