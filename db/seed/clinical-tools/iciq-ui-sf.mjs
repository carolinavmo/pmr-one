// ICIQ-UI SF (International Consultation on Incontinence Questionnaire
// — Urinary Incontinence Short Form) — second calculator in "Pelvic
// Floor Rehabilitation". 3 scored items (frequency, amount, impact),
// per-item differing options (Harris Hip Score-style, no shared
// rubric), sum-scored, max 21, descendingGood: true. The official
// instrument also has an unscored diagnostic item ("when does urine
// leak?"), not represented here since it doesn't contribute to the
// score.
//
// A real copyrighted, trademarked instrument (Copyright © ICIQ Group)
// requiring registration via iciq.net for official reproduction — item
// wording here is paraphrased in this app's own words, not copied
// verbatim, same non-verbatim convention as DASH/FIM/KOOS.
// proprietary: true for the "non-official calculator" notice.
//
// Usage: node db/seed/clinical-tools/iciq-ui-sf.mjs
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
  { value: 0, label: "Never" },
  { value: 1, label: "About once a week or less" },
  { value: 2, label: "Two or three times a week" },
  { value: 3, label: "About once a day" },
  { value: 4, label: "Several times a day" },
  { value: 5, label: "All the time" },
];
const AMOUNT_EN = [
  { value: 0, label: "None" },
  { value: 2, label: "A small amount" },
  { value: 4, label: "A moderate amount" },
  { value: 6, label: "A large amount" },
];
const IMPACT_EN = Array.from({ length: 11 }, (_, i) => ({ value: i, label: String(i) }));

const definitionEn = {
  items: [
    { id: "frequency", label: "How often do you leak urine?", options: FREQUENCY_EN },
    { id: "amount", label: "How much urine do you usually leak (with or without a pad)?", options: AMOUNT_EN },
    { id: "impact", label: "Overall, how much does leaking urine interfere with your everyday life? (0 = not at all, 10 = a great deal)", options: IMPACT_EN, numericScale: true },
  ],
  scoring: { method: "sum" },
  maxScore: 21,
  descendingGood: true,
  calculationExplanation:
    "The ICIQ-UI SF score is the sum of the frequency (0-5), amount (0/2/4/6), and impact (0-10) items, for a total out of 21. The official instrument also includes a diagnostic item about when leakage occurs, which is not scored and isn't included here.",
  source: {
    citation: "Avery K, Donovan J, Peters TJ, Shaw C, Gotoh M, Abrams P. ICIQ: a brief and robust measure for evaluating the symptoms and impact of urinary incontinence. Neurourol Urodyn. 2004;23(4):322-330.",
    url: "https://iciq.net",
  },
  proprietary: true,
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "iciq-ui-sf", {
  slug: "iciq-ui-sf",
  category_id: categoryId,
  name: "ICIQ-UI Short Form",
  abbreviation: "ICIQ-UI SF",
  description: "Measures the frequency, amount, and impact of urinary incontinence across 3 scored items, producing a score out of 21.",
  population: "Adults with urinary incontinence",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 1,
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
    "ICIQ-UI Short Form",
    "ICIQ-UI SF",
    "Measures the frequency, amount, and impact of urinary incontinence across 3 scored items, producing a score out of 21.",
    "Adults with urinary incontinence",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    1,
  ]
);

// ---------- Translations ----------

