// Wexner Score / Cleveland Clinic Incontinence Score (CCIS) — first
// calculator in a new "Pelvic Floor Rehabilitation" category. 5 items
// (solid, liquid, gas, pad use, lifestyle alteration) sharing one 0-4
// frequency rubric, sum-scored, max 20, descendingGood: true (0 =
// perfect continence, 20 = complete incontinence).
//
// A classic, freely-reproduced academic instrument (Jorge & Wexner,
// 1993) — no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/wexner-score.mjs
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
  { value: 0, label: "0 — Never" },
  { value: 1, label: "1 — Rarely", description: "Less than once a month." },
  { value: 2, label: "2 — Sometimes", description: "Less than once a week, at least once a month." },
  { value: 3, label: "3 — Usually", description: "Less than once a day, at least once a week." },
  { value: 4, label: "4 — Always", description: "At least once a day." },
];

const ITEMS_EN = [
  { id: "solid", label: "Incontinence to solid stool" },
  { id: "liquid", label: "Incontinence to liquid stool" },
  { id: "gas", label: "Incontinence to gas" },
  { id: "pad", label: "Wears a pad" },
  { id: "lifestyle", label: "Lifestyle alteration due to incontinence" },
];

const definitionEn = {
  items: ITEMS_EN.map((item) => ({ id: item.id, label: item.label, options: RUBRIC_EN })),
  scoring: { method: "sum" },
  maxScore: 20,
  descendingGood: true,
  interpretation: [
    { min: 0, max: 0, label: "Perfect continence", description: "No episodes of incontinence.", severity: "good" },
    { min: 1, max: 9, label: "Mild incontinence", description: "Infrequent, minor episodes of incontinence.", severity: "warning" },
    { min: 10, max: 14, label: "Moderate incontinence", description: "Regular episodes of incontinence affecting daily life.", severity: "serious" },
    { min: 15, max: 20, label: "Severe incontinence", description: "Frequent or complete incontinence.", severity: "critical" },
  ],
  calculationExplanation:
    "The Wexner score is the sum of the 5 items — incontinence to solid stool, liquid stool, and gas, pad use, and lifestyle alteration — each rated 0 (never) to 4 (always), for a total out of 20. 0 reflects perfect continence and 20 reflects complete incontinence.",
  source: {
    citation: "Jorge JM, Wexner SD. Etiology and management of fecal incontinence. Dis Colon Rectum. 1993;36(1):77-97.",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "wexner-score", {
  slug: "wexner-score",
  category_id: categoryId,
  name: "Wexner Score",
  abbreviation: "CCIS",
  description: "Measures the severity and frequency of fecal incontinence across 5 items, producing a score out of 20 (0 = perfect continence).",
  population: "Adults with fecal incontinence",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 0,
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
    "Wexner Score",
    "CCIS",
    "Measures the severity and frequency of fecal incontinence across 5 items, producing a score out of 20 (0 = perfect continence).",
    "Adults with fecal incontinence",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    0,
  ]
);

// ---------- Translations ----------

function buildTranslated(itemLabels, rubric, calculationExplanation, interpretationLabels) {
  return {
    items: ITEMS_EN.map((item, i) => ({ id: item.id, label: itemLabels[i], options: rubric })),
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    descendingGood: true,
    interpretation: definitionEn.interpretation.map((band, i) => ({ ...band, label: interpretationLabels[i].label, description: interpretationLabels[i].description })),
    calculationExplanation,
    source: definitionEn.source,
  };
}

const RUBRIC_PT_PT = [
  { value: 0, label: "0 — Nunca" },
  { value: 1, label: "1 — Raramente", description: "Menos de uma vez por mês." },
  { value: 2, label: "2 — Às vezes", description: "Menos de uma vez por semana, pelo menos uma vez por mês." },
  { value: 3, label: "3 — Geralmente", description: "Menos de uma vez por dia, pelo menos uma vez por semana." },
  { value: 4, label: "4 — Sempre", description: "Pelo menos uma vez por dia." },
];
const ITEMS_PT_PT = ["Incontinência para fezes sólidas", "Incontinência para fezes líquidas", "Incontinência para gases", "Uso de penso", "Alteração do estilo de vida devido à incontinência"];
const interpretationPtPt = [
  { label: "Continência perfeita", description: "Sem episódios de incontinência." },
  { label: "Incontinência ligeira", description: "Episódios infrequentes e ligeiros de incontinência." },
  { label: "Incontinência moderada", description: "Episódios regulares de incontinência que afetam a vida diária." },
  { label: "Incontinência grave", description: "Episódios frequentes ou incontinência completa." },
];
const calculationExplanationPtPt =
  "A pontuação de Wexner é a soma dos 5 itens — incontinência para fezes sólidas, líquidas e gases, uso de penso e alteração do estilo de vida — cada um pontuado de 0 (nunca) a 4 (sempre), para um total em 20. 0 reflete continência perfeita e 20 reflete incontinência completa.";

const RUBRIC_PT_BR = [
  { value: 0, label: "0 — Nunca" },
  { value: 1, label: "1 — Raramente", description: "Menos de uma vez por mês." },
  { value: 2, label: "2 — Às vezes", description: "Menos de uma vez por semana, pelo menos uma vez por mês." },
  { value: 3, label: "3 — Geralmente", description: "Menos de uma vez por dia, pelo menos uma vez por semana." },
  { value: 4, label: "4 — Sempre", description: "Pelo menos uma vez por dia." },
];
const ITEMS_PT_BR = ["Incontinência para fezes sólidas", "Incontinência para fezes líquidas", "Incontinência para gases", "Uso de fralda ou absorvente", "Alteração do estilo de vida devido à incontinência"];
const interpretationPtBr = [
  { label: "Continência perfeita", description: "Sem episódios de incontinência." },
  { label: "Incontinência leve", description: "Episódios infrequentes e leves de incontinência." },
  { label: "Incontinência moderada", description: "Episódios regulares de incontinência que afetam a vida diária." },
  { label: "Incontinência grave", description: "Episódios frequentes ou incontinência completa." },
];
const calculationExplanationPtBr =
  "A pontuação de Wexner é a soma dos 5 itens — incontinência para fezes sólidas, líquidas e gases, uso de fralda ou absorvente e alteração do estilo de vida — cada um pontuado de 0 (nunca) a 4 (sempre), para um total em 20. 0 reflete continência perfeita e 20 reflete incontinência completa.";

const RUBRIC_ES = [
  { value: 0, label: "0 — Nunca" },
  { value: 1, label: "1 — Raramente", description: "Menos de una vez al mes." },
  { value: 2, label: "2 — A veces", description: "Menos de una vez a la semana, al menos una vez al mes." },
  { value: 3, label: "3 — Generalmente", description: "Menos de una vez al día, al menos una vez a la semana." },
  { value: 4, label: "4 — Siempre", description: "Al menos una vez al día." },
];
const ITEMS_ES = ["Incontinencia a heces sólidas", "Incontinencia a heces líquidas", "Incontinencia a gases", "Uso de compresa o pañal", "Alteración del estilo de vida por la incontinencia"];
const interpretationEs = [
  { label: "Continencia perfecta", description: "Sin episodios de incontinencia." },
  { label: "Incontinencia leve", description: "Episodios infrecuentes y leves de incontinencia." },
  { label: "Incontinencia moderada", description: "Episodios regulares de incontinencia que afectan la vida diaria." },
  { label: "Incontinencia grave", description: "Episodios frecuentes o incontinencia completa." },
];
const calculationExplanationEs =
  "La puntuación de Wexner es la suma de los 5 ítems — incontinencia a heces sólidas, líquidas y gases, uso de compresa y alteración del estilo de vida — cada uno puntuado de 0 (nunca) a 4 (siempre), para un total sobre 20. 0 refleja continencia perfecta y 20 refleja incontinencia completa.";

const translations = [
  {
    locale: "pt-pt",
    name: "Pontuação de Wexner",
    description: "Mede a gravidade e a frequência da incontinência fecal em 5 itens, produzindo uma pontuação em 20 (0 = continência perfeita).",
    definition: buildTranslated(ITEMS_PT_PT, RUBRIC_PT_PT, calculationExplanationPtPt, interpretationPtPt),
  },
  {
    locale: "pt-br",
    name: "Escore de Wexner",
    description: "Mede a gravidade e a frequência da incontinência fecal em 5 itens, gerando uma pontuação em 20 (0 = continência perfeita).",
    definition: buildTranslated(ITEMS_PT_BR, RUBRIC_PT_BR, calculationExplanationPtBr, interpretationPtBr),
  },
  {
    locale: "es",
    name: "Puntuación de Wexner",
    description: "Mide la gravedad y la frecuencia de la incontinencia fecal en 5 ítems, generando una puntuación sobre 20 (0 = continencia perfecta).",
    definition: buildTranslated(ITEMS_ES, RUBRIC_ES, calculationExplanationEs, interpretationEs),
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

console.log("Wexner Score seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
