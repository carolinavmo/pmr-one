// Modified Rankin Scale (mRS) — sixth Clinical Tools calculator, same
// "Independence" category as Barthel/Katz/Lawton-Brody/FIM. Structurally
// this is the "single-select ordinal" pattern flagged in the original
// engine design (modified Rankin, House-Brackmann, etc.): one item,
// pick exactly one of 7 options, the result *is* that option — no
// separate scoring method needed, `sum` over one item works unchanged.
//
// The first calculator to set descendingGood: true — mRS runs from 0
// (no symptoms, best) to 6 (dead, worst), the opposite orientation of
// every ascending-good scale so far. CalculatorRunner's per-item bar
// and resultNote gradient both read this flag so "low" still renders
// green instead of red. interpretation bands are unaffected by
// ascending/descending — each band's severity is authored explicitly
// below, independent of value order.
//
// Usage: node db/seed/clinical-tools/modified-rankin-scale.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "independence", {
  slug: "independence",
  name: "Independence",
  color: "teal",
  position: 0,
});

// ---------- Definition (English source) ----------

// Same 7 grades used for both the item's answer options (shown while
// filling out the calculator) and the interpretation bands (shown in
// the result). Kept as separate arrays — matching every other
// calculator's items/interpretation split — even though the text
// overlaps, since the two serve different moments in the UI.
const GRADES_EN = [
  { value: 0, label: "No symptoms", description: "No symptoms at all." },
  { value: 1, label: "No significant disability", description: "No significant disability despite symptoms; able to carry out all usual duties and activities." },
  { value: 2, label: "Slight disability", description: "Unable to carry out all previous activities, but able to look after own affairs without assistance." },
  { value: 3, label: "Moderate disability", description: "Requires some help, but able to walk without assistance." },
  { value: 4, label: "Moderately severe disability", description: "Unable to walk without assistance and unable to attend to own bodily needs without assistance." },
  { value: 5, label: "Severe disability", description: "Bedridden, incontinent, and requires constant nursing care and attention." },
  { value: 6, label: "Dead", description: "The patient has died." },
];
const SEVERITIES = ["good", "good", "warning", "warning", "serious", "serious", "critical"];

function buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return {
    items: [
      {
        id: "mrs",
        label: itemLabel,
        instructions: itemInstructions,
        options: grades.map((g) => ({ value: g.value, label: g.label, description: g.description })),
      },
    ],
    scoring: { method: "sum" },
    maxScore: 6,
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
      citation: "van Swieten JC, Koudstaal PJ, Visser MC, Schouten HJ, van Gijn J. Interobserver agreement for the assessment of handicap in stroke patients. Stroke. 1988;19(5):604-607.",
      url: "https://www.sralab.org/rehabilitation-measures/modified-rankin-handicap-scale",
    },
  };
}

const calculationExplanationEn =
  "The modified Rankin Scale (mRS) score is the single grade — from 0 (no symptoms) to 6 (dead) — that best matches the patient's overall level of disability. Unlike scales that sum multiple item scores, the mRS is one global clinical judgment based on the patient's mobility, ability to manage self-care, and need for assistance from others.";

const definitionEn = buildDefinition(
  "Overall level of disability",
  "Select the single grade that best reflects the patient's current overall functional status, considering mobility, self-care, and the level of assistance required.",
  GRADES_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Modified Rankin Scale",
  abbreviation: "mRS",
  description: "Rates overall disability and dependence in daily activities on a single 0–6 scale, most often used to assess functional outcome after stroke.",
  population: "Adults with stroke or other acute neurological disability",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definition),
  status: "published",
  position: 4,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "modified-rankin-scale", {
  slug: "modified-rankin-scale",
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
    "Modified Rankin Scale",
    "mRS",
    "Rates overall disability and dependence in daily activities on a single 0–6 scale, most often used to assess functional outcome after stroke.",
    "Adults with stroke or other acute neurological disability",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    4,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation);
}

const GRADES_PT_PT = [
  { value: 0, label: "Sem sintomas", description: "Sem quaisquer sintomas." },
  { value: 1, label: "Sem incapacidade significativa", description: "Sem incapacidade significativa apesar dos sintomas; capaz de realizar todas as atividades e deveres habituais." },
  { value: 2, label: "Incapacidade ligeira", description: "Incapaz de realizar todas as atividades anteriores, mas capaz de cuidar dos seus próprios assuntos sem assistência." },
  { value: 3, label: "Incapacidade moderada", description: "Necessita de alguma ajuda, mas é capaz de andar sem assistência." },
  { value: 4, label: "Incapacidade moderadamente grave", description: "Incapaz de andar sem assistência e incapaz de cuidar das suas necessidades corporais sem assistência." },
  { value: 5, label: "Incapacidade grave", description: "Acamado, incontinente e a necessitar de cuidados de enfermagem e atenção constantes." },
  { value: 6, label: "Óbito", description: "O doente faleceu." },
];
const calculationExplanationPtPt =
  "A pontuação da Escala de Rankin modificada (mRS) corresponde ao grau único — de 0 (sem sintomas) a 6 (óbito) — que melhor descreve o nível global de incapacidade do doente. Ao contrário de escalas que somam vários itens, a mRS é um único julgamento clínico global baseado na mobilidade, na capacidade de autocuidado e na necessidade de assistência de terceiros.";

