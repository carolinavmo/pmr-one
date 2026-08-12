// Tardieu Scale — second calculator in "Spasticity", alongside
// modified-ashworth-scale.mjs. The full Tardieu assessment is
// velocity-dependent: it records the angle of catch (X) at a fast
// stretch (V3) and the passive range of motion (R2) at a slow stretch
// (V1), both raw goniometric degree measurements that vary per joint
// tested — not a fixed point scale this app's engine can score.
// Scoped here to the one part that IS a fixed grading scale: Quality
// of Muscle Reaction (Y), graded 0-4 at the fast stretch. The
// calculationExplanation says so explicitly, so this is never
// presented as a full replacement for goniometric angle recording.
// Same single-select-ordinal pattern as Modified Ashworth/mRS.
//
// A classic, freely-reproduced academic instrument (Held & Pierrot-
// Deseilligny, 1969; Boyd & Graham, 1999 for the modern clinical
// protocol) — no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/tardieu-scale.mjs
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
  { value: 0, label: "0", description: "No resistance throughout the course of the passive movement." },
  { value: 1, label: "1", description: "Slight resistance throughout the course of the passive movement, with no clear catch at a precise angle." },
  { value: 2, label: "2", description: "Clear catch at a precise angle, interrupting the passive movement, followed by release." },
  { value: 3, label: "3", description: "Fatigable clonus (fewer than 10 seconds when maintaining pressure) occurring at a precise angle." },
  { value: 4, label: "4", description: "Unfatigable clonus (more than 10 seconds when maintaining pressure) occurring at a precise angle." },
];
const SEVERITIES = ["good", "good", "warning", "serious", "critical"];

function buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return {
    items: [
      {
        id: "tardieu",
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
      citation: "Boyd RN, Graham HK. Objective measurement of clinical findings in the use of botulinum toxin type A for the management of children with cerebral palsy. Eur J Neurol. 1999;6(s4):S23-S35.",
    },
  };
}

const calculationExplanationEn =
  "This calculator covers the Quality of Muscle Reaction (Y) grade — from 0 (no resistance) to 4 (unfatigable clonus) — assessed at a fast stretch velocity (V3). The full Tardieu assessment also records the angle of catch (X) at V3 and the passive range of motion (R2) at a slow stretch (V1), both raw goniometric degree measurements specific to the joint being tested; record those separately alongside this grade, since they aren't part of a fixed point scale.";

const definitionEn = buildDefinition(
  "Quality of muscle reaction (fast stretch)",
  "Select the single grade that best reflects the muscle's reaction when the joint is moved passively through its range of motion as fast as possible (V3).",
  GRADES_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Tardieu Scale — Quality of Muscle Reaction",
  abbreviation: "Tardieu",
  description: "Grades the quality of the muscle's reaction to a fast passive stretch on a single 0–4 scale. The angle of catch and passive range of motion are recorded separately by the clinician.",
  population: "Adults or children with spasticity from an upper motor neuron lesion",
  estimated_minutes_min: 2,
  estimated_minutes_max: 4,
  definition: JSON.stringify(definition),
  status: "published",
  position: 1,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "tardieu-scale", {
  slug: "tardieu-scale",
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
    "Tardieu Scale — Quality of Muscle Reaction",
    "Tardieu",
    "Grades the quality of the muscle's reaction to a fast passive stretch on a single 0–4 scale. The angle of catch and passive range of motion are recorded separately by the clinician.",
    "Adults or children with spasticity from an upper motor neuron lesion",
    2,
    4,
    JSON.stringify(definitionEn),
    "published",
    1,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation);
}

const GRADES_PT_PT = [
  { value: 0, label: "0", description: "Sem resistência ao longo de todo o movimento passivo." },
  { value: 1, label: "1", description: "Ligeira resistência ao longo de todo o movimento passivo, sem uma resistência clara num ângulo preciso." },
  { value: 2, label: "2", description: "Resistência clara num ângulo preciso, interrompendo o movimento passivo, seguida de libertação." },
  { value: 3, label: "3", description: "Clónus fatigável (menos de 10 segundos ao manter a pressão) num ângulo preciso." },
  { value: 4, label: "4", description: "Clónus não fatigável (mais de 10 segundos ao manter a pressão) num ângulo preciso." },
];
const calculationExplanationPtPt =
  "Esta calculadora abrange o grau de Qualidade da Reação Muscular (Y) — de 0 (sem resistência) a 4 (clónus não fatigável) — avaliado a uma velocidade de alongamento rápida (V3). A avaliação completa de Tardieu também regista o ângulo de resistência (X) em V3 e a amplitude de movimento passivo (R2) num alongamento lento (V1), ambas medições goniométricas em graus específicas da articulação testada; registe-as separadamente junto deste grau, uma vez que não fazem parte de uma escala de pontos fixa.";

