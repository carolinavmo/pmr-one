// Preset Question Bank content — 3 folders (same names/colors already
// established by db/seed/flashcards/seed-categories.mjs, since it's
// the same underlying clinical taxonomy). Most sets are 3 real MCQs
// written from the same real clinical facts already verified in
// db/seed/flashcards/seed-preset-decks.mjs (itself copied from the
// self_check blocks on the real disease pages) — reformatted as
// multiple-choice with genuine clinical distractors, not invented
// trivia. The Plantar Fasciopathy set is a larger, user-supplied
// 10-question set with 5 options each, kept as-authored rather than
// trimmed to match the others' size.
//
// Usage: node db/seed/question-bank/seed-question-bank.mjs
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIES = [
  { name: "Foot & Ankle", color: "accent" },
  { name: "Face", color: "trust" },
  { name: "Knee & Hip", color: "insight" },
];

const SETS = [
  {
    categoryName: "Foot & Ankle",
    name: "Achilles Tendinopathy — Key Concepts",
    description: "Multiple-choice questions on Achilles tendinopathy.",
    color: "accent",
    difficulty: "medium",
    questions: [
      {
        prompt:
          "A patient reports pain and thickening of the Achilles tendon located 4 cm above its insertion on the calcaneus, worsened by activity. Which type of Achilles tendinopathy is most consistent with this presentation?",
        explanation:
          "Mid-portion Achilles tendinopathy classically presents with pain and thickening 2-6 cm above the insertion on the calcaneus, distinguishing it from insertional disease, which presents at the heel itself.",
        topicLabel: "Achilles Tendinopathy",
        tags: ["Tendinopathy", "Foot & Ankle", "Diagnosis"],
        options: [
          { label: "Mid-portion Achilles tendinopathy", isCorrect: true, rationale: "Correct — mid-portion disease classically presents with pain and thickening 2-6 cm above the insertion." },
          { label: "Insertional Achilles tendinopathy", isCorrect: false, rationale: "Insertional disease presents with pain directly at the back of the heel, at the calcaneal insertion — not 4 cm proximal to it." },
          { label: "Retrocalcaneal bursitis", isCorrect: false, rationale: "Presents with tenderness anterior to the Achilles at its insertion, not tendon thickening 4 cm proximal." },
          { label: "Plantar fasciopathy", isCorrect: false, rationale: "Involves plantar heel pain at the fascia origin, not the Achilles tendon itself." },
        ],
      },
      {
        prompt:
          "A 45-year-old recreational athlete has sudden posterior ankle pain during a sprint. With the patient prone and the foot hanging off the table, squeezing the calf produces no plantarflexion (positive Thompson test). What is the most appropriate next step?",
        explanation:
          "An abnormal (positive) Thompson test — no plantarflexion when the calf is squeezed — suggests a complete or high-grade partial Achilles tendon rupture, not tendinopathy, and should prompt urgent reassessment rather than continuing routine tendinopathy management.",
        topicLabel: "Achilles Tendinopathy",
        tags: ["Tendinopathy", "Physical Exam", "Red Flags"],
        options: [
          { label: "Continue routine eccentric-loading tendinopathy management", isCorrect: false, rationale: "A positive Thompson test suggests a rupture, not tendinopathy — routine eccentric loading is not appropriate here." },
          { label: "Urgent reassessment for possible Achilles tendon rupture", isCorrect: true, rationale: "Correct — a positive Thompson test suggests a complete or high-grade partial rupture, which needs urgent reassessment." },
          { label: "Corticosteroid injection into the tendon sheath", isCorrect: false, rationale: "Corticosteroid injection is generally avoided in Achilles pathology given rupture risk, and doesn't address a positive Thompson test." },
          { label: "Reassure and review in 6 weeks", isCorrect: false, rationale: "A positive Thompson test is a red flag for rupture and shouldn't be managed with routine reassurance and delayed follow-up." },
        ],
      },
      {
        prompt:
          "Why is corticosteroid injection generally avoided in the management of Achilles tendinopathy, unlike some other tendinopathies such as plantar fasciopathy?",
        explanation:
          "Corticosteroid injection carries a real, well-recognized risk of tendon rupture in the Achilles — eccentric loading is preferred as first-line management instead.",
        topicLabel: "Achilles Tendinopathy",
        tags: ["Tendinopathy", "Treatment", "Injections"],
        options: [
          { label: "It has no evidence of any pain-relieving effect", isCorrect: false, rationale: "Corticosteroid injections can reduce pain short-term; the concern here is structural, not lack of efficacy." },
          { label: "It carries a well-recognized risk of tendon rupture", isCorrect: true, rationale: "Correct — this real risk is why eccentric loading is preferred as first-line management instead." },
          { label: "It is contraindicated in all lower-limb tendons", isCorrect: false, rationale: "The concern is specific to the Achilles, not a blanket contraindication across all lower-limb tendons." },
          { label: "It significantly delays diagnosis", isCorrect: false, rationale: "The concern is a structural rupture risk, not a diagnostic delay." },
        ],
      },
    ],
  },
  {
    categoryName: "Foot & Ankle",
    name: "Plantar Fasciopathy — Key Concepts",
    description: "Multiple-choice questions on plantar fasciopathy.",
    color: "accent",
    difficulty: "medium",
    questions: [
      {
        prompt:
          "A 46-year-old recreational runner reports plantar heel pain that is most severe during the first few steps after getting out of bed. The pain initially improves with walking but returns after prolonged standing. What is the most likely diagnosis?",
        explanation:
          "Plantar fasciopathy classically presents with plantar-medial heel pain and pronounced first-step pain after waking or after prolonged inactivity. Symptoms often ease temporarily as the tissue warms up but return after sustained standing, walking or running.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Foot & Ankle", "Diagnosis"],
        options: [
          { label: "Calcaneal stress fracture", isCorrect: false, rationale: "Usually produces progressively worsening pain with weight-bearing. In more advanced cases, pain may occur at rest. A calcaneal squeeze test is often positive, whereas first-step pain is less characteristic." },
          { label: "Plantar fasciopathy", isCorrect: true, rationale: "Correct — plantar fasciopathy causes plantar-medial heel pain with pronounced first-step pain that eases with movement but returns after prolonged standing." },
          { label: "Tarsal tunnel syndrome", isCorrect: false, rationale: "More likely to cause burning, tingling, numbness or radiating pain along the plantar foot. Tinel's sign may be present over the posterior tibial nerve." },
          { label: "S1 radiculopathy", isCorrect: false, rationale: "May cause radiating leg pain, sensory disturbance, plantar-flexion weakness or a reduced Achilles reflex. Isolated focal plantar-medial heel pain would be unusual." },
          { label: "Heel-fat-pad syndrome", isCorrect: false, rationale: "Typically causes deep, bruise-like pain beneath the centre of the heel, particularly when walking barefoot or on hard surfaces." },
        ],
      },
      {
        prompt: "Where is tenderness most commonly found in plantar fasciopathy?",
        explanation:
          "The plantar fascia originates proximally from the plantar aspect of the calcaneus. Plantar fasciopathy most commonly affects its proximal attachment near the medial calcaneal tubercle, where focal tenderness is usually found.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Physical Exam", "Anatomy"],
        options: [
          { label: "Posterior calcaneal tuberosity", isCorrect: false, rationale: "Pain here is more consistent with insertional Achilles tendinopathy, retrocalcaneal bursitis or Haglund-related pathology." },
          { label: "Central heel fat pad", isCorrect: false, rationale: "Central plantar heel tenderness suggests heel-fat-pad irritation or atrophy rather than plantar fasciopathy." },
          { label: "Medial calcaneal tubercle", isCorrect: true, rationale: "Correct — the plantar fascia originates near the medial calcaneal tubercle, where focal tenderness is usually found in plantar fasciopathy." },
          { label: "Navicular tuberosity", isCorrect: false, rationale: "Tenderness in this location may indicate posterior tibial tendon pathology, an accessory navicular or a navicular stress injury." },
          { label: "Base of the fifth metatarsal", isCorrect: false, rationale: "This is the insertion of the fibularis brevis tendon and a potential site of an avulsion or Jones fracture." },
        ],
      },
      {
        prompt: "Which examination maneuver most directly reproduces symptoms by increasing tension in the plantar fascia?",
        explanation:
          "Extending the great toe winds the plantar fascia around the first metatarsal head. This shortens the distance between the calcaneus and forefoot, tightens the fascia and elevates the medial longitudinal arch. Reproduction of plantar-medial heel pain is considered a positive windlass test.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Physical Exam", "Windlass Test"],
        options: [
          { label: "Passive ankle plantarflexion", isCorrect: false, rationale: "Does not directly engage the windlass mechanism and generally reduces tension through the calf–Achilles complex." },
          { label: "Passive great-toe extension", isCorrect: true, rationale: "Correct — extending the great toe winds the plantar fascia around the first metatarsal head, tightening it and reproducing symptoms — the windlass test." },
          { label: "Resisted great-toe flexion", isCorrect: false, rationale: "Primarily assesses the flexor hallucis longus and intrinsic toe flexors rather than directly tensioning the plantar fascia." },
          { label: "Calcaneal squeeze test", isCorrect: false, rationale: "Compresses the calcaneus from side to side and is mainly used when a calcaneal stress fracture is suspected." },
          { label: "Tinel's sign at the tarsal tunnel", isCorrect: false, rationale: "Assesses irritation of the posterior tibial nerve and may reproduce paresthesia in tarsal tunnel syndrome." },
        ],
      },
      {
        prompt: "What is the principal biomechanical function of the windlass mechanism during late stance?",
        explanation:
          "During terminal stance, extension of the metatarsophalangeal joints—particularly the great toe—tightens the plantar fascia. This elevates the longitudinal arch, draws the calcaneus and forefoot closer together and helps stabilize the foot. The foot therefore becomes a more effective lever for propulsion.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Biomechanics", "Windlass Mechanism"],
        options: [
          { label: "Increasing flexibility of the midfoot", isCorrect: false, rationale: "The mechanism increases arch tension and foot stability rather than making the midfoot more flexible." },
          { label: "Pronating the subtalar joint", isCorrect: false, rationale: "Windlass activation is associated with arch elevation and contributes to a more supinated, stable foot configuration." },
          { label: "Converting the foot into a more rigid lever for push-off", isCorrect: true, rationale: "Correct — tightening the plantar fascia elevates the arch and stabilizes the foot into a more rigid lever for propulsion." },
          { label: "Relaxing the plantar fascia", isCorrect: false, rationale: "Great-toe extension tightens rather than relaxes the plantar fascia." },
          { label: "Increasing ankle dorsiflexion", isCorrect: false, rationale: "Ankle dorsiflexion occurs during stance, but it is not the primary function of the windlass mechanism." },
        ],
      },
      {
        prompt:
          "A patient has a classic clinical presentation of plantar fasciopathy without trauma, neurological findings or systemic symptoms. What is the most appropriate initial imaging strategy?",
        explanation:
          "Plantar fasciopathy is usually a clinical diagnosis, based on the characteristic history and examination. Routine imaging rarely changes initial management. Imaging becomes appropriate when the presentation is atypical, red flags are present, an alternative diagnosis is suspected or symptoms persist despite an adequate treatment programme.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Imaging", "Diagnosis"],
        options: [
          { label: "Obtain a weight-bearing radiograph", isCorrect: false, rationale: "May be useful when fracture, arthritis, structural deformity or another bony disorder is suspected, but is not routinely required. A calcaneal spur may be present in people with or without pain and does not confirm the diagnosis." },
          { label: "Obtain diagnostic ultrasonography", isCorrect: false, rationale: "Can demonstrate fascial thickening, altered echogenicity or tears, but is generally reserved for diagnostic uncertainty, procedural guidance or refractory symptoms." },
          { label: "Obtain an MRI", isCorrect: false, rationale: "Provides detailed evaluation of soft tissue and bone but is unnecessarily expensive for a typical initial presentation. It may be considered when stress fracture, tumour, infection or fascial rupture is suspected." },
          { label: "Obtain a CT scan", isCorrect: false, rationale: "Is mainly useful for detailed assessment of bone and is not a first-line test for uncomplicated plantar fasciopathy." },
          { label: "No imaging is routinely required", isCorrect: true, rationale: "Correct — plantar fasciopathy is usually a clinical diagnosis; routine imaging rarely changes initial management for a classic presentation." },
        ],
      },
      {
        prompt:
          "A runner reports progressively worsening heel pain that now occurs at rest. Examination demonstrates diffuse calcaneal tenderness and pain when the calcaneus is compressed from both sides. Which diagnosis should be suspected?",
        explanation:
          "A calcaneal stress fracture should be suspected when heel pain progressively worsens after increased loading, becomes present at rest and is reproduced by mediolateral compression of the calcaneus—the calcaneal squeeze test. Early radiographs may be normal, so MRI may be required if clinical suspicion remains high.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Differential Diagnosis", "Red Flags"],
        options: [
          { label: "Plantar fasciopathy", isCorrect: false, rationale: "Usually produces focal plantar-medial tenderness and first-step pain rather than diffuse calcaneal tenderness with a positive squeeze test." },
          { label: "Calcaneal stress fracture", isCorrect: true, rationale: "Correct — progressively worsening pain at rest with a positive calcaneal squeeze test suggests a calcaneal stress fracture." },
          { label: "Baxter nerve entrapment", isCorrect: false, rationale: "Entrapment of the first branch of the lateral plantar nerve may produce medial plantar heel pain, often with a burning quality. It does not typically cause pain with calcaneal compression." },
          { label: "Achilles tendinopathy", isCorrect: false, rationale: "Causes posterior heel or tendon pain associated with tendon loading. Tenderness is located at the Achilles insertion or within the tendon." },
          { label: "First metatarsophalangeal osteoarthritis", isCorrect: false, rationale: "Produces pain and restricted movement at the great-toe joint, particularly during push-off, rather than diffuse heel pain." },
        ],
      },
      {
        prompt: "Which intervention is most appropriate as part of first-line management for plantar fasciopathy?",
        explanation:
          "Initial treatment should address the relationship between tissue load and tissue capacity. This generally includes education, temporary modification of aggravating activities, plantar-fascia-specific stretching, calf stretching and progressive strengthening. Footwear modification or taping may also provide short-term symptom relief.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Treatment", "Management"],
        options: [
          { label: "Complete avoidance of weight-bearing for six weeks", isCorrect: false, rationale: "Usually causes unnecessary deconditioning and does not progressively restore tissue capacity. Relative load modification is preferable to complete rest." },
          { label: "Immediate surgical plantar fasciotomy", isCorrect: false, rationale: "Surgery is reserved for a small proportion of patients with persistent, function-limiting symptoms despite prolonged, well-structured conservative treatment." },
          { label: "Load modification combined with plantar-fascia and calf stretching", isCorrect: true, rationale: "Correct — first-line treatment addresses tissue load and capacity through activity modification, stretching and progressive strengthening." },
          { label: "Repeated corticosteroid injections", isCorrect: false, rationale: "May offer short-term relief but do not address loading capacity and carry risks such as plantar fascia rupture and heel-fat-pad atrophy." },
          { label: "Long-term immobilization in a walking boot", isCorrect: false, rationale: "May occasionally be considered for severe pain or suspected tissue injury, but prolonged routine immobilization can lead to stiffness, weakness and loss of tissue capacity." },
        ],
      },
      {
        prompt: "Which exercise strategy most directly improves the plantar fascia's capacity to tolerate mechanical loading?",
        explanation:
          "Progressive resistance exercise exposes the plantar fascia and its supporting structures to controlled, gradually increasing loads. Heel-raise variations and exercises for the intrinsic foot muscles may improve calf–foot strength, load tolerance and function. Exercise dosage should be individualized and adjusted according to symptom response.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Treatment", "Exercise"],
        options: [
          { label: "Passive stretching alone", isCorrect: false, rationale: "Stretching may reduce symptoms and improve mobility but does not provide a sufficient progressive strengthening stimulus when used in isolation." },
          { label: "Progressive resistance exercise targeting the calf–foot complex", isCorrect: true, rationale: "Correct — progressive resistance exercise exposes the plantar fascia and supporting structures to controlled, gradually increasing loads, improving load tolerance." },
          { label: "Non-weight-bearing rest until all pain resolves", isCorrect: false, rationale: "May temporarily reduce pain but also reduces muscle and tissue capacity. A graded return to loading is generally required." },
          { label: "Repeated toe-flexor stretching", isCorrect: false, rationale: "Does not provide the same strengthening stimulus and may place additional tension on irritable plantar tissues if performed aggressively." },
          { label: "Continuous use of rigid immobilization", isCorrect: false, rationale: "Prevents progressive tissue adaptation and can produce weakness and stiffness. It is not a routine long-term strategy." },
        ],
      },
      {
        prompt: "Which potential complication should be discussed before corticosteroid injection for plantar fasciopathy?",
        explanation:
          "Corticosteroid injection may provide short-term pain reduction, but it can weaken collagen-containing structures. Recognized complications include plantar fascia rupture, heel-fat-pad atrophy, skin depigmentation, infection and transient post-injection pain. The decision should therefore consider the expected short-term benefit, alternatives and individual risk.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Treatment", "Injections"],
        options: [
          { label: "Achilles tendon elongation", isCorrect: false, rationale: "This is not a typical complication of an appropriately placed plantar fascia injection." },
          { label: "Plantar fascia rupture and heel-fat-pad atrophy", isCorrect: true, rationale: "Correct — corticosteroid injection can weaken collagen-containing structures, with recognized risks of plantar fascia rupture and heel-fat-pad atrophy." },
          { label: "Tarsal coalition", isCorrect: false, rationale: "A coalition is a congenital or developmental connection between tarsal bones and is not caused by corticosteroid injection." },
          { label: "Calcaneonavicular arthritis", isCorrect: false, rationale: "Arthritis is not a recognized direct complication of plantar fascia injection." },
          { label: "Hallux rigidus", isCorrect: false, rationale: "This is degenerative osteoarthritis of the first metatarsophalangeal joint and is unrelated to plantar fascia injection." },
        ],
      },
      {
        prompt:
          "A patient continues to experience plantar heel pain after six weeks of treatment but reports modest functional improvement. What is the most appropriate next step?",
        explanation:
          "Plantar fasciopathy often improves gradually over several months rather than resolving within a few weeks. Modest functional improvement at six weeks suggests that conservative management may be working. Adherence, activity load, exercise dosage, ankle mobility, strength, footwear and recovery should be reassessed before escalating treatment.",
        topicLabel: "Plantar Fasciopathy",
        tags: ["Plantar Fasciopathy", "Prognosis", "Treatment"],
        options: [
          { label: "Declare conservative treatment unsuccessful and perform surgery", isCorrect: false, rationale: "This is far too early. Surgery is generally considered only after prolonged, well-conducted non-operative management has failed." },
          { label: "Continue and progressively adjust the rehabilitation programme", isCorrect: true, rationale: "Correct — modest improvement at six weeks suggests conservative management may be working; reassess and adjust before escalating." },
          { label: "Recommend permanent cessation of running", isCorrect: false, rationale: "Most patients can return to running through appropriate load modification and gradual progression. Permanent avoidance is rarely necessary." },
          { label: "Administer serial corticosteroid injections", isCorrect: false, rationale: "Repeated injections increase the risk of tissue damage and should not replace a structured rehabilitation programme." },
          { label: "Prescribe indefinite immobilization", isCorrect: false, rationale: "Prolonged immobilization promotes weakness and loss of load tolerance and does not address the underlying rehabilitation goals." },
        ],
      },
    ],
  },
  {
    categoryName: "Face",
    name: "Bell's Palsy — Key Concepts",
    description: "Multiple-choice questions on Bell's Palsy.",
    color: "trust",
    difficulty: "medium",
    questions: [
      {
        prompt:
          "A patient presents with acute facial weakness. Which single exam finding is most useful for distinguishing a central (e.g. stroke) cause from a peripheral (Bell's Palsy) cause?",
        explanation:
          "Forehead sparing is the key finding: preserved forehead movement despite lower facial weakness indicates a central lesion (most importantly stroke), while forehead weakness alongside lower facial weakness indicates a peripheral pattern consistent with Bell's Palsy.",
        topicLabel: "Bell's Palsy",
        tags: ["Cranial Nerve", "Physical Exam", "Diagnosis"],
        options: [
          { label: "Forehead sparing", isCorrect: true, rationale: "Correct — preserved forehead movement despite lower facial weakness points to a central lesion; forehead weakness too means a peripheral pattern." },
          { label: "Presence of ear pain", isCorrect: false, rationale: "Ear pain can accompany Bell's Palsy but doesn't reliably distinguish central from peripheral causes." },
          { label: "Degree of lower facial droop", isCorrect: false, rationale: "Both central and peripheral lesions can cause lower facial droop; drooping alone doesn't localize the lesion." },
          { label: "Symmetry of pupil size", isCorrect: false, rationale: "Pupillary findings relate to different cranial nerve/brainstem pathways, not facial nerve localization." },
        ],
      },
      {
        prompt:
          "On attempted eyelid closure, a patient with facial weakness shows the eye rolling upward while the eyelid fails to fully close. What does this demonstrate, and why does it matter clinically?",
        explanation:
          "Bell's phenomenon — the eye rolling upward on attempted closure — is a normal reflex. Its clinical importance is that the accompanying lagophthalmos (failure of the eyelid to close over it) creates the corneal exposure risk that drives urgent eye protection.",
        topicLabel: "Bell's Palsy",
        tags: ["Cranial Nerve", "Physical Exam", "Eye Care"],
        options: [
          {
            label: "A normal reflex (Bell's phenomenon); the failure of eyelid closure creates corneal exposure risk",
            isCorrect: true,
            rationale: "Correct — the eye rolling up is a normal reflex; the clinically important part is the lagophthalmos exposing the cornea.",
          },
          { label: "An abnormal oculomotor nerve palsy requiring urgent imaging", isCorrect: false, rationale: "This describes Bell's phenomenon, a normal protective reflex — not an oculomotor nerve palsy." },
          { label: "A sign of raised intracranial pressure", isCorrect: false, rationale: "This finding relates to facial nerve function and eyelid closure, not intracranial pressure." },
          { label: "An indication that the facial weakness is resolving", isCorrect: false, rationale: "Bell's phenomenon is present regardless of whether the palsy is resolving — it doesn't track recovery." },
        ],
      },
      {
        prompt:
          "In a patient newly diagnosed with Bell's Palsy, when should eye protection (e.g. lubricating drops, taping at night) be started relative to the decision about corticosteroid treatment?",
        explanation:
          "Eye protection should start the same day as diagnosis, regardless of the steroid-timing decision — corneal injury from lagophthalmos is a preventable complication that doesn't need to wait on any other treatment decision.",
        topicLabel: "Bell's Palsy",
        tags: ["Cranial Nerve", "Treatment", "Eye Care"],
        options: [
          { label: "The same day, regardless of the steroid-timing decision", isCorrect: true, rationale: "Correct — corneal injury from lagophthalmos is a preventable complication that doesn't need to wait on any other treatment decision." },
          { label: "Only after starting corticosteroids", isCorrect: false, rationale: "Eye protection should start immediately and is independent of whether or when corticosteroids are started." },
          { label: "Only if the patient develops visible corneal irritation", isCorrect: false, rationale: "Eye protection is preventive, started before any corneal injury occurs — not reactive to visible irritation." },
          { label: "After confirming the diagnosis with nerve conduction studies", isCorrect: false, rationale: "Bell's Palsy is a clinical diagnosis; eye protection shouldn't be delayed pending electrodiagnostic testing." },
        ],
      },
    ],
  },
  {
    categoryName: "Knee & Hip",
    name: "Knee Osteoarthritis — Key Concepts",
    description: "Multiple-choice questions on knee osteoarthritis.",
    color: "insight",
    difficulty: "medium",
    questions: [
      {
        prompt:
          "A patient with known knee osteoarthritis has a positive McMurray's test on examination. Does this confirm the osteoarthritis diagnosis?",
        explanation:
          "A positive McMurray's test identifies a commonly co-existing meniscal component, not a competing or confirming finding for osteoarthritis itself — the two frequently occur together without one causing the other.",
        topicLabel: "Knee Osteoarthritis",
        tags: ["Osteoarthritis", "Physical Exam", "Diagnosis"],
        options: [
          {
            label: "No — it identifies a commonly co-existing meniscal component, not a confirming finding for osteoarthritis",
            isCorrect: true,
            rationale: "Correct — the two frequently occur together without one causing or confirming the other.",
          },
          { label: "Yes — McMurray's is diagnostic for osteoarthritis", isCorrect: false, rationale: "McMurray's test specifically assesses for meniscal pathology, not osteoarthritis itself." },
          { label: "No — a positive McMurray's actually argues against osteoarthritis", isCorrect: false, rationale: "A positive McMurray's doesn't argue against OA; the two commonly coexist." },
          { label: "Yes, but only in patients over 60", isCorrect: false, rationale: "McMurray's tests for meniscal pathology regardless of age and isn't confirmatory for osteoarthritis at any age." },
        ],
      },
      {
        prompt: "A patient has Kellgren-Lawrence grade 3 changes on knee radiograph but reports only mild pain. How should this be interpreted?",
        explanation:
          "Radiographic severity correlates imperfectly with symptom severity — a patient can have advanced imaging findings with mild symptoms, or the reverse. Management should be guided by the patient's actual pain and function, not the radiographic grade.",
        topicLabel: "Knee Osteoarthritis",
        tags: ["Osteoarthritis", "Imaging", "Diagnosis"],
        options: [
          {
            label: "Radiographic severity correlates imperfectly with symptoms; treat the patient's actual pain and function, not the imaging grade",
            isCorrect: true,
            rationale: "Correct — treat the patient's actual pain and function, not the grade on the film.",
          },
          { label: "The radiograph must be mislabeled, since grade 3 changes always cause severe pain", isCorrect: false, rationale: "Radiographic grade and symptom severity are known to correlate imperfectly; a mismatch doesn't imply a labeling error." },
          { label: "The patient should be referred immediately for total knee replacement based on the grade", isCorrect: false, rationale: "Surgical decisions are based on symptoms and function, not radiographic grade alone." },
          { label: "The mild pain suggests the diagnosis should be reconsidered", isCorrect: false, rationale: "Mild symptoms with advanced imaging findings is a recognized pattern in OA, not a reason to doubt the diagnosis." },
        ],
      },
      {
        prompt: "Why does even modest weight loss have an outsized effect on symptoms in knee osteoarthritis?",
        explanation:
          "Each pound of body weight is estimated to translate into several times that load across the knee during walking (commonly cited estimates are around 4x) — so a modest reduction in body weight meaningfully reduces joint loading with every step.",
        topicLabel: "Knee Osteoarthritis",
        tags: ["Osteoarthritis", "Treatment", "Weight Management"],
        options: [
          {
            label: "Each pound of body weight is estimated to translate into several times that load across the knee during walking",
            isCorrect: true,
            rationale: "Correct — commonly cited estimates are around 4x that weight in load across the knee per step.",
          },
          { label: "Weight loss directly regenerates lost articular cartilage", isCorrect: false, rationale: "Weight loss reduces mechanical load; it doesn't regenerate cartilage." },
          { label: "It works only through reducing systemic inflammation, not mechanical load", isCorrect: false, rationale: "The dominant, well-established mechanism is the load-multiplier effect at the knee, not an inflammation-only pathway." },
          { label: "It matters only for patients with a BMI over 35", isCorrect: false, rationale: "The load-multiplier effect applies across body weights — benefit isn't restricted to a specific BMI threshold." },
        ],
      },
    ],
  },
];

