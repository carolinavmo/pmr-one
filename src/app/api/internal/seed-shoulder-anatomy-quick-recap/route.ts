import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Temporary, one-shot content-seeding route — same pattern as
// seed-shoulder-anatomy-v7: hardcoded (generated from the verified
// local dev DB), idempotent SQL only, no user input, deleted right
// after it's triggered once. Inserts the "Shoulder Anatomy - Quick
// Recap" page into production's Anatomy folder.

const SLUG = "shoulder-anatomy-quick-recap";
const CANONICAL_NAME = "Shoulder Anatomy - Quick Recap";
const ALIASES = ["Shoulder Anatomy Concise","Shoulder Anatomy PMR Concise"];

const blocks: { block_type: string; content_config: unknown }[] = [
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>The High-Yield Essentials for Physical Medicine & Rehabilitation Residents and Specialists</strong> — Concise Edition.<br><br>A condensed companion to the full Shoulder Anatomy volume. Biomechanics is treated separately."
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "How to Use This Edition"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "This is the condensed edition: only the anatomy a PM&R resident genuinely needs at the bedside, in clinic, or in front of an ultrasound machine. Everything that earns its place here does so because it changes a decision."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Chapter 6 is the longest, deliberately. Neuroanatomy is where shoulder anatomy becomes physiatry, and section 6.6 is the single table most worth memorising in this book. Chapter 7 is built for the week before an examination."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The full volume covers the same ground in depth, with complete origin–insertion tables, fascial anatomy, the axilla, anatomical variants and self-assessment questions."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The coloured boxes"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "A clinically important consequence of the anatomy just described.",
      "color": "accent",
      "label": "PM&R clinical pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "A common error, an outdated teaching, or something dangerous to miss.",
      "color": "red",
      "label": "Pitfall — do not miss"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Electrodiagnostic anatomy — needle localisation and the reasoning behind it.",
      "color": "violet",
      "label": "EMG / electrodiagnostics"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Ultrasound windows and injection approaches derived from the anatomy.",
      "color": "blue",
      "label": "Ultrasound & injection"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "A mnemonic worth keeping.",
      "color": "green",
      "label": "Memory aid"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "1. The Shoulder in One Page"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The five components"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Glenohumeral</strong>",
          "Synovial, ball-and-socket",
          "Only 25–30% of the head contacts the glenoid — the least stable joint in the body"
        ],
        [
          "<strong>Acromioclavicular</strong>",
          "Synovial, plane",
          "Degenerates in almost everyone after 40; imaging findings need clinical corroboration"
        ],
        [
          "<strong>Sternoclavicular</strong>",
          "Synovial, saddle",
          "The only true bony link to the axial skeleton; posterior dislocation is an emergency"
        ],
        [
          "<strong>Scapulothoracic</strong>",
          "Functional gliding interface",
          "Not a true joint; where much of \"impingement\" actually originates"
        ],
        [
          "<strong>Subacromial–subdeltoid space</strong>",
          "Bursal gliding plane",
          "Not a joint, but where most of your injections go"
        ]
      ],
      "columns": [
        "<strong>Component</strong>",
        "<strong>Type</strong>",
        "<strong>The one thing to remember</strong>"
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Why it is so mobile — and so unstable"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>A <strong>large humeral head against a shallow glenoid</strong>; arc-of-curvature ratio roughly 1:3 to 1:4. The socket supports the ball, it does not contain it.</li><li>The greatest range of motion in the body, paid for with the <strong>highest dislocation rate</strong>.</li><li>Stability is therefore delegated almost entirely to <strong>soft tissue</strong> — which is the part rehabilitation can actually influence.</li></ul>"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Static and dynamic stabilisers"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Glenoid version, inclination, depth</strong>",
          "Rotator cuff — concavity-compression"
        ],
        [
          "<strong>Labrum</strong>",
          "Long head of biceps (secondary depressor)"
        ],
        [
          "<strong>Capsule and its ligaments (SGHL, MGHL, IGHL, CHL)</strong>",
          "Deltoid, opposing the cuff as a force couple"
        ],
        [
          "<strong>Negative intra-articular pressure</strong>",
          "Periscapular muscles — serratus anterior, trapezius"
        ],
        [
          "<strong>Coracoacromial arch; AC and CC ligaments</strong>",
          "Proprioception from capsuloligamentous mechanoreceptors"
        ]
      ],
      "columns": [
        "<strong>Static (passive)</strong>",
        "<strong>Dynamic (active)</strong>"
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Rehabilitation cannot lengthen a torn labrum or restore a stretched inferior glenohumeral ligament. It <strong>can</strong> retrain the dynamic tier to compensate for a deficient static tier.<br><br>So when a patient fails conservative treatment, ask: was this a <strong>dynamic failure</strong> (retrainable) or a <strong>structural static failure</strong> (not retrainable)? That question — not the imaging report — decides whether to refer.",
      "color": "accent",
      "label": "PM&R clinical pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Orientation"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>The scapular plane:</strong> the scapula sits <strong>30–45° anterior to the coronal plane</strong>, tilted forward 10–20°, upwardly rotated 5–10° at rest. Elevation in this plane (\"scaption\") is the most physiological arc.</li><li><strong>Everything hangs from the clavicle.</strong> One small saddle joint suspends the limb; one strut holds it clear of the thorax.</li></ul>"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "2. Osteology — What You Actually Need"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "2.1 Clavicle"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>S-shaped: <strong>medial two-thirds convex anteriorly, lateral third concave</strong>. The junction is the weak point — <strong>~80% of fractures are middle-third</strong>.</li><li><strong>First bone to ossify, last epiphysis to fuse</strong> (medial epiphysis fuses at 22–25 years).</li><li>Fracture deformity follows the attachments: <strong>sternocleidomastoid elevates the medial fragment</strong>; the weight of the limb plus pectoralis major depress and medialise the lateral fragment.</li><li>Key inferior landmarks: <strong>rhomboid fossa</strong> (costoclavicular ligament), <strong>conoid tubercle</strong> (~4.5 cm from the lateral end), <strong>trapezoid ridge</strong> (~2.5–3 cm).</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Apparent <strong>SC dislocation under age 25</strong> is usually a <strong>physeal (Salter–Harris) fracture</strong> through the unfused medial epiphysis. Plain films are unreliable — order <strong>CT</strong>.",
      "color": "red",
      "label": "Pitfall — do not miss"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "2.2 Scapula"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Supraspinous / infraspinous fossae</strong>",
          "Compare side to side on every patient — atrophy is visible long before it is measurable, and the pattern localises a suprascapular lesion"
        ],
        [
          "<strong>Suprascapular notch</strong>",
          "Nerve passes <strong>under</strong> the superior transverse scapular ligament, artery <strong>over</strong>. Entrapment here affects <strong>both</strong> supraspinatus and infraspinatus"
        ],
        [
          "<strong>Spinoglenoid notch</strong>",
          "Nerve rounds it <strong>after</strong> supplying supraspinatus. Entrapment here affects <strong>infraspinatus only</strong> — look for a paralabral cyst"
        ],
        [
          "<strong>Coracoid process</strong>",
          "The \"lighthouse of the shoulder\" — everything medial to it is neurovascular. Attachments: pectoralis minor, conjoint tendon, CA / CC / CH ligaments"
        ],
        [
          "<strong>Supraglenoid tubercle</strong>",
          "Long head of <strong>biceps</strong> (with the superior labrum)"
        ],
        [
          "<strong>Infraglenoid tubercle</strong>",
          "Long head of <strong>triceps</strong>"
        ],
        [
          "<strong>Acromion</strong>",
          "Roof of the coracoacromial arch. <strong>Os acromiale</strong> in ~8%"
        ]
      ],
      "columns": [
        "<strong>Landmark</strong>",
        "<strong>Why it matters</strong>"
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>\"Army over, Navy under the bridge.\"</strong> At the suprascapular notch the <strong>A</strong>rtery passes <strong>over</strong> the ligament, the <strong>N</strong>erve passes <strong>under</strong> it.",
      "color": "green",
      "label": "Memory aid"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Glenoid numbers"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>25–30%</strong> humeral head contact · <strong>5–7° retroversion</strong> · <strong>~5° superior inclination</strong></li><li>The <strong>labrum roughly doubles glenoid depth</strong>, from ~2.5 mm to ~5 mm.</li><li>Pear-shaped; anteroinferior bone loss creates an <strong>\"inverted pear\"</strong> — the threshold beyond which soft-tissue-only stabilisation tends to fail.</li></ul>"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "2.3 Proximal humerus"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Superior facet</strong><strong>, greater tuberosity</strong>",
          "Supraspinatus"
        ],
        [
          "<strong>Middle facet</strong><strong>, greater tuberosity</strong>",
          "Infraspinatus"
        ],
        [
          "<strong>Inferior facet</strong><strong>, greater tuberosity</strong>",
          "Teres minor"
        ],
        [
          "<strong>Lesser tuberosity</strong>",
          "Subscapularis"
        ],
        [
          "<strong>Floor of the bicipital groove</strong>",
          "Latissimus dorsi"
        ],
        [
          "<strong>Lateral lip of the groove</strong>",
          "Pectoralis major"
        ],
        [
          "<strong>Medial lip of the groove</strong>",
          "Teres major"
        ]
      ],
      "columns": [
        "<strong>Site</strong>",
        "<strong>Tendon</strong>"
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Retroversion 20–30°</strong>, neck–shaft angle <strong>130–140°</strong>.</li><li><strong>Anatomical neck</strong> = capsular attachment. <strong>Surgical neck</strong> = where the <strong>axillary nerve and posterior circumflex humeral vessels lie against bone</strong>.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Bicipital groove: <strong>\"a Lady between two Majors\"</strong> — <strong>L</strong>atissimus dorsi in the floor, <strong>P</strong>ectoralis <strong>major</strong> lateral lip, <strong>T</strong>eres <strong>major</strong> medial lip.",
      "color": "green",
      "label": "Memory aid"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "3. Joints and Ligaments"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.1 Sternoclavicular joint"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Saddle (sellar) synovial</strong> joint with <strong>fibrocartilage</strong> surfaces — the least congruent joint in the body. <strong>All stability is ligamentous.</strong></li><li>A <strong>complete fibrocartilaginous disc</strong> divides it into two compartments and acts as a checkrein against medial clavicular displacement.</li><li><strong>Costoclavicular ligament</strong> = the principal stabiliser. <strong>Posterior capsular ligament</strong> = the strongest capsular restraint, resisting both anterior and posterior translation. <strong>Interclavicular ligament</strong> resists depression.</li><li><strong>Innervation: medial supraclavicular nerve (C3–C4)</strong> — which is why SC pain refers to the neck and trapezial ridge, not down the arm.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Posterior SC dislocation is a surgical emergency</strong> — brachiocephalic vessels, trachea, oesophagus and lung apex lie millimetres behind the joint. Dysphagia, dyspnoea, hoarseness or diminished pulses mandate CT angiography.<br><br>Also remember the SC joint in <strong>septic arthritis in people who inject drugs</strong>, and in <strong>SAPHO / CRMO</strong>.",
      "color": "red",
      "label": "Pitfall — do not miss"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.2 Acromioclavicular joint"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Plane synovial</strong> joint, <strong>fibrocartilage</strong> surfaces, with a meniscoid disc that is <strong>functionally absent in most people by 40</strong>.</li><li><strong>AC ligaments (superior strongest) resist horizontal translation. Coracoclavicular ligaments resist vertical translation.</strong> Every Rockwood grade is a statement about which system failed.</li><li>The <strong>deltotrapezial fascia</strong> is the third element — the clavicle buttonholing through it is what separates a Rockwood III from a V and makes the deformity fixed rather than springy.</li><li><strong>Innervation:</strong> lateral pectoral, suprascapular and axillary nerves — hence diffuse referral to the anterolateral shoulder and trapezial ridge.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "AC degeneration on MRI is close to <strong>universal after 40</strong> and is present in most asymptomatic volunteers. It becomes a diagnosis only with <strong>focal tenderness + a positive provocative test + a positive diagnostic block</strong>.",
      "color": "red",
      "label": "Pitfall — do not miss"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.3 Coracoclavicular ligaments"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Position</strong>",
          "Posteromedial",
          "Anterolateral"
        ],
        [
          "<strong>Orientation</strong>",
          "Near-vertical",
          "Oblique, superolateral"
        ],
        [
          "<strong>Distance from AC joint</strong>",
          "<strong>~4.5 cm</strong>",
          "<strong>~2.5–3 cm</strong>"
        ],
        [
          "<strong>Primary restraint</strong>",
          "<strong>Superior translation</strong>",
          "<strong>Axial compression</strong>"
        ]
      ],
      "columns": [
        "",
        "<strong>Conoid</strong>",
        "<strong>Trapezoid</strong>"
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "These are the <strong>suspensory ligaments of the upper limb</strong>. In a Rockwood III–V the clavicle has <strong>not</strong> risen — <strong>the arm has dropped away from it</strong>.<br><br>Normal coracoclavicular distance <strong>11–13 mm</strong>; an increase of <strong>>25–50% versus the uninjured side</strong> indicates disruption. Use upright films with the arms unsupported.",
      "color": "accent",
      "label": "PM&R clinical pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.4 Glenohumeral joint"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Labrum"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>Doubles glenoid depth; anchors the GH ligaments and the long head of biceps; contains mechanoreceptors.</li><li><strong>Inferior labrum (3–9 o'clock via 6) is firmly attached — detachment there is pathological. The anterosuperior labrum (11–3 o'clock) is loosely attached and is where all the normal variants live.</strong></li><li>Peripheral blood supply only; the free edge is avascular, so tears heal poorly.</li></ul>"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The four ligaments"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>SGHL</strong>",
          "Adduction",
          "Primary restraint to <strong>inferior translation of the adducted arm</strong> (sulcus sign). Key part of the biceps pulley"
        ],
        [
          "<strong>MGHL</strong>",
          "~45° abduction with external rotation",
          "Anterior stability in mid-range. <strong>The most variable</strong> — absent or cord-like in up to 30%"
        ],
        [
          "<strong>IGHL complex</strong>",
          "<strong>90° abduction</strong>; anterior band in ER, posterior band in IR",
          "The <strong>most important stabiliser in the overhead position</strong>. Anterior band is avulsed in a <strong>Bankart lesion</strong>"
        ],
        [
          "<strong>CHL</strong>",
          "Adduction, external rotation",
          "<strong>Thickened and contracted in adhesive capsulitis</strong> — with the rotator interval, the key structure in frozen shoulder"
        ]
      ],
      "columns": [
        "<strong>Ligament</strong>",
        "<strong>Taut when</strong>",
        "<strong>Function / clinical note</strong>"
      ]
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Rotator interval and biceps pulley"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>The triangular gap between <strong>supraspinatus above and subscapularis below</strong>, containing the CHL, SGHL and the long head of biceps.</li><li><strong>The pulley has four components:</strong> SGHL (medial floor, the key one), CHL (roof), superficial subscapularis fibres (medial wall), anterior supraspinatus fibres (lateral wall).</li><li>The long head of biceps is <strong>intra-articular but extrasynovial</strong>, arising from the <strong>supraglenoid tubercle and superior labrum</strong> — the anatomical basis of the SLAP lesion.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Adhesive capsulitis starts in the rotator interval and CHL</strong>, then contracts the axillary pouch. That is exactly why the capsular pattern runs <strong>external rotation lost first and most</strong>, then abduction, then internal rotation.<br><br>A <strong>medially dislocated long head of biceps means a subscapularis tear</strong> until proven otherwise — subscapularis fibres form the medial wall of the pulley.<br><br><strong>Buford complex</strong> (absent anterosuperior labrum + cord-like MGHL, 1.5–6.5%) is a normal variant and <strong>must never be repaired</strong>.",
      "color": "accent",
      "label": "PM&R clinical pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.5 Scapulothoracic articulation"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>No capsule, cartilage or ligaments — a gliding interface with <strong>two bursae</strong> (infraserratus and supraserratus) between serratus anterior and subscapularis.</li><li>Held to the thorax <strong>entirely by muscle</strong>, which is why periscapular weakness produces winging.</li><li><strong>Snapping scapula:</strong> look for a structural cause — Luschka's tubercle at the superomedial angle, osteochondroma, malunited rib, or scapular hooking from thoracic kyphosis — before labelling it bursitis.</li></ul>"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.6 Subacromial–subdeltoid space"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Coracoacromial arch</strong> = acromion + coracoacromial ligament + coracoid. Beneath it: supraspinatus, long head of biceps, superior capsule, SASD bursa.</li><li><strong>Acromiohumeral interval 7–14 mm.</strong> Below 7 mm means superior migration — in practice, a large or massive cuff tear.</li><li>The SASD bursa is the <strong>largest bursa in the body</strong>, richly innervated, and normally does <strong>not</strong> communicate with the joint.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Fluid in both the glenohumeral joint and the SASD bursa suggests a full-thickness cuff tear</strong> — a full-thickness defect is how these two normally separate compartments come to communicate.<br><br><strong>Blind subacromial injection is accurate 50–70% of the time; ultrasound raises it above 90%.</strong> Posterolateral approach: 1–2 cm inferior to the posterolateral acromial corner, angled anteromedially under the acromion.",
      "color": "accent",
      "label": "PM&R clinical pearl"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "4. Muscles"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "4.1 The rotator cuff"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The four muscles that matter most in a PM&R clinic. Their fundamental role is <strong>compression of the head into the glenoid</strong>; rotation is secondary."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Origin</strong>",
            "Supraspinous fossa"
          ]
        },
        {
          "cells": [
            "<strong>Insertion</strong>",
            "<strong>Superior facet</strong> of the greater tuberosity"
          ]
        },
        {
          "cells": [
            "<strong>Innervation</strong>",
            "<strong>Suprascapular nerve (C5, C6)</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Action</strong>",
            "Compresses and centres the head throughout elevation; assists abduction across the whole arc"
          ]
        },
        {
          "cells": [
            "<strong>Clinical relevance</strong>",
            "Most commonly torn. <strong>Abandon the \"first 15° of abduction\" teaching</strong> — it is active throughout the arc and its dominant role is compression; many patients with an isolated tear abduct fully. Its <strong>critical zone</strong>, ~1 cm proximal to the insertion, is hypovascular"
          ]
        }
      ],
      "title": "Supraspinatus",
      "columns": [
        {
          "type": "text",
          "title": "Field"
        },
        {
          "type": "text",
          "title": "Detail"
        }
      ]
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Origin</strong>",
            "Infraspinous fossa"
          ]
        },
        {
          "cells": [
            "<strong>Insertion</strong>",
            "<strong>Middle facet</strong> of the greater tuberosity, wrapping onto the superior facet"
          ]
        },
        {
          "cells": [
            "<strong>Innervation</strong>",
            "<strong>Suprascapular nerve (C5, C6)</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Action</strong>",
            "The dominant <strong>external rotator</strong>; resists anterior translation"
          ]
        },
        {
          "cells": [
            "<strong>Clinical relevance</strong>",
            "Because its footprint extends onto the superior facet, <strong>part of what is called \"supraspinatus\" on MRI is infraspinatus</strong>. Isolated infraspinatus atrophy = <strong>spinoglenoid notch lesion</strong> — look for a paralabral cyst"
          ]
        }
      ],
      "title": "Infraspinatus",
      "columns": [
        {
          "type": "text",
          "title": "Field"
        },
        {
          "type": "text",
          "title": "Detail"
        }
      ]
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Origin</strong>",
            "Upper lateral (axillary) border of the scapula"
          ]
        },
        {
          "cells": [
            "<strong>Insertion</strong>",
            "<strong>Inferior facet</strong> of the greater tuberosity"
          ]
        },
        {
          "cells": [
            "<strong>Innervation</strong>",
            "<strong>Axillary nerve, posterior branch (C5, C6)</strong> — the only cuff muscle not from the suprascapular nerve"
          ]
        },
        {
          "cells": [
            "<strong>Action</strong>",
            "External rotation, especially in abduction; inferior stabilisation"
          ]
        },
        {
          "cells": [
            "<strong>Clinical relevance</strong>",
            "<strong>Isolated teres minor fatty atrophy is a marker of axillary nerve pathology</strong> — look for it specifically after dislocation and in quadrilateral space syndrome"
          ]
        }
      ],
      "title": "Teres minor",
      "columns": [
        {
          "type": "text",
          "title": "Field"
        },
        {
          "type": "text",
          "title": "Detail"
        }
      ]
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Origin</strong>",
            "Subscapular fossa"
          ]
        },
        {
          "cells": [
            "<strong>Insertion</strong>",
            "<strong>Lesser tuberosity</strong>; the superior 60% is tendinous"
          ]
        },
        {
          "cells": [
            "<strong>Innervation</strong>",
            "<strong>Upper and lower subscapular nerves (C5, C6)</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Action</strong>",
            "The principal <strong>internal rotator</strong> and the <strong>only anterior dynamic restraint</strong>; a powerful head depressor"
          ]
        },
        {
          "cells": [
            "<strong>Clinical relevance</strong>",
            "<strong>The largest cuff muscle</strong> — roughly half the total cuff volume. A <strong>medially dislocated biceps means a subscapularis lesion</strong>. Tested with lift-off, belly-press and bear-hug"
          ]
        }
      ],
      "title": "Subscapularis",
      "columns": [
        {
          "type": "text",
          "title": "Field"
        },
        {
          "type": "text",
          "title": "Detail"
        }
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "4.2 Everything else, at a glance"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Deltoid</strong>",
          "Axillary",
          "<strong>C5</strong>, C6",
          "Prime abductor; anterior fibres flex, posterior extend",
          "Anterior branch lies <strong>5–7 cm below the lateral acromion</strong> — the safe limit for deltoid splitting"
        ],
        [
          "<strong>Trapezius</strong>",
          "Spinal accessory (CN XI)",
          "CN XI, C3–C4",
          "Upper elevates, middle retracts, lower depresses and upwardly rotates",
          "<strong>Lateral winging + shoulder droop</strong>, worse on abduction. Classic cause: posterior triangle node biopsy"
        ],
        [
          "<strong>Serratus anterior</strong>",
          "Long thoracic",
          "<strong>C5, C6, C7</strong>",
          "Protracts and <strong>upwardly rotates</strong> the scapula",
          "<strong>Medial winging</strong>, worse on forward flexion and wall push-up; elevation limited above ~120°"
        ],
        [
          "<strong>Rhomboids</strong>",
          "Dorsal scapular",
          "C4–<strong>C5</strong>",
          "Retract and downwardly rotate",
          "Subtle lateral winging. <strong>A key EMG muscle for separating root from trunk</strong>"
        ],
        [
          "<strong>Levator scapulae</strong>",
          "Dorsal scapular + C3–C4",
          "C3–C5",
          "Elevates and downwardly rotates",
          "The <strong>superior scapular angle</strong> is a classic myofascial tender point"
        ],
        [
          "<strong>Pectoralis minor</strong>",
          "Medial pectoral",
          "<strong>C8–T1</strong>",
          "Protracts, depresses, <strong>anteriorly tilts</strong> the scapula",
          "Tightness is a common, treatable cause of anterior tilt and secondary subacromial narrowing"
        ],
        [
          "<strong>Pectoralis major</strong>",
          "Lateral (clavicular head) + medial (sternocostal) pectoral",
          "C5–C7 / <strong>C8–T1</strong>",
          "Adduction, internal rotation, horizontal adduction",
          "Dual innervation is diagnostically useful: <strong>sternocostal weakness implicates C8–T1</strong>"
        ],
        [
          "<strong>Latissimus dorsi</strong>",
          "Thoracodorsal",
          "<strong>C6, C7</strong>, C8",
          "Adduction, extension, internal rotation",
          "Tightness limits overhead elevation — check before blaming the glenohumeral joint"
        ],
        [
          "<strong>Teres major</strong>",
          "Lower subscapular",
          "C5, <strong>C6</strong>, C7",
          "Adduction, internal rotation",
          "Boundary of all three posterior spaces"
        ],
        [
          "<strong>Biceps (long head)</strong>",
          "Musculocutaneous",
          "C5, <strong>C6</strong>",
          "Elbow flexion and supination; weak head depressor",
          "Intra-articular, richly innervated — a potent pain generator. The <strong>anchor point of SLAP lesions</strong>"
        ],
        [
          "<strong>Coracobrachialis</strong>",
          "Musculocutaneous",
          "C5–C7",
          "Flexion and adduction",
          "The nerve <strong>pierces it 5–8 cm distal to the coracoid</strong> — an entrapment site"
        ],
        [
          "<strong>Triceps (long head)</strong>",
          "Radial",
          "C6–C8",
          "Elbow and shoulder extension",
          "Arises from the <strong>infraglenoid tubercle</strong>; contributes to inferior stability"
        ]
      ],
      "columns": [
        "<strong>Muscle</strong>",
        "<strong>Nerve</strong>",
        "<strong>Roots</strong>",
        "<strong>Main action</strong>",
        "<strong>Clinical note</strong>"
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "4.3 Cuff detail worth knowing"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Footprints:</strong> supraspinatus ~12–16 mm wide anteriorly, tapering posteriorly. The tendons <strong>interdigitate before insertion</strong>, so truly isolated single-tendon tears are less common than reports suggest.</li><li><strong>Rotator cable and crescent:</strong> a thickened band (continuous with the CHL) runs perpendicular to the supraspinatus fibres, arcing from the biceps anteriorly to the inferior infraspinatus posteriorly. The thinner <strong>crescent</strong> lies lateral to it. The arrangement acts as a <strong>suspension bridge</strong>, stress-shielding the crescent.</li><li><strong>The cuff blends with the capsule</strong> at its insertion — which is why a full-thickness tear connects the joint to the bursa, and why cuff and capsular pathology so often coexist.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The cable explains why <strong>some crescent tears are surprisingly well tolerated</strong>: the cable stays intact, keeps transmitting load, and the patient retains a stable centre of rotation. Tears that <strong>disrupt the cable's attachments</strong> are functionally devastating.<br><br>When deciding whether a patient with a cuff tear is a candidate for conservative loading, <strong>cable integrity matters more than measured tear size</strong>. Ask the radiologist directly.",
      "color": "accent",
      "label": "PM&R clinical pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Scanning order:</strong> long head of biceps in short axis (the anatomical anchor) → subscapularis with the arm externally rotated → supraspinatus in <strong>modified Crass</strong> (hand in back pocket) → SASD bursa dynamically → infraspinatus and posterior joint below the scapular spine.<br><br><strong>Beware anisotropy</strong> — tendon fibres look falsely hypoechoic when the beam is not perpendicular. Confirm any suspected tear in <strong>two orthogonal planes</strong>.",
      "color": "blue",
      "label": "Ultrasound & injection"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "5. Vascular Anatomy"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "5.1 Axillary artery"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Begins at the lateral border of the first rib, becomes the brachial artery at the inferior border of teres major. Divided into three parts by <strong>pectoralis minor</strong> — and <strong>the number of branches equals the number of the part</strong>."
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>First</strong>",
          "Medial",
          "Superior thoracic"
        ],
        [
          "<strong>Second</strong>",
          "Deep",
          "Thoracoacromial; lateral thoracic"
        ],
        [
          "<strong>Third</strong>",
          "Lateral",
          "Subscapular; anterior circumflex humeral; posterior circumflex humeral"
        ]
      ],
      "columns": [
        "<strong>Part</strong>",
        "<strong>Relation to pectoralis minor</strong>",
        "<strong>Branches</strong>"
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "5.2 Blood supply of the humeral head"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>Classical teaching credits the <strong>arcuate artery of Laing</strong> (from the <strong>anterior</strong> circumflex humeral artery).</li><li><strong>This has been revised:</strong> the <strong>posterior circumflex humeral artery supplies ~64% of the head</strong>, the anterior roughly one third.</li><li><strong>AVN risk</strong> rises with a short metaphyseal head extension (<strong><8 mm</strong>), a disrupted medial hinge, and four-part fracture patterns.</li></ul>"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "5.3 Scapular anastomosis"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Suprascapular + dorsal scapular + circumflex scapular</strong> arteries link the subclavian and axillary systems. Occlusion of the axillary artery <strong>between the first rib and the subscapular origin</strong> can be tolerated, because flow reverses through this network. Occlusion <strong>distal</strong> to the subscapular origin cannot."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "5.4 Four relationships to recognise and avoid"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>SC joint</strong>",
          "Brachiocephalic vessels, carotid, trachea, oesophagus <strong>millimetres posterior</strong>",
          "Never needle blind in an AP direction; posterior dislocation is a vascular emergency"
        ],
        [
          "<strong>Quadrangular space</strong>",
          "Posterior circumflex humeral artery travels with the axillary nerve",
          "Quadrilateral space syndrome can be neurogenic, vascular or both"
        ],
        [
          "<strong>Axilla</strong>",
          "Axillary vessels and all plexus cords in the fat pad",
          "Any axillary injection carries vascular risk"
        ],
        [
          "<strong>Surgical neck</strong>",
          "<strong>Axillary nerve and posterior circumflex vessels lie directly on bone</strong>",
          "Document deltoid function and the regimental badge before and after any reduction"
        ]
      ],
      "columns": [
        "<strong>Site</strong>",
        "<strong>The relationship</strong>",
        "<strong>What it means</strong>"
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "6. Innervation and Neuroanatomy"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The chapter that separates a PM&R resource from a general anatomy text. Almost everything you do electrodiagnostically in the shoulder depends on <strong>where each nerve branches</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "6.1 Branch points — the basis of localisation"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Roots</strong>",
          "Dorsal scapular",
          "C4–<strong>C5</strong>",
          "Rhomboids, levator scapulae"
        ],
        [
          "<strong>Roots</strong>",
          "Long thoracic",
          "<strong>C5, C6, C7</strong>",
          "Serratus anterior"
        ],
        [
          "<strong>Upper trunk</strong>",
          "<strong>Suprascapular</strong>",
          "<strong>C5, C6</strong>",
          "Supraspinatus, infraspinatus + articular branches"
        ],
        [
          "<strong>Lateral cord</strong>",
          "Lateral pectoral",
          "C5–C7",
          "Pectoralis major (clavicular); articular branches"
        ],
        [
          "<strong>Lateral cord</strong>",
          "Musculocutaneous",
          "C5–C7",
          "Coracobrachialis, biceps, brachialis"
        ],
        [
          "<strong>Medial cord</strong>",
          "Medial pectoral",
          "<strong>C8–T1</strong>",
          "Pectoralis minor; pectoralis major (sternocostal)"
        ],
        [
          "<strong>Posterior cord</strong>",
          "Upper / lower subscapular",
          "C5–C6",
          "Subscapularis; teres major"
        ],
        [
          "<strong>Posterior cord</strong>",
          "Thoracodorsal",
          "C6–<strong>C7</strong>, C8",
          "Latissimus dorsi"
        ],
        [
          "<strong>Posterior cord</strong>",
          "<strong>Axillary</strong>",
          "<strong>C5, C6</strong>",
          "Deltoid, teres minor; superior lateral cutaneous nerve of arm"
        ]
      ],
      "columns": [
        "<strong>Level</strong>",
        "<strong>Nerve</strong>",
        "<strong>Roots</strong>",
        "<strong>Supplies</strong>"
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The three nerves leaving <strong>before the cords</strong> are what make shoulder localisation possible: <strong>dorsal scapular</strong> and <strong>long thoracic</strong> (from the roots), and <strong>suprascapular</strong> (from the upper trunk). Everything else comes off a cord.",
      "color": "green",
      "label": "Memory aid"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "6.2 Suprascapular nerve"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>C5–C6</strong>, from the <strong>upper trunk</strong> at Erb's point. Passes <strong>under</strong> the superior transverse scapular ligament at the suprascapular notch → supraspinatus; then around the <strong>spinoglenoid notch</strong> → infraspinatus.</li><li><strong>No cutaneous territory at all</strong> — a patient with suprascapular neuropathy has no numbness.</li><li>Carries <strong>~70% of the sensory innervation of the shoulder joint</strong> (posterior and superior capsule, AC joint, subacromial bursa) — the rationale for the suprascapular nerve block.</li></ul>"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Suprascapular notch</strong>",
          "<strong>Both</strong> supraspinatus and infraspinatus",
          "Ligament hypertrophy or ossification, narrow notch, traction, ganglion"
        ],
        [
          "<strong>Spinoglenoid notch</strong>",
          "<strong>Infraspinatus only</strong>",
          "<strong>Paralabral cyst</strong> from a posterior labral tear; overhead sport"
        ]
      ],
      "columns": [
        "<strong>Entrapment site</strong>",
        "<strong>Muscles affected</strong>",
        "<strong>Typical cause</strong>"
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Isolated infraspinatus atrophy is a specific finding — pursue it.</strong> Confirm with needle EMG (denervation in infraspinatus, normal supraspinatus), then MRI looking specifically for a <strong>paralabral cyst and posterior labral tear</strong>.<br><br>Keep <strong>Parsonage–Turner syndrome</strong> in the differential: severe pain then patchy weakness, classically suprascapular + long thoracic + axillary, often after viral illness, vaccination or surgery. Its distribution respects no single nerve or root.",
      "color": "violet",
      "label": "EMG / electrodiagnostics"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "6.3 Axillary nerve"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>C5–C6</strong>, from the <strong>posterior cord</strong>. Passes through the <strong>quadrangular space</strong> in contact with the <strong>inferior glenohumeral capsule</strong>.</li><li><strong>Quadrangular space:</strong> teres minor above, teres major below, long head of triceps medially, surgical neck laterally. Contents: <strong>axillary nerve + posterior circumflex humeral vessels</strong>.</li><li><strong>Anterior branch</strong> → anterior and middle deltoid, wrapping the surgical neck <strong>5–7 cm below the lateral acromion</strong>. <strong>Posterior branch</strong> → teres minor + the <strong>superior lateral cutaneous nerve of the arm</strong> (\"regimental badge\").</li><li>Injured by <strong>anterior dislocation</strong>, surgical neck fracture, iatrogenic surgery, and quadrilateral space syndrome.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Always document <strong>regimental badge sensation and deltoid contraction before and after reducing a dislocation</strong> — otherwise you cannot later tell whether a deficit was traumatic or iatrogenic.",
      "color": "red",
      "label": "Pitfall — do not miss"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "6.4 The winging nerves"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Long thoracic</strong><strong> (C5–C7)</strong>",
          "Serratus anterior",
          "<strong>Medial</strong> — inferior angle rotates toward the spine; worse on <strong>forward flexion</strong> and wall push-up",
          "Traction, axillary node dissection, first-rib resection, neuralgic amyotrophy"
        ],
        [
          "<strong>Spinal accessory</strong><strong> (CN XI)</strong>",
          "Trapezius",
          "<strong>Lateral</strong> — with <strong>shoulder droop</strong> and loss of the upper trapezius contour; worse on <strong>abduction</strong>",
          "<strong>Posterior cervical triangle lymph node biopsy</strong> — the nerve is millimetres deep to skin there"
        ],
        [
          "<strong>Dorsal scapular</strong><strong> (C4–C5)</strong>",
          "Rhomboids",
          "Subtle lateral winging, scapula abducted and inferiorly translated",
          "Entrapment in scalenus medius; frequently missed"
        ]
      ],
      "columns": [
        "<strong>Nerve</strong>",
        "<strong>Muscle</strong>",
        "<strong>Winging pattern</strong>",
        "<strong>Classic cause</strong>"
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "6.5 Articular innervation"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>GH joint</strong><strong> — posterior and superior capsule</strong>",
          "<strong>Suprascapular</strong> (~70% of the joint)"
        ],
        [
          "<strong>GH joint</strong><strong> — inferior capsule</strong>",
          "<strong>Axillary</strong>"
        ],
        [
          "<strong>GH joint</strong><strong> — anterior capsule</strong>",
          "<strong>Lateral pectoral</strong> and subscapular nerves"
        ],
        [
          "<strong>AC joint</strong>",
          "Lateral pectoral, suprascapular, axillary"
        ],
        [
          "<strong>SC joint</strong>",
          "<strong>Medial supraclavicular nerve (C3–C4)</strong> — from the cervical plexus"
        ],
        [
          "<strong>Skin over the \"cape\"</strong>",
          "<strong>Supraclavicular nerves (C3–C4)</strong> — not the brachial plexus"
        ],
        [
          "<strong>Skin over the lateral deltoid</strong>",
          "Superior lateral cutaneous nerve of arm (axillary, <strong>C5</strong>)"
        ]
      ],
      "columns": [
        "<strong>Structure</strong>",
        "<strong>Innervation</strong>"
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Because the suprascapular nerve carries most of the joint's sensation and has <strong>no cutaneous territory</strong>, a suprascapular block gives substantial analgesia with <strong>no numbness</strong> — which is why it works so well in adhesive capsulitis, post-operative pain and hemiplegic shoulder pain.<br><br>The skin over the shoulder tip is <strong>C3–C4</strong>; so is the diaphragm (C3–C5). Hence <strong>diaphragmatic irritation refers to the shoulder tip</strong> (Kehr's sign).<br><br>Practical rule: if shoulder pain is diffuse and <strong>completely unaffected by active and passive movement</strong>, the source is very unlikely to be intra-articular. Think cervical spine, cardiac, gallbladder, or apical lung.",
      "color": "accent",
      "label": "PM&R clinical pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "6.6 Clinical localisation — the table to memorise"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>Deltoid</strong>",
          "Weak",
          "Weak",
          "Normal",
          "<strong>Weak</strong>"
        ],
        [
          "<strong>Supra / infraspinatus</strong>",
          "Weak",
          "Weak",
          "<strong>Weak</strong>",
          "Normal"
        ],
        [
          "<strong>Biceps</strong>",
          "Weak",
          "Weak",
          "Normal",
          "Normal"
        ],
        [
          "<strong>Rhomboids</strong>",
          "<strong>Weak</strong>",
          "Normal",
          "Normal",
          "Normal"
        ],
        [
          "<strong>Serratus anterior</strong>",
          "<strong>Weak</strong>",
          "Normal",
          "Normal",
          "Normal"
        ],
        [
          "<strong>Sensory loss</strong>",
          "Lateral arm, dermatomal",
          "Lateral arm and forearm",
          "<strong>None</strong>",
          "Regimental badge"
        ],
        [
          "<strong>Paraspinals on EMG</strong>",
          "<strong>Abnormal</strong>",
          "Normal",
          "Normal",
          "Normal"
        ],
        [
          "<strong>Sensory NAP</strong>",
          "<strong>Preserved</strong>",
          "<strong>Reduced</strong>",
          "Normal",
          "Normal"
        ],
        [
          "<strong>Spurling</strong>",
          "Often positive",
          "Negative",
          "Negative",
          "Negative"
        ]
      ],
      "columns": [
        "",
        "<strong>C5 radiculopathy</strong>",
        "<strong>Upper trunk plexopathy</strong>",
        "<strong>Suprascapular neuropathy</strong>",
        "<strong>Axillary neuropathy</strong>"
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>The two pillars of localisation:</strong><br><br><strong>Branch points.</strong> Dorsal scapular (rhomboids), long thoracic (serratus) and posterior primary rami (paraspinals) all leave at <strong>root</strong> level. Abnormality in any places the lesion <strong>above the trunk</strong>. Normal paraspinals do not exclude radiculopathy, but abnormal paraspinals are strong positive evidence.<br><br><strong>The dorsal root ganglion.</strong> A lesion <strong>proximal</strong> to it (a root lesion) <strong>spares the SNAP</strong>; a lesion <strong>distal</strong> to it (plexus or peripheral nerve) <strong>reduces the SNAP</strong>.<br><br>Put together: weak deltoid and supraspinatus <strong>with</strong> abnormal rhomboids, abnormal paraspinals and a <strong>preserved</strong> SNAP = <strong>C5 radiculopathy</strong>. The same weakness with <strong>normal</strong> rhomboids and a <strong>reduced</strong> SNAP = <strong>upper trunk plexopathy</strong>.",
      "color": "violet",
      "label": "EMG / electrodiagnostics"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "7. Rapid Revision"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "7.1 Numbers worth knowing"
    }
  },
  {
    "block_type": "comparison_table",
    "content_config": {
      "rows": [
        [
          "<strong>25–30%</strong>",
          "Humeral head in contact with the glenoid at any moment"
        ],
        [
          "<strong>5–7°</strong>",
          "Normal glenoid retroversion"
        ],
        [
          "<strong>~2.5 → ~5 mm</strong>",
          "Glenoid depth without and with the labrum"
        ],
        [
          "<strong>20–30°</strong>",
          "Humeral head retroversion"
        ],
        [
          "<strong>130–140°</strong>",
          "Neck–shaft angle"
        ],
        [
          "<strong>7–14 mm</strong>",
          "Acromiohumeral interval; <strong><7 mm = superior migration = large/massive cuff tear</strong>"
        ],
        [
          "<strong>11–13 mm</strong>",
          "Coracoclavicular distance; <strong>>25–50% increase vs the other side = CC disruption</strong>"
        ],
        [
          "<strong>~4.5 cm / ~2.5–3 cm</strong>",
          "Conoid / trapezoid distance from the AC joint"
        ],
        [
          "<strong>5–7 cm</strong>",
          "Axillary nerve below the lateral acromion — the deltoid-splitting safe limit"
        ],
        [
          "<strong>~70%</strong>",
          "Share of shoulder joint sensory supply carried by the suprascapular nerve"
        ],
        [
          "<strong>~64%</strong>",
          "Share of humeral head blood supply from the <strong>posterior</strong> circumflex humeral artery"
        ],
        [
          "<strong>22–25 years</strong>",
          "Medial clavicular epiphysis fusion — below this, suspect a physeal injury"
        ],
        [
          "<strong>30–45°</strong>",
          "Scapular plane, anterior to the coronal plane"
        ]
      ],
      "columns": [
        "<strong>Value</strong>",
        "<strong>What it is</strong>"
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "7.2 Twelve pearls"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Five components, not one joint.</strong> Localise before you treat.</li><li><strong>AC ligaments resist horizontal, coracoclavicular ligaments resist vertical translation.</strong> That sentence is the Rockwood classification.</li><li><strong>In an AC separation the clavicle has not risen — the arm has dropped.</strong></li><li><strong>Superior facet = supraspinatus, middle = infraspinatus, inferior = teres minor, lesser tuberosity = subscapularis.</strong></li><li><strong>The rotator interval and CHL are the anatomy of frozen shoulder</strong> — which is why external rotation goes first.</li><li><strong>A medially dislocated biceps means a subscapularis tear</strong> until proven otherwise.</li><li><strong>Suprascapular notch lesion = both fossae. Spinoglenoid notch lesion = infraspinatus only</strong> — go find the paralabral cyst.</li><li><strong>Rhomboids, serratus anterior and paraspinals separate root from trunk.</strong> The highest-yield localisation principle in the upper limb.</li><li><strong>Check the regimental badge and deltoid before and after reducing a dislocation.</strong> Then look at teres minor on the MRI.</li><li><strong>Skin over the shoulder tip is C3–C4, the same as the diaphragm.</strong> A shoulder that hurts without mechanical provocation may not be a shoulder.</li><li><strong>AC and SC degeneration on imaging is near-universal after 40.</strong> Findings become diagnoses only when the examination agrees.</li><li><strong>Supraspinatus is a compressor first, an elevator second.</strong> Abandon the \"first 15 degrees\" teaching.</li></ul>"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "7.3 Red flags in a painful shoulder"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>Pain <strong>unaffected by active and passive movement</strong> — think cervical, cardiac, diaphragmatic, or apical lung (Pancoast).</li><li><strong>Night pain at rest with a normal examination</strong> — image, and consider malignancy or infection.</li><li><strong>Posterior SC dislocation signs</strong> — dysphagia, dyspnoea, hoarseness, venous congestion, absent pulses.</li><li><strong>Severe pain then patchy weakness</strong> after illness, vaccination or surgery — neuralgic amyotrophy.</li><li><strong>Swollen tender medial clavicle in a person who injects drugs</strong> — septic SC arthritis until proven otherwise.</li><li><strong>Progressive atrophy without trauma</strong> — suprascapular entrapment, a mass lesion, or motor neuron disease.</li></ul>"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "This is the condensed companion. The full volume covers the same material in depth, with complete origin–insertion tables, fascial anatomy, the axilla, variants and self-assessment. Biomechanics is treated separately."
    }
  }
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
      [CANONICAL_NAME, SLUG, anatomyTopicId, ALIASES]
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
