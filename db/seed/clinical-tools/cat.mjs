// COPD Assessment Test (CAT) — second calculator in "Respiratory
// Rehabilitation". 8 items, each a bipolar 0-5 semantic-differential
// rating (shared rubric across all 8, only the two anchor statements
// change per item) — same "one shared rubric, item wording changes"
// shape as FIM/DASH. Sum-scored, max 40, descendingGood: true (0 =
// best on every item).
//
// A real trademarked, copyrighted instrument (developed by GSK) — item
// wording here is paraphrased in this app's own words, not copied
// verbatim from the official questionnaire, same non-verbatim
// convention as DASH/FIM/KOOS. proprietary: true for the "non-official
// calculator" notice.
//
// Usage: node db/seed/clinical-tools/cat.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "respiratory-rehabilitation", {
  slug: "respiratory-rehabilitation",
  name: "Respiratory Rehabilitation",
  color: "cyan",
  position: 8,
});

// Shared 0-5 rubric — the anchor labels are generic here; each item's
// `instructions` field carries the item-specific low/high anchors
// (e.g. "0 = I never cough, 5 = I cough all the time"), since the two
// endpoints differ per item but the numeric scale itself doesn't.
const RUBRIC_EN = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
];

const ITEMS_EN = [
  { id: "cough", label: "Cough", instructions: "0 = I never cough. 5 = I cough all the time." },
  { id: "phlegm", label: "Phlegm (mucus) in chest", instructions: "0 = I have no phlegm in my chest at all. 5 = My chest is completely full of phlegm." },
  { id: "chest_tightness", label: "Chest tightness", instructions: "0 = My chest does not feel tight at all. 5 = My chest feels very tight." },
  { id: "breathlessness_stairs", label: "Breathlessness going up a hill or flight of stairs", instructions: "0 = When I walk up a hill or a flight of stairs I am not breathless. 5 = When I walk up a hill or a flight of stairs I am very breathless." },
  { id: "home_activities", label: "Activity limitation at home", instructions: "0 = I am not limited doing any activities at home. 5 = I am very limited doing activities at home." },
  { id: "confidence_leaving_home", label: "Confidence leaving home", instructions: "0 = I am confident leaving my home despite my lung condition. 5 = I am not at all confident leaving my home because of my lung condition." },
  { id: "sleep", label: "Sleep", instructions: "0 = I sleep soundly. 5 = I don't sleep soundly because of my lung condition." },
  { id: "energy", label: "Energy", instructions: "0 = I have lots of energy. 5 = I have no energy at all." },
];

const definitionEn = {
  items: ITEMS_EN.map((item) => ({ id: item.id, label: item.label, instructions: item.instructions, options: RUBRIC_EN })),
  scoring: { method: "sum" },
  maxScore: 40,
  descendingGood: true,
  interpretation: [
    { min: 0, max: 10, label: "Low impact", description: "The COPD has a low impact on the patient's life.", severity: "good" },
    { min: 11, max: 20, label: "Medium impact", description: "The COPD has a medium impact on the patient's life.", severity: "warning" },
    { min: 21, max: 30, label: "High impact", description: "The COPD has a high impact on the patient's life.", severity: "serious" },
    { min: 31, max: 40, label: "Very high impact", description: "The COPD has a very high impact on the patient's life.", severity: "critical" },
  ],
  calculationExplanation:
    "The CAT score is the sum of the 8 items, each rated 0 to 5 along its own pair of statements (e.g. cough, phlegm, chest tightness, breathlessness, activity limitation, confidence, sleep, and energy), for a total out of 40. All 8 items must be answered.",
  source: {
    citation: "Jones PW, Harding G, Berry P, Wiklund I, Chen WH, Kline Leidy N. Development and first validation of the COPD Assessment Test. Eur Respir J. 2009;34(3):648-654.",
    url: "https://www.catestonline.org/",
  },
  proprietary: true,
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "cat", {
  slug: "cat",
  category_id: categoryId,
  name: "COPD Assessment Test",
  abbreviation: "CAT",
  description: "Measures the impact of COPD on daily life across 8 items — cough, phlegm, chest tightness, breathlessness, activity, confidence, sleep, and energy — producing a score out of 40.",
  population: "Adults with COPD",
  estimated_minutes_min: 2,
  estimated_minutes_max: 4,
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
    "COPD Assessment Test",
    "CAT",
    "Measures the impact of COPD on daily life across 8 items — cough, phlegm, chest tightness, breathlessness, activity, confidence, sleep, and energy — producing a score out of 40.",
    "Adults with COPD",
    2,
    4,
    JSON.stringify(definitionEn),
    "published",
    1,
  ]
);

