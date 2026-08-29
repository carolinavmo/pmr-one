import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Temporary, one-shot content-seeding route — same pattern as
// seed-shoulder-anatomy: hardcoded (generated from the verified local
// dev DB), idempotent SQL only, no user input, deleted right after
// it's triggered once. Inserts the "Shoulder Anatomy V7" reference
// page into production's Anatomy folder.

const SLUG = "shoulder-anatomy-v7";
const CANONICAL_NAME = "Shoulder Anatomy V7";
const ALIASES = ["Shoulder Anatomy PMRATLAS"];

const blocks: { block_type: string; content_config: unknown }[] = [
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "How to Use This Companion"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "This is pure anatomy, written the way it would be taught at the bedside rather than the way it appears in a dissection manual. Biomechanics — scapulohumeral rhythm, force couples, instability mechanics — is deliberately excluded except where a structure cannot be understood without a sentence of function; that reasoning lives in the companion <strong>Shoulder Anatomy V2</strong> chapter."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Nothing here is included for completeness alone. Every structure earns its place because a physiatrist needs it: to localise a lesion on <strong>needle EMG</strong>, to place a needle under ultrasound, to interpret an imaging report critically, to explain a referral pattern to a patient, or to write a rehabilitation prescription that respects the tissue involved."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The Coloured Boxes"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Five recurring box types carry the material a plain paragraph can't: a <strong><strong>PM&R clinical pearl</strong></strong> (a clinically important consequence of the anatomy just described), a <strong>pitfall — do not miss</strong> (a common error, an outdated teaching, or a diagnosis dangerous to miss), an <strong><strong>EMG / electrodiagnostics</strong></strong> box (needle localisation and the reasoning behind it), an <strong>ultrasound & injection</strong> box (windows, probe positions and approaches), and a <strong>memory aid</strong> (a mnemonic worth keeping)."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "A Note on Accuracy"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Several widely taught statements about the shoulder are outdated or simply incorrect, and they are corrected explicitly where they arise: the supraspinatus does not merely \"initiate the first 15 degrees of abduction\"; the sternoclavicular joint is saddle-shaped rather than a plane joint; the <strong>humeral head</strong> is supplied predominantly by the posterior rather than the <strong>anterior circumflex humeral</strong> artery; and acromial shape is at least partly acquired rather than purely congenital. Where evidence is genuinely contested, that is stated rather than smoothed over."
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "1. The Shoulder Is Not a Joint — It Is a Complex"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "When we talk about the shoulder, it is easy to think of the <strong>glenohumeral joint</strong> alone. In reality, the shoulder is a complex of several articulations and <strong>gliding interface</strong>s that work together to position the upper limb in space."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "This is clinically important. When a patient says, \"my shoulder hurts,\" they have not yet localized the source of their pain. Symptoms may arise from the glenohumeral, acromioclavicular, or sternoclavicular joints, the scapulothoracic region, or the subacromial–subdeltoid space. Pain may also be referred from outside the shoulder, particularly from the cervical spine and, less commonly, the diaphragm or visceral structures."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Understanding this anatomy provides the foundation for much of PM&R practice — from the physical examination and clinical localization to ultrasound, injections, electrodiagnosis, imaging interpretation, and rehabilitation."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "1.1 The Five Components of the Shoulder Complex"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Glenohumeral (GH) joint</strong>",
            "Synovial, spheroidal (ball-and-socket)",
            "3",
            "Provides most of the shoulder's mobility. The large <strong>humeral head</strong> articulates with a relatively shallow glenoid. This makes it the least intrinsically stable joint in the body. Stability depends heavily on soft tissues."
          ]
        },
        {
          "cells": [
            "<strong>Acromioclavicular (AC) joint</strong>",
            "Synovial, plane, with a meniscoid disc",
            "3 (small excursions)",
            "Connects the clavicle to the scapula and allows the small but essential adjustments required for normal scapular movement. Degenerates universally after the fourth decade."
          ]
        },
        {
          "cells": [
            "<strong>Sternoclavicular (SC) joint</strong>",
            "Synovial, saddle (sellar), with a complete disc",
            "3",
            "The <strong>only true bony articulation</strong> between the upper limb and the axial skeleton."
          ]
        },
        {
          "cells": [
            "<strong>Scapulothoracic (ST) joint</strong>",
            "Functional <strong>gliding interface</strong>, not a true joint",
            "—",
            "Allows the scapula to glide over the thoracic wall. It has no articular cartilage or conventional joint capsule."
          ]
        },
        {
          "cells": [
            "<strong>Subacromial–subdeltoid space</strong>",
            "Bursal <strong>gliding interface</strong> — not a true joint (\"second shoulder joint\" of Codman)",
            "—",
            "Allows smooth movement between the rotator cuff and the structures above it; clinically important in shoulder pain and interventional PM&R."
          ]
        }
      ],
      "title": "The five components",
      "columns": [
        {
          "type": "text",
          "title": "Component"
        },
        {
          "type": "text",
          "title": "Type"
        },
        {
          "type": "text",
          "title": "Degrees of freedom"
        },
        {
          "type": "text",
          "title": "What you must remember"
        }
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "How should you think about this system?"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The sternoclavicular joint is the only true skeletal connection between the upper limb and the trunk. From there, the clavicle connects to the scapula through the <strong>AC joint</strong>, while the scapula is largely held against the thoracic wall by muscles rather than by another bony articulation. The humerus then articulates with the relatively shallow glenoid."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "In simple terms: Axial skeleton → SC joint → clavicle → <strong>AC joint</strong> → scapula → GH joint → humerus."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Meanwhile, the scapula must remain mobile over the thoracic wall. This arrangement explains one of the most important concepts in shoulder anatomy: mobility comes at the cost of stability. The shoulder has enormous freedom of movement, but relatively little <strong>inherent bony stability</strong>. It therefore depends heavily on soft-tissue and muscular control to remain stable during movement. This mobility–stability trade-off is a useful framework for understanding much of the anatomy — and many of the clinical disorders — that follow."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "1.2 Static Versus Dynamic Stabilisers"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The shoulder has an exceptional range of motion, but this comes with relatively little <strong>inherent bony stability</strong>. To keep the <strong>humeral head</strong> centred on the glenoid during rest and movement, the shoulder relies on two complementary systems: <strong>static and dynamic stabilisers</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "A simple way to think about them: static stabilisers provide passive stability through the shape of the joint and its surrounding soft tissues, while dynamic stabilisers use active muscle contraction and neuromuscular control to maintain stability during movement. Both systems work together continuously."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong><strong><u>Static stabilisers</u></strong></strong> do not require active muscle contraction. They provide the <strong>passive restraints</strong> that help prevent excessive translation of the <strong>humeral head</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Glenoid geometry",
            "Glenoid depth, version and inclination contribute to the underlying bony stability of the joint."
          ]
        },
        {
          "cells": [
            "Glenoid labrum",
            "Deepens the glenoid and increases the effective contact surface with the <strong>humeral head</strong>."
          ]
        },
        {
          "cells": [
            "Joint capsule and <strong>glenohumeral ligaments</strong>",
            "Limit excessive translation, particularly near the extremes of motion."
          ]
        },
        {
          "cells": [
            "Negative intra-articular pressure",
            "Creates a suction effect that helps maintain the <strong>humeral head</strong> against the glenoid."
          ]
        },
        {
          "cells": [
            "Synovial fluid adhesion–cohesion",
            "Contributes to maintaining contact between the articular surfaces."
          ]
        },
        {
          "cells": [
            "Coracoacromial arch",
            "Provides a superior restraint to migration or escape of the <strong>humeral head</strong>."
          ]
        },
        {
          "cells": [
            "AC and coracoclavicular ligaments",
            "Provide passive stability to the acromioclavicular region and help maintain the relationship between the clavicle and scapula."
          ]
        }
      ],
      "title": "Static stabilisers",
      "columns": [
        {
          "type": "text",
          "title": "Static stabiliser"
        },
        {
          "type": "text",
          "title": "Main contribution"
        }
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Importantly, the contribution of these structures <strong>changes with arm position</strong>. For example, different parts of the glenohumeral capsule and ligament complex become taut at different positions of elevation and rotation."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong><strong><u>Dynamic stabilisers</u></strong></strong> are primarily the <strong>muscles that actively control the humeral head and scapula during movement</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Rotator cuff",
            "Compresses and centres the <strong>humeral head</strong> within the glenoid during movement (concavity-compression)."
          ]
        },
        {
          "cells": [
            "Deltoid",
            "Generates powerful elevation while working together with the rotator cuff to control the <strong>humeral head</strong>."
          ]
        },
        {
          "cells": [
            "Periscapular muscles",
            "<strong>Serratus anterior</strong>, <strong>trapezius, rhomboids and levator scapulae</strong> control the position and movement of the scapula."
          ]
        },
        {
          "cells": [
            "<strong>Long head of biceps</strong>",
            "Can contribute to <strong>glenohumeral stability</strong>, particularly in certain shoulder positions and loading conditions."
          ]
        },
        {
          "cells": [
            "<strong>Pectoralis major</strong> and <strong>latissimus dorsi</strong>",
            "Primarily powerful shoulder movers, but can also contribute to dynamic control."
          ]
        },
        {
          "cells": [
            "Neuromuscular / proprioceptive control",
            "Sensory feedback from capsuloligamentous mechanoreceptors allows continuous adjustment of muscular activity and joint position."
          ]
        }
      ],
      "title": "Dynamic stabilisers",
      "columns": [
        {
          "type": "text",
          "title": "Dynamic stabiliser"
        },
        {
          "type": "text",
          "title": "Main contribution"
        }
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong><strong>How do the two systems work together?</strong></strong> Imagine the glenoid as a <strong>shallow socket</strong> supporting a much larger <strong>humeral head</strong>. The static structures define and constrain that socket, but they cannot actively correct the position of the <strong>humeral head</strong> during movement. That is where the dynamic system becomes essential."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>rotator cuff continuously compresses and centres the humeral head against the glenoid</strong>, while the periscapular muscles position the glenoid appropriately beneath it. At the same time, the capsule, labrum and ligaments limit excessive translation. Normal shoulder stability therefore depends not on a single structure, but on the <strong>coordinated interaction between passive restraints and active muscular control</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "This distinction helps explain why rehabilitation can be effective even when structural abnormalities are present. Rehabilitation cannot anatomically repair a <strong>torn labrum</strong> or restore the original mechanical properties of a <strong>stretched ligament</strong>. What it can do is improve the <strong>dynamic stabilising system</strong> through strengthening, motor control, proprioception and scapular retraining. This is particularly important in the non-operative management of <strong>atraumatic shoulder instability</strong>, where improving rotator cuff and periscapular control may compensate, at least partly, for deficient passive stability. <strong>Clinical reasoning</strong>: when a patient continues to experience instability despite appropriate rehabilitation, it is useful to ask whether the main problem is dynamic and potentially retrainable, or whether there is a major structural deficiency of the static stabilisers. The answer should come from the combination of <strong>history, examination, functional response to rehabilitation and imaging</strong>, rather than from the imaging findings alone.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "2. Osteology"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "2.1 The Clavicle"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The clavicle is an S-shaped long bone that acts as the main bony strut of the shoulder girdle. It is unique among long bones because it lies almost horizontally, extending from the sternum medially to the acromion laterally."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Its characteristic shape is easy to recognize:"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>The medial two-thirds are <strong>convex anteriorly</strong>.</li><li>The lateral third is <strong>concave anteriorly</strong>.</li><li>The transition between these two curves creates a relatively <strong>weak region</strong> and corresponds to the site of most clavicular fractures.</li></ul>"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Rather than thinking of the clavicle as simply a bone connecting the sternum to the scapula, it is more useful to think of it as a mobile strut. It keeps the shoulder away from the thorax while transmitting forces between the upper limb and the axial skeleton."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Functions"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The clavicle performs several important roles:"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong><strong>Strut for the shoulder girdle:</strong></strong> The clavicle holds the scapula and shoulder laterally, away from the thoracic wall. This gives the upper limb space to move freely and maximizes its functional reach.</li><li><strong><strong>Force transmission:</strong></strong> Forces generated in or transmitted through the upper limb pass through the scapula and clavicle toward the axial skeleton. The clavicle therefore forms the <strong>skeletal link between the upper limb and trunk</strong>.</li><li><strong><strong>Neurovascular protection:</strong></strong> The <strong>brachial plexus and subclavian vessels</strong> pass deep to the clavicle. Together with the subclavius and surrounding fascia, the clavicle forms a protective superior boundary over these important neurovascular structures.</li><li><strong><strong>Muscle attachment:</strong></strong> The clavicle provides attachment for several important muscles of the neck, chest and shoulder, including the <strong>sternocleidomastoid, pectoralis major, deltoid, trapezius and subclavius</strong>.</li><li><strong><strong>Mobility of the shoulder girdle:</strong></strong> The clavicle is not a fixed strut. It moves at both the sternoclavicular and acromioclavicular joints. During full arm elevation, it undergoes approximately <strong>40–50° of posterior axial rotation</strong>, allowing the scapula to continue rotating upward.</li></ul>"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Development and ossification"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>First bone in the body to ossify</strong> (around the fifth intrauterine week) and the <strong>last epiphysis in the skeleton to fuse</strong>.</li><li>Most of its shaft develops through <strong>intramembranous ossification</strong>, which is unusual for a long bone, while <strong>secondary ossification</strong> centres develop at its ends.</li><li>The <strong>medial (sternal) epiphysis develops late</strong>, appearing at approximately 18 years of age and typically fusing between <strong>22 and 25 years</strong>. This makes the <strong>medial clavicle</strong> particularly important when evaluating injuries in adolescents and young adults.</li><li>The clavicle also differs from most long bones in that it has <strong>no well-defined medullary cavity</strong>, which is relevant both to fixation technique and to interpreting marrow signal on MRI.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Because the medial clavicular physis may remain open into the early twenties, trauma around the sternoclavicular joint in a young patient may produce a <strong>physeal (Salter–Harris) fracture rather than a true SC joint dislocation</strong>. The medial epiphysis may remain seated against the manubrium while the clavicular metaphysis displaces, creating the appearance of a sternoclavicular dislocation. Plain radiographs can be difficult to interpret in this region, so <strong>CT is particularly useful for defining the injury and its relationship to adjacent structures</strong>.",
      "color": "red",
      "label": "Pitfall — Medial Clavicle Injury in Young Patients"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Attachments, medial to lateral"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The easiest way to learn the clavicular attachments is to move systematically from <strong>medial to lateral</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Supero<strong>medial clavicle</strong>",
            "Sternocleidomastoid — <strong>clavicular head</strong>"
          ]
        },
        {
          "cells": [
            "Antero<strong>medial clavicle</strong>",
            "<strong>Pectoralis major — clavicular head</strong>"
          ]
        },
        {
          "cells": [
            "Infero<strong>medial clavicle</strong> / rhomboid fossa",
            "<strong>Costoclavicular ligament</strong>"
          ]
        },
        {
          "cells": [
            "Inferior <strong>middle third</strong> / subclavian groove",
            "Subclavius"
          ]
        },
        {
          "cells": [
            "<strong>Conoid tubercle</strong>",
            "<strong>Conoid ligament</strong>"
          ]
        },
        {
          "cells": [
            "Trapezoid line",
            "<strong>Trapezoid ligament</strong>"
          ]
        },
        {
          "cells": [
            "Antero<strong>lateral clavicle</strong>",
            "Deltoid"
          ]
        },
        {
          "cells": [
            "Postero<strong>lateral clavicle</strong>",
            "Trapezius"
          ]
        }
      ],
      "title": "Clavicle attachments",
      "columns": [
        {
          "type": "text",
          "title": "Surface / landmark"
        },
        {
          "type": "text",
          "title": "Attachment"
        }
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The inferior surface of the <strong>lateral clavicle</strong> deserves particular attention. The <strong>conoid tubercle</strong> and <strong>trapezoid line</strong> provide attachment for the conoid and <strong>trapezoid ligament</strong>s, respectively. Together, these form the <strong>coracoclavicular ligament complex</strong>, an important stabilizer of the acromioclavicular region."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Most clavicular fractures (roughly 80%) occur in the <strong>middle third</strong>. The characteristic displacement can largely be understood from the forces acting on the fragments. The <strong>sternocleidomastoid pulls the medial fragment superiorly</strong>, while the <strong>weight of the upper limb pulls the lateral fragment inferiorly</strong>. The lateral fragment may also move medially under the influence of the shoulder girdle and surrounding muscles, including <strong>pectoralis major</strong>. In other words, the deformity is not random — the <strong>anatomy predicts the displacement</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Why Does a Clavicle Fracture Displace?"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Neurovascular relationship.</strong> The <strong>subclavian vessels and brachial plexus lie immediately deep to the clavicle</strong>, making their relationship clinically important in clavicular trauma. The intervening <strong>subclavius muscle and its fascia provide some protection</strong>, which helps explain why major neurovascular injury is uncommon in most clavicular fractures despite the close anatomical relationship. When neurovascular injury does occur, significant displacement should raise concern for compression or direct injury to these underlying structures. Late complications can also occur following fracture malunion or excessive callus formation."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "In a patient with a previous clavicular fracture who later develops <strong>upper-limb pain, paresthesias, weakness or vascular symptoms</strong>, consider post-traumatic compression of the brachial plexus or subclavian vessels, including <strong>secondary thoracic outlet syndrome</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "2.2 The Scapula"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The scapula is a thin, triangular flat bone that lies over the postero<strong>lateral thoracic</strong> wall, approximately between the <strong>2nd and 7th ribs</strong>. Unlike the clavicle, it has no direct bony articulation with the axial skeleton. Instead, it is held against the thoracic wall and controlled primarily by the surrounding muscles."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "This is what allows the scapula to act as a <strong>mobile platform for the glenohumeral joint</strong>. As the arm moves, the scapula changes position so that the glenoid remains appropriately oriented beneath the <strong>humeral head</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "An important point is that the scapula does not normally lie flat in the coronal plane. Its resting orientation is three-dimensional, and understanding this position makes the anatomy of shoulder movement much easier to follow."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Resting orientation — the scapular plane"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "At rest, the scapula has three characteristic orientations: <strong>internal rotation</strong> of approximately <strong>30–45° anterior to the coronal plane</strong> (this defines the <strong>scapular plane</strong>), anterior tilt of approximately 10–20° in the sagittal plane, and upward rotation of approximately 5–10° in the frontal plane. Because the glenoid faces somewhat anteriorly rather than directly laterally, elevation of the arm approximately <strong>30–45° anterior to the frontal plane</strong> follows the orientation of the scapula. This movement is called scaption."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Scaption simply means <strong>elevation of the arm in the plane of the scapula</strong>. This position is mechanically favorable because the humerus is more closely aligned with the glenoid and the line of pull of the deltoid and supraspinatus is favorable. It is therefore commonly used during <strong>shoulder examination and rehabilitation</strong>.",
      "color": "accent",
      "label": "Key Concept — Scaption"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Surfaces, borders and angles"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The scapula has <strong>two surfaces, three borders and three angles</strong>. The <strong>costal (anterior) surface</strong> faces the thoracic wall and contains the broad, shallow <strong>subscapular fossa</strong>, which provides the origin for most of the subscapularis muscle. The <strong>posterior surface</strong> is divided by the prominent <strong>scapular spine</strong> into two fossae — the supraspinous fossa (supraspinatus) and the infraspinous fossa (infraspinatus). The <strong>scapular spine</strong> expands laterally to form the acromion, which articulates with the <strong>lateral clavicle</strong> at the acromioclavicular joint."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Always compare the supraspinous and infraspinous fossae <strong>side to side</strong> during the shoulder examination. Visible <strong>supraspinatus or infraspinatus atrophy</strong> may provide an early clue to chronic rotator cuff disease or neurological injury. The pattern of atrophy can also help localize a <strong>suprascapular neuropathy</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The three <strong>borders</strong> are the superior border (the shortest and thinnest; contains the <strong>suprascapular notch</strong> near the base of the coracoid), the medial (vertebral) border (runs approximately parallel to the vertebral column and provides attachment for several important scapular stabilizers), and the lateral (axillary) border (the thickest border, extending toward the glenoid and providing attachment for structures including the teres muscles and <strong>long head</strong> of triceps)."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The three <strong>angles</strong> are the superior angle (<strong>levator scapulae</strong> attachment), the <strong>inferior angle</strong> (an easily palpable landmark that moves substantially during scapular rotation), and the lateral angle (the thickened lateral portion of the scapula that contains the <strong>glenoid cavity</strong>)."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The glenoid cavity"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "is the shallow articular surface that receives the <strong>humeral head</strong>. Its anatomy explains one of the defining characteristics of the <strong>glenohumeral joint</strong>: <strong>enormous mobility with relatively little inherent bony stability</strong>. The <strong>humeral head</strong> is considerably larger than the glenoid, so only a portion of its articular surface is in contact with the glenoid at any given time. Stability therefore depends heavily on the <strong>glenoid labrum, capsule, ligaments and dynamic muscular control</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Shape",
            "Pear-shaped, narrower superiorly",
            "Anteroinferior bone loss converts it to an \"inverted pear\" — a recognised threshold for failure of soft-tissue-only stabilisation"
          ]
        },
        {
          "cells": [
            "<strong>Articular contact with humeral head</strong>",
            "Approximately 25–30% at any moment",
            "The origin of the mobility–stability trade-off"
          ]
        },
        {
          "cells": [
            "Version",
            "Approximately 5–7° of retroversion",
            "Excess retroversion is associated with posterior instability; anteversion with anterior instability"
          ]
        },
        {
          "cells": [
            "<strong>Inclination (superior tilt)</strong>",
            "Approximately 5°",
            "Contributes to inferior stability with the arm adducted"
          ]
        },
        {
          "cells": [
            "Labrum",
            "Fibrocartilaginous rim surrounding the glenoid. Roughly ~5 mm of depth.",
            "Increases the effective depth and surface area of the socket and contributes to stability."
          ]
        }
      ],
      "title": "The glenoid cavity",
      "columns": [
        {
          "type": "text",
          "title": "Parameter"
        },
        {
          "type": "text",
          "title": "Normal value"
        },
        {
          "type": "text",
          "title": "Clinical meaning"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The glenoid is deliberately shallow. This allows the <strong>humeral head</strong> to move through a very large range of motion, but it also means that the <strong>glenohumeral joint</strong> cannot rely on bone alone for stability. <strong>Shallow glenoid → greater mobility → greater dependence on soft-tissue stabilization</strong>.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The coracoid process"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "is a thick, hook-like projection arising from the superior aspect of the scapular neck and extending anteriorly and laterally. It is one of the most useful palpable and imaging landmarks of the anterior shoulder because several important muscles and ligaments converge on it."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Pectoralis minor</strong>",
            "Medial border"
          ]
        },
        {
          "cells": [
            "<strong>Coracobrachialis and short head of biceps (conjoint tendon)</strong>",
            "Apex / tip"
          ]
        },
        {
          "cells": [
            "<strong>Coracoacromial ligament</strong>",
            "Lateral border"
          ]
        },
        {
          "cells": [
            "<strong>Conoid ligament</strong>",
            "Posteromedial aspect of the base"
          ]
        },
        {
          "cells": [
            "<strong>Trapezoid ligament</strong>",
            "Superior surface, anterolateral to the conoid"
          ]
        },
        {
          "cells": [
            "<strong>Coracohumeral ligament</strong>",
            "Lateral aspect of the base"
          ]
        }
      ],
      "title": "Coracoid attachments",
      "columns": [
        {
          "type": "text",
          "title": "Structure"
        },
        {
          "type": "text",
          "title": "Attachment site on the coracoid"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The coracoid is an excellent <strong>anatomical landmark during palpation and ultrasound</strong>. Once identified, it helps orient the examiner to the <strong>subscapularis tendon</strong>, short head of biceps, coracobrachialis, <strong>pectoralis minor</strong> and nearby neurovascular structures.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The suprascapular and spinoglenoid notches"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "are particularly important in PM&R because they help explain the anatomy and localization of <strong>suprascapular neuropathy</strong>. The <strong>suprascapular notch</strong> lies along the superior border of the scapula, just medial to the base of the <strong>coracoid process</strong>, bridged by the <strong>superior transverse scapular ligament</strong>: the suprascapular artery passes over the ligament, the <strong>suprascapular nerve</strong> passes under it."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "\"Army over, Navy under the bridge.\" Artery → over. Nerve → under.",
      "color": "violet",
      "label": "Memory Aid"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "After passing through the <strong>suprascapular notch</strong>, the nerve enters the supraspinous fossa, where it supplies the supraspinatus. The <strong>suprascapular nerve</strong> then travels laterally and posteriorly around the <strong>scapular spine</strong> through the <strong>spinoglenoid notch</strong> — lateral to the base of the <strong>scapular spine</strong>, bridged variably by the <strong>inferior transverse (spinoglenoid) ligament</strong> — to enter the infraspinous fossa and supply the infraspinatus."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Lesion at the suprascapular notch</strong> → supraspinatus and infraspinatus may be affected. <strong>Lesion at the spinoglenoid notch</strong> → supraspinatus is spared and the <strong>infraspinatus is preferentially affected</strong>. This anatomical distinction is particularly useful when combining <strong>physical examination, muscle atrophy patterns, EMG and imaging</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Localizing Suprascapular Neuropathy"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "2.3 The Proximal Humerus"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>proximal humerus</strong> forms the humeral side of the <strong>glenohumeral joint</strong>. Its large, rounded head articulates with the much smaller and shallower <strong>glenoid cavity</strong>, providing the shoulder with its remarkable range of motion."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Around the <strong>humeral head</strong> are several landmarks that are particularly important in PM&R. The <strong>greater and lesser tuberosities</strong> are the insertion sites of the rotator cuff, the <strong>intertubercular groove</strong> contains the <strong>long head of the biceps tendon</strong>, and the <strong>surgical neck</strong> has an important relationship with the <strong>axillary nerve</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Geometry"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>humeral head</strong> is not simply aligned with the shaft. It has a characteristic orientation that influences glenohumeral alignment and function."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Head retroversion</strong>",
            "Approximately 20–30° (range 10–55°)",
            "The <strong>humeral head</strong> faces posteromedially relative to the distal humeral axis."
          ]
        },
        {
          "cells": [
            "<strong>Neck–shaft angle</strong>",
            "130–140°",
            "Reduced in varus malunion, a common cause of post-fracture impingement"
          ]
        },
        {
          "cells": [
            "<strong>Head sphericity</strong>",
            "Approximately one-third of a sphere",
            "The large spherical head articulates with a much smaller glenoid, favoring mobility over inherent stability."
          ]
        },
        {
          "cells": [
            "<strong>Head–tuberosity offset</strong>",
            "Head projects approximately <strong>8 mm above the greater tuberosity</strong>",
            "Loss of offset after malunion produces mechanical impingement resistant to therapy"
          ]
        }
      ],
      "title": "Proximal humerus geometry",
      "columns": [
        {
          "type": "text",
          "title": "Parameter"
        },
        {
          "type": "text",
          "title": "Typical value"
        },
        {
          "type": "text",
          "title": "Why it matters"
        }
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Humeral retroversion</strong> means that the articular surface of the <strong>humeral head</strong> is rotated posteriorly relative to the distal humeral axis. There is considerable normal variation between individuals, so isolated measurements should always be interpreted with caution."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Proximal humeral fractures can <strong>alter the normal relationship</strong> between the head, tuberosities and shaft. Varus malunion or superior displacement of the greater tuberosity can reduce the available subacromial space and interfere mechanically with arm elevation.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Important landmarks"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>humeral head</strong> is covered by articular cartilage and faces medially, superiorly and somewhat posteriorly toward the glenoid. Immediately surrounding the articular surface is the <strong>anatomical neck</strong>, a shallow groove separating the head from the tuberosities that marks the approximate peripheral attachment of the <strong>glenohumeral joint</strong> capsule."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The greater tuberosity lies lateral to the <strong>humeral head</strong> and is one of the most important landmarks in shoulder anatomy. It contains three facets for the insertion of three rotator cuff tendons — superior facet (supraspinatus), middle facet (infraspinatus), inferior facet (<strong>teres minor</strong>) — relationships that are particularly important when interpreting <strong>MRI and ultrasound</strong> or assessing greater tuberosity fractures. The <strong>lesser tuberosity</strong> lies anteriorly and provides the insertion for the <strong>subscapularis tendon</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The intertubercular (bicipital) groove runs between the <strong>greater and lesser tuberosities</strong>. The tendon of the <strong>long head of the biceps</strong> passes through this groove after leaving the <strong>glenohumeral joint</strong>, making the groove an important landmark when examining the anterior shoulder, particularly with ultrasound. The lips and floor of the groove also provide attachment for three major muscles: lateral lip (<strong>pectoralis major</strong>), floor (<strong>latissimus dorsi</strong>), medial lip (<strong>teres major</strong>)."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "\"A Lady between two Majors.\" <strong>Pectoralis major</strong> → lateral lip. <strong>Latissimus dorsi</strong> → floor. <strong>Teres major</strong> → medial lip. The <strong>Lady (Latissimus)</strong> lies between the two Majors.",
      "color": "violet",
      "label": "Memory Aid"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>surgical neck</strong> is the narrowed region immediately distal to the <strong>greater and lesser tuberosities</strong> and is a common site of proximal humeral fracture. Its major clinical importance comes from its close relationship with the <strong>axillary nerve and posterior circumflex humeral vessels</strong>, which pass posteriorly around the <strong>proximal humerus</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "After a proximal humeral fracture or shoulder dislocation, always consider <strong>axillary nerve injury</strong>, particularly when there is deltoid weakness or sensory loss over the superolateral arm. In electrodiagnostic evaluation, remember that the <strong>axillary nerve</strong> supplies both the <strong>deltoid and teres minor</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The deltoid tuberosity, on the lateral humeral shaft, serves as the insertion of the deltoid. The radial (spiral) groove, on the posterior humeral shaft, transmits the <strong>radial nerve and profunda brachii vessels</strong>. These structures are less directly involved in glenohumeral anatomy but become important when localizing nerve injury after humeral fractures."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Superior facet of greater tuberosity</strong>",
            "Supraspinatus"
          ]
        },
        {
          "cells": [
            "<strong>Middle facet of greater tuberosity</strong>",
            "Infraspinatus"
          ]
        },
        {
          "cells": [
            "<strong>Inferior facet of greater tuberosity</strong>",
            "<strong>Teres minor</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Lesser tuberosity</strong>",
            "Subscapularis"
          ]
        },
        {
          "cells": [
            "<strong>Floor of bicipital groove</strong>",
            "<strong>Latissimus dorsi</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Lateral lip of bicipital groove</strong>",
            "<strong>Pectoralis major</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Medial lip of bicipital groove</strong>",
            "<strong>Teres major</strong>"
          ]
        }
      ],
      "title": "Rotator cuff insertions — the pattern to remember",
      "columns": [
        {
          "type": "text",
          "title": "Facet / site"
        },
        {
          "type": "text",
          "title": "Tendon inserted"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "3. Articulations"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.1 The Sternoclavicular Joint"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>sternoclavicular (SC) joint</strong> is small, but its importance is easy to underestimate. It is the <strong>only true bony articulation connecting the upper limb to the axial skeleton</strong>. As a result, forces transmitted from the upper limb toward the trunk ultimately pass through this joint. Despite this important mechanical role, the SC joint has relatively little intrinsic bony stability. Its stability depends predominantly on the <strong>articular disc, joint capsule and surrounding ligaments</strong>."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Joint type and articular surfaces"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The SC joint is a <strong>synovial saddle (sellar) joint</strong> formed between the <strong>sternal end of the clavicle</strong>, the <strong>clavicular notch of the manubrium</strong>, and the superior aspect of the <strong>first costal cartilage</strong>. Although anatomically classified as a saddle joint, functionally it allows movement in <strong>three planes</strong>, including axial rotation of the clavicle. Unlike most synovial joints, its articular surfaces are covered predominantly by <strong>fibrocartilage rather than hyaline cartilage</strong>. There is also considerable incongruity between the two articular surfaces: the large medial end of the clavicle articulates with a much smaller and shallower surface on the manubrium — a mismatch compensated for by the <strong>articular disc</strong>."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The articular disc — the structural solution to incongruity"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Because the surfaces do not fit one another, a <strong>complete fibrocartilaginous disc</strong> lies between the <strong>medial clavicle</strong> and the sternum. Unlike an incomplete meniscus, this disc extends across the joint and <strong>completely separates the joint cavity into two synovial compartments</strong>. It attaches superiorly to the <strong>medial clavicle</strong> and inferiorly to the <strong>first costal cartilage and adjacent sternum</strong>, effectively linking the clavicle to the first rib–sternal complex. The disc improves congruence between the poorly matched articular surfaces, distributes forces transmitted through the clavicle, and helps resist excessive medial displacement of the clavicle during axial loading — dividing the joint into two functional compartments: elevation and depression occur predominantly in the lateral (clavicular) compartment, protraction and retraction in the medial (sternal) compartment."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>articular disc</strong> is not simply a cushion between two bones. It is an important <strong>load-transmitting and stabilizing structure</strong> that helps make a highly incongruent joint mechanically functional.",
      "color": "accent",
      "label": "Why This Matters"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Ligaments and stability"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Because the bony surfaces provide relatively little stability, the SC joint depends heavily on its ligamentous support."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Costoclavicular ligament</strong>",
            "Bilaminar; extends from the first rib and costal cartilage to the inferior surface of the <strong>medial clavicle</strong>.",
            "<strong>The principal stabiliser.</strong> Anterior lamina (directed superolaterally) resists upward rotation and lateral displacement; posterior lamina (superomedially) resists <strong>downward rotation</strong> and medial displacement. Acts as the fulcrum for clavicular elevation"
          ]
        },
        {
          "cells": [
            "<strong>Posterior sternoclavicular ligament</strong>",
            "Thickening of the posterior joint capsule",
            "<strong>The strongest capsular restraint</strong>, and the primary restraint to both anterior and posterior translation. Sectioning studies show the joint remains stable while it is intact"
          ]
        },
        {
          "cells": [
            "<strong>Anterior sternoclavicular ligament</strong>",
            "Thickening of the anterior capsule",
            "Secondary restraint to <strong>anterior translation</strong>. Its relative weakness is why anterior dislocation is far more common"
          ]
        },
        {
          "cells": [
            "<strong>Interclavicular ligament</strong>",
            "Runs across the superior manubrium between the medial ends of both clavicles",
            "Resists excessive depression of the clavicle — the ligament that holds the shoulder up when carrying a heavy load. Taut with the arm at the side, slack in elevation"
          ]
        }
      ],
      "title": "Sternoclavicular ligaments",
      "columns": [
        {
          "type": "text",
          "title": "Ligament"
        },
        {
          "type": "text",
          "title": "Anatomy"
        },
        {
          "type": "text",
          "title": "Function"
        }
      ]
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Motion available"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The SC joint permits three principal movements of the clavicle: elevation/depression (approximately 30–35°, as the <strong>lateral clavicle</strong> rises and falls with the scapula), protraction/retraction (approximately 30–35° of anteroposterior translation), and posterior axial rotation (approximately 45–50°, as the clavicle <strong>rotates posteriorly</strong> around its longitudinal axis during arm elevation). The last movement is particularly easy to overlook — the clavicle does not simply elevate as the arm is raised, it also <strong>rotates posteriorly</strong>, allowing continued <strong>upward rotation of the scapula</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Restriction at the SC joint can therefore affect movement of the entire shoulder girdle. Normal overhead elevation requires coordinated motion at the <strong>SC, AC, scapulothoracic and glenohumeral components</strong> rather than movement of the GH joint alone.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Neurovascular supply"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Arterial supply comes from branches of the internal thoracic (mammary) and suprascapular arteries. Sensory innervation includes contributions from the <strong>medial supraclavicular nerve (C3–C4)</strong> and the <strong>nerve to subclavius (C5–C6)</strong> — which helps explain why pain arising from the SC region may not always remain precisely localized over the joint."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Anatomical relations"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Anteriorly lie skin, platysma, the sternal and <strong>clavicular head</strong>s of sternocleidomastoid, and the medial supraclavicular nerves — the joint is subcutaneous and easily palpated. Posteriorly, within millimetres, lie major <strong>vascular, respiratory, gastrointestinal and neural structures</strong>, including the brachiocephalic vessels, great arterial branches, trachea, oesophagus, vagus and recurrent laryngeal nerves, as well as the nearby lung apex."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "A <strong>posterior sternoclavicular dislocation is potentially life-threatening</strong> because the displaced <strong>medial clavicle</strong> can compress or injure mediastinal structures. <strong>Warning symptoms</strong> include dyspnoea, dysphagia, stridor, hoarseness, venous congestion, neurological symptoms or diminished upper-limb pulses. Suspected posterior displacement requires urgent cross-sectional imaging and specialist evaluation — it should not be treated as a routine musculoskeletal rehabilitation problem. Anterior SC dislocation is much more common and generally carries substantially less risk to mediastinal structures.",
      "color": "red",
      "label": "Pitfall — Posterior SC Dislocation"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Although traumatic instability is perhaps the most memorable SC joint disorder, it is not the only reason to examine this region. SC joint pain may occur with <strong>osteoarthritis, inflammatory arthropathies, infection and disorders affecting the anterior chest wall</strong>. The region can also be involved in conditions such as <strong>SAPHO syndrome</strong> and chronic recurrent multifocal osteomyelitis / chronic nonbacterial osteomyelitis.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The SC joint is superficial and can be visualized with ultrasound by placing the transducer over the <strong>medial clavicle and manubrium</strong>. Ultrasound can help identify the joint line, cortical margins, capsular contour and surrounding soft tissues. The anatomy becomes particularly important if an injection is considered because the <strong>joint is small and critical mediastinal structures lie immediately posterior to it</strong>.",
      "color": "teal",
      "label": "Ultrasound & Injection"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "3.2 The Acromioclavicular Joint"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>acromioclavicular (AC) joint</strong> connects the lateral end of the clavicle to the acromion. Although its movement is small compared with the <strong>glenohumeral joint</strong>, it is essential because it allows the <strong>scapula to adjust its position relative to the clavicle</strong> as the arm moves."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "A useful way to think about the shoulder girdle is that the <strong>SC joint moves the clavicle relative to the trunk</strong>, while the <strong>AC joint allows the scapula to fine-tune its position relative to the clavicle</strong>. Both are necessary for normal scapular movement."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Joint type and articular surfaces"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>AC joint</strong> is a <strong>plane (gliding) synovial joint</strong> formed between the lateral end of the clavicle and the medial facet of the acromion. It is small (roughly <strong>9 mm superoinferior by 19 mm anteroposterior</strong> in adults) and very superficial, making it easy to palpate at the superior aspect of the shoulder. Like the SC joint, the surfaces are covered by <strong>fibrocartilage rather than hyaline cartilage</strong>. The joint line is <strong>obliquely oriented</strong>, with considerable individual variation — the distal clavicle may normally sit slightly superior to the acromion, so mild asymmetry on a single image should not automatically be interpreted as subluxation. <strong>Always compare sides.</strong>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>AC joint</strong> is one of the easiest shoulder joints to palpate directly. When assessing suspected AC pathology, <strong>localize the joint first and reproduce the patient's familiar pain with focal palpation and appropriate provocative testing</strong>, rather than relying on imaging alone.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The intra-articular disc"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Unlike the SC joint's complete disc, the <strong>AC joint</strong> contains an <strong>incomplete meniscoid fibrocartilaginous disc</strong> of highly variable size. Its clinical significance is largely negative: it most commonly <strong>degenerates progressively from the second decade and is functionally absent in most people by age 40</strong>. Do not build a diagnosis on it."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Stability — two complementary ligament systems"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The easiest way to understand <strong>AC joint</strong> stability is to separate it into <strong>horizontal and vertical control</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Acromioclavicular (capsular) ligaments</strong>",
            "Superior, inferior, anterior and posterior AC ligaments, reinforced superiorly by the <strong>deltotrapezial fascia</strong>",
            "Primarily controls <strong>horizontal/anterior-posterior stability</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Coracoclavicular ligaments</strong>",
            "Conoid and <strong>trapezoid ligament</strong>s",
            "Primarily controls <strong>vertical stability</strong> and the relationship between the clavicle and scapula"
          ]
        }
      ],
      "title": "Two complementary ligament systems",
      "columns": [
        {
          "type": "text",
          "title": "Tier"
        },
        {
          "type": "text",
          "title": "Main components"
        },
        {
          "type": "text",
          "title": "Principal role"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>AC ligaments → primarily horizontal stability</strong>. <strong>Coracoclavicular ligaments → primarily vertical stability</strong>. This is a useful framework for understanding both the physical examination and the radiographic appearance of <strong>AC joint</strong> injuries.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The deltotrapezial fascia"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The superior AC capsule is reinforced by the <strong>deltotrapezial fascia</strong>, formed by the fascial attachments of the deltoid and trapezius around the distal clavicle and acromion. Although it is not part of the <strong>coracoclavicular ligament complex</strong>, it contributes importantly to overall stability of the AC region. In higher-grade AC injuries, disruption of this fascial envelope contributes to the marked deformity and instability of the distal clavicle."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>deltotrapezial fascia</strong> disruption is what separates a Rockwood III from a Rockwood V: in the higher grades the distal clavicle has buttonholed through this fascial sheet, which is why the deformity becomes fixed and irreducible rather than springy.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Motion at the AC joint"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "is small in absolute degrees but functionally important — roughly <strong>5–8° of relative rotation</strong>, occurring mostly in the first 30° of elevation and again beyond about 135°. <strong>This gives a useful chain</strong>: SC joint positions the clavicle relative to the trunk → <strong>AC joint</strong> allows the scapula to adjust relative to the clavicle → glenoid is appropriately positioned for humeral movement. Restriction at either the SC or <strong>AC joint</strong> can therefore influence the movement of the entire shoulder girdle."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Blood supply and innervation"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Arterial supply comes from the acromial branch of the thoracoacromial artery and the suprascapular artery. Articular innervation is variable and includes contributions from nerves supplying the surrounding shoulder region, particularly the <strong>suprascapular and lateral pectoral nerves</strong>, with additional contributions described from the <strong>axillary nerve</strong>. Because this sensory innervation overlaps with surrounding structures, <strong>AC joint</strong> pain does not always remain perfectly localized — clinically, symptomatic AC pathology commonly produces <strong>superior shoulder pain</strong>, often with focal tenderness directly over the joint and pain during movements that compress it, particularly <strong>cross-body adduction</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The coracoacromial arch"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "is closely related to the AC region but should not be confused with the <strong>AC joint</strong> itself. It is a rigid osteoligamentous roof over the <strong>humeral head</strong> formed by the acromion posterolaterally, the <strong>coracoacromial ligament</strong> (a strong triangular band from the lateral coracoid to the anteroinferior acromion, often bilaminar), and the coracoid anteriorly. Beneath this arch lie structures including the rotator cuff — particularly the supraspinatus tendon — and the subacromial–subdeltoid bursa; the <strong>long head</strong> of biceps and superior joint structures are deeper and more anteriorly related. The space between the <strong>humeral head</strong> and the acromion can be assessed radiographically as the <strong>acromiohumeral interval</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "On a properly positioned AP radiograph, the <strong><strong>acromiohumeral interval</strong></strong> is typically approximately <strong>7–14 mm</strong>. A markedly reduced interval, particularly under 7 mm, suggests superior migration of the <strong>humeral head</strong> — in the appropriate clinical context, an important indirect sign of a <strong>large or massive chronic rotator cuff tear</strong>."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Acromial morphology"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "is classically described by the <strong>Bigliani classification</strong>: Type I flat, Type II curved, Type III hooked (a Type IV, or convex acromion, is sometimes additionally described). Historically, a hooked acromion was considered an important primary cause of rotator cuff disease. The relationship is now understood to be more complex: acromial morphology is associated with rotator cuff pathology, but some morphological changes may also develop with <strong>ageing and enthesopathic remodeling</strong>. The classification is therefore best understood as a description of morphology rather than a stand-alone explanation for shoulder pain."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong><strong>critical shoulder angle (CSA)</strong></strong> combines the inclination of the glenoid with the lateral extension of the acromion. Values around 30–35° are generally considered typical. Larger angles have been associated with rotator cuff disease, while smaller angles have been associated with glenohumeral osteoarthritis — these are <strong>associations rather than diagnostic thresholds</strong>, so the CSA should not be interpreted in isolation."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "An <strong><strong>os acromiale</strong></strong> results from failure of fusion of one or more acromial ossification centres. It is often discovered incidentally and may be completely asymptomatic. In some patients, however, mobility or stress at the unfused segment can contribute to <strong>superior shoulder pain</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>AC joint</strong> develops degenerative change <strong>universally and early</strong>. By the fourth decade, disc degeneration, subchondral cysts, marginal osteophytes and capsular hypertrophy are the norm, and MRI in asymptomatic volunteers shows AC \"abnormality\" in the substantial majority. An MRI report describing AC degeneration or oedema therefore means very little on its own. <strong>It becomes a diagnosis only when corroborated</strong> by focal tenderness, a positive provocative test, and ideally a positive response to a diagnostic intra-articular block. Acting on imaging alone leads to a great deal of unnecessary treatment.",
      "color": "red",
      "label": "Pitfall — Do Not Miss"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The superficial location of the <strong>AC joint</strong> makes it particularly well suited to <strong>musculoskeletal ultrasound</strong>. On ultrasound, the distal clavicle and acromion appear as two hyperechoic cortical surfaces separated by the joint space, with the superior capsule spanning between them. Dynamic scanning during <strong>cross-body adduction</strong> can help demonstrate movement of the joint and reproduce symptoms. For injection, the small and variably oblique joint space can make landmark-guided placement difficult; ultrasound allows direct visualization of the <strong>joint line, capsule and needle tip</strong>, improving confidence that the injectate is delivered intra-articularly.",
      "color": "teal",
      "label": "Ultrasound & Injection"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The Coracoclavicular Ligaments"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Despite the singular name, these are <strong>two anatomically and functionally distinct structures</strong>. Almost every clinical decision about AC injury turns on which of the two is intact. The <strong>coracoclavicular (CC) ligament complex</strong> is formed by two distinct ligaments — the conoid and the trapezoid — that together connect the <strong>coracoid process</strong> of the scapula to the inferior surface of the clavicle. They are major stabilizers of the AC region and, importantly, form the principal <strong>suspensory connection between the scapula and clavicle</strong>. This anatomy becomes particularly important in <strong>AC joint injuries and distal clavicle fractures</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The suspensory concept"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "A useful way to understand the CC ligaments is to imagine the upper limb as being <strong>suspended from the clavicle</strong>. The clavicle is connected to the axial skeleton through the SC joint. The scapula, in turn, is <strong>suspended from the clavicle</strong> largely through the <strong>coracoclavicular ligament complex</strong>. Because the humerus articulates with the scapula, the upper limb follows with it: <strong>Axial skeleton → SC joint → clavicle → CC ligaments → scapula → upper limb</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "This is why a Rockwood III–V injury produces the appearance of an elevated clavicle. <strong>The clavicle has not risen — the scapula and arm have dropped away from it</strong>, because the suspension has failed. Describing it as \"clavicle up\" to a patient is anatomically backwards, and correcting that in your own language helps you reason about the injury correctly.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Conoid and trapezoid ligaments"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The two ligaments are continuous with one another but have different shapes, orientations and mechanical roles."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Shape",
            "Inverted cone — narrow apex inferiorly, broad base superiorly",
            "Broad, flat quadrilateral sheet"
          ]
        },
        {
          "cells": [
            "Position",
            "More <strong>medial and posterior</strong>",
            "More <strong>lateral and anterior</strong>"
          ]
        },
        {
          "cells": [
            "Orientation",
            "Almost vertical, angled slightly posteriorly and medially",
            "Oblique, running superolaterally"
          ]
        },
        {
          "cells": [
            "<strong>Coracoid attachment</strong>",
            "Posteromedial region near the base of the coracoid",
            "Superior surface of the coracoid, anterolateral to the conoid"
          ]
        },
        {
          "cells": [
            "<strong>Clavicular attachment</strong>",
            "<strong>Conoid tubercle</strong>",
            "<strong>Trapezoid ridge</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Distance from the AC joint</strong>",
            "Approximately <strong>4.5 cm</strong>",
            "Approximately <strong>2.5–3 cm</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Position across clavicular width</strong>",
            "Posterior third",
            "Broader, more anterior"
          ]
        },
        {
          "cells": [
            "<strong>Primary role</strong>",
            "<strong>Primary restraint to superior translation</strong>; also resists anterior rotation. Tightens as the clavicle elevates",
            "Resists <strong>axial compression</strong> (acromion driven medially under the clavicle); contributes to posterior stability; tightens with protraction"
          ]
        }
      ],
      "title": "Conoid versus trapezoid ligaments",
      "columns": [
        {
          "type": "text",
          "title": "Feature"
        },
        {
          "type": "text",
          "title": "Conoid ligament"
        },
        {
          "type": "text",
          "title": "Trapezoid ligament"
        }
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "A small <strong>coracoclavicular bursa</strong> lies between the two ligaments and can itself become inflamed — an occasional explanation for a tender but otherwise unremarkable subclavicular region."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The simplest way to orient them anatomically: conoid = medial + posterior + more vertical; trapezoid = lateral + anterior + more oblique. <strong>Memory aid</strong>: start at the <strong>AC joint</strong> and move medially along the inferior clavicle — <strong>AC joint → trapezoid → conoid</strong>. The <strong>trapezoid is closer to the AC joint</strong>; the <strong>conoid lies farther medially and posteriorly</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>How do they stabilize the AC region?</strong> The CC ligaments do more than prevent the clavicle and scapula from separating. Because their fibers have different orientations, they become tensioned during different components of scapular and clavicular movement. Together, they help control <strong>vertical displacement, axial compression and rotation between the scapula and clavicle</strong>. The <strong>conoid ligament</strong>, with its relatively vertical orientation, is particularly important in controlling superior displacement of the clavicle relative to the scapula and contributes to control of clavicular rotation. The more oblique <strong>trapezoid ligament</strong> is particularly suited to resisting forces that drive the acromion and scapula medially relative to the clavicle. This complementary arrangement allows the <strong>AC joint</strong> to remain mobile while preventing excessive translation."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Coracoclavicular distance"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The relationship between the coracoid and clavicle can be assessed radiographically using the <strong>coracoclavicular distance</strong>, measured between the superior surface of the coracoid and the inferior cortex of the clavicle. It is normally approximately <strong>11–13 mm</strong>, although absolute measurements vary with patient anatomy and radiographic technique — comparison with the <strong>contralateral shoulder</strong> is particularly useful. An increase of more than 25–50% relative to the <strong>contralateral shoulder</strong> indicates coracoclavicular disruption, the finding that separates a Rockwood II from a Rockwood III."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "In a <strong>suspected AC separation</strong>, do not look only at the <strong>AC joint</strong> itself — also assess the <strong>coracoclavicular distance</strong>. The <strong>AC joint</strong> tells you about the relationship between the acromion and clavicle; the CC distance gives information about the integrity of the <strong>suspensory ligament complex</strong>. Upright films with the arms unsupported are far more informative than supine films, because gravity is what reveals a failed suspensory mechanism.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Relationship to AC joint injury"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The AC and CC ligament systems fail progressively as injury severity increases. In lower-grade injuries, the AC capsuloligamentous structures may be injured while the CC ligaments remain intact or only partially injured. With complete disruption of the CC ligaments, the scapula and upper limb lose an important part of their suspensory connection to the clavicle, producing obvious vertical deformity. This is why understanding the CC ligaments provides the anatomical foundation for understanding the <strong>Rockwood classification</strong> rather than simply memorizing each grade."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Relationship to distal clavicle fractures"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The location of a distal clavicle fracture relative to the CC ligaments strongly influences its stability. If the fracture leaves the CC ligament complex functionally attached to the main medial clavicular fragment, the fracture may remain relatively stable. If the fracture pattern disrupts this relationship — particularly when the <strong>conoid ligament is detached from the medial fragment</strong> — the medial fragment loses an important restraint and the fracture becomes substantially more unstable."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The reason some distal clavicle fractures have a higher risk of displacement and nonunion is not simply that they occur near the end of the bone. The key question is: where is the fracture relative to the coracoclavicular ligaments? Once that relationship is understood, the stability of the fracture becomes much easier to predict.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Neurovascular relations"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The CC ligament complex sits in a region with important neurovascular structures nearby. The <strong>brachial plexus and axillary vessels lie medial and inferior to the coracoid region</strong>, while the <strong>suprascapular nerve and vessels</strong> pass near the superior border of the scapula and <strong>suprascapular notch</strong>. These relationships are particularly important during surgical reconstruction and other invasive procedures around the coracoid. For PM&R, the main lesson is anatomical: <strong>the coracoid is not an isolated bony landmark</strong> — important neural and vascular structures lie nearby, particularly on its medial and deep aspects."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Variant to recognise:</strong> the <strong>coracoclavicular joint</strong> — a genuine accessory synovial articulation between the <strong>conoid tubercle</strong> and the coracoid, present in roughly 1% of Western populations and considerably more frequently in some East Asian populations. Ossification of the coracoclavicular ligament is a common incidental finding, particularly post-injury. Neither should be reported as acute pathology.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "3.3 The Glenohumeral Joint"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>glenohumeral (GH) joint</strong> is what most people mean when they refer to the \"shoulder joint.\" It is a <strong>synovial ball-and-socket joint</strong> between the <strong>humeral head</strong> and the <strong>glenoid cavity</strong> of the scapula. Its defining feature is the mismatch between a <strong>large humeral head and a relatively small, shallow glenoid</strong>. This gives the shoulder extraordinary mobility, but relatively little <strong>inherent bony stability</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Articular surfaces"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>humeral head</strong> is much larger than the glenoid. At any given moment, only approximately <strong>25–30% of the humeral head</strong> is in contact with the glenoid. The articular cartilage helps improve this imperfect congruence: on the glenoid, cartilage is generally thinner centrally and thicker toward the periphery, effectively increasing the concavity of the socket; on the <strong>humeral head</strong>, the pattern is approximately reversed, with thicker cartilage centrally."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>The <strong>glenoid labrum</strong></strong> is a fibrocartilaginous/fibrous rim attached around the margin of the glenoid. It <strong>increases the effective depth and surface area of the glenoid</strong>, improving contact with the <strong>humeral head</strong> without substantially restricting movement. The labrum also provides an attachment for the <strong>glenohumeral ligaments</strong> and, superiorly, contributes to the origin of the <strong>long head of the biceps tendon</strong>. It additionally contributes to the sealing mechanism of the joint, helping maintain <strong>negative intra-articular pressure</strong>, and contains mechanoreceptors — one reason labral injury impairs neuromuscular control and not just mechanical stability. The labrum should therefore be thought of as more than a simple rim of cartilage; it is part of an integrated <strong>stabilizing complex</strong>."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Not all parts of the labrum are the same"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>inferior labrum</strong> is generally more firmly attached to the glenoid margin — detachment here is pathological. The <strong>superior and anterosuperior labrum</strong>, particularly around the biceps anchor, is more variable and may be relatively mobile; this is also where most normal anatomical variants occur, which is particularly important when interpreting <strong>MRI and MR arthrography</strong>, because a normal anterosuperior variant can sometimes resemble a labral tear. The <strong>vascular supply</strong> of the labrum is predominantly peripheral, while its inner free margin has relatively poor vascularity, which is why labral tears heal poorly."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The joint capsule"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The GH joint is surrounded by a large, relatively loose fibrous capsule. Medially, it attaches around the glenoid margin and adjacent scapular neck; laterally, it attaches around the <strong>anatomical neck</strong> of the humerus, with some inferior extension onto the <strong>proximal humerus</strong>. The capsule is deliberately redundant — its surface area is roughly <strong>twice that of the humeral head</strong>. If it tightly enclosed the <strong>humeral head</strong>, the shoulder could not achieve its enormous range of motion. This redundancy is particularly obvious inferiorly, where the capsule forms the <strong>axillary recess</strong>, or axillary pouch: at rest this inferior capsule folds on itself, and during elevation it unfolds to permit movement."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The same capsular redundancy that permits normal shoulder mobility also means that stability cannot depend on the capsule alone. Different regions of the capsule become tensioned in different positions, while the rotator cuff actively controls the <strong>humeral head</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Recesses include the <strong>axillary recess</strong> (the redundant inferior portion of the capsule, obliterated and contracted in adhesive capsulitis), the <strong>subscapular recess (bursa of Weitbrecht)</strong> deep to the <strong>subscapularis tendon</strong> — an anterior synovial extension communicating with the joint in most people — and the <strong>biceps tendon sheath</strong>, a synovial extension continuous with the joint, which is why a <strong>glenohumeral effusion</strong> may appear as fluid around the biceps on ultrasound, and why a biceps sheath injection may inadvertently become an intra-articular injection."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "A GH joint effusion can therefore produce <strong>fluid around the long head of the biceps tendon</strong> within its sheath. Fluid here does not necessarily mean primary biceps tenosynovitis; always consider whether it represents extension of a <strong>glenohumeral effusion</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The glenohumeral ligaments"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "— superior, middle and inferior — are best understood as <strong>regional thickenings of the anterior and inferior capsule</strong>, rather than completely separate cord-like ligaments. Their contribution to stability changes according to the position of the arm."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Superior GHL (SGHL)</strong>",
            "Supraglenoid tubercle / anterosuperior labrum to the <strong>lesser tuberosity</strong>, just medial to the bicipital groove",
            "<strong>Arm adducted</strong>",
            "Helps resist <strong>inferior translation of the humeral head</strong> (the sulcus sign). Component of the <strong>biceps pulley</strong>."
          ]
        },
        {
          "cells": [
            "<strong>Middle GHL (MGHL)</strong>",
            "Anterosuperior labrum / supraglenoid tubercle to the base of the <strong>lesser tuberosity</strong>, deep to subscapularis",
            "<strong>Mid-range abduction (~45°)</strong> particularly with <strong>external rotation</strong>",
            "Helps resist <strong>anterior translation</strong>. The most variable GH ligament (absent or vestigial in up to 30%)"
          ]
        },
        {
          "cells": [
            "<strong>Inferior GHL complex (IGHLC)</strong>",
            "A <strong>hammock-like complex</strong>: anterior band, axillary pouch, posterior band",
            "<strong>90° abduction</strong>; anterior band tensions with <strong>external rotation</strong>, posterior band with <strong>internal rotation</strong>",
            "The <strong>most important static stabiliser in the functional overhead position</strong>. Its anterior band is avulsed in a Bankart lesion"
          ]
        },
        {
          "cells": [
            "<strong>Coracohumeral (CHL)</strong>",
            "Lateral base of the coracoid, spanning across the <strong>rotator interval</strong> toward the greater and <strong>lesser tuberosity</strong> regions; with the SGHL, reinforces the superior capsule and the <strong>rotator interval</strong>",
            "Adduction, <strong>external rotation</strong>, inferior translation",
            "Helps resist <strong>inferior translation of the humeral head</strong> when the arm is at the side. Thickened and contracted in adhesive capsulitis"
          ]
        }
      ],
      "title": "The glenohumeral ligaments",
      "columns": [
        {
          "type": "text",
          "title": "Ligament"
        },
        {
          "type": "text",
          "title": "Course"
        },
        {
          "type": "text",
          "title": "Taut when"
        },
        {
          "type": "text",
          "title": "Main role"
        }
      ]
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The rotator interval"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "is a triangular region of the superior-anterior shoulder: bounded superiorly by the anterior border of supraspinatus, inferiorly by the superior border of subscapularis, based medially at the coracoid, and narrowing laterally toward the <strong>intertubercular groove</strong>. Within this relatively small region lie several important structures, particularly the <strong>coracohumeral ligament, superior glenohumeral ligament and long head of the biceps tendon</strong>. The <strong>rotator interval</strong> has two major functions: it contributes to <strong>glenohumeral stability</strong>, and it helps stabilize the <strong>long head of the biceps</strong> as the tendon enters the bicipital groove."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The biceps pulley"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "As the <strong>long head of the biceps tendon</strong> leaves the intra-articular portion of its course and turns into the bicipital groove, it must remain centred over the anterior <strong>humeral head</strong>. It is stabilized by a soft-tissue sling known as the <strong>biceps reflection pulley</strong>, formed by the SGHL (the medial floor, and the key component), the CHL (the superficial roof, with medial and lateral limbs), superficial fibres of the <strong>subscapularis tendon</strong> (the medial wall), and anterior fibres of the supraspinatus tendon (the lateral wall)."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>This relationship is particularly important because the pulley and upper subscapularis are anatomically closely connected.</strong> A medial subluxation or dislocation of the <strong>long head</strong> of biceps <strong>is almost always accompanied by a subscapularis tendon lesion.</strong> If the report says \"medial biceps subluxation,\" be suspicious of the subscapularis.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Adhesive capsulitis provides an excellent example of why this anatomy matters clinically.</strong> This disease particularly involves the <strong>rotator interval</strong>, coracohumeral ligament and glenohumeral capsule, with capsular fibrosis and contracture developing as the condition progresses, then progressing to axillary pouch contraction. This explains the classic capsular pattern of restriction: <strong>external rotation is lost first and most</strong> (CHL / <strong>rotator interval</strong>), then abduction (axillary pouch), then <strong>internal rotation</strong>. When passive <strong>external rotation</strong> is markedly restricted, <strong>think about the structures that normally permit that movement</strong> — particularly the anterior-superior capsule, <strong>rotator interval</strong> and coracohumeral ligament. The clinical examination is therefore directly reflecting the underlying anatomy.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Adhesive Capsulitis"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The long head of the biceps"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "originates from the <strong>supraglenoid region and superior labrum</strong> — its exact labral attachment varies between individuals, which is important when interpreting superior labral pathology. From its origin, the tendon passes across the superior aspect of the <strong>humeral head</strong> before entering the <strong>intertubercular groove</strong>, meaning it is <strong>intra-articular but extrasynovial</strong>: it passes within the fibrous boundaries of the joint but is surrounded by a synovial reflection rather than lying freely within the synovial cavity. The superior labrum–biceps anchor relationship also explains the anatomy of <strong>SLAP lesions</strong>. It is richly innervated with sensory and sympathetic fibres, making it a genuinely potent pain generator — and the reason biceps tenotomy or tenodesis relieves pain so effectively."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Normal anterosuperior labral variants"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>superior and anterosuperior labrum</strong> is highly variable. Several normal variants can mimic pathology on imaging. All occur in the <strong>11 to 3 o'clock</strong> region. Misreading them as pathology leads to unnecessary surgical referral."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Sublabral foramen (hole)</strong>",
            "Unattached anterosuperior labrum with an opening communicating with the <strong>subscapular recess</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Sublabral recess (sulcus)</strong>",
            "A recess at the biceps anchor. Follows the glenoid contour, has smooth margins and extends medially — unlike a SLAP tear, which extends laterally with irregular margins"
          ]
        },
        {
          "cells": [
            "<strong>Buford complex</strong>",
            "<strong>Absent anterosuperior labrum</strong> with a <strong>cord-like MGHL</strong> attaching directly to the superior labrum at the biceps root"
          ]
        },
        {
          "cells": [
            "<strong>Meniscoid labrum</strong>",
            "Mobile, free superior labral edge overlying the cartilage"
          ]
        }
      ],
      "title": "Anterosuperior labral variants",
      "columns": [
        {
          "type": "text",
          "title": "Variant"
        },
        {
          "type": "text",
          "title": "Description"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Recognizing a <strong>Buford complex</strong> is important because treating the absent anterosuperior labrum as though it were a conventional labral detachment can alter normal shoulder mechanics and restrict <strong>external rotation</strong>, creating a new problem. A resident who recognises the variant will not panic when a report describes \"absent anterosuperior labrum with a thick cord-like structure.\" This is a good example of a broader principle in shoulder imaging: variation is common, and anatomy must be understood before pathology can be recognized.",
      "color": "red",
      "label": "Pitfall — Do Not Mistake Normal Anatomy for Pathology"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "3.4 The Scapulothoracic Articulation"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>scapulothoracic articulation</strong> is not a true synovial joint. It is a <strong>functional gliding interface</strong> that allows the scapula to move smoothly over the postero<strong>lateral thoracic</strong> wall. Unlike the SC, AC and GH joints, it has <strong>no articular cartilage, joint capsule or synovial cavity</strong>. Instead, smooth movement is created by layers of muscle and bursae interposed between the scapula and the rib cage. This interface is essential because the scapula provides the <strong>mobile base from which the glenohumeral joint operates</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Layers, deep to superficial"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "From the thoracic wall toward the scapula: the thoracic wall (ribs 2–7 and intercostals); <strong>serratus anterior</strong>, which covers the <strong>lateral thoracic</strong> wall and separates the scapula from the ribs; the infraserratus (scapulothoracic) bursa, between serratus and chest wall; the supraserratus (subscapularis) bursa, between subscapularis and serratus; subscapularis, which covers most of the anterior surface of the scapula and forms the muscular surface facing the <strong>serratus anterior</strong>; the scapula itself; and, posteriorly, the rotator cuff and other scapular muscles, with <strong>trapezius, rhomboids and levator scapulae</strong> contributing to its positioning and control."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Serratus anterior</strong> and subscapularis effectively create a <strong>muscle-on-muscle gliding interface</strong> between the scapula and thoracic wall. This is why abnormal scapular movement, muscle dysfunction or inflammation of the intervening bursae can produce pain and crepitus even though there is no true scapulothoracic \"joint.\"",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Scapulothoracic bursae"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Several bursae may occur around the scapulothoracic interface. The two principal anatomical bursal planes are the supraserratus bursa (between subscapularis and <strong>serratus anterior</strong>) and the infraserratus bursa (between <strong>serratus anterior</strong> and the thoracic wall). Their role is straightforward: they <strong>reduce friction as the scapula moves over the chest wall</strong>. Additional <strong>adventitial bursae</strong> may develop in areas exposed to repetitive friction, particularly around the <strong>superomedial and inferior angles of the scapula</strong>, and can become symptomatic, contributing to <strong>scapulothoracic bursitis or snapping scapula syndrome</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Not every scapular click is pathological. Painless crepitus can occur without clinically important disease. It becomes more relevant when the snapping is associated with <strong>pain, focal tenderness, functional limitation or reproducible symptoms during scapular movement</strong>. When symptoms are prominent, determine whether the problem is primarily soft-tissue/bursal or whether a structural bony abnormality is altering the scapulothoracic interface.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Snapping scapula</strong> refers to painful or sometimes painless crepitus produced during scapular movement over the thoracic wall. The underlying mechanism is usually abnormal friction between the scapula and surrounding soft tissues or chest wall. Potential causes include inflamed or thickened scapulothoracic bursae and structural abnormalities that alter the normally smooth scapulothoracic interface. Important structural causes include <strong>osteochondroma, prominent superomedial scapular morphology such as a Luschka tubercle, malunited scapular or rib fractures, and other bony abnormalities that reduce normal scapulothoracic congruence</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Snapping Scapula Syndrome"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Why scapular control matters"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Because there is no conventional joint holding the scapula to the thorax, its position is largely controlled by the surrounding muscles. The <strong>serratus anterior and trapezius</strong> are particularly important for maintaining the scapula against the thoracic wall and controlling its orientation during arm movement; the rhomboids and <strong>levator scapulae</strong> provide additional control. Neurological injury can therefore dramatically alter the <strong>scapulothoracic articulation</strong> without producing any primary joint lesion."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Scapular winging is anatomy made visible. A <u>long thoracic nerve lesion</u> weakens the <strong>serratus anterior</strong>, reducing its ability to maintain the medial scapular border against the thoracic wall. <u>Spinal accessory nerve injury</u> weakens the trapezius and produces a different pattern of scapular malposition and abnormal movement. Careful observation of the scapula at rest and during movement can therefore provide valuable information for <strong>neurological localization</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Scapular Winging Is Anatomy Made Visible"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "3.5 The Subacromial–Subdeltoid Space and the Bursae"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>subacromial–subdeltoid (SASD) space</strong> is not a true joint, but functionally it behaves like an important <strong>gliding interface</strong> between the rotator cuff and the structures above it. Codman famously described this region as the \"second shoulder joint\" because smooth movement here is essential for normal shoulder motion. As the arm elevates, the rotator cuff and greater tuberosity must move smoothly beneath the <strong>acromion, coracoacromial arch and deltoid</strong>. The <strong>SASD bursa</strong> provides the low-friction surface that makes this possible."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Think of the <strong>SASD bursa</strong> as a <strong>sliding layer between the rotator cuff and the overlying acromion/deltoid</strong>. When this interface becomes inflamed, thickened or mechanically overloaded, movement that should be almost frictionless may become painful.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The subacromial–subdeltoid bursa"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "is a large synovial-lined potential space located superficial to the rotator cuff. Its subacromial portion lies beneath the acromion and <strong>coracoacromial arch</strong>, while its subdeltoid extension continues laterally beneath the deltoid; these regions communicate extensively and function clinically as a <strong>single continuous bursal structure</strong>. The bursa normally contains only a very small amount of fluid, sufficient to allow its opposing surfaces to glide over one another. Because the bursa is richly innervated, inflammation can be an important source of shoulder pain."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The bursa itself can hurt. In patients with rotator cuff–related shoulder pain, symptoms do not necessarily arise directly from the tendon lesion seen on imaging. The <strong>SASD bursa is a potential pain-generating structure</strong>, which helps explain why relatively modest tendon abnormalities may coexist with substantial pain — and why reducing bursal inflammation can sometimes produce significant symptomatic improvement.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Relationship to the <strong>glenohumeral joint</strong>.</strong> Under normal circumstances, the <strong>SASD bursa does not communicate with the glenohumeral joint</strong> — the rotator cuff forms a tissue barrier between the two spaces. If a <strong>full-thickness rotator cuff tear</strong> creates a defect extending through the entire tendon, communication may develop between the GH joint and <strong>SASD bursa</strong>, and joint fluid can then pass through the cuff defect into the bursa."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Fluid in the <strong>SASD bursa</strong> is <strong>not specific</strong> for a <strong>full-thickness rotator cuff tear</strong> and can occur with bursitis or other shoulder disorders. However, <strong>direct communication between the GH joint and SASD bursa through a tendon defect</strong> is characteristic of a <u>full-thickness cuff tear</u>.",
      "color": "accent",
      "label": "Imaging Pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>SASD bursa</strong> lies at the intersection of <strong>several common shoulder disorders:</strong> rotator cuff pathology can produce secondary bursal inflammation, repetitive loading can irritate the bursa, calcific deposits may rupture into it, inflammatory disorders may produce bursitis, and a <u>full-thickness cuff tear</u> can allow communication with the GH joint. For this reason, the bursa should rarely be interpreted in isolation. A more useful clinical question is: why is the bursa abnormal? The answer may lie in the bursa itself, the adjacent rotator cuff, the underlying GH joint or the broader mechanics of the shoulder.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Why the SASD Bursa Matters Clinically"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Subacromial–subdeltoid (SASD)</strong>",
            "Beneath the acromion and deltoid, above supraspinatus and the greater tuberosity. The subacromial and subdeltoid components <strong>communicate in over 95%</strong> and behave as one structure",
            "<strong>The largest bursa in the body.</strong> Normally it does not communicate with the <strong>glenohumeral joint</strong> — <strong>fluid in both the joint and the bursa suggests a full-thickness cuff tear</strong>"
          ]
        },
        {
          "cells": [
            "Subcoracoid",
            "Between the coracoid / <strong>conjoint tendon</strong> and subscapularis. Not to be confused with the <strong>subscapular recess</strong>, which is directly continuous with the GH joint.",
            "May communicate with the SASD; implicated in subcoracoid impingement"
          ]
        },
        {
          "cells": [
            "<strong>Subscapular recess</strong>",
            "Deep to the <strong>subscapularis tendon</strong>",
            "Technically a <strong>recess of the joint</strong>, not an independent bursa — it communicates with the joint normally"
          ]
        },
        {
          "cells": [
            "Scapulothoracic",
            "Between the muscular layers of the scapulothoracic interface",
            "Relevant to scapulothoracic bursitis and snapping scapula"
          ]
        }
      ],
      "title": "Other important bursae and recesses",
      "columns": [
        {
          "type": "text",
          "title": "Bursa"
        },
        {
          "type": "text",
          "title": "Location"
        },
        {
          "type": "text",
          "title": "Clinical relevance"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "4. Investing Fasciae and Fascial Planes"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Fascia is easy to overlook when learning shoulder anatomy because it is less visually obvious than bones, muscles or nerves. Clinically, however, these fascial layers are important because they <strong>enclose muscles, define anatomical and surgical planes, transmit forces between regions, and contribute to the stability of the shoulder girdle</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "For PM&R, the most useful fascial structures to recognize are the <strong>pectoral fascia, clavipectoral fascia, costocoracoid membrane, deltotrapezial fascia and axillary fascia</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Pectoral fascia</strong>",
            "A relatively thin fascial layer that invests the <strong>pectoralis major muscle</strong>; continuous inferiorly with the fascia of the anterior abdominal wall and laterally with the axillary fascia",
            "Rather than functioning as an isolated sheet, it forms part of the continuous connective-tissue envelope of the anterior chest wall and shoulder."
          ]
        },
        {
          "cells": [
            "<strong>Clavipectoral fascia</strong>",
            "A deep sheet behind <strong>pectoralis major</strong>, descending from the clavicle, splitting to enclose subclavius and <strong>pectoralis minor</strong>, then continuing inferolaterally to fuse with the axillary fascia as the <strong>suspensory ligament of the axilla</strong>",
            "Defines the deltopectoral surgical interval; the suspensory ligament is what produces the hollow of the armpit"
          ]
        },
        {
          "cells": [
            "<strong>Costocoracoid membrane</strong>",
            "The superior portion of the clavipectoral fascia, between subclavius and <strong>pectoralis minor</strong>",
            "<strong>Pierced by four structures: the cephalic vein, the lateral pectoral nerve, the thoracoacromial artery, and lymphatics.</strong> A major surgical landmark"
          ]
        },
        {
          "cells": [
            "<strong>Deltotrapezial fascia</strong>",
            "The aponeurotic sheet where anterior deltoid and trapezius blend over the distal clavicle",
            "A functional stabiliser of the <strong>AC joint</strong>; its disruption distinguishes Rockwood III from V"
          ]
        },
        {
          "cells": [
            "<strong>Axillary fascia</strong>",
            "The base of the axilla, continuous with pectoral and latissimus fasciae",
            "Forms the floor of the axilla; tethered upward by the suspensory ligament"
          ]
        }
      ],
      "title": "Investing fasciae",
      "columns": [
        {
          "type": "text",
          "title": "Fascial layer"
        },
        {
          "type": "text",
          "title": "Anatomy"
        },
        {
          "type": "text",
          "title": "Why it matters"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "5. Muscles"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Rather than memorizing the shoulder muscles alphabetically, it is more useful to organize them by <strong>what they connect and what they control</strong>. The first group is the <strong>axioscapular muscles</strong>: muscles connecting the axial skeleton to the scapula or clavicle. Their main role is to <strong>position and stabilize the scapula</strong>, creating a stable but mobile platform for glenohumeral movement."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "5.1 Group 1: Axioscapular (They Position the Scapula)"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The scapula has no direct bony articulation with the thoracic cage. Its position therefore depends heavily on muscular control. The principal <strong>axioscapular muscles</strong> are the <strong>trapezius, serratus anterior, rhomboids and levator scapulae</strong>, with <strong>pectoralis minor</strong> also influencing scapular position. The subclavius acts primarily on the clavicle but contributes to stabilization of the shoulder girdle."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Trapezius — upper</strong>",
            "External occipital protuberance, nuchal ligament, C1–C6",
            "Lateral third of clavicle",
            "<strong>Spinal accessory (CN XI)</strong> + C3–C4",
            "CN XI, C3–C4"
          ]
        },
        {
          "cells": [
            "<strong>Trapezius — middle</strong>",
            "C7–T3 spinous processes",
            "Acromion, <strong>scapular spine</strong>",
            "<strong>Spinal accessory (CN XI)</strong>",
            "CN XI, C3–C4"
          ]
        },
        {
          "cells": [
            "<strong>Trapezius — lower</strong>",
            "T4–T12 spinous processes",
            "Medial <strong>scapular spine</strong> (tubercle)",
            "<strong>Spinal accessory (CN XI)</strong>",
            "CN XI, C3–C4"
          ]
        },
        {
          "cells": [
            "<strong>Serratus anterior</strong>",
            "Outer surfaces of ribs 1–8/9",
            "Costal surface of the medial scapular border; lower digitations concentrated at the <strong>inferior angle</strong>",
            "<strong>Long thoracic</strong>",
            "<strong>C5, C6, C7</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Rhomboid major</strong>",
            "T2–T5 spinous processes",
            "Medial border below the spine",
            "<strong>Dorsal scapular</strong>",
            "C4–C5"
          ]
        },
        {
          "cells": [
            "<strong>Rhomboid minor</strong>",
            "C7–T1 spinous processes, lower nuchal ligament",
            "Medial border at the root of the spine",
            "<strong>Dorsal scapular</strong>",
            "C4–C5"
          ]
        },
        {
          "cells": [
            "<strong>Levator scapulae</strong>",
            "Transverse processes C1–C4",
            "<strong>Superior angle</strong> to the root of the spine",
            "<strong>Dorsal scapular</strong> (C5) + direct C3–C4 branches",
            "C3–C5"
          ]
        },
        {
          "cells": [
            "<strong>Pectoralis minor</strong>",
            "Ribs 3–5",
            "Medial border and superior surface of the coracoid",
            "<strong>Medial pectoral</strong>",
            "C8–T1"
          ]
        },
        {
          "cells": [
            "Subclavius",
            "First rib / costal cartilage junction",
            "Inferior surface of the middle clavicle",
            "Nerve to subclavius",
            "C5–C6"
          ]
        }
      ],
      "title": "Axioscapular muscles",
      "columns": [
        {
          "type": "text",
          "title": "Muscle"
        },
        {
          "type": "text",
          "title": "Origin"
        },
        {
          "type": "text",
          "title": "Insertion"
        },
        {
          "type": "text",
          "title": "Innervation"
        },
        {
          "type": "text",
          "title": "Roots"
        }
      ]
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Trapezius"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The trapezius is a large superficial muscle extending from the skull and cervical/thoracic spine to the clavicle, acromion and <strong>scapular spine</strong>. Functionally, it is better understood as <strong>three regions with different fiber directions</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Upper trapezius:</strong> the upper fibers originate from the occipital and upper cervical region and insert primarily onto the <strong>lateral clavicle</strong>. They contribute to <strong>scapular elevation</strong> and, together with the lower <strong>trapezius and serratus anterior</strong>, contribute to <strong>upward rotation of the scapula</strong>.</li><li><strong>Middle trapezius:</strong> the middle fibers run more horizontally toward the acromion and <strong>scapular spine</strong>. Their major role is <strong>scapular retraction</strong>, helping control the position of the <strong>medial border</strong> of the scapula relative to the thorax.</li><li><strong>Lower trapezius:</strong> the lower fibers ascend toward the medial portion of the <strong>scapular spine</strong>. They contribute to <strong>scapular depression and upward rotation</strong> and are particularly important in coordinated overhead movement.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Do not think of the trapezius simply as a \"shoulder shrugger.\" Its different regions work together to <strong>position and rotate the scapula</strong>: upper + lower trapezius → upward rotation; middle trapezius → retraction. The upper and lower fibers create an important force couple during arm elevation.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Innervation.</strong> The trapezius has an unusual innervation: its primary motor supply comes from the <strong>spinal accessory nerve (CN XI)</strong>, while cervical spinal nerves, principally C3–C4, provide sensory and proprioceptive contributions. This makes the trapezius particularly useful in electrodiagnostic localization because its motor innervation differs from that of most shoulder muscles supplied through the brachial plexus."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Serratus Anterior"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>serratus anterior</strong> originates from the lateral surfaces of the upper eight or nine ribs and passes posteriorly around the thoracic wall to insert along the <strong>anterior surface of the medial border of the scapula</strong>. Its lower fibers converge strongly toward the <strong>inferior angle</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "It has three particularly important functions: protraction (moves the scapula around the thoracic wall), upward rotation (helps orient the glenoid superiorly during arm elevation), and scapular stabilization (keeps the <strong>medial border</strong> and <strong>inferior angle</strong> closely applied to the thorax). It is innervated by the <strong>long thoracic nerve (C5–C7)</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>serratus anterior</strong> does more than protract the scapula. Its clinically critical role is to <strong>hold the scapula against the thoracic wall while contributing to upward rotation</strong>. Loss of this function explains both the winging and difficulty with overhead elevation seen in <strong>long thoracic nerve</strong> palsy.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "During arm elevation, the scapula must <strong>upwardly rotate</strong> so that the glenoid follows the <strong>humeral head</strong> and the acromion moves appropriately relative to the elevating humerus. This is achieved largely through coordinated activity of the <strong>trapezius and serratus anterior</strong>. The upper and lower trapezius exert forces on the <strong>scapular spine</strong> and clavicular-acromial region, while the <strong>serratus anterior</strong> — particularly its lower fibers — acts strongly on the <strong>inferior angle</strong>. The result is coordinated <strong>upward rotation of the scapula rather than simple translation</strong>. Rehabilitation pearl: this is why rehabilitation of altered scapular control rarely makes sense as isolated strengthening of a single muscle. Normal scapular movement depends on coordinated recruitment of the <strong>serratus anterior and different regions of the trapezius</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Trapezius + Serratus Anterior: the Upward-Rotation Force Couple"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Rhomboids"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>rhomboid major and minor</strong> connect the vertebral column to the <strong>medial border</strong> of the scapula. <strong>Rhomboid minor</strong> inserts around the level of the <strong>root of the scapular spine</strong>, while rhomboid major inserts along the <strong>medial border</strong> below it. Their main actions are <strong>scapular retraction and downward rotation</strong>, while also helping stabilize the <strong>medial border</strong> against the thoracic wall. Both are supplied primarily by the <strong>dorsal scapular nerve</strong>, predominantly from C5."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The rhomboids are particularly useful when evaluating a suspected <strong>C5 radiculopathy</strong> because the <strong>dorsal scapular nerve</strong> typically branches from the proximal <strong>C5 root</strong> before the formation of the <strong>upper trunk</strong>. Abnormal rhomboid findings can therefore support a lesion proximal to the <strong>upper trunk</strong>, although anatomical variation means they should never be interpreted in isolation.",
      "color": "trust",
      "label": "EMG Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Levator Scapulae"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>levator scapulae</strong> extends from the transverse processes of C1–C4 to the superior medial scapula between the superior angle and root of the spine. As its name suggests, it contributes to <strong>scapular elevation</strong>, and also contributes to <strong>downward rotation</strong> of the scapula. Its innervation comes from cervical spinal nerves and the <strong>dorsal scapular nerve</strong>. Because of its cervical attachments, it forms an anatomical link between the <strong>cervical spine and scapular girdle</strong>."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Pectoralis Minor"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>pectoralis minor</strong> originates from ribs 3–5 and inserts onto the <strong>coracoid process</strong>. Because its distal attachment is on the scapula rather than the humerus, its contraction directly influences scapular position. It can contribute to <strong>scapular protraction, depression and anterior tilt</strong>, depending on the position of the scapula and thorax. It is supplied predominantly by the <strong>medial pectoral nerve</strong>, usually with C8–T1 contributions."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "A shortened or highly active <strong>pectoralis minor</strong> is often discussed in patients with altered scapular posture because its line of pull can favor <strong>anterior tilt and internal rotation of the scapula</strong>. However, scapular posture is multifactorial; <strong>pectoralis minor</strong> should not automatically be assumed to be the cause of shoulder pain simply because it feels \"tight.\"",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Subclavius"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The subclavius is a small muscle extending from the first rib/costal cartilage region to the inferior surface of the middle clavicle. It helps stabilize and depress the clavicle and may provide some protection to the underlying <strong>brachial plexus and subclavian vessels</strong>. It is innervated by the <strong>nerve to subclavius (C5–C6)</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Scapular winging is one of the clearest examples of how muscle anatomy can directly localize a neurological lesion. <strong>Long thoracic</strong> palsy → loss of function of <strong>serratus anterior</strong> → <strong>medial winging</strong>, with the <strong>inferior angle</strong> rotating toward the spine. Worse on forward flexion and the wall push-up. There is loss of upward rotation and protraction. <strong>Spinal accessory palsy → weakness of trapezius</strong> → lateral winging, with the <strong>inferior angle</strong> translating laterally, plus <strong>shoulder droop, an asymmetric neckline and loss of the upper trapezius contour</strong>. Worse on abduction. The classic iatrogenic cause is <u>posterior cervical triangle lymph node biopsy</u>. <strong>Dorsal scapular palsy → loss of function of rhomboids</strong> → subtle lateral winging with the scapula slightly abducted and inferiorly translated — much less common and frequently overlooked entirely. Do not diagnose the nerve lesion simply because \"the scapula wings.\" Observe <strong>which border becomes prominent, where the inferior angle moves, whether the shoulder droops, and which movement exaggerates the deformity</strong>. The pattern of scapular movement often tells you which muscle is weak — and the muscle points toward the nerve.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Scapular Winging: Anatomy Applied"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Long thoracic</strong> nerve",
            "<strong>Serratus anterior</strong>",
            "Prominent <strong>medial border</strong>/<strong>inferior angle</strong>; classically described as <strong>medial winging</strong>",
            "Often accentuated with forward flexion or wall push-up"
          ]
        },
        {
          "cells": [
            "Spinal accessory nerve",
            "Trapezius",
            "Shoulder droop with abnormal lateral displacement/rotation of the scapula; <strong>lateral winging pattern</strong>",
            "Often more apparent during abduction"
          ]
        },
        {
          "cells": [
            "<strong>Dorsal scapular</strong> nerve",
            "Rhomboids",
            "Usually subtler lateral displacement of the scapula",
            "May become more apparent during resisted retraction"
          ]
        }
      ],
      "title": "The three winging patterns",
      "columns": [
        {
          "type": "text",
          "title": "Lesion"
        },
        {
          "type": "text",
          "title": "Weak muscle"
        },
        {
          "type": "text",
          "title": "Typical pattern"
        },
        {
          "type": "text",
          "title": "Helpful maneuver"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "5.2 Muscles — Group 2: Scapulohumeral (They Act Across the Glenohumeral Joint)"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>scapulohumeral muscles</strong> arise from the scapula or clavicle and insert onto the humerus, allowing them to act directly a<strong>cross the glenohumeral joint</strong>. This group includes the <strong>rotator cuff muscles, deltoid and teres major</strong>. Coracobrachialis can also be considered here functionally because it crosses the GH joint and acts on the humerus."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Supraspinatus",
            "<strong>Supraspinous fossa</strong>",
            "<strong>Superior facet of greater tuberosity</strong> + capsular attachment",
            "<strong>Suprascapular nerve</strong>",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "Infraspinatus",
            "<strong>Infraspinous fossa</strong>",
            "<strong>Middle facet of greater tuberosity</strong>",
            "<strong>Suprascapular nerve</strong>",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "<strong>Teres minor</strong>",
            "Lateral border of scapula",
            "<strong>Inferior facet of greater tuberosity</strong>",
            "<strong>Axillary nerve</strong>",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "Subscapularis",
            "Subscapular fossa",
            "<strong>Lesser tuberosity</strong> and adjacent <strong>proximal humerus</strong>",
            "<strong>Upper + lower subscapular nerves</strong>",
            "C5–C6, variable C7"
          ]
        },
        {
          "cells": [
            "Deltoid",
            "Lateral clavicle, acromion, <strong>scapular spine</strong>",
            "<strong>Deltoid tuberosity</strong>",
            "<strong>Axillary nerve</strong>",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "<strong>Teres major</strong>",
            "<strong>Inferior angle</strong>/lower lateral border of scapula",
            "Medial lip of <strong>intertubercular groove</strong>",
            "<strong>Lower subscapular nerve</strong>",
            "C5–C7"
          ]
        },
        {
          "cells": [
            "Coracobrachialis",
            "<strong>Coracoid process</strong>",
            "Medial mid-humeral shaft",
            "<strong>Musculocutaneous nerve</strong>",
            "C5–C7"
          ]
        }
      ],
      "title": "Scapulohumeral muscles",
      "columns": [
        {
          "type": "text",
          "title": "Muscle"
        },
        {
          "type": "text",
          "title": "Origin"
        },
        {
          "type": "text",
          "title": "Insertion"
        },
        {
          "type": "text",
          "title": "Innervation"
        },
        {
          "type": "text",
          "title": "Roots"
        }
      ]
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "The Rotator Cuff"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The rotator cuff is the <strong>dynamic stabilizing system of the glenohumeral joint</strong>, and its anatomy explains much of what we see clinically: why some large tears remain surprisingly functional, why some small tears are painful, why the <strong>long head</strong> of biceps and subscapularis frequently fail together, and why tear location matters."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The cuff consists of four muscles — subscapularis, supraspinatus, infraspinatus, <strong>teres minor</strong> — the familiar mnemonic SITS. Their tendons do not behave as four completely independent structures. As they approach the humerus, they <strong>interdigitate with one another and blend with the joint capsule</strong>, forming a continuous musculotendinous cuff around the <strong>humeral head</strong>. Collectively, the cuff acts as a <strong>dynamic stabilizer of the glenohumeral joint</strong>, compressing and centring the <strong>humeral head</strong> against the glenoid during movement — the principle of concavity-compression."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Deltoid generates powerful elevation. Rotator cuff keeps the <strong>humeral head</strong> centred while that movement occurs. Normal shoulder elevation depends on these forces working together.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Subscapularis",
            "Largest cuff muscle",
            "Internal rotation + anterior dynamic stabilization",
            "Upper and <strong>lower subscapular nerve</strong>s, C5–C6 ± C7"
          ]
        },
        {
          "cells": [
            "Infraspinatus",
            "Large posterior cuff muscle",
            "External rotation + posterior stabilization",
            "<strong>Suprascapular nerve</strong>, C5–C6"
          ]
        },
        {
          "cells": [
            "Supraspinatus",
            "Smaller than subscapularis/infraspinatus",
            "Compression, stabilization and contribution to elevation",
            "<strong>Suprascapular nerve</strong>, C5–C6"
          ]
        },
        {
          "cells": [
            "<strong>Teres minor</strong>",
            "Smallest cuff muscle",
            "External rotation, particularly important with the arm abducted",
            "<strong>Axillary nerve</strong>, C5–C6"
          ]
        }
      ],
      "title": "Relative size and role",
      "columns": [
        {
          "type": "text",
          "title": "Muscle"
        },
        {
          "type": "text",
          "title": "Relative size"
        },
        {
          "type": "text",
          "title": "Principal role"
        },
        {
          "type": "text",
          "title": "Innervation"
        }
      ]
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Supraspinatus"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The supraspinatus originates from the supraspinous fossa, passes laterally beneath the acromion, and inserts predominantly onto the <strong>superior facet of the greater tuberosity</strong>. Its footprint is approximately <strong>12–16 mm in medial-to-lateral width anteriorly</strong>, with an anteroposterior dimension in the region of 20–25 mm, although measurements vary between anatomical studies. The tendon itself is not uniform: its anterior portion is generally thicker and mechanically important, while the posterior portion is thinner and blends extensively with the adjacent infraspinatus. It is innervated by the <strong>suprascapular nerve (C5–C6)</strong> before the nerve passes through the spinoglenoid region."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Function.</strong> Supraspinatus contributes to <strong>arm elevation throughout the range</strong>, rather than acting only during the first 15° of abduction. It also provides an important <strong>compressive force</strong>, helping maintain the <strong>humeral head</strong> against the glenoid while the deltoid elevates the arm."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The traditional statement that \"supraspinatus initiates the first 15° of abduction and then the deltoid takes over\" is an oversimplification. Both muscles contribute to elevation, with their relative mechanical roles changing through the range. This also helps explain why some patients with an isolated supraspinatus tear can still actively elevate the arm: shoulder elevation depends on the <strong>entire cuff–deltoid system</strong>, not on supraspinatus acting as an isolated \"starter motor.\"",
      "color": "red",
      "label": "Pitfall — Do Not Miss"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Supraspinatus is particularly important clinically because its tendon is commonly involved in <strong>rotator cuff tendinopathy and tears</strong>.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Infraspinatus"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The infraspinatus originates from the infraspinous fossa and inserts predominantly onto the <strong>middle facet of the greater tuberosity</strong>. There is substantial overlap between the supraspinatus and infraspinatus footprints. It is supplied by the <strong>suprascapular nerve (C5–C6)</strong> after the nerve has supplied supraspinatus. Its major movement is <strong>external rotation of the humerus</strong>, but it also contributes substantially to dynamic GH stability."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The relationship between supraspinatus and infraspinatus is extremely useful for localizing <strong>suprascapular neuropathy</strong>. A lesion near the <strong>suprascapular notch</strong> can affect both muscles. A more distal lesion around the <strong>spinoglenoid notch</strong> preferentially affects the infraspinatus while sparing supraspinatus. This makes the two muscles a natural electrodiagnostic pair.",
      "color": "trust",
      "label": "EMG Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Teres Minor"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>teres minor</strong> originates from the lateral border of the scapula and inserts onto the <strong>inferior facet of the greater tuberosity</strong> and adjacent <strong>proximal humerus</strong>. It is innervated by the <strong>posterior branch of the axillary nerve</strong>, predominantly C5–C6. Like infraspinatus, its principal action is <strong>external rotation</strong>, with an additional contribution to <strong>humeral head</strong> stabilization. Its position becomes especially important when distinguishing <strong>axillary nerve pathology from suprascapular neuropathy</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Weak <strong>external rotation</strong> does not automatically mean <strong>suprascapular neuropathy</strong>. <strong>Infraspinatus → suprascapular nerve</strong>. <strong>Teres minor → axillary nerve</strong>. Examining both muscles helps localize the lesion.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Subscapularis"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The subscapularis is the largest and most powerful muscle of the rotator cuff. It originates across the <strong>subscapular fossa</strong> on the anterior surface of the scapula and passes anterior to the GH joint to insert primarily onto the <strong>lesser tuberosity</strong>, with additional attachment to the adjacent <strong>proximal humerus</strong>. Unlike the other three cuff muscles, it lies anteriorly. Its upper portion is more tendinous, while the inferior portion has a more muscular insertion. It is innervated by the <strong>upper and lower subscapular nerves</strong>, predominantly from C5–C6 with variable C7 contribution."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Function.</strong> Subscapularis is a powerful <strong>internal rotator</strong> of the humerus and contributes to anterior dynamic stability of the GH joint. Its superior fibers also form an important component of the <strong>biceps pulley</strong> — creating an important clinical relationship: upper subscapularis ↔ <strong>biceps pulley</strong> ↔ <strong>long head</strong> of biceps stability."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "When the <strong>long head</strong> of biceps is displaced <strong>medially out of the bicipital groove</strong>, carefully evaluate the upper subscapularis and pulley complex. <strong>Biceps instability</strong> and <strong>subscapularis pathology</strong> commonly coexist because their anatomy is intimately connected.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Learning the individual actions of the cuff muscles is necessary, but it misses their most important collective role. During elevation, the deltoid produces a strong force that includes a superiorly directed component on the <strong>humeral head</strong>. The rotator cuff generates a <strong>compressive and stabilizing force</strong>, helping maintain the <strong>humeral head</strong> centred on the glenoid — a mechanism often described as concavity-compression. The cuff therefore creates a stable centre of rotation from which the larger shoulder muscles can work efficiently.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — the Rotator Cuff as a Functional Unit"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Rotator cuff footprints. The cuff tendons insert onto the <strong>proximal humerus</strong> through broad footprints, rather than discrete points. The classic map remains extremely useful — greater tuberosity: superior facet → supraspinatus, middle facet → infraspinatus, inferior facet → <strong>teres minor</strong>; <strong>lesser tuberosity</strong> → subscapularis (anteriorly). Although the real anatomy is more complex, because the tendons <strong>overlap and interdigitate before insertion</strong>: near their insertion, fibers from neighboring tendons <strong>interdigitate with one another and blend with the underlying GH capsule</strong>, producing a continuous soft-tissue sleeve around the <strong>humeral head</strong>. That continuity helps transmit force across the cuff but also means that tears may <strong>extend between adjacent tendon regions</strong> rather than respecting the boundaries shown in simplified anatomical diagrams.",
      "color": "violet",
      "label": "Memory Aid"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Vascularity and the \"critical zone.\" The supraspinatus tendon has traditionally been described as containing a \"critical zone\" near its insertion. Codman proposed that this region, approximately <strong>1 cm proximal to the greater tuberosity</strong>, was relatively poorly vascularized and therefore particularly vulnerable to degeneration. Modern understanding is more nuanced: the region should be considered <strong>relatively hypovascular rather than avascular</strong>, and tendon perfusion varies with age, arm position and disease. Avoid the old explanation \"supraspinatus tears because the critical zone has no blood supply\" — rotator cuff degeneration is multifactorial, with age-related tendon changes, repetitive loading, mechanical environment, vascular factors and biological healing capacity all interacting.",
      "color": "red",
      "label": "Pitfall — Do Not Miss"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Deltoid"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The deltoid forms the characteristic contour of the lateral shoulder. It originates broadly from the <strong>lateral clavicle, acromion and scapular spine</strong> and converges onto the <strong>deltoid tuberosity of the humerus</strong>. It is conventionally divided into three functional regions: the anterior (clavicular) fibers, arising from the <strong>lateral clavicle</strong>, contribute primarily to <strong>shoulder flexion and internal rotation</strong> while assisting elevation; the middle (acromial) fibers, arising from the acromion, are oriented to make them particularly important for <strong>abduction/elevation of the humerus</strong>; and the posterior (spinal) fibers, arising from the <strong>scapular spine</strong>, contribute to <strong>extension and external rotation</strong> of the shoulder. All three regions are supplied by the <strong>axillary nerve (C5–C6)</strong>, although different branches preferentially supply different portions of the muscle."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The deltoid is not one muscle performing one movement: anterior → flexion + <strong>internal rotation</strong>; middle → abduction/elevation; posterior → extension + <strong>external rotation</strong>.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong><strong>Axillary nerve</strong> relationship.</strong> The <strong>axillary nerve</strong> passes <strong>through the quadrangular space</strong> and winds around the <strong>surgical neck</strong> of the humerus with the <strong>posterior circumflex humeral</strong> vessels before supplying the <strong>deltoid and teres minor</strong>. This relationship explains why the nerve is vulnerable in <strong>shoulder dislocation and proximal humeral fractures</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "In suspected axillary neuropathy, sampling both the <strong>deltoid and teres minor</strong> can be useful because both receive axillary innervation.",
      "color": "trust",
      "label": "EMG Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Teres Major"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>teres major</strong> originates from the posterior aspect of the inferior scapular region and inserts onto the <strong>medial lip of the intertubercular groove</strong>. It is supplied by the <strong>lower subscapular nerve</strong>. Its principal actions are <strong>internal rotation, adduction and extension of the humerus</strong>. Despite its name and proximity to <strong>teres minor</strong>, <strong>teres major is not part of the rotator cuff</strong> because its tendon does not blend with the GH capsule and does not insert onto a rotator cuff facet of the tuberosities."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Teres minor → rotator cuff → greater tuberosity → axillary nerve</strong>. <strong>Teres major → NOT rotator cuff → medial lip of bicipital groove → lower subscapular nerve</strong>.",
      "color": "violet",
      "label": "Memory Aid"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Coracobrachialis"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The coracobrachialis originates from the <strong>coracoid process</strong> alongside the short head of biceps and inserts onto the medial aspect of the mid-humeral shaft. It is innervated by the <strong>musculocutaneous nerve</strong>, which characteristically passes through the muscle. Its main actions are <strong>flexion and adduction of the shoulder</strong>, although its contribution is smaller than that of the major shoulder movers. Its greatest anatomical importance is often its relationship with the <strong>musculocutaneous nerve</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>musculocutaneous nerve</strong> typically <strong>pierces the coracobrachialis</strong> shortly after leaving the axilla. This relationship provides a useful landmark for understanding proximal <strong>musculocutaneous nerve</strong> anatomy.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "5.3 Muscles — Group 3: Axiohumeral and Spanning Muscles"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The third functional group includes muscles that either connect the <strong>axial skeleton directly to the humerus</strong> or cross the shoulder while also acting strongly at another joint. The major muscles are <strong>pectoralis major and latissimus dorsi</strong>, together with the <strong>long and short heads of biceps brachii and the long head of triceps</strong>. These muscles are particularly important in PM&R because they link shoulder function to the <strong>trunk and elbow</strong>, contribute to powerful upper-limb movements, and provide useful information for <strong>neurological localization and electrodiagnostic examination</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Pectoralis major — clavicular head</strong>",
            "Medial half of the clavicle",
            "<strong>Lateral lip</strong> of the bicipital groove; clavicular fibres insert inferiorly",
            "<strong>Lateral pectoral</strong>",
            "C5–C7"
          ]
        },
        {
          "cells": [
            "<strong>Pectoralis major — sternocostal head</strong>",
            "Sternum, costal cartilages 1–6, external oblique aponeurosis",
            "<strong>Lateral lip</strong>, superiorly",
            "Medial (and lateral) pectoral",
            "C8–T1"
          ]
        },
        {
          "cells": [
            "<strong>Latissimus dorsi</strong>",
            "T7–L5 spinous processes, thoracolumbar fascia, iliac crest, ribs 9–12, ± <strong>inferior angle</strong> of scapula",
            "<strong>Floor of the bicipital groove</strong>",
            "Thoracodorsal",
            "<strong>C6, C7</strong>, C8"
          ]
        },
        {
          "cells": [
            "<strong>Biceps brachii — long head</strong>",
            "Supraglenoid tubercle + superior labrum",
            "Radial tuberosity and bicipital aponeurosis",
            "Musculocutaneous",
            "<strong>C5, C6</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Biceps brachii — short head</strong>",
            "Apex of the coracoid",
            "Radial tuberosity and bicipital aponeurosis",
            "Musculocutaneous",
            "<strong>C5, C6</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Triceps — long head</strong>",
            "<strong>Infraglenoid tubercle</strong> of the scapula",
            "Olecranon",
            "Radial",
            "C6–C8"
          ]
        }
      ],
      "title": "Axiohumeral and spanning muscles",
      "columns": [
        {
          "type": "text",
          "title": "Muscle"
        },
        {
          "type": "text",
          "title": "Origin"
        },
        {
          "type": "text",
          "title": "Insertion"
        },
        {
          "type": "text",
          "title": "Innervation"
        },
        {
          "type": "text",
          "title": "Roots"
        }
      ]
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Pectoralis Major"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>pectoralis major</strong> is a large, fan-shaped muscle forming much of the anterior chest wall and the <strong>anterior axillary fold</strong>. It has two major components: a <strong>clavicular head</strong> and a much larger <strong>sternocostal head</strong>. Although they converge onto a common humeral insertion, their different fiber orientations give them somewhat different functions."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Clavicular head.</strong> Arises from the <strong>medial clavicle</strong>; its fibers pass inferolaterally toward the humerus and contribute particularly to <strong>shoulder flexion, horizontal adduction and internal rotation</strong>. It is supplied predominantly by the <strong>lateral pectoral nerve</strong>, with upper and middle root contributions."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Sternocostal head.</strong> Arises broadly from the <strong>sternum and adjacent costal cartilages</strong>, with inferior fibers blending with the aponeurosis of the external oblique. Its fibers converge toward the humerus and contribute strongly to <strong>adduction, horizontal adduction and internal rotation</strong>; from a flexed position, the sternocostal fibers can also contribute to <strong>shoulder extension back toward neutral</strong>. Both medial and <strong>lateral pectoral nerve</strong>s contribute to its innervation."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The <strong>pectoralis major</strong> tendon is more complex than a simple flat tendon attaching to the humerus. As the clavicular and sternocostal fibers converge laterally, the tendon undergoes a <strong>twisting arrangement</strong> before inserting onto the lateral lip of the <strong>intertubercular groove</strong> — the clavicular and sternocostal components therefore occupy different positions within the final tendon. This explains why <strong>sternocostal-head ruptures</strong> (typically eccentric bench press) can preserve the <strong>anterior axillary fold</strong> contour despite a substantial tear, and why the ruptured belly retracts medially to produce the visible \"web\" deformity.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — the Pectoralis Major \"Twist\""
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Pectoralis major</strong> rupture classically occurs during forceful <strong>eccentric loading of an abducted and externally rotated shoulder</strong>, particularly during the lowering phase of a bench press. The sternocostal fibers are commonly involved. A complete or substantial tear can produce <strong>medial retraction of the muscle, bruising, weakness of adduction/internal rotation, and loss or distortion of the anterior axillary fold</strong>. Do not exclude a substantial <strong>pectoralis major</strong> tear simply because some anterior axillary contour remains — the muscle's layered architecture means that one component may remain intact while another is significantly disrupted. Compare both sides during <strong>resisted adduction or internal rotation</strong>, when contour asymmetry may become more apparent.",
      "color": "accent",
      "label": "PM&R Clinical Pearl — Pectoralis Major Rupture"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Latissimus Dorsi"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>latissimus dorsi</strong> is a large muscle linking the lower trunk to the humerus. It has a broad origin from the lower thoracic region, <strong>thoracolumbar fascia, iliac crest and lower ribs</strong>, with variable fibers from the <strong>inferior angle</strong> of the scapula. These fibers converge superiorly and laterally to form a tendon inserting into the <strong>floor of the intertubercular groove</strong>. It is innervated by the <strong>thoracodorsal nerve</strong>, predominantly C6–C8."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Function.</strong> <strong>Latissimus dorsi</strong> produces three major movements at the shoulder — extension, adduction, <strong>internal rotation</strong>. Because it connects the trunk to the humerus, it becomes particularly important during movements in which the upper limb is used to <strong>pull the body toward the arm</strong>, such as climbing, swimming or using crutches."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Latissimus dorsi</strong> can influence both the shoulder and trunk. In patients who rely heavily on their upper limbs for <strong>transfers, wheelchair mobility or assistive-device use</strong>, it can become an important functional muscle rather than simply an accessory shoulder extensor.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Biceps Brachii"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>biceps brachii</strong> is primarily an elbow flexor and forearm supinator, but both heads originate from the scapula and therefore <strong>cross the glenohumeral joint</strong>. This makes the muscle anatomically relevant to the shoulder, particularly the <strong>long head</strong>. Both heads converge distally and insert onto the <strong>radial tuberosity</strong>, with the bicipital aponeurosis extending into the forearm fascia. Both are supplied by the <strong>musculocutaneous nerve</strong>, predominantly C5–C6."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong><strong>Long head of biceps</strong>.</strong> Originates from the <strong>supraglenoid region and superior labrum</strong>. Its tendon travels across the superior aspect of the <strong>humeral head</strong> within the GH joint before entering the <strong>intertubercular groove</strong> — intracapsular but extrasynovial. This unusual course explains its close anatomical relationship with the <strong>superior labrum, rotator interval, biceps pulley and subscapularis tendon</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Think of the <strong>long head</strong> of biceps as an anatomical bridge: superior labrum → GH joint → <strong>rotator interval</strong>/pulley → bicipital groove. Pathology at any part of this pathway may therefore involve neighboring structures.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Long-head biceps pathology commonly coexists with rotator cuff and superior labral abnormalities. Particular attention should be paid to the <strong>upper subscapularis and biceps pulley</strong> when the tendon is unstable or displaced medially.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong><strong>Short head</strong> of biceps.</strong> Originates from the <strong>coracoid process</strong>, sharing a proximal origin with the coracobrachialis as the <strong>conjoint tendon</strong>. Unlike the <strong>long head</strong>, it does not pass through the GH joint. Its shoulder contribution is relatively modest, assisting <strong>flexion and adduction</strong>, while its major functional roles remain elbow flexion and forearm supination as part of the biceps muscle. The distinction between the two heads is anatomically useful: <strong>long head</strong> → supraglenoid region → intra-articular course; short head → coracoid → extra-articular."
    }
  },
  {
    "block_type": "subsubsection_heading",
    "content_config": {
      "text": "Long Head of Triceps"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The triceps is predominantly an elbow extensor, but its <strong>long head</strong> is unique because it originates from the scapula and crosses the shoulder joint. It arises from the <strong>infraglenoid tubercle</strong>, passes inferiorly between <strong>teres minor</strong> and <strong>teres major</strong>, and joins the remainder of the triceps before inserting onto the olecranon. It is supplied by the <strong>radial nerve</strong>, with contributions mainly from C6–C8. At the shoulder, the <strong>long head</strong> contributes to <strong>extension and adduction of the humerus</strong> and can assist with stabilization of the <strong>humeral head</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Posteriorly, the <strong>long head</strong> of triceps passes between <strong>teres minor</strong> (superiorly) and <strong>teres major</strong> (inferiorly). This relationship is important because these muscles form boundaries of the <strong>quadrangular and triangular spaces</strong>, through which major nerves and vessels travel.",
      "color": "accent",
      "label": "Important Anatomical Landmark — Teres Minor, Triceps and Teres Major"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "These spanning muscles are useful because their peripheral nerve supply comes from several different parts of the brachial plexus. When localizing a proximal upper-limb lesion, think beyond the familiar distal muscles — sampling muscles such as <strong>latissimus dorsi, pectoralis major, biceps or triceps</strong> can help determine whether abnormalities extend across different terminal nerves and plexus divisions, improving localization between a <strong>root, plexus and individual peripheral nerve lesion</strong>.",
      "color": "trust",
      "label": "EMG Pearl"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Pectoralis major</strong>",
            "Medial/<strong>lateral pectoral nerve</strong>s",
            "Useful proximal plexus/root-level context"
          ]
        },
        {
          "cells": [
            "<strong>Latissimus dorsi</strong>",
            "Thoracodorsal nerve",
            "<strong>Posterior cord</strong> muscle proximal to <strong>radial nerve</strong>"
          ]
        },
        {
          "cells": [
            "Biceps",
            "<strong>Musculocutaneous nerve</strong>",
            "Upper-trunk/lateral-cord pathway; predominantly C5–C6"
          ]
        },
        {
          "cells": [
            "Triceps",
            "<strong>Radial nerve</strong>",
            "Posterior-cord/radial pathway; predominantly C6–C8"
          ]
        }
      ],
      "title": "Spanning muscles and their localization value",
      "columns": [
        {
          "type": "text",
          "title": "Muscle"
        },
        {
          "type": "text",
          "title": "Peripheral nerve"
        },
        {
          "type": "text",
          "title": "Localization value"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "6. The Brachial Plexus as It Concerns the Shoulder"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The shoulder girdle is supplied almost entirely from <strong>C5 and C6</strong>, with contributions from C4, C7, C8 and T1. The nerves arising proximally are the diagnostic keys in electrodiagnosis, because their branch points let you separate root from trunk from cord."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Roots",
            "<strong>Dorsal scapular</strong>",
            "C4–C5",
            "<strong>Rhomboid major</strong> and minor, <strong>levator scapulae</strong>"
          ]
        },
        {
          "cells": [
            "Roots",
            "<strong>Long thoracic</strong>",
            "<strong>C5, C6, C7</strong>",
            "<strong>Serratus anterior</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Upper trunk</strong>",
            "Nerve to subclavius",
            "C5–C6",
            "Subclavius (may give an accessory phrenic nerve)"
          ]
        },
        {
          "cells": [
            "<strong>Upper trunk (Erb's point)</strong>",
            "Suprascapular",
            "<strong>C5, C6</strong> (± C4 in ~20%)",
            "Supraspinatus, infraspinatus, plus articular sensory branches"
          ]
        },
        {
          "cells": [
            "<strong>Lateral cord</strong>",
            "<strong>Lateral pectoral</strong>",
            "C5–C7",
            "<strong>Pectoralis major</strong> (<strong>clavicular head</strong>); articular branches"
          ]
        },
        {
          "cells": [
            "<strong>Lateral cord</strong>",
            "Musculocutaneous",
            "C5–C7",
            "Coracobrachialis, biceps, brachialis"
          ]
        },
        {
          "cells": [
            "<strong>Medial cord</strong>",
            "<strong>Medial pectoral</strong>",
            "C8–T1",
            "<strong>Pectoralis minor</strong>, <strong>pectoralis major</strong> (<strong>sternocostal head</strong>)"
          ]
        },
        {
          "cells": [
            "<strong>Posterior cord</strong>",
            "Upper subscapular",
            "C5–C6",
            "Subscapularis (upper)"
          ]
        },
        {
          "cells": [
            "<strong>Posterior cord</strong>",
            "Thoracodorsal",
            "C6–C7, C8",
            "<strong>Latissimus dorsi</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Posterior cord</strong>",
            "Lower subscapular",
            "C5–C6",
            "Subscapularis (lower), <strong>teres major</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Posterior cord</strong>",
            "Axillary",
            "<strong>C5, C6</strong>",
            "Deltoid, <strong>teres minor</strong>; <strong>superior lateral cutaneous nerve of the arm</strong>"
          ]
        }
      ],
      "title": "Shoulder-relevant branches of the brachial plexus",
      "columns": [
        {
          "type": "text",
          "title": "Origin level"
        },
        {
          "type": "text",
          "title": "Nerve"
        },
        {
          "type": "text",
          "title": "Roots"
        },
        {
          "type": "text",
          "title": "Muscles supplied"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>The single most useful localisation principle in the upper limb.</strong> To separate a <strong>C5–C6 radiculopathy</strong> from an <strong>upper trunk plexopathy</strong>, examine muscles innervated by nerves that leave the plexus before the trunk is formed: rhomboids (<strong>dorsal scapular nerve</strong> — comes off the root), <strong>serratus anterior</strong> (<strong>long thoracic nerve</strong> — comes off the roots), and <strong>cervical paraspinals</strong> (posterior primary ramus — leaves immediately at the root level). Abnormality in <strong>rhomboids or serratus anterior</strong> points <strong>above the trunk</strong>, toward the root. Abnormal paraspinals localise to the root level (intraspinal). Normal paraspinals do not exclude radiculopathy — sensitivity is limited and they reinnervate early — but abnormal paraspinals are strong positive evidence. Remember also that a lesion at or distal to the dorsal root ganglion spares the sensory nerve action potential. <strong>A preserved SNAP with sensory symptoms points to a preganglionic (root) lesion</strong>; a reduced SNAP points to a postganglionic (plexus or peripheral nerve) lesion. This is the second pillar of localisation.",
      "color": "trust",
      "label": "EMG / Electrodiagnostics"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Dorsal Scapular Nerve"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>dorsal scapular nerve</strong> most commonly arises directly from the <strong>C5 root</strong>. It courses posteriorly, typically passing through the middle scalene, and travels along the medial scapular region to supply the rhomboids, with contribution to <strong>levator scapulae</strong>. For EMG, the rhomboids are particularly useful."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Long Thoracic Nerve"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>long thoracic nerve</strong> usually receives contributions from <strong>C5, C6</strong> and C7 and supplies the <strong>serratus anterior</strong>. Because its fibers arise directly from the roots, <strong>serratus anterior</strong> can also provide information about lesions <strong>proximal to the trunks</strong>. Clinically, long thoracic neuropathy produces weakness of <strong>serratus anterior</strong> with characteristic <strong>scapular winging and impaired upward rotation</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The Suprascapular Nerve"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>suprascapular nerve</strong> arises from the <strong>upper trunk</strong>, predominantly carrying <strong>C5–C6 fibers</strong>. It travels laterally toward the superior scapular border and through the <strong>suprascapular notch beneath the superior transverse scapular ligament</strong> → supraspinous fossa, giving motor branches to supraspinatus and articular branches → around the <strong>spinoglenoid notch</strong>, deep to the inferior transverse ligament → infraspinous fossa, supplying infraspinatus. It supplies supraspinatus first, then infraspinatus."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>This sequence creates an excellent anatomical localization tool.</strong> <strong>Suprascapular notch lesion → supraspinatus + infraspinatus</strong>. <strong>Spinoglenoid notch lesion → predominantly infraspinatus</strong>. If supraspinatus is preserved but infraspinatus is denervated, think about a lesion <strong>distal to the supraspinatus branches</strong>, particularly around the spinoglenoid region.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong>Sensory territory:</strong> no cutaneous territory at all — an important negative. A patient with <strong>suprascapular neuropathy</strong> has no area of numbness. It supplies articular branches to the <strong>posterior and superior glenohumeral capsule, the AC joint, the subacromial bursa and the coracoclavicular ligament</strong> — accounting for roughly <strong>70% of the sensory innervation of the shoulder joint</strong>. This is the anatomical rationale for the <strong>suprascapular nerve</strong> block."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Two Entrapment Syndromes, Distinguished Purely by Anatomy"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Suprascapular notch</strong>",
            "Both supraspinatus and infraspinatus",
            "Ligament hypertrophy or ossification, narrow notch morphology, traction, ganglion cyst, direct trauma"
          ]
        },
        {
          "cells": [
            "<strong>Spinoglenoid notch</strong>",
            "<strong>Infraspinatus only</strong> — isolated posterior fossa atrophy with preserved supraspinatus",
            "<strong>Paralabral ganglion cyst</strong> (frequently arising from a posterior labral tear); repetitive overhead activity — volleyball, tennis, baseball"
          ]
        }
      ],
      "title": "Suprascapular nerve entrapment syndromes",
      "columns": [
        {
          "type": "text",
          "title": "Site of entrapment"
        },
        {
          "type": "text",
          "title": "Muscles affected"
        },
        {
          "type": "text",
          "title": "Typical causes"
        }
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Notch morphology (<strong>Rengachary types I–VI</strong>) ranges from a wide U-shaped depression to a completely ossified foramen; the narrow V-shaped and ossified variants are over-represented among patients with entrapment."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "<strong>Isolated infraspinatus atrophy is a specific clinical finding — pursue it.</strong> A patient with visible hollowing of the infraspinous fossa, weak <strong>external rotation</strong> with the arm at the side, and normal supraspinatus function has a spinoglenoid-level lesion until proven otherwise. Confirm with <strong>needle EMG</strong> showing denervation in infraspinatus with a normal supraspinatus, and nerve conduction with stimulation at Erb's point recording over each muscle (normal latency roughly 2.7 ms to supraspinatus and 3.3 ms to infraspinatus, with side-to-side comparison more useful than absolute values). Then order an MRI looking specifically for a <strong>paralabral cyst and an associated posterior labral tear</strong>. Always keep <strong>Parsonage–Turner syndrome (neuralgic amyotrophy)</strong> in the differential: severe pain followed by patchy weakness, classically affecting the suprascapular, long thoracic and <strong>axillary nerve</strong>s, often after a viral illness, vaccination or surgery. The distribution does not respect a single nerve or root.",
      "color": "trust",
      "label": "EMG / Electrodiagnostics"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "The Axillary Nerve"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>axillary nerve</strong> is one of the most clinically important terminal branches around the shoulder. It arises from the posterior cord, predominantly C5–C6 → passes anterior to subscapularis → travels inferiorly and posteriorly <strong>through the quadrangular space</strong>, in close contact with the <strong>inferior glenohumeral capsule</strong> → divides into anterior and posterior branches."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Anterior branch</strong> — wraps around the <strong>surgical neck</strong> deep to deltoid, supplying <strong>anterior and middle deltoid</strong>. It lies approximately <strong>5–7 cm distal to the lateral acromion</strong>, which is the anatomical limit of a safe deltoid-splitting approach and of deep deltoid needle placement.</li><li><strong>Posterior branch</strong> — supplies <strong>teres minor</strong> and continues as the <strong>superior lateral cutaneous nerve of the arm</strong>, supplying the \"regimental badge\" area over the lateral deltoid.</li><li><strong>Articular branches</strong> to the inferior and anteroinferior capsule.</li></ul>"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "This anatomy explains its vulnerability following <strong>glenohumeral dislocation, proximal humeral fracture and other trauma around the surgical neck</strong>."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<strong><strong>Mechanisms of injury:</strong></strong><ul><li><strong>Anterior glenohumeral dislocation</strong> — the commonest cause; the nerve is tethered against the inferior capsule.</li><li><strong>Surgical neck fracture</strong> of the humerus.</li><li>Iatrogenic — deltoid-splitting approaches, arthroscopic portal placement, injection.</li><li><strong>Prolonged crutch use</strong> or compression.</li><li><strong>Quadrilateral space syndrome</strong> — posterior shoulder pain, paraesthesia in a non-dermatomal lateral arm distribution, and <strong>teres minor</strong> atrophy, often the only MRI finding.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "In suspected axillary neuropathy, do not rely only on the deltoid. <strong>Deltoid + teres minor</strong> are both supplied by the <strong>axillary nerve</strong>. Comparing them with muscles supplied by other C5–C6 nerves helps distinguish axillary neuropathy → posterior cord lesion → upper-trunk lesion → <strong>C5–C6 radiculopathy</strong>.",
      "color": "trust",
      "label": "EMG / Electrodiagnostics"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Consider a patient with weakness in deltoid (<strong>axillary nerve</strong>), biceps (<strong>musculocutaneous nerve</strong>) and supraspinatus (<strong>suprascapular nerve</strong>). All three have strong <strong>C5–C6 contributions</strong>, but arise through different peripheral nerves — if all three are abnormal, an isolated terminal nerve lesion becomes unlikely, and the next question is root or <strong>upper trunk</strong>. This is where muscles innervated by branches leaving <strong>before the upper trunk</strong> become valuable: abnormalities extending into the <strong>rhomboids or serratus anterior</strong> provide evidence the lesion may lie proximal to the <strong>upper trunk</strong>. An even more proximal muscle group is the <strong>cervical paraspinals</strong>, supplied through posterior rami that branch from the spinal nerves before the brachial plexus is formed — denervation there supports a <strong>root-level process rather than a plexopathy</strong>. No single muscle makes the diagnosis; the power comes from identifying a pattern across muscles supplied by the same roots but different peripheral nerves and different plexus levels.",
      "color": "trust",
      "label": "EMG / Electrodiagnostics — the Most Useful EMG Localization Principle"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "Other Nerves You Must Know Precisely"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Long thoracic (C5–C7)</strong>",
            "The roots pierce <strong>scalenus medius</strong>; the nerve then descends <strong>superficial to serratus anterior</strong> on the lateral chest wall",
            "Long, superficial and tethered — vulnerable to traction, mastectomy and axillary node dissection, first-rib resection, backpack carriage, and neuralgic amyotrophy. Produces <strong>medial winging</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Spinal accessory (CN XI)</strong>",
            "Exits the jugular foramen, descends deep to sternocleidomastoid, then crosses the <strong>posterior cervical triangle within the superficial investing fascia</strong>, only millimetres deep to the skin",
            "Classic iatrogenic injury from posterior triangle <strong>lymph node biopsy</strong>; also neck dissection. Produces <strong>lateral winging with shoulder droop</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Dorsal scapular (C4–C5)</strong>",
            "Pierces <strong>scalenus medius</strong>, descends deep to <strong>levator scapulae</strong> along the medial scapular border with the dorsal scapular artery",
            "Entrapment within <strong>scalenus medius</strong>; a recognised but under-diagnosed cause of medial scapular pain"
          ]
        },
        {
          "cells": [
            "<strong>Musculocutaneous (C5–C7)</strong>",
            "Pierces coracobrachialis roughly 5–8 cm distal to the coracoid",
            "Entrapment at that point; iatrogenic injury during anterior approaches and coracoid procedures"
          ]
        },
        {
          "cells": [
            "<strong>Lateral pectoral (C5–C7)</strong>",
            "<strong>Lateral cord</strong>; pierces the clavipectoral (costocoracoid) membrane. Gives <strong>articular branches to the anterosuperior joint and the AC joint</strong>",
            "An emerging target in shoulder denervation and radiofrequency procedures"
          ]
        },
        {
          "cells": [
            "<strong>Medial pectoral (C8–T1)</strong>",
            "<strong>Medial cord</strong>; supplies <strong>pectoralis minor</strong> and the <strong>sternocostal head</strong> of <strong>pectoralis major</strong>",
            "Involved in lower plexus lesions; useful for distinguishing upper from lower plexus involvement"
          ]
        },
        {
          "cells": [
            "<strong>Thoracodorsal (C6–C8)</strong>",
            "<strong>Posterior cord</strong>; runs on the deep surface of <strong>latissimus dorsi</strong> along the posterior axillary wall",
            "At risk in axillary dissection; important when latissimus transfer is contemplated"
          ]
        }
      ],
      "title": "Other nerves",
      "columns": [
        {
          "type": "text",
          "title": "Nerve"
        },
        {
          "type": "text",
          "title": "Anatomical detail"
        },
        {
          "type": "text",
          "title": "Clinical vulnerability"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "Sensory Innervation, Dermatomes and Referred Pain"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Shoulder pain is not produced by a single nerve. The <strong>glenohumeral joint, AC joint, capsule, bursae and surrounding periarticular tissues receive overlapping sensory innervation from several peripheral nerves</strong>, while the skin over the shoulder is supplied through both the cervical and brachial plexuses. Understanding this overlap helps explain two common clinical problems: <strong>different shoulder structures may produce very similar pain patterns</strong>, and <strong>pain perceived at the shoulder may originate outside the shoulder altogether</strong>."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Innervation of the Joint Itself"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "A useful starting principle is <strong>Hilton's law</strong>: nerves supplying muscles acting across a joint often also provide sensory branches to that joint. This is helpful conceptually, but the shoulder should not be thought of as having a rigid territory map — articular innervation is <strong>variable and overlapping</strong>."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Posterior and superior capsule, AC joint, subacromial bursa</strong>",
            "Suprascapular (dominant, roughly 70% of joint sensory supply)"
          ]
        },
        {
          "cells": [
            "<strong>Inferior and anteroinferior capsule</strong>",
            "Axillary"
          ]
        },
        {
          "cells": [
            "<strong>Anterior and anterosuperior capsule, AC joint</strong>",
            "<strong>Lateral pectoral</strong> and the subscapular nerves"
          ]
        },
        {
          "cells": [
            "<strong>Skin over the \"cape\" and the superior shoulder</strong>",
            "<strong>Supraclavicular nerves (C3–C4)</strong> — from the cervical plexus, not the brachial plexus"
          ]
        },
        {
          "cells": [
            "<strong>Skin over the lateral deltoid</strong>",
            "<strong>Superior lateral cutaneous nerve of the arm</strong> (axillary, C5)"
          ]
        },
        {
          "cells": [
            "<strong>Skin of the medial arm and axilla</strong>",
            "Intercostobrachial nerve (T2) and medial cutaneous nerve of the arm (C8–T1)"
          ]
        }
      ],
      "title": "Sensory innervation of the shoulder joint",
      "columns": [
        {
          "type": "text",
          "title": "Region"
        },
        {
          "type": "text",
          "title": "Nerve supply"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Shoulder sensation comes from <strong>two different neural systems</strong>: cervical plexus → supraclavicular nerves → superior shoulder skin; brachial plexus → articular nerves + axillary sensory territory. This distinction becomes particularly important when interpreting referred pain and peripheral nerve lesions.",
      "color": "accent",
      "label": "Key Concept"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>suprascapular nerve</strong> provides important sensory innervation to the shoulder, in addition to its familiar motor supply to supraspinatus and infraspinatus. <strong>Articular branches</strong> contribute particularly to the <strong>posterior and superior glenohumeral region</strong> and to the AC region. This substantial sensory contribution explains why the <strong>suprascapular nerve</strong> has become an important target in <strong>regional analgesia and interventional pain management</strong>."
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Do not think of the <strong>suprascapular nerve</strong> as purely motor. It is both motor (supraspinatus + infraspinatus) and sensory (important portions of the shoulder joint). This dual role explains why pathology of the nerve may produce both weakness and pain — and why nerve blocks can reduce shoulder pain without directly treating the underlying structural lesion.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The <strong>axillary nerve</strong> gives articular branches to the GH joint and continues superficially through the <strong>superior lateral cutaneous nerve of the arm</strong>, supplying the characteristic patch of skin over the lateral shoulder, sometimes referred to clinically as the \"regimental badge\" area. After shoulder dislocation or proximal humeral trauma, altered sensation in this region can therefore support an <strong>axillary nerve lesion</strong>, particularly when accompanied by deltoid weakness."
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Why Shoulder Pain Is So Often Not From the Shoulder"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "The skin over the top of the shoulder is C3–C4. The diaphragm is innervated by C3–C5. Hence <strong>diaphragmatic irritation refers to the shoulder tip</strong> — Kehr's sign in splenic rupture, subphrenic collection, or post-laparoscopic gas. <strong>C5 radiculopathy</strong> refers pain to the lateral shoulder and deltoid region, often with no neck pain at all, and can perfectly mimic rotator cuff disease. Distinguish it with a careful scapular-nerve motor examination, Spurling's test, and electrodiagnosis. Cardiac ischaemia, gallbladder disease and apical lung tumour (Pancoast) all refer to this region. <strong>A shoulder that hurts at rest and at night, with no positional or resisted-movement provocation and a normal examination, deserves a wider differential and a chest radiograph.</strong> Practical rule: if pain is diffuse and <strong>completely unaffected by both active and passive shoulder range of motion</strong>, the source is very unlikely to be intra-articular.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Myotomes and Reflexes for the Shoulder Girdle"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Myotomes are especially useful when shoulder weakness does not fit a single muscle, tendon, or peripheral nerve. The central principle: peripheral nerves tell you which nerve is involved; myotomes help tell you which root is involved. Because most shoulder muscles receive fibers from more than one spinal root, no movement represents a perfectly isolated myotome — localization therefore depends on identifying a <strong>pattern of weakness across several muscles supplied by different peripheral nerves</strong>. Dermatomes are useful, but their boundaries are <strong>not as precise as textbook diagrams suggest</strong>; adjacent roots overlap substantially, and published dermatome maps differ."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "C4",
            "Shoulder elevation (upper trapezius, with CN XI)",
            "—",
            "Top of shoulder / cape"
          ]
        },
        {
          "cells": [
            "C5",
            "Shoulder abduction, <strong>external rotation</strong>, elbow flexion",
            "Biceps, brachioradialis",
            "Lateral arm (\"regimental badge\")"
          ]
        },
        {
          "cells": [
            "C6",
            "Elbow flexion, wrist extension",
            "Brachioradialis, biceps",
            "Lateral forearm, thumb"
          ]
        },
        {
          "cells": [
            "C7",
            "Elbow extension, wrist flexion",
            "Triceps",
            "Middle finger"
          ]
        },
        {
          "cells": [
            "C8",
            "Finger flexion, thumb extension",
            "—",
            "Medial forearm, little finger"
          ]
        },
        {
          "cells": [
            "T1",
            "Finger abduction / adduction",
            "—",
            "Medial arm"
          ]
        }
      ],
      "title": "Myotomes and reflexes",
      "columns": [
        {
          "type": "text",
          "title": "Root"
        },
        {
          "type": "text",
          "title": "Key myotomal action"
        },
        {
          "type": "text",
          "title": "Reflex"
        },
        {
          "type": "text",
          "title": "Dermatome"
        }
      ]
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Biceps reflex: evaluates the <strong>musculocutaneous nerve</strong> and predominantly the <strong>C5–C6 roots</strong>, commonly weighted toward C5 clinically. Brachioradialis reflex: travels through the <strong>radial nerve</strong> and predominantly assesses C5–C6, commonly used particularly for C6. Triceps reflex: travels through the <strong>radial nerve</strong> and predominantly evaluates C7, with some C8 contribution."
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "Arterial Supply"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The Axillary Artery"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "The subclavian artery becomes the <strong>axillary artery</strong> at the lateral border of the first rib, and the <strong>brachial artery</strong> at the inferior border of <strong>teres major</strong>. It is divided into three parts by the <strong>pectoralis minor</strong>, and there is a memorable rule: <strong>the number of branches equals the number of the part.</strong>"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "First",
            "Proximal (medial) to the muscle",
            "<strong>Superior thoracic</strong> artery"
          ]
        },
        {
          "cells": [
            "Second",
            "Deep (posterior) to the muscle",
            "Thoracoacromial (pectoral, acromial, clavicular and deltoid branches) and <strong>lateral thoracic</strong>"
          ]
        },
        {
          "cells": [
            "Third",
            "Distal (lateral) to the muscle",
            "Subscapular (→ circumflex scapular + thoracodorsal), <strong>anterior circumflex humeral</strong>, <strong>posterior circumflex humeral</strong>"
          ]
        }
      ],
      "title": "Axillary artery parts and branches",
      "columns": [
        {
          "type": "text",
          "title": "Part"
        },
        {
          "type": "text",
          "title": "Relation to pectoralis minor"
        },
        {
          "type": "text",
          "title": "Branches"
        }
      ]
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Blood Supply of the Humeral Head"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>Classical teaching attributes it to the <strong>arcuate artery of Laing</strong>, the terminal continuation of the <strong>ascending branch of the anterior circumflex humeral artery</strong>, running in the lateral bicipital groove.</li><li><strong>This has been revised.</strong> Contrast-enhanced MRI and quantitative perfusion studies show the <strong>posterior circumflex humeral artery supplies the majority (approximately 64%) of the humeral head</strong>, with the anterior circumflex contributing roughly one third. Both are clinically relevant.</li><li>Risk of <strong>avascular necrosis</strong> after proximal humeral fracture rises with a short (<8 mm) metaphyseal head extension, a disrupted medial hinge, and four-part fracture patterns — anatomical criteria that drive the surgical decision and, downstream, your rehabilitation planning.</li></ul>"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "The Scapular Arterial Anastomosis"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "A rich collateral network around the scapula linking the subclavian and axillary systems, formed by three vessels:"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Suprascapular artery</strong> — from the thyrocervical trunk of the subclavian.</li><li><strong>Dorsal scapular artery</strong> — from the subclavian directly, or from the transverse cervical artery, running along the medial scapular border.</li><li><strong>Circumflex scapular artery</strong> — from the subscapular artery, off the third part of the axillary.</li></ul>"
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Because of this anastomosis, <strong>ligation or occlusion of the axillary artery between the first rib and the origin of the subscapular artery can be tolerated</strong>, with flow reversing through the collateral network to reach the distal limb. Occlusion distal to the subscapular origin is far less well tolerated, because the collateral entry point has been bypassed. This network is also the vascular basis for scapular and parascapular flaps.",
      "color": "accent",
      "label": "PM&R Clinical Pearl"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "The Three Posterior Spaces"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Learn these as a single unit — they are examined together and share boundaries."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Quadrangular space</strong>",
            "Superior: <strong>teres minor</strong>. Inferior: <strong>teres major</strong>. Medial: <strong>long head</strong> of triceps. Lateral: <strong>surgical neck</strong> of humerus",
            "<strong>Axillary nerve</strong>, <strong>posterior circumflex humeral</strong> vessels",
            "<strong>Quadrilateral space syndrome</strong> — compression by fibrous bands or hypertrophy causing posterior shoulder pain, non-dermatomal paraesthesia, and deltoid / <strong>teres minor</strong> weakness"
          ]
        },
        {
          "cells": [
            "<strong>Triangular space</strong>",
            "Superior: <strong>teres minor</strong>. Inferior: <strong>teres major</strong>. Lateral: <strong>long head</strong> of triceps",
            "<strong>Circumflex scapular vessels</strong>",
            "A key site for collateral scapular circulation; rarely a site of entrapment but an important surgical landmark"
          ]
        },
        {
          "cells": [
            "<strong>Triangular interval</strong>",
            "Superior: <strong>teres major</strong>. Medial: <strong>long head</strong> of triceps. Lateral: humeral shaft / lateral head of triceps",
            "<strong>Radial nerve</strong>, profunda brachii artery",
            "<strong>Radial nerve</strong> injury in proximal-to-midshaft humeral fracture, producing wrist drop with triceps weakness if proximal enough"
          ]
        }
      ],
      "title": "The three posterior spaces",
      "columns": [
        {
          "type": "text",
          "title": "Space"
        },
        {
          "type": "text",
          "title": "Boundaries"
        },
        {
          "type": "text",
          "title": "Contents"
        },
        {
          "type": "text",
          "title": "Clinical relevance"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "All three spaces are bounded by the <strong>two teres muscles and the long head of triceps</strong>. Work out which by asking where the <strong>long head</strong> of triceps sits: medial to the space → quadrangular (with the humerus lateral); lateral to the space → triangular space; and if <strong>teres major is the superior border</strong> with the humerus lateral → triangular interval.",
      "color": "violet",
      "label": "Memory Aid"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "Part VII — Applied Anatomy"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Examination, ultrasound, and procedures."
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "24. Surface Anatomy and Palpation"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Use a fixed sequence so that nothing is missed. The following runs from <strong>medial to lateral</strong> and then posteriorly."
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ol><li><strong>Sternoclavicular joint</strong> — locate the jugular notch, step laterally onto the bulbous <strong>medial clavicle</strong>. Compare sides for prominence and tenderness.</li><li><strong>Clavicular shaft</strong> — follow it laterally, assessing for callus, step-off and tenderness.</li><li><strong>Acromioclavicular joint</strong> — palpate the step. Compare sides.</li><li>Acromion — anterior, lateral and, critically, the <strong>posterolateral corner</strong>, which is your injection landmark.</li><li><strong>Greater tuberosity</strong> — just distal to the lateral acromion. With the arm in extension and <strong>internal rotation</strong>, the supraspinatus footprint rotates anteriorly and becomes accessible.</li><li><strong>Bicipital groove</strong> — approximately 3–5 cm distal to the anterior acromion. Rotate the arm and feel the groove pass beneath your finger. In the anatomical position the groove faces slightly anteromedially; <strong>externally rotating the arm about 10° brings it directly anterior</strong>.</li><li><strong>Coracoid process</strong> — 2–3 cm inferomedial to the <strong>AC joint</strong>, deep to anterior deltoid. It is tender in most normal people, so interpret with caution.</li><li><strong>Scapular spine, supraspinous and infraspinous fossae</strong> — assess for atrophy, comparing the two fossae <strong>side to side</strong>. This is the single most under-performed part of the shoulder examination.</li><li><strong>Superomedial angle</strong> (<strong>levator scapulae</strong>), <strong>medial border</strong> (rhomboids) and <strong>inferior angle</strong>.</li><li>Axilla — anterior fold (<strong>pectoralis major</strong>), posterior fold (<strong>latissimus dorsi</strong> and <strong>teres major</strong>), and the lateral wall.</li></ol>"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "25. Ultrasound Anatomy"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Point-of-care ultrasound is now core physiatry practice. The standard scanning protocol maps directly onto the anatomy in this book."
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Long head of biceps</strong>",
            "Arm neutral, elbow flexed 90°, forearm supinated resting on the thigh",
            "Short axis: the ovoid hyperechoic tendon in the bicipital groove between the tuberosities. <strong>Start every examination here</strong> — it is the anatomical anchor for orientation"
          ]
        },
        {
          "cells": [
            "Subscapularis",
            "As above, then <strong>externally rotate</strong> the arm",
            "Long axis: the tendon glides medially over the <strong>lesser tuberosity</strong>. Dynamic assessment reveals subluxation"
          ]
        },
        {
          "cells": [
            "Supraspinatus",
            "<strong>Modified Crass</strong> — hand in the back pocket, palm on the iliac crest, elbow flexed and posterior (better tolerated than full Crass)",
            "Long axis \"parrot's beak\" over the greater tuberosity; assess the critical zone and the footprint"
          ]
        },
        {
          "cells": [
            "<strong>SASD bursa</strong>",
            "With the supraspinatus views",
            "A thin hypoechoic layer between two hyperechoic peribursal fat planes; assess dynamically during passive abduction"
          ]
        },
        {
          "cells": [
            "<strong>AC joint</strong>",
            "Neutral, coronal probe over the joint",
            "Capsular bulging, osteophytes, effusion; <strong>cross-body adduction</strong> for dynamic testing"
          ]
        },
        {
          "cells": [
            "<strong>Posterior GH joint / infraspinatus</strong>",
            "Probe below and parallel to the <strong>scapular spine</strong>",
            "Glenoid, labrum (hyperechoic triangle), <strong>humeral head</strong>, infraspinatus. <strong>The best window for joint effusion, posterior paralabral cysts, and confirming dislocation or reduction</strong>"
          ]
        }
      ],
      "title": "Ultrasound windows",
      "columns": [
        {
          "type": "text",
          "title": "Window"
        },
        {
          "type": "text",
          "title": "Patient position"
        },
        {
          "type": "text",
          "title": "What you are looking at"
        }
      ]
    }
  },
  {
    "block_type": "highlight_card",
    "content_config": {
      "text": "Anisotropy is the commonest ultrasound error in the shoulder. Tendon fibres appear falsely hypoechoic — mimicking a tear — whenever the beam is not perpendicular to them. Before calling a tear, toggle the probe angle and confirm the finding <strong>in two orthogonal planes</strong>.",
      "color": "red",
      "label": "Pitfall — Do Not Miss"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "26. Injection Anatomy"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Subacromial–subdeltoid bursa</strong>",
            "Posterolateral, 1–2 cm inferior to the posterolateral acromial corner, angled anteromedially beneath the acromion",
            "The bursa is largest anterolaterally; a posterior entry avoids the deltoid's neuro<strong>vascular supply</strong> and the anterior structures"
          ]
        },
        {
          "cells": [
            "<strong>Glenohumeral joint (posterior approach)</strong>",
            "2 cm inferior and 1 cm medial to the posterolateral acromion, needle directed toward the coracoid",
            "Enters through the deltoid–infraspinatus interval into the posterior joint; the <strong>axillary nerve</strong> lies well inferior"
          ]
        },
        {
          "cells": [
            "<strong>AC joint</strong>",
            "Superior or anterosuperior, ~1 cm medial to the lateral clavicular edge, angled slightly medially and posteriorly",
            "Follows the oblique joint line. Tiny capacity — small volumes and image guidance"
          ]
        },
        {
          "cells": [
            "<strong>Biceps tendon sheath</strong>",
            "Short axis at the groove, in-plane from lateral, arm in slight <strong>external rotation</strong>",
            "Remember the sheath communicates with the joint, so this is effectively an intra-articular injection"
          ]
        },
        {
          "cells": [
            "<strong>Suprascapular nerve block</strong>",
            "Ultrasound at the <strong>floor of the supraspinous fossa</strong>, between the suprascapular and <strong>spinoglenoid notch</strong>es",
            "Targets ~70% of the joint's sensory supply. The risk of pneumothorax with older blind \"notch\" techniques makes ultrasound the standard"
          ]
        },
        {
          "cells": [
            "<strong>Sternoclavicular joint</strong>",
            "Ultrasound-guided, anteriorly, lateral to medial, needle tip in view throughout",
            "The posterior relations make blind AP needling unacceptable"
          ]
        }
      ],
      "title": "Injection targets",
      "columns": [
        {
          "type": "text",
          "title": "Target"
        },
        {
          "type": "text",
          "title": "Approach"
        },
        {
          "type": "text",
          "title": "Anatomical rationale"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "27. Anatomical Variants — Consolidated"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "<strong>Os acromiale</strong>",
            "~8%; bilateral in ~60%",
            "Pain generator; alters surgical planning; do not mistake for an acute fracture"
          ]
        },
        {
          "cells": [
            "<strong>Sublabral foramen</strong>",
            "~11%",
            "Mistaken for a labral tear"
          ]
        },
        {
          "cells": [
            "<strong>Buford complex</strong>",
            "1.5–6.5%",
            "Mistaken for a labral tear; <strong>must not be repaired</strong>"
          ]
        },
        {
          "cells": [
            "<strong>Absent or cord-like MGHL</strong>",
            "Up to 30%",
            "Normal; alters the arthroscopic appearance"
          ]
        },
        {
          "cells": [
            "<strong>Sublabral recess at the biceps anchor</strong>",
            "Common",
            "The main differential for a SLAP I/II lesion"
          ]
        },
        {
          "cells": [
            "<strong>Narrow or ossified suprascapular notch (Rengachary III–VI)</strong>",
            "Variable",
            "Predisposes to <strong>suprascapular nerve</strong> entrapment"
          ]
        },
        {
          "cells": [
            "<strong>Langer's axillary arch (achselbogen)</strong>",
            "~7%",
            "A muscular slip from <strong>latissimus dorsi</strong> to <strong>pectoralis major</strong> crossing the axilla; can cause neurovascular compression and complicates axillary dissection"
          ]
        },
        {
          "cells": [
            "<strong>Coracoclavicular joint</strong>",
            "~1% in Western series; higher in some East Asian populations",
            "An accessory synovial joint; occasionally symptomatic, occasionally contributes to impingement"
          ]
        },
        {
          "cells": [
            "<strong>Luschka's tubercle</strong>",
            "Variable",
            "Superomedial scapular angle prominence; snapping scapula"
          ]
        },
        {
          "cells": [
            "<strong>Glenoid dysplasia / hypoplasia</strong>",
            "Uncommon",
            "Posterior instability; misread as a labral abnormality"
          ]
        },
        {
          "cells": [
            "<strong>Third head of biceps</strong>",
            "Up to ~10% in some series",
            "Anatomical curiosity with occasional surgical relevance"
          ]
        }
      ],
      "title": "Anatomical variants",
      "columns": [
        {
          "type": "text",
          "title": "Variant"
        },
        {
          "type": "text",
          "title": "Prevalence"
        },
        {
          "type": "text",
          "title": "Why it matters"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "Part VIII — Consolidation"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "28. Rapid Revision — Innervation and Root Levels"
    }
  },
  {
    "block_type": "rich_table",
    "content_config": {
      "rows": [
        {
          "cells": [
            "Trapezius",
            "<strong>Spinal accessory (CN XI)</strong> + C3–C4",
            "CN XI, C3–C4"
          ]
        },
        {
          "cells": [
            "<strong>Levator scapulae</strong>",
            "<strong>Dorsal scapular</strong> + C3–C4",
            "C3–C5"
          ]
        },
        {
          "cells": [
            "Rhomboids",
            "<strong>Dorsal scapular</strong>",
            "C4–C5"
          ]
        },
        {
          "cells": [
            "<strong>Serratus anterior</strong>",
            "<strong>Long thoracic</strong>",
            "C5–C7"
          ]
        },
        {
          "cells": [
            "Supraspinatus",
            "Suprascapular",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "Infraspinatus",
            "Suprascapular",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "<strong>Teres minor</strong>",
            "Axillary (posterior branch)",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "Deltoid",
            "Axillary",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "Subscapularis",
            "Upper and lower subscapular",
            "C5–C6"
          ]
        },
        {
          "cells": [
            "<strong>Teres major</strong>",
            "Lower subscapular",
            "C5–C7"
          ]
        },
        {
          "cells": [
            "<strong>Latissimus dorsi</strong>",
            "Thoracodorsal",
            "C6–C8"
          ]
        },
        {
          "cells": [
            "<strong>Pectoralis major (clavicular)</strong>",
            "<strong>Lateral pectoral</strong>",
            "C5–C7"
          ]
        },
        {
          "cells": [
            "<strong>Pectoralis major (sternocostal)</strong>",
            "<strong>Medial pectoral</strong>",
            "C8–T1"
          ]
        },
        {
          "cells": [
            "<strong>Pectoralis minor</strong>",
            "<strong>Medial pectoral</strong>",
            "C8–T1"
          ]
        },
        {
          "cells": [
            "<strong>Biceps, coracobrachialis, brachialis</strong>",
            "Musculocutaneous",
            "C5–C7"
          ]
        },
        {
          "cells": [
            "<strong>Triceps (long head)</strong>",
            "Radial",
            "C6–C8"
          ]
        }
      ],
      "title": "Innervation and root levels",
      "columns": [
        {
          "type": "text",
          "title": "Muscle"
        },
        {
          "type": "text",
          "title": "Nerve"
        },
        {
          "type": "text",
          "title": "Roots"
        }
      ]
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "29. Fifteen Pearls to Carry Into Clinic"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ol><li><strong>Five components, not one joint.</strong> Localise before you treat.</li><li><strong>The SC joint is the only bony link to the axial skeleton</strong> — and posterior dislocation is a surgical emergency, not a rehabilitation problem.</li><li><strong>AC ligaments resist horizontal, coracoclavicular ligaments resist vertical translation.</strong> The <strong>Rockwood classification</strong> is that sentence with radiographs attached.</li><li><strong>In an AC separation the clavicle has not risen — the arm has dropped.</strong> The coracoclavicular ligaments are a suspensory mechanism.</li><li><strong>The labrum doubles glenoid depth.</strong> The <strong>inferior labrum</strong> is firmly attached; the anterosuperior labrum is where the variants live.</li><li><strong>The rotator interval and coracohumeral ligament are the anatomy of frozen shoulder</strong> — which is precisely why <strong>external rotation</strong> is lost first.</li><li><strong>A medially dislocated long head of biceps means a subscapularis lesion</strong> until proven otherwise.</li><li><strong>Superior facet = supraspinatus; middle = infraspinatus; inferior = teres minor; lesser tuberosity = subscapularis.</strong> Rehearse until automatic.</li><li><strong>Acromiohumeral interval below 7 mm means superior migration</strong>, and in practice a large or massive cuff tear.</li><li><strong>Suprascapular notch lesion = both fossae atrophy. Spinoglenoid notch lesion = infraspinatus only</strong> — and go looking for the paralabral cyst.</li><li><strong>Rhomboids, serratus anterior and cervical paraspinals separate root from trunk</strong> on EMG. The highest-yield localisation principle in the upper limb.</li><li><strong>Check the regimental badge and deltoid before and after reducing a dislocation.</strong> Then look at <strong>teres minor</strong> on the MRI.</li><li><strong>The skin over the shoulder tip is C3–C4, the same as the diaphragm.</strong> A shoulder that hurts with no mechanical provocation may not be a shoulder at all.</li><li><strong>AC and SC degeneration on MRI is close to universal after 40.</strong> Imaging findings become diagnoses only when the examination agrees.</li><li><strong>Supraspinatus is a compressor first and an elevator second.</strong> Abandon the \"first 15 degrees\" teaching.</li></ol>"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "30. Self-Assessment"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "Answers follow the questions. Attempt them before looking."
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "<strong>Spinoglenoid notch</strong>, compressing the <strong>suprascapular nerve</strong> distal to its branches to supraspinatus. Most likely cause is a <strong>paralabral ganglion cyst</strong> arising from a posterior labral tear. Confirm with <strong>needle EMG</strong> (denervation in infraspinatus, normal supraspinatus) and MRI of the shoulder girdle.",
      "question": "A 34-year-old volleyball player has posterior shoulder pain, weak <strong>external rotation</strong> with the arm at the side, and a visible hollow below the <strong>scapular spine</strong>. Supraspinatus bulk and strength are normal. Where is the lesion, what is the most likely cause, and which two investigations confirm it?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "SGHL (medial floor, the key component), CHL (superficial roof), <strong>superficial subscapularis fibres</strong> (medial wall) and <strong>anterior supraspinatus fibres</strong> (lateral wall). Suspect a subscapularis tear.",
      "question": "Which four structures form the <strong>biceps reflection pulley</strong>, and which tendon tear should you suspect when the biceps is medially dislocated?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "<strong>Spinal accessory nerve (CN XI)</strong>, supplying trapezius. It crosses the <strong>posterior cervical triangle within the superficial investing fascia</strong>, only millimetres deep to the skin, with no protective muscle over it.",
      "question": "A patient has lateral winging with a drooping shoulder after a neck <strong>lymph node biopsy</strong>. Which nerve, which muscle, and why is that nerve so vulnerable at that site?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "Quadrangular: <strong>teres minor</strong> above, <strong>teres major</strong> below, <strong>long head</strong> of triceps medially, humerus laterally; contains the <strong>axillary nerve and posterior circumflex humeral vessels</strong>. <strong>Triangular space:</strong> <strong>teres minor</strong> above, <strong>teres major</strong> below, <strong>long head</strong> of triceps laterally; contains the <strong>circumflex scapular vessels</strong>. <strong>Triangular interval:</strong> <strong>teres major</strong> above, <strong>long head</strong> of triceps medially, humeral shaft laterally; contains the <strong>radial nerve and profunda brachii</strong>.",
      "question": "Name the boundaries and contents of the <strong>quadrangular space</strong>, the triangular space and the triangular interval."
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "A <strong>Buford complex</strong>, present in 1.5–6.5% of shoulders. It is a normal variant and <strong>must not be repaired to the glenoid</strong>, as doing so restricts <strong>external rotation</strong>.",
      "question": "An MR arthrogram reports \"absent anterosuperior labrum with a cord-like middle glenohumeral ligament.\" What is this, how common is it, and what must not be done about it?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "The <strong>superior glenohumeral ligament (SGHL)</strong>, with the coracohumeral ligament, resists inferior translation in adduction. The <strong>anterior band of the inferior glenohumeral ligament complex</strong> is the key restraint at <strong>90° abduction</strong> with <strong>external rotation</strong>.",
      "question": "Which glenohumeral ligament is the primary restraint to inferior translation with the arm adducted, and which becomes the key restraint at 90° of abduction with <strong>external rotation</strong>?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "The diaphragm is innervated by the phrenic nerve (C3–C5), and the skin over the shoulder tip is supplied by the supraclavicular nerves (C3–C4). Shared spinal segments produce referred pain — Kehr's sign.",
      "question": "Explain anatomically why a patient with a subphrenic abscess complains of shoulder pain."
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "Rhomboids (<strong>dorsal scapular nerve</strong>, off the root), <strong>serratus anterior</strong> (<strong>long thoracic nerve</strong>, off the roots) and <strong>cervical paraspinals</strong> (posterior primary ramus). All three branch proximal to the trunk, so abnormality in them localises the lesion <strong>above the trunk</strong>, at root level.",
      "question": "You are performing <strong>needle EMG</strong> on a patient with C5-distribution weakness. Which three muscles best distinguish a <strong>C5 root</strong> lesion from an <strong>upper trunk plexopathy</strong>, and why?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "Approximately <strong>5–7 cm distal to the lateral acromion</strong>, wrapping around the <strong>surgical neck</strong> deep to deltoid. This is the safe limit for a deltoid-splitting approach and for deep deltoid needle placement.",
      "question": "Where does the anterior branch of the <strong>axillary nerve</strong> lie relative to the lateral acromion, and what practical constraint does this impose?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "The <strong>SASD bursa</strong> does not normally communicate with the <strong>glenohumeral joint</strong>. Fluid in both compartments implies a full-thickness defect connecting them.",
      "question": "Why does fluid in both the <strong>glenohumeral joint</strong> and the subacromial–subdeltoid bursa suggest a <strong>full-thickness rotator cuff tear</strong>?"
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "Conoid: inverted cone, near-vertical, ~<strong>4.5 cm</strong> from the <strong>AC joint</strong>, posteromedial; primary restraint to superior translation. Trapezoid: broad quadrilateral, oblique superolateral, ~<strong>2.5–3 cm</strong> from the <strong>AC joint</strong>, anterolateral; resists <strong>axial compression</strong>.",
      "question": "Distinguish the conoid from the <strong>trapezoid ligament</strong> by shape, orientation, distance from the <strong>AC joint</strong>, and primary restraint."
    }
  },
  {
    "block_type": "self_check",
    "content_config": {
      "answer": "A <strong>physeal (Salter–Harris) injury</strong> of the medial clavicular epiphysis, which does not fuse until 22–25 years. Order a <strong>CT scan</strong> (with angiography if there is any suspicion of posterior displacement).",
      "question": "A 19-year-old has an apparent sternoclavicular dislocation after a rugby tackle. What is the most likely true diagnosis, and what imaging do you order?"
    }
  },
  {
    "block_type": "section_heading",
    "content_config": {
      "text": "References and Further Reading"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Core Texts"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li><strong>Standring S.</strong> <em>Gray's Anatomy: The Anatomical Basis of Clinical Practice.</em> Pectoral girdle and upper limb chapters.</li><li><strong>Rockwood CA, Matsen FA, et al.</strong> <em>The Shoulder.</em> The reference text for shoulder anatomy and pathology.</li><li><strong>Cifu DX (ed.).</strong> <em>Braddom's Physical Medicine and Rehabilitation.</em> Upper limb musculoskeletal chapters.</li><li><strong>Preston DC, Shapiro BE.</strong> <em>Electromyography and Neuromuscular Disorders.</em> For the localisation principles in Part V.</li><li><strong>Jacobson JA.</strong> <em>Fundamentals of Musculoskeletal Ultrasound.</em> For the scanning protocol in Chapter 25.</li><li><strong>Bianchi S, Martinoli C.</strong> <em>Ultrasound of the Musculoskeletal System.</em> Shoulder chapter.</li><li><strong>Srikumaran U (ed.).</strong> <em>Synopsis of Shoulder Surgery.</em> Thieme, 2021.</li></ul>"
    }
  },
  {
    "block_type": "subsection_heading",
    "content_config": {
      "text": "Key Primary Sources"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "<ul><li>Burkhart SS, Esch JC, Jolson RS. The rotator crescent and rotator cable: an anatomic description of the shoulder's \"suspension bridge.\" <em>Arthroscopy</em> 1993;9(3):611–616.</li><li>Halder AM, Kuhl SG, Zobitz ME, et al. Effects of the <strong>glenoid labrum</strong> and glenohumeral abduction on stability of the shoulder joint through concavity-compression. <em>J Bone Joint Surg Am</em> 2001;83-A:1062–1069.</li><li>Piepers I, Boudt P, Van Tongel A, et al. Evaluation of the muscle volumes of the transverse rotator cuff force couple in nonpathologic shoulders. <em>J Shoulder Elbow Surg</em> 2014;23:e158–e162.</li><li>Yang S, Kim TU, Kim DH, Chang MC. Understanding the physical examination of the shoulder: a narrative review. <em>Ann Palliat Med</em> 2021;10(2):2293–2303.</li></ul>"
    }
  },
  {
    "block_type": "paragraph",
    "content_config": {
      "body": "This volume covers anatomy only. Biomechanics — scapulohumeral rhythm, force couples, concavity-compression, instability mechanics and the kinematic basis of rehabilitation — is treated in the companion <strong>Shoulder Anatomy V2</strong> chapter."
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
