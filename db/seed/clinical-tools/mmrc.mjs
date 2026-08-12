// Modified Medical Research Council Dyspnea Scale (mMRC) — first
// calculator in a new "Respiratory Rehabilitation" category.
// Single-select ordinal scale (one item, pick exactly one of 5
// grades, the result *is* that grade) — same pattern as Modified
// Rankin / House-Brackmann / Modified Ashworth / Penn Spasm Frequency.
// descendingGood: true (0 = only breathless with strenuous exercise =
// best, 4 = too breathless to leave the house = worst).
//
// A classic, freely-reproduced academic instrument (Fletcher et al.,
// 1959; modified by Mahler & Wells, 1988) — no proprietary flag set.
//
// Usage: node db/seed/clinical-tools/mmrc.mjs
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

const GRADES_EN = [
  { value: 0, label: "0 — Strenuous exercise only", description: "I only get breathless with strenuous exercise." },
  { value: 1, label: "1 — Hurrying or slight hill", description: "I get short of breath when hurrying on level ground or walking up a slight hill." },
  { value: 2, label: "2 — Slower than peers", description: "I walk slower than people of the same age on level ground because of breathlessness, or have to stop for breath when walking at my own pace on the level." },
  { value: 3, label: "3 — Stop after ~100 m", description: "I stop for breath after walking about 100 metres, or after a few minutes, on level ground." },
  { value: 4, label: "4 — Too breathless to leave the house", description: "I am too breathless to leave the house, or I am breathless when dressing or undressing." },
];
const SEVERITIES = ["good", "good", "warning", "serious", "critical"];

function buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return {
    items: [
      {
        id: "mmrc",
        label: itemLabel,
        instructions: itemInstructions,
        options: grades.map((g) => ({ value: g.value, label: g.label, description: g.description })),
      },
    ],
    scoring: { method: "sum" },
    maxScore: 4,
    descendingGood: true,
    interpretation: grades.map((g, i) => ({
      min: g.value,
      max: g.value,
      label: g.label,
      description: g.description,
      severity: SEVERITIES[i],
    })),
    calculationExplanation,
    source: {
      citation: "Mahler DA, Wells CK. Evaluation of clinical methods for rating dyspnea. Chest. 1988;93(3):580-586.",
      url: "https://www.sralab.org/rehabilitation-measures/modified-medical-research-council-mmrc-dyspnea-scale",
    },
  };
}

const calculationExplanationEn =
  "The mMRC grade is the single grade — from 0 (breathless only with strenuous exercise) to 4 (too breathless to leave the house) — that best matches the level of activity that provokes the patient's breathlessness. Unlike scales that sum multiple item scores, mMRC is one global grade.";

const definitionEn = buildDefinition(
  "Breathlessness grade",
  "Select the single grade that best reflects the patient's usual level of breathlessness during activity.",
  GRADES_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Modified Medical Research Council Dyspnea Scale",
  abbreviation: "mMRC",
  description: "Grades breathlessness on a single 0–4 scale, based on the level of activity that provokes shortness of breath.",
  population: "Adults with chronic respiratory disease, most often COPD",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definition),
  status: "published",
  position: 0,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "mmrc", {
  slug: "mmrc",
  ...calculatorFields(definitionEn),
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
    "Modified Medical Research Council Dyspnea Scale",
    "mMRC",
    "Grades breathlessness on a single 0–4 scale, based on the level of activity that provokes shortness of breath.",
    "Adults with chronic respiratory disease, most often COPD",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    0,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation);
}

const GRADES_PT_PT = [
  { value: 0, label: "0 — Apenas com exercício extenuante", description: "Só fico com falta de ar com exercício extenuante." },
  { value: 1, label: "1 — Ao apressar-me ou numa ligeira subida", description: "Fico com falta de ar quando me apresso em terreno plano ou subo uma ligeira encosta." },
  { value: 2, label: "2 — Mais lento do que pessoas da mesma idade", description: "Ando mais devagar do que pessoas da minha idade em terreno plano por causa da falta de ar, ou tenho de parar para respirar quando ando ao meu próprio ritmo em terreno plano." },
  { value: 3, label: "3 — Paro após cerca de 100 m", description: "Paro para respirar depois de andar cerca de 100 metros, ou após alguns minutos, em terreno plano." },
  { value: 4, label: "4 — Demasiada falta de ar para sair de casa", description: "Tenho demasiada falta de ar para sair de casa, ou fico com falta de ar ao vestir-me ou despir-me." },
];
const calculationExplanationPtPt =
  "O grau mMRC é o grau único — de 0 (falta de ar apenas com exercício extenuante) a 4 (demasiada falta de ar para sair de casa) — que melhor corresponde ao nível de atividade que provoca a falta de ar do doente. Ao contrário de escalas que somam vários itens, a mMRC é um único grau global.";