// ---------- Translations ----------

function buildTranslated(itemLabels, calculationExplanation, interpretationLabels) {
  return {
    items: ITEMS_EN.map((item, i) => ({ id: item.id, label: itemLabels[i].label, instructions: itemLabels[i].instructions, options: RUBRIC_EN })),
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    descendingGood: true,
    interpretation: definitionEn.interpretation.map((band, i) => ({ ...band, label: interpretationLabels[i].label, description: interpretationLabels[i].description })),
    calculationExplanation,
    source: definitionEn.source,
    proprietary: true,
  };
}

const ITEMS_PT_PT = [
  { label: "Tosse", instructions: "0 = Nunca tusso. 5 = Tusso o tempo todo." },
  { label: "Expetoração (secreções) no peito", instructions: "0 = Não tenho nenhuma expetoração no peito. 5 = O meu peito está completamente cheio de expetoração." },
  { label: "Aperto no peito", instructions: "0 = Não sinto o peito apertado. 5 = Sinto o peito muito apertado." },
  { label: "Falta de ar ao subir uma encosta ou um lanço de escadas", instructions: "0 = Quando subo uma encosta ou um lanço de escadas não sinto falta de ar. 5 = Quando subo uma encosta ou um lanço de escadas sinto muita falta de ar." },
  { label: "Limitação de atividades em casa", instructions: "0 = Não estou limitado(a) para nenhuma atividade em casa. 5 = Estou muito limitado(a) para atividades em casa." },
  { label: "Confiança para sair de casa", instructions: "0 = Sinto-me confiante para sair de casa apesar da minha doença pulmonar. 5 = Não me sinto nada confiante para sair de casa por causa da minha doença pulmonar." },
  { label: "Sono", instructions: "0 = Durmo profundamente. 5 = Não durmo profundamente por causa da minha doença pulmonar." },
  { label: "Energia", instructions: "0 = Tenho muita energia. 5 = Não tenho nenhuma energia." },
];
const interpretationPtPt = [
  { label: "Impacto baixo", description: "A DPOC tem um impacto baixo na vida do doente." },
  { label: "Impacto médio", description: "A DPOC tem um impacto médio na vida do doente." },
  { label: "Impacto elevado", description: "A DPOC tem um impacto elevado na vida do doente." },
  { label: "Impacto muito elevado", description: "A DPOC tem um impacto muito elevado na vida do doente." },
];
const calculationExplanationPtPt =
  "A pontuação CAT é a soma dos 8 itens, cada um pontuado de 0 a 5 ao longo do seu próprio par de afirmações (por exemplo, tosse, expetoração, aperto no peito, falta de ar, limitação de atividades, confiança, sono e energia), para um total em 40. Todos os 8 itens têm de ser respondidos.";

const ITEMS_PT_BR = [
  { label: "Tosse", instructions: "0 = Nunca tusso. 5 = Tusso o tempo todo." },
  { label: "Catarro (secreção) no peito", instructions: "0 = Não tenho nenhum catarro no peito. 5 = Meu peito está completamente cheio de catarro." },
  { label: "Aperto no peito", instructions: "0 = Não sinto o peito apertado. 5 = Sinto o peito muito apertado." },
  { label: "Falta de ar ao subir uma ladeira ou um lance de escada", instructions: "0 = Quando subo uma ladeira ou um lance de escada não sinto falta de ar. 5 = Quando subo uma ladeira ou um lance de escada sinto muita falta de ar." },
  { label: "Limitação de atividades em casa", instructions: "0 = Não estou limitado(a) para nenhuma atividade em casa. 5 = Estou muito limitado(a) para atividades em casa." },
  { label: "Confiança para sair de casa", instructions: "0 = Sinto-me confiante para sair de casa apesar da minha doença pulmonar. 5 = Não me sinto nada confiante para sair de casa por causa da minha doença pulmonar." },
  { label: "Sono", instructions: "0 = Durmo profundamente. 5 = Não durmo profundamente por causa da minha doença pulmonar." },
  { label: "Energia", instructions: "0 = Tenho muita energia. 5 = Não tenho nenhuma energia." },
];
const interpretationPtBr = [
  { label: "Impacto baixo", description: "A DPOC tem um impacto baixo na vida do paciente." },
  { label: "Impacto médio", description: "A DPOC tem um impacto médio na vida do paciente." },
  { label: "Impacto alto", description: "A DPOC tem um impacto alto na vida do paciente." },
  { label: "Impacto muito alto", description: "A DPOC tem um impacto muito alto na vida do paciente." },
];
const calculationExplanationPtBr =
  "A pontuação CAT é a soma dos 8 itens, cada um pontuado de 0 a 5 ao longo de seu próprio par de afirmações (por exemplo, tosse, catarro, aperto no peito, falta de ar, limitação de atividades, confiança, sono e energia), para um total em 40. Todos os 8 itens precisam ser respondidos.";

