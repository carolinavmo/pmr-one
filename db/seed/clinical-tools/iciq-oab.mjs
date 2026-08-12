// ICIQ-OAB (Overactive Bladder module) — third calculator in "Pelvic
// Floor Rehabilitation". 4 symptom items (daytime frequency, nocturia,
// urgency, urgency incontinence), per-item differing options, sum-
// scored, max 16, descendingGood: true. The official instrument also
// pairs each symptom with its own 0-10 "bother" VAS, reported
// separately per symptom rather than folded into the symptom total —
// not represented here since the engine models a single combined
// score.
//
// A real copyrighted, trademarked instrument (Copyright © ICIQ Group)
// requiring registration via iciq.net for official reproduction — item
// wording here is paraphrased in this app's own words, not copied
// verbatim, same non-verbatim convention as DASH/FIM/ICIQ-UI SF.
// proprietary: true for the "non-official calculator" notice.
//
// Usage: node db/seed/clinical-tools/iciq-oab.mjs
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

const FREQUENCY_EN = [
  { value: 0, label: "1 to 6 times" },
  { value: 1, label: "7 to 8 times" },
  { value: 2, label: "9 to 10 times" },
  { value: 3, label: "11 to 12 times" },
  { value: 4, label: "13 or more times" },
];
const NOCTURIA_EN = [
  { value: 0, label: "None" },
  { value: 1, label: "Once" },
  { value: 2, label: "Twice" },
  { value: 3, label: "Three times" },
  { value: 4, label: "Four or more times" },
];
const FREQUENCY_SCALE_EN = [
  { value: 0, label: "Never" },
  { value: 1, label: "Occasionally" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "Most of the time" },
  { value: 4, label: "All of the time" },
];

const definitionEn = {
  items: [
    { id: "daytime_frequency", label: "How many times do you pass urine during the day?", options: FREQUENCY_EN },
    { id: "nocturia", label: "How many times do you get up at night to pass urine?", options: NOCTURIA_EN },
    { id: "urgency", label: "Do you have to rush to the toilet to pass urine?", options: FREQUENCY_SCALE_EN },
    { id: "urgency_incontinence", label: "Does urine leak before you can get to the toilet?", options: FREQUENCY_SCALE_EN },
  ],
  scoring: { method: "sum" },
  maxScore: 16,
  descendingGood: true,
  calculationExplanation:
    "The ICIQ-OAB symptom score is the sum of the 4 items — daytime frequency, nocturia, urgency, and urgency incontinence — each rated 0 to 4, for a total out of 16. The official instrument also pairs each symptom with its own 0-10 bother rating, recorded separately by the clinician and not included in this total.",
  source: {
    citation: "Abrams P, Avery K, Gardener N, Donovan J; ICIQ Advisory Board. The International Consultation on Incontinence Modular Questionnaire: www.iciq.net. J Urol. 2006;175(3 Pt 1):1063-1066.",
    url: "https://iciq.net",
  },
  proprietary: true,
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "iciq-oab", {
  slug: "iciq-oab",
  category_id: categoryId,
  name: "ICIQ-Overactive Bladder Module",
  abbreviation: "ICIQ-OAB",
  description: "Measures the frequency of daytime voiding, nocturia, urgency, and urgency incontinence across 4 items, producing a symptom score out of 16.",
  population: "Adults with overactive bladder symptoms",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 2,
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
    "ICIQ-Overactive Bladder Module",
    "ICIQ-OAB",
    "Measures the frequency of daytime voiding, nocturia, urgency, and urgency incontinence across 4 items, producing a symptom score out of 16.",
    "Adults with overactive bladder symptoms",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    2,
  ]
);

// ---------- Translations ----------

function buildTranslated(itemLabels, frequency, nocturia, frequencyScale, calculationExplanation) {
  return {
    items: [
      { id: "daytime_frequency", label: itemLabels[0], options: frequency },
      { id: "nocturia", label: itemLabels[1], options: nocturia },
      { id: "urgency", label: itemLabels[2], options: frequencyScale },
      { id: "urgency_incontinence", label: itemLabels[3], options: frequencyScale },
    ],
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    descendingGood: true,
    calculationExplanation,
    source: definitionEn.source,
    proprietary: true,
  };
}

