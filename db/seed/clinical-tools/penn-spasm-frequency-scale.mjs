// Penn Spasm Frequency Scale (PSFS) — third calculator in
// "Spasticity", alongside modified-ashworth-scale.mjs and
// tardieu-scale.mjs. Same single-select-ordinal pattern (one item,
// pick exactly one of 5 grades, the result *is* that grade).
// descendingGood: true (0 = no spasms = best, 4 = most frequent =
// worst).
//
// A classic, freely-reproduced academic instrument (Penn et al.,
// 1989) — no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/penn-spasm-frequency-scale.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "spasticity", {
  slug: "spasticity",
  name: "Spasticity",
  color: "purple",
  position: 7,
});

const GRADES_EN = [
  { value: 0, label: "0 — No spasms", description: "No spasms." },
  { value: 1, label: "1 — Mild spasms", description: "Mild spasms induced by stimulation, such as movement or being touched." },
  { value: 2, label: "2 — Infrequent spasms", description: "Infrequent, spontaneous spasms occurring less than once per hour." },
  { value: 3, label: "3 — Frequent spasms", description: "Spasms occurring more than once per hour." },
  { value: 4, label: "4 — Very frequent spasms", description: "Spasms occurring more than 10 times per hour." },
];
const SEVERITIES = ["good", "good", "warning", "serious", "critical"];

function buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return {
    items: [
      {
        id: "psfs",
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
      citation: "Penn RD, Savoy SM, Corcos D, et al. Intrathecal baclofen for severe spinal spasticity. N Engl J Med. 1989;320(23):1517-1521.",
    },
  };
}

const calculationExplanationEn =
  "The Penn Spasm Frequency Scale grade is the single grade — from 0 (no spasms) to 4 (more than 10 spasms per hour) — that best matches how often the patient experiences spasms, based on patient report or observation over the preceding 24 hours.";

const definitionEn = buildDefinition(
  "Spasm frequency",
  "Select the single grade that best reflects how often spasms occur, based on the patient's report over the preceding 24 hours.",
  GRADES_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Penn Spasm Frequency Scale",
  abbreviation: "PSFS",
  description: "Grades how often the patient experiences spasms on a single 0–4 scale, from none to more than 10 per hour.",
  population: "Adults or children with spasticity, most often from spinal cord injury or disease",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definition),
  status: "published",
  position: 2,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "penn-spasm-frequency-scale", {
  slug: "penn-spasm-frequency-scale",
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
    "Penn Spasm Frequency Scale",
    "PSFS",
    "Grades how often the patient experiences spasms on a single 0–4 scale, from none to more than 10 per hour.",
    "Adults or children with spasticity, most often from spinal cord injury or disease",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    2,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation);
}

const GRADES_PT_PT = [
  { value: 0, label: "0 — Sem espasmos", description: "Sem espasmos." },
  { value: 1, label: "1 — Espasmos ligeiros", description: "Espasmos ligeiros induzidos por estimulação, como movimento ou toque." },
  { value: 2, label: "2 — Espasmos infrequentes", description: "Espasmos espontâneos infrequentes, ocorrendo menos de uma vez por hora." },
  { value: 3, label: "3 — Espasmos frequentes", description: "Espasmos ocorrendo mais de uma vez por hora." },
  { value: 4, label: "4 — Espasmos muito frequentes", description: "Espasmos ocorrendo mais de 10 vezes por hora." },
];
const calculationExplanationPtPt =
  "O grau da Escala de Frequência de Espasmos de Penn é o grau único — de 0 (sem espasmos) a 4 (mais de 10 espasmos por hora) — que melhor corresponde à frequência com que o doente experiencia espasmos, com base no relato do doente ou na observação nas 24 horas anteriores.";

const GRADES_PT_BR = [
  { value: 0, label: "0 — Sem espasmos", description: "Sem espasmos." },
  { value: 1, label: "1 — Espasmos leves", description: "Espasmos leves induzidos por estimulação, como movimento ou toque." },
  { value: 2, label: "2 — Espasmos infrequentes", description: "Espasmos espontâneos infrequentes, ocorrendo menos de uma vez por hora." },
  { value: 3, label: "3 — Espasmos frequentes", description: "Espasmos ocorrendo mais de uma vez por hora." },
  { value: 4, label: "4 — Espasmos muito frequentes", description: "Espasmos ocorrendo mais de 10 vezes por hora." },
];
const calculationExplanationPtBr =
  "O grau da Escala de Frequência de Espasmos de Penn é o grau único — de 0 (sem espasmos) a 4 (mais de 10 espasmos por hora) — que melhor corresponde à frequência com que o paciente apresenta espasmos, com base no relato do paciente ou na observação nas 24 horas anteriores.";

const GRADES_ES = [
  { value: 0, label: "0 — Sin espasmos", description: "Sin espasmos." },
  { value: 1, label: "1 — Espasmos leves", description: "Espasmos leves inducidos por estimulación, como movimiento o contacto." },
  { value: 2, label: "2 — Espasmos infrecuentes", description: "Espasmos espontáneos infrecuentes, que ocurren menos de una vez por hora." },
  { value: 3, label: "3 — Espasmos frecuentes", description: "Espasmos que ocurren más de una vez por hora." },
  { value: 4, label: "4 — Espasmos muy frecuentes", description: "Espasmos que ocurren más de 10 veces por hora." },
];
const calculationExplanationEs =
  "El grado de la Escala de Frecuencia de Espasmos de Penn es el grado único — de 0 (sin espasmos) a 4 (más de 10 espasmos por hora) — que mejor corresponde a la frecuencia con la que el paciente experimenta espasmos, según el informe del paciente o la observación en las 24 horas anteriores.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Frequência de Espasmos de Penn",
    description: "Classifica a frequência com que o doente experiencia espasmos numa única escala de 0 a 4, de nenhum a mais de 10 por hora.",
    definition: translateDefinition(
      "Frequência de espasmos",
      "Selecione o grau único que melhor reflete a frequência dos espasmos, com base no relato do doente nas 24 horas anteriores.",
      GRADES_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Frequência de Espasmos de Penn",
    description: "Classifica a frequência com que o paciente apresenta espasmos em uma única escala de 0 a 4, de nenhum a mais de 10 por hora.",
    definition: translateDefinition(
      "Frequência de espasmos",
      "Selecione o grau único que melhor reflete a frequência dos espasmos, com base no relato do paciente nas 24 horas anteriores.",
      GRADES_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Frecuencia de Espasmos de Penn",
    description: "Clasifica la frecuencia con la que el paciente presenta espasmos en una única escala de 0 a 4, desde ninguno hasta más de 10 por hora.",
    definition: translateDefinition(
      "Frecuencia de espasmos",
      "Seleccione el grado único que mejor refleje la frecuencia de los espasmos, según el informe del paciente en las 24 horas anteriores.",
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

console.log("Penn Spasm Frequency Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