const ITEMS_ES = [
  { label: "Tos", instructions: "0 = Nunca toso. 5 = Toso todo el tiempo." },
  { label: "Flema (mucosidad) en el pecho", instructions: "0 = No tengo nada de flema en el pecho. 5 = Mi pecho está completamente lleno de flema." },
  { label: "Opresión en el pecho", instructions: "0 = No siento el pecho nada oprimido. 5 = Siento el pecho muy oprimido." },
  { label: "Falta de aire al subir una cuesta o un tramo de escaleras", instructions: "0 = Cuando subo una cuesta o un tramo de escaleras no me falta el aire. 5 = Cuando subo una cuesta o un tramo de escaleras me falta mucho el aire." },
  { label: "Limitación de actividades en casa", instructions: "0 = No estoy limitado/a para ninguna actividad en casa. 5 = Estoy muy limitado/a para actividades en casa." },
  { label: "Confianza para salir de casa", instructions: "0 = Me siento seguro/a saliendo de casa a pesar de mi enfermedad pulmonar. 5 = No me siento nada seguro/a saliendo de casa por mi enfermedad pulmonar." },
  { label: "Sueño", instructions: "0 = Duermo profundamente. 5 = No duermo profundamente por mi enfermedad pulmonar." },
  { label: "Energía", instructions: "0 = Tengo mucha energía. 5 = No tengo nada de energía." },
];
const interpretationEs = [
  { label: "Impacto bajo", description: "La EPOC tiene un impacto bajo en la vida del paciente." },
  { label: "Impacto medio", description: "La EPOC tiene un impacto medio en la vida del paciente." },
  { label: "Impacto alto", description: "La EPOC tiene un impacto alto en la vida del paciente." },
  { label: "Impacto muy alto", description: "La EPOC tiene un impacto muy alto en la vida del paciente." },
];
const calculationExplanationEs =
  "La puntuación CAT es la suma de los 8 ítems, cada uno puntuado de 0 a 5 a lo largo de su propio par de afirmaciones (por ejemplo, tos, flema, opresión en el pecho, falta de aire, limitación de actividades, confianza, sueño y energía), para un total sobre 40. Los 8 ítems deben responderse.";

const translations = [
  {
    locale: "pt-pt",
    name: "Teste de Avaliação da DPOC",
    description: "Mede o impacto da DPOC na vida diária em 8 itens — tosse, expetoração, aperto no peito, falta de ar, atividade, confiança, sono e energia — produzindo uma pontuação em 40.",
    definition: buildTranslated(ITEMS_PT_PT, calculationExplanationPtPt, interpretationPtPt),
  },
  {
    locale: "pt-br",
    name: "Teste de Avaliação da DPOC",
    description: "Mede o impacto da DPOC na vida diária em 8 itens — tosse, catarro, aperto no peito, falta de ar, atividade, confiança, sono e energia — gerando uma pontuação em 40.",
    definition: buildTranslated(ITEMS_PT_BR, calculationExplanationPtBr, interpretationPtBr),
  },
  {
    locale: "es",
    name: "Prueba de Evaluación de la EPOC",
    description: "Mide el impacto de la EPOC en la vida diaria en 8 ítems — tos, flema, opresión en el pecho, falta de aire, actividad, confianza, sueño y energía — generando una puntuación sobre 40.",
    definition: buildTranslated(ITEMS_ES, calculationExplanationEs, interpretationEs),
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

console.log("CAT seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
