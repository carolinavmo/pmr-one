// UDI-6 (Urogenital Distress Inventory, short form) — fourth
// calculator in "Pelvic Floor Rehabilitation". 6 items sharing one
// 0-3 distress rubric, formula-scored via "percent3" ((mean/3)*100,
// equivalent to the standard (raw sum/18)*100 transform), max 100,
// descendingGood: true (higher = more distress).
//
// A classic, freely-circulated academic instrument (Uebersax et al.,
// 1995) — no proprietary flag is set, though item wording here is
// paraphrased in this app's own words rather than copied verbatim.
//
// Usage: node db/seed/clinical-tools/udi-6.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "pelvic-floor-rehabilitation", {
  slug: "pelvic-floor-rehabilitation",
  name: "Pelvic Floor Rehabilitation",
  color: "pink",
  position: 9,
});

const RUBRIC_EN = [
  { value: 0, label: "0 — Not at all" },
  { value: 1, label: "1 — Somewhat" },
  { value: 2, label: "2 — Moderately" },
  { value: 3, label: "3 — Greatly" },
];

const ITEMS_EN = [
  { id: "frequent_urination", label: "Frequent urination" },
  { id: "urgency_leakage", label: "Urine leakage related to a feeling of urgency" },
  { id: "stress_leakage", label: "Urine leakage related to physical activity, coughing, or sneezing" },
  { id: "small_amounts", label: "Small amounts of urine leakage (drops)" },
  { id: "difficulty_emptying", label: "Difficulty emptying your bladder" },
  { id: "pain_discomfort", label: "Pain or discomfort in the lower abdominal or genital area" },
];