const FREQUENCY_PT_PT = [
  { value: 0, label: "1 a 6 vezes" },
  { value: 1, label: "7 a 8 vezes" },
  { value: 2, label: "9 a 10 vezes" },
  { value: 3, label: "11 a 12 vezes" },
  { value: 4, label: "13 ou mais vezes" },
];
const NOCTURIA_PT_PT = [
  { value: 0, label: "Nenhuma" },
  { value: 1, label: "Uma vez" },
  { value: 2, label: "Duas vezes" },
  { value: 3, label: "Três vezes" },
  { value: 4, label: "Quatro ou mais vezes" },
];
const FREQUENCY_SCALE_PT_PT = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Ocasionalmente" },
  { value: 2, label: "Às vezes" },
  { value: 3, label: "Na maior parte do tempo" },
  { value: 4, label: "Sempre" },
];
const ITEMS_PT_PT = [
  "Quantas vezes urina durante o dia?",
  "Quantas vezes se levanta durante a noite para urinar?",
  "Tem de se apressar para chegar à casa de banho para urinar?",
  "Perde urina antes de conseguir chegar à casa de banho?",
];
const calculationExplanationPtPt =
  "A pontuação de sintomas ICIQ-OAB é a soma dos 4 itens — frequência diurna, noctúria, urgência e incontinência de urgência — cada um pontuado de 0 a 4, para um total em 16. O instrumento oficial também associa a cada sintoma a sua própria classificação de incómodo de 0 a 10, registada separadamente pelo clínico e não incluída neste total.";

const ITEMS_PT_BR = [
  "Quantas vezes você urina durante o dia?",
  "Quantas vezes você se levanta durante a noite para urinar?",
  "Você precisa se apressar para chegar ao banheiro para urinar?",
  "Você perde urina antes de conseguir chegar ao banheiro?",
];
const calculationExplanationPtBr =
  "A pontuação de sintomas ICIQ-OAB é a soma dos 4 itens — frequência diurna, noctúria, urgência e incontinência de urgência — cada um pontuado de 0 a 4, para um total em 16. O instrumento oficial também associa a cada sintoma sua própria classificação de incômodo de 0 a 10, registrada separadamente pelo clínico e não incluída neste total.";

const FREQUENCY_ES = [
  { value: 0, label: "1 a 6 veces" },
  { value: 1, label: "7 a 8 veces" },
  { value: 2, label: "9 a 10 veces" },
  { value: 3, label: "11 a 12 veces" },
  { value: 4, label: "13 o más veces" },
];
const NOCTURIA_ES = [
  { value: 0, label: "Ninguna" },
  { value: 1, label: "Una vez" },
  { value: 2, label: "Dos veces" },
  { value: 3, label: "Tres veces" },
  { value: 4, label: "Cuatro o más veces" },
];
const FREQUENCY_SCALE_ES = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Ocasionalmente" },
  { value: 2, label: "A veces" },
  { value: 3, label: "La mayor parte del tiempo" },
  { value: 4, label: "Todo el tiempo" },
];
const ITEMS_ES = [
  "¿Cuántas veces orina durante el día?",
  "¿Cuántas veces se levanta por la noche para orinar?",
  "¿Tiene que apresurarse para llegar al baño a orinar?",
  "¿Se le escapa la orina antes de poder llegar al baño?",
];
const calculationExplanationEs =
  "La puntuación de síntomas ICIQ-OAB es la suma de los 4 ítems — frecuencia diurna, nocturia, urgencia e incontinencia de urgencia — cada uno puntuado de 0 a 4, para un total sobre 16. El instrumento oficial también asocia a cada síntoma su propia calificación de molestia de 0 a 10, registrada por separado por el clínico y no incluida en este total.";

const translations = [
  {
    locale: "pt-pt",
    name: "Módulo de Bexiga Hiperativa ICIQ",
    description: "Mede a frequência de micção diurna, noctúria, urgência e incontinência de urgência em 4 itens, produzindo uma pontuação de sintomas em 16.",
    definition: buildTranslated(ITEMS_PT_PT, FREQUENCY_PT_PT, NOCTURIA_PT_PT, FREQUENCY_SCALE_PT_PT, calculationExplanationPtPt),
  },
  {
    locale: "pt-br",
    name: "Módulo de Bexiga Hiperativa ICIQ",
    description: "Mede a frequência de micção diurna, noctúria, urgência e incontinência de urgência em 4 itens, gerando uma pontuação de sintomas em 16.",
    definition: buildTranslated(ITEMS_PT_BR, FREQUENCY_PT_PT, NOCTURIA_PT_PT, FREQUENCY_SCALE_PT_PT, calculationExplanationPtBr),
  },
  {
    locale: "es",
    name: "Módulo de Vejiga Hiperactiva ICIQ",
    description: "Mide la frecuencia de la micción diurna, nocturia, urgencia e incontinencia de urgencia en 4 ítems, generando una puntuación de síntomas sobre 16.",
    definition: buildTranslated(ITEMS_ES, FREQUENCY_ES, NOCTURIA_ES, FREQUENCY_SCALE_ES, calculationExplanationEs),
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

console.log("ICIQ-OAB seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