const GRADES_PT_BR = [
  { value: 0, label: "0 — Apenas com exercício extenuante", description: "Só fico com falta de ar com exercício extenuante." },
  { value: 1, label: "1 — Ao me apressar ou em uma leve subida", description: "Fico com falta de ar quando me apresso em terreno plano ou subo uma leve ladeira." },
  { value: 2, label: "2 — Mais devagar do que pessoas da mesma idade", description: "Ando mais devagar do que pessoas da minha idade em terreno plano por causa da falta de ar, ou preciso parar para respirar quando ando no meu próprio ritmo em terreno plano." },
  { value: 3, label: "3 — Paro após cerca de 100 m", description: "Paro para respirar depois de andar cerca de 100 metros, ou após alguns minutos, em terreno plano." },
  { value: 4, label: "4 — Falta de ar demais para sair de casa", description: "Tenho falta de ar demais para sair de casa, ou fico com falta de ar ao me vestir ou despir." },
];
const calculationExplanationPtBr =
  "O grau mMRC é o grau único — de 0 (falta de ar apenas com exercício extenuante) a 4 (falta de ar demais para sair de casa) — que melhor corresponde ao nível de atividade que provoca a falta de ar do paciente. Diferente de escalas que somam vários itens, a mMRC é um único grau global.";

const GRADES_ES = [
  { value: 0, label: "0 — Solo con ejercicio extenuante", description: "Solo me falta el aire con ejercicio extenuante." },
  { value: 1, label: "1 — Al apurarme o en una ligera cuesta", description: "Me falta el aire cuando me apuro en terreno llano o subo una ligera cuesta." },
  { value: 2, label: "2 — Más lento que personas de la misma edad", description: "Camino más despacio que personas de mi edad en terreno llano por la falta de aire, o tengo que parar para respirar cuando camino a mi propio ritmo en terreno llano." },
  { value: 3, label: "3 — Me detengo tras unos 100 m", description: "Me detengo para respirar después de caminar unos 100 metros, o tras unos minutos, en terreno llano." },
  { value: 4, label: "4 — Demasiada falta de aire para salir de casa", description: "Tengo demasiada falta de aire para salir de casa, o me falta el aire al vestirme o desvestirme." },
];
const calculationExplanationEs =
  "El grado mMRC es el grado único — de 0 (falta de aire solo con ejercicio extenuante) a 4 (demasiada falta de aire para salir de casa) — que mejor corresponde al nivel de actividad que provoca la falta de aire del paciente. A diferencia de las escalas que suman varios ítems, el mMRC es un único grado global.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Dispneia mMRC",
    description: "Classifica a falta de ar numa única escala de 0 a 4, com base no nível de atividade que a provoca.",
    definition: translateDefinition(
      "Grau de falta de ar",
      "Selecione o grau único que melhor reflete o nível habitual de falta de ar do doente durante a atividade.",
      GRADES_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Dispneia mMRC",
    description: "Classifica a falta de ar em uma única escala de 0 a 4, com base no nível de atividade que a provoca.",
    definition: translateDefinition(
      "Grau de falta de ar",
      "Selecione o grau único que melhor reflete o nível habitual de falta de ar do paciente durante a atividade.",
      GRADES_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Disnea mMRC",
    description: "Clasifica la falta de aire en una única escala de 0 a 4, según el nivel de actividad que la provoca.",
    definition: translateDefinition(
      "Grado de falta de aire",
      "Seleccione el grado único que mejor refleje el nivel habitual de falta de aire del paciente durante la actividad.",
      GRADES_ES,
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

console.log("mMRC seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