const definitionEn = {
  items: ITEMS_EN.map((item) => ({ id: item.id, label: item.label, options: RUBRIC_EN })),
  scoring: { method: "formula", formula: "percent3" },
  maxScore: 100,
  descendingGood: true,
  calculationExplanation:
    "Over the past 3 months, each of the 6 items is rated 0 (not at all) to 3 (greatly). The raw sum (0-18) is transformed to a 0-100 scale by dividing by 18 and multiplying by 100, matching the standard UDI-6 scoring convention. A higher score reflects greater urogenital distress.",
  source: {
    citation: "Uebersax JS, Wyman JF, Shumaker SA, McClish DK, Fantl JA (Continence Program for Women Research Group). Short forms to assess life quality and symptom distress for urinary incontinence in women: the Incontinence Impact Questionnaire and the Urogenital Distress Inventory. Neurourol Urodyn. 1995;14(2):131-139.",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "udi-6", {
  slug: "udi-6",
  category_id: categoryId,
  name: "Urogenital Distress Inventory (Short Form)",
  abbreviation: "UDI-6",
  description: "Measures urogenital symptom distress across 6 items, producing a score out of 100 (0 = no distress).",
  population: "Adults with urinary incontinence or other urogenital symptoms",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 3,
});
await pool.query(
  `UPDATE clinical_calculator
   SET category_id = $2, name = $3, abbreviation = $4, description = $5,
       population = $6, estimated_minutes_min = $7, estimated_minutes_max = $8,
       definition = $9, status = $10, position = $11
   WHERE id = $1`,
  [
    calculatorId,
    categoryId,
    "Urogenital Distress Inventory (Short Form)",
    "UDI-6",
    "Measures urogenital symptom distress across 6 items, producing a score out of 100 (0 = no distress).",
    "Adults with urinary incontinence or other urogenital symptoms",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    3,
  ]
);

// ---------- Translations ----------

function buildTranslated(itemLabels, rubric, calculationExplanation) {
  return {
    items: ITEMS_EN.map((item, i) => ({ id: item.id, label: itemLabels[i], options: rubric })),
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    descendingGood: true,
    calculationExplanation,
    source: definitionEn.source,
  };
}

const RUBRIC_PT_PT = [
  { value: 0, label: "0 — Nada" },
  { value: 1, label: "1 — Um pouco" },
  { value: 2, label: "2 — Moderadamente" },
  { value: 3, label: "3 — Muito" },
];
const ITEMS_PT_PT = [
  "Urinar com frequência",
  "Perda de urina associada a uma sensação de urgência",
  "Perda de urina relacionada com atividade física, tosse ou espirros",
  "Pequenas perdas de urina (gotas)",
  "Dificuldade em esvaziar a bexiga",
  "Dor ou desconforto na zona abdominal inferior ou genital",
];
const calculationExplanationPtPt =
  "Nos últimos 3 meses, cada um dos 6 itens é classificado de 0 (nada) a 3 (muito). A soma bruta (0-18) é transformada numa escala de 0 a 100, dividindo por 18 e multiplicando por 100, seguindo a convenção padrão de pontuação do UDI-6. Uma pontuação mais alta reflete maior desconforto urogenital.";

const ITEMS_PT_BR = [
  "Urinar com frequência",
  "Perda de urina associada a uma sensação de urgência",
  "Perda de urina relacionada a atividade física, tosse ou espirros",
  "Pequenas perdas de urina (gotas)",
  "Dificuldade para esvaziar a bexiga",
  "Dor ou desconforto na região abdominal inferior ou genital",
];
const calculationExplanationPtBr =
  "Nos últimos 3 meses, cada um dos 6 itens é classificado de 0 (nada) a 3 (muito). A soma bruta (0-18) é transformada em uma escala de 0 a 100, dividindo por 18 e multiplicando por 100, seguindo a convenção padrão de pontuação do UDI-6. Uma pontuação mais alta reflete maior desconforto urogenital.";

const RUBRIC_ES = [
  { value: 0, label: "0 — Nada" },
  { value: 1, label: "1 — Un poco" },
  { value: 2, label: "2 — Moderadamente" },
  { value: 3, label: "3 — Mucho" },
];
const ITEMS_ES = [
  "Orinar con frecuencia",
  "Pérdida de orina asociada a una sensación de urgencia",
  "Pérdida de orina relacionada con actividad física, tos o estornudos",
  "Pequeñas pérdidas de orina (gotas)",
  "Dificultad para vaciar la vejiga",
  "Dolor o molestia en la zona abdominal inferior o genital",
];
const calculationExplanationEs =
  "En los últimos 3 meses, cada uno de los 6 ítems se puntúa de 0 (nada) a 3 (mucho). La suma bruta (0-18) se transforma a una escala de 0 a 100, dividiendo entre 18 y multiplicando por 100, siguiendo la convención estándar de puntuación del UDI-6. Una puntuación más alta refleja mayor malestar urogenital.";

const translations = [
  {
    locale: "pt-pt",
    name: "Inventário de Sofrimento Urogenital (Forma Curta)",
    description: "Mede o desconforto urogenital em 6 itens, produzindo uma pontuação em 100 (0 = sem desconforto).",
    definition: buildTranslated(ITEMS_PT_PT, RUBRIC_PT_PT, calculationExplanationPtPt),
  },
  {
    locale: "pt-br",
    name: "Inventário de Sofrimento Urogenital (Forma Curta)",
    description: "Mede o desconforto urogenital em 6 itens, gerando uma pontuação em 100 (0 = sem desconforto).",
    definition: buildTranslated(ITEMS_PT_BR, RUBRIC_PT_PT, calculationExplanationPtBr),
  },
  {
    locale: "es",
    name: "Inventario de Malestar Urogenital (Forma Corta)",
    description: "Mide el malestar urogenital en 6 ítems, generando una puntuación sobre 100 (0 = sin malestar).",
    definition: buildTranslated(ITEMS_ES, RUBRIC_ES, calculationExplanationEs),
  },
];

for (const translation of translations) {
  await upsertRelationship(
    pool,
    "clinical_calculator_translation",
    {
      calculator_id: calculatorId,
      locale: translation.locale,
      name: translation.name,
      description: translation.description,
      definition: JSON.stringify(translation.definition),
    },
    ["calculator_id", "locale"]
  );
}

console.log("UDI-6 seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