const categoryIdByName = new Map();
for (let i = 0; i < CATEGORIES.length; i++) {
  const cat = CATEGORIES[i];
  const { rows: existing } = await pool.query(`SELECT id FROM question_category WHERE name = $1`, [cat.name]);
  if (existing.length > 0) {
    categoryIdByName.set(cat.name, existing[0].id);
    console.log(`Skipping folder "${cat.name}" — already seeded.`);
    continue;
  }
  const { rows } = await pool.query(
    `INSERT INTO question_category (name, color, position) VALUES ($1, $2, $3) RETURNING id`,
    [cat.name, cat.color, i]
  );
  categoryIdByName.set(cat.name, rows[0].id);
  console.log(`Seeded folder "${cat.name}".`);
}

for (const [position, set] of SETS.entries()) {
  const { rows: existingSet } = await pool.query(`SELECT id FROM question_set WHERE name = $1`, [set.name]);
  if (existingSet.length > 0) {
    console.log(`Skipping "${set.name}" — already seeded.`);
    continue;
  }

  const categoryId = categoryIdByName.get(set.categoryName) ?? null;
  const { rows: setRows } = await pool.query(
    `INSERT INTO question_set (category_id, name, description, color, difficulty, position)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [categoryId, set.name, set.description, set.color, set.difficulty, position]
  );
  const setId = setRows[0].id;

  for (const [qPosition, question] of set.questions.entries()) {
    const { rows: questionRows } = await pool.query(
      `INSERT INTO question (set_id, prompt, explanation, topic_label, tags, position)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [setId, question.prompt, question.explanation, question.topicLabel, question.tags, qPosition]
    );
    const questionId = questionRows[0].id;

    for (const [oPosition, option] of question.options.entries()) {
      await pool.query(
        `INSERT INTO question_option (question_id, label, is_correct, rationale, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [questionId, option.label, option.isCorrect, option.rationale, oPosition]
      );
    }
  }

  console.log(`Seeded "${set.name}" with ${set.questions.length} questions.`);
}

await pool.end();
