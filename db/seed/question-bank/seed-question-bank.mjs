// Preset Question Bank content — 3 folders (same names/colors already
// established by db/seed/flashcards/seed-categories.mjs, since it's
// the same underlying clinical taxonomy), one question set per folder,
// 3 real MCQs per set. Every question is written from the same real
// clinical facts already verified in db/seed/flashcards/seed-preset-decks.mjs
// (itself copied from the self_check blocks on the real disease pages)
// — reformatted as multiple-choice with genuine clinical distractors,
// not invented trivia. Small and honest, same precedent as the preset
// flashcard decks: 3 sets, 3 questions each, not a fabricated bank size.
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