const GRADES_PT_BR = [
  { value: 0, label: "Sem sintomas", description: "Sem nenhum sintoma." },
  { value: 1, label: "Sem incapacidade significativa", description: "Sem incapacidade significativa apesar dos sintomas; capaz de realizar todas as atividades e deveres habituais." },
  { value: 2, label: "Incapacidade leve", description: "Incapaz de realizar todas as atividades anteriores, mas capaz de cuidar dos próprios assuntos sem assistência." },
  { value: 3, label: "Incapacidade moderada", description: "Necessita de alguma ajuda, mas é capaz de andar sem assistência." },
  { value: 4, label: "Incapacidade moderadamente grave", description: "Incapaz de andar sem assistência e incapaz de cuidar das próprias necessidades corporais sem assistência." },
  { value: 5, label: "Incapacidade grave", description: "Acamado, incontinente e necessitando de cuidados de enfermagem e atenção constantes." },
  { value: 6, label: "Óbito", description: "O paciente faleceu." },
];
const calculationExplanationPtBr =
  "A pontuação da Escala de Rankin modificada (mRS) corresponde ao grau único — de 0 (sem sintomas) a 6 (óbito) — que melhor descreve o nível global de incapacidade do paciente. Diferente de escalas que somam vários itens, a mRS é um único julgamento clínico global baseado na mobilidade, na capacidade de autocuidado e na necessidade de assistência de terceiros.";

const GRADES_ES = [
  { value: 0, label: "Sin síntomas", description: "Sin ningún síntoma." },
  { value: 1, label: "Sin discapacidad significativa", description: "Sin discapacidad significativa a pesar de los síntomas; capaz de realizar todas las actividades y deberes habituales." },
  { value: 2, label: "Discapacidad leve", description: "Incapaz de realizar todas las actividades previas, pero capaz de ocuparse de sus propios asuntos sin asistencia." },
  { value: 3, label: "Discapacidad moderada", description: "Necesita algo de ayuda, pero es capaz de caminar sin asistencia." },
  { value: 4, label: "Discapacidad moderadamente grave", description: "Incapaz de caminar sin asistencia e incapaz de atender sus propias necesidades corporales sin asistencia." },
  { value: 5, label: "Discapacidad grave", description: "Postrado en cama, incontinente y que requiere cuidados de enfermería y atención constantes." },
  { value: 6, label: "Fallecido", description: "El paciente ha fallecido." },
];
const calculationExplanationEs =
  "La puntuación de la Escala de Rankin modificada (mRS) corresponde al grado único — de 0 (sin síntomas) a 6 (fallecido) — que mejor describe el nivel global de discapacidad del paciente. A diferencia de las escalas que suman varios ítems, la mRS es un único juicio clínico global basado en la movilidad, la capacidad de autocuidado y la necesidad de asistencia de terceros.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Rankin Modificada",
    description: "Classifica a incapacidade e a dependência globais nas atividades diárias numa única escala de 0 a 6, usada sobretudo para avaliar o resultado funcional após um AVC.",
    definition: translateDefinition(
      "Grau global de incapacidade",
      "Selecione o grau único que melhor reflete o estado funcional atual do doente, considerando a mobilidade, os cuidados pessoais e o nível de assistência necessário.",
      GRADES_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Rankin Modificada",
    description: "Classifica a incapacidade e a dependência globais nas atividades diárias em uma única escala de 0 a 6, usada principalmente para avaliar o resultado funcional após um AVC.",
    definition: translateDefinition(
      "Grau global de incapacidade",
      "Selecione o grau único que melhor reflete o estado funcional atual do paciente, considerando a mobilidade, os cuidados pessoais e o nível de assistência necessário.",
      GRADES_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Rankin Modificada",
    description: "Clasifica la discapacidad y la dependencia globales en las actividades diarias en una única escala de 0 a 6, utilizada sobre todo para evaluar el resultado funcional tras un ictus.",
    definition: translateDefinition(
      "Grado global de discapacidad",
      "Seleccione el grado único que mejor refleje el estado funcional actual del paciente, considerando la movilidad, el autocuidado y el nivel de asistencia necesario.",
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

console.log("Modified Rankin Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