function buildTranslated(frequency, amount, impactLabel, frequencyLabel, amountLabel, calculationExplanation) {
  return {
    items: [
      { id: "frequency", label: frequencyLabel, options: frequency },
      { id: "amount", label: amountLabel, options: amount },
      { id: "impact", label: impactLabel, options: IMPACT_EN, numericScale: true },
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
  { value: 0, label: "Nunca" },
  { value: 1, label: "Cerca de uma vez por semana ou menos" },
  { value: 2, label: "Duas ou três vezes por semana" },
  { value: 3, label: "Cerca de uma vez por dia" },
  { value: 4, label: "Várias vezes por dia" },
  { value: 5, label: "O tempo todo" },
];
const AMOUNT_PT_PT = [
  { value: 0, label: "Nenhuma" },
  { value: 2, label: "Uma pequena quantidade" },
  { value: 4, label: "Uma quantidade moderada" },
  { value: 6, label: "Uma grande quantidade" },
];
const calculationExplanationPtPt =
  "A pontuação ICIQ-UI SF é a soma dos itens de frequência (0-5), quantidade (0/2/4/6) e impacto (0-10), para um total em 21. O instrumento oficial também inclui um item diagnóstico sobre quando ocorre a perda de urina, que não é pontuado e não está incluído aqui.";

const FREQUENCY_PT_BR = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Cerca de uma vez por semana ou menos" },
  { value: 2, label: "Duas ou três vezes por semana" },
  { value: 3, label: "Cerca de uma vez por dia" },
  { value: 4, label: "Várias vezes por dia" },
  { value: 5, label: "O tempo todo" },
];
const AMOUNT_PT_BR = [
  { value: 0, label: "Nenhuma" },
  { value: 2, label: "Uma pequena quantidade" },
  { value: 4, label: "Uma quantidade moderada" },
  { value: 6, label: "Uma grande quantidade" },
];
const calculationExplanationPtBr =
  "A pontuação ICIQ-UI SF é a soma dos itens de frequência (0-5), quantidade (0/2/4/6) e impacto (0-10), para um total em 21. O instrumento oficial também inclui um item diagnóstico sobre quando ocorre a perda de urina, que não é pontuado e não está incluído aqui.";

const FREQUENCY_ES = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Aproximadamente una vez a la semana o menos" },
  { value: 2, label: "Dos o tres veces a la semana" },
  { value: 3, label: "Aproximadamente una vez al día" },
  { value: 4, label: "Varias veces al día" },
  { value: 5, label: "Todo el tiempo" },
];
const AMOUNT_ES = [
  { value: 0, label: "Ninguna" },
  { value: 2, label: "Una pequeña cantidad" },
  { value: 4, label: "Una cantidad moderada" },
  { value: 6, label: "Una gran cantidad" },
];
const calculationExplanationEs =
  "La puntuación ICIQ-UI SF es la suma de los ítems de frecuencia (0-5), cantidad (0/2/4/6) e impacto (0-10), para un total sobre 21. El instrumento oficial también incluye un ítem diagnóstico sobre cuándo ocurre la pérdida de orina, que no se puntúa y no está incluido aquí.";

const translations = [
  {
    locale: "pt-pt",
    name: "ICIQ-UI Forma Curta",
    description: "Mede a frequência, a quantidade e o impacto da incontinência urinária em 3 itens pontuados, produzindo uma pontuação em 21.",
    definition: buildTranslated(
      FREQUENCY_PT_PT,
      AMOUNT_PT_PT,
      "No geral, quanto é que a perda de urina interfere na sua vida diária? (0 = nada, 10 = muitíssimo)",
      "Com que frequência perde urina?",
      "Que quantidade de urina costuma perder (com ou sem penso)?",
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "ICIQ-UI Forma Curta",
    description: "Mede a frequência, a quantidade e o impacto da incontinência urinária em 3 itens pontuados, gerando uma pontuação em 21.",
    definition: buildTranslated(
      FREQUENCY_PT_BR,
      AMOUNT_PT_BR,
      "No geral, o quanto a perda de urina interfere na sua vida diária? (0 = nada, 10 = muitíssimo)",
      "Com que frequência você perde urina?",
      "Que quantidade de urina você costuma perder (com ou sem absorvente)?",
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "ICIQ-UI Forma Corta",
    description: "Mide la frecuencia, la cantidad y el impacto de la incontinencia urinaria en 3 ítems puntuados, generando una puntuación sobre 21.",
    definition: buildTranslated(
      FREQUENCY_ES,
      AMOUNT_ES,
      "En general, ¿cuánto interfiere la pérdida de orina en su vida diaria? (0 = nada, 10 = muchísimo)",
      "¿Con qué frecuencia pierde orina?",
      "¿Qué cantidad de orina suele perder (con o sin compresa)?",
      calculationExplanationEs
    ),
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

console.log("ICIQ-UI SF seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