const GRADES_PT_BR = [
  { value: 0, label: "0", description: "Sem resistência ao longo de todo o movimento passivo." },
  { value: 1, label: "1", description: "Leve resistência ao longo de todo o movimento passivo, sem uma resistência clara em um ângulo preciso." },
  { value: 2, label: "2", description: "Resistência clara em um ângulo preciso, interrompendo o movimento passivo, seguida de liberação." },
  { value: 3, label: "3", description: "Clônus fatigável (menos de 10 segundos ao manter a pressão) em um ângulo preciso." },
  { value: 4, label: "4", description: "Clônus não fatigável (mais de 10 segundos ao manter a pressão) em um ângulo preciso." },
];
const calculationExplanationPtBr =
  "Esta calculadora abrange o grau de Qualidade da Reação Muscular (Y) — de 0 (sem resistência) a 4 (clônus não fatigável) — avaliado em uma velocidade de alongamento rápida (V3). A avaliação completa de Tardieu também registra o ângulo de resistência (X) em V3 e a amplitude de movimento passivo (R2) em um alongamento lento (V1), ambas medições goniométricas em graus específicas da articulação testada; registre-as separadamente junto a este grau, já que não fazem parte de uma escala de pontos fixa.";

const GRADES_ES = [
  { value: 0, label: "0", description: "Sin resistencia durante todo el movimiento pasivo." },
  { value: 1, label: "1", description: "Leve resistencia durante todo el movimiento pasivo, sin una resistencia clara en un ángulo preciso." },
  { value: 2, label: "2", description: "Resistencia clara en un ángulo preciso, que interrumpe el movimiento pasivo, seguida de liberación." },
  { value: 3, label: "3", description: "Clono fatigable (menos de 10 segundos al mantener la presión) en un ángulo preciso." },
  { value: 4, label: "4", description: "Clono no fatigable (más de 10 segundos al mantener la presión) en un ángulo preciso." },
];
const calculationExplanationEs =
  "Esta calculadora cubre el grado de Calidad de la Reacción Muscular (Y) — de 0 (sin resistencia) a 4 (clono no fatigable) — evaluado a una velocidad de estiramiento rápida (V3). La evaluación completa de Tardieu también registra el ángulo de resistencia (X) en V3 y el rango de movimiento pasivo (R2) en un estiramiento lento (V1), ambas mediciones goniométricas en grados específicas de la articulación evaluada; regístrelas por separado junto a este grado, ya que no forman parte de una escala de puntos fija.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Tardieu — Qualidade da Reação Muscular",
    description: "Classifica a qualidade da reação muscular a um alongamento passivo rápido numa única escala de 0 a 4. O ângulo de resistência e a amplitude de movimento passivo são registados separadamente pelo clínico.",
    definition: translateDefinition(
      "Qualidade da reação muscular (alongamento rápido)",
      "Selecione o grau único que melhor reflete a reação do músculo quando a articulação é movida passivamente ao longo da sua amplitude tão rapidamente quanto possível (V3).",
      GRADES_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Tardieu — Qualidade da Reação Muscular",
    description: "Classifica a qualidade da reação muscular a um alongamento passivo rápido em uma única escala de 0 a 4. O ângulo de resistência e a amplitude de movimento passivo são registrados separadamente pelo clínico.",
    definition: translateDefinition(
      "Qualidade da reação muscular (alongamento rápido)",
      "Selecione o grau único que melhor reflete a reação do músculo quando a articulação é movida passivamente ao longo de sua amplitude o mais rápido possível (V3).",
      GRADES_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Tardieu — Calidad de la Reacción Muscular",
    description: "Clasifica la calidad de la reacción muscular a un estiramiento pasivo rápido en una única escala de 0 a 4. El ángulo de resistencia y el rango de movimiento pasivo se registran por separado por el clínico.",
    definition: translateDefinition(
      "Calidad de la reacción muscular (estiramiento rápido)",
      "Seleccione el grado único que mejor refleje la reacción del músculo cuando la articulación se mueve pasivamente a lo largo de su rango tan rápido como sea posible (V3).",
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

console.log("Tardieu Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
