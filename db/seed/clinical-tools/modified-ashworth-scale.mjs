// Modified Ashworth Scale (MAS) — first calculator in a new
// "Spasticity" category. Single-select ordinal scale (one item, pick
// exactly one of 6 grades, the result *is* that grade) — same pattern
// as Modified Rankin Scale / House-Brackmann. Grades run 0, 1, 1+, 2,
// 3, 4 — "1+" isn't a real number, so it's encoded as value 2 (ordinal
// position, not the literal grade label) with every subsequent grade
// shifted up by one; the grade LABEL shown to the user is always the
// real clinical name ("1+", "2", etc.), only the internal `value` is
// a plain 0-5 ordinal index. descendingGood: true (0 = normal tone =
// best, 4 = rigid = worst).
//
// A classic, freely-reproduced academic instrument (Bohannon & Smith,
// 1987) — like mRS/House-Brackmann/LKSS, no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/modified-ashworth-scale.mjs
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
  { value: 0, label: "0", description: "No increase in muscle tone." },
  { value: 1, label: "1", description: "Slight increase in muscle tone, manifested by a catch and release, or by minimal resistance at the end of the range of motion." },
  { value: 2, label: "1+", description: "Slight increase in muscle tone, manifested by a catch, followed by minimal resistance throughout the remainder (less than half) of the range of motion." },
  { value: 3, label: "2", description: "More marked increase in muscle tone through most of the range of motion, but the affected part is easily moved." },
  { value: 4, label: "3", description: "Considerable increase in muscle tone; passive movement is difficult." },
  { value: 5, label: "4", description: "Affected part is rigid in flexion or extension." },
];
const SEVERITIES = ["good", "good", "warning", "warning", "serious", "critical"];

function buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return {
    items: [
      {
        id: "mas",
        label: itemLabel,
        instructions: itemInstructions,
        options: grades.map((g) => ({ value: g.value, label: g.label, description: g.description })),
      },
    ],
    scoring: { method: "sum" },
    maxScore: 5,
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
      citation: "Bohannon RW, Smith MB. Interrater reliability of a modified Ashworth scale of muscle spasticity. Phys Ther. 1987;67(2):206-207.",
      url: "https://www.sralab.org/rehabilitation-measures/modified-ashworth-scale-spasticity",
    },
  };
}

const calculationExplanationEn =
  "The Modified Ashworth Scale grade is the single grade — from 0 (no increase in tone) to 4 (rigid) — that best matches the resistance felt when the examiner passively moves the joint through its range of motion. Unlike scales that sum multiple item scores, MAS is one grade per muscle group tested.";

const definitionEn = buildDefinition(
  "Muscle tone grade",
  "Select the single grade that best reflects the resistance felt during passive movement of the joint through its full range of motion.",
  GRADES_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Modified Ashworth Scale",
  abbreviation: "MAS",
  description: "Grades muscle tone on a single 0–4 scale (including the intermediate grade 1+), based on the resistance felt during passive range of motion.",
  population: "Adults or children with spasticity from an upper motor neuron lesion",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definition),
  status: "published",
  position: 0,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "modified-ashworth-scale", {
  slug: "modified-ashworth-scale",
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
    "Modified Ashworth Scale",
    "MAS",
    "Grades muscle tone on a single 0–4 scale (including the intermediate grade 1+), based on the resistance felt during passive range of motion.",
    "Adults or children with spasticity from an upper motor neuron lesion",
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
  { value: 0, label: "0", description: "Sem aumento do tónus muscular." },
  { value: 1, label: "1", description: "Ligeiro aumento do tónus muscular, manifestado por uma resistência seguida de libertação, ou por resistência mínima no final da amplitude de movimento." },
  { value: 2, label: "1+", description: "Ligeiro aumento do tónus muscular, manifestado por uma resistência, seguida de resistência mínima ao longo do resto (menos de metade) da amplitude de movimento." },
  { value: 3, label: "2", description: "Aumento mais marcado do tónus muscular ao longo da maior parte da amplitude de movimento, mas a parte afetada move-se com facilidade." },
  { value: 4, label: "3", description: "Aumento considerável do tónus muscular; o movimento passivo é difícil." },
  { value: 5, label: "4", description: "A parte afetada está rígida em flexão ou extensão." },
];
const calculationExplanationPtPt =
  "O grau da Escala de Ashworth Modificada é o grau único — de 0 (sem aumento do tónus) a 4 (rígido) — que melhor corresponde à resistência sentida quando o examinador move passivamente a articulação ao longo da sua amplitude de movimento. Ao contrário de escalas que somam vários itens, a MAS é um único grau por grupo muscular testado.";

const GRADES_PT_BR = [
  { value: 0, label: "0", description: "Sem aumento do tônus muscular." },
  { value: 1, label: "1", description: "Leve aumento do tônus muscular, manifestado por uma resistência seguida de liberação, ou por resistência mínima no final da amplitude de movimento." },
  { value: 2, label: "1+", description: "Leve aumento do tônus muscular, manifestado por uma resistência, seguida de resistência mínima ao longo do restante (menos da metade) da amplitude de movimento." },
  { value: 3, label: "2", description: "Aumento mais marcante do tônus muscular ao longo da maior parte da amplitude de movimento, mas a parte afetada é movida com facilidade." },
  { value: 4, label: "3", description: "Aumento considerável do tônus muscular; o movimento passivo é difícil." },
  { value: 5, label: "4", description: "A parte afetada está rígida em flexão ou extensão." },
];
const calculationExplanationPtBr =
  "O grau da Escala de Ashworth Modificada é o grau único — de 0 (sem aumento do tônus) a 4 (rígido) — que melhor corresponde à resistência sentida quando o examinador move passivamente a articulação ao longo de sua amplitude de movimento. Diferente de escalas que somam vários itens, a MAS é um único grau por grupo muscular testado.";

const GRADES_ES = [
  { value: 0, label: "0", description: "Sin aumento del tono muscular." },
  { value: 1, label: "1", description: "Ligero aumento del tono muscular, manifestado por una resistencia seguida de liberación, o por resistencia mínima al final del rango de movimiento." },
  { value: 2, label: "1+", description: "Ligero aumento del tono muscular, manifestado por una resistencia, seguida de resistencia mínima durante el resto (menos de la mitad) del rango de movimiento." },
  { value: 3, label: "2", description: "Aumento más marcado del tono muscular durante la mayor parte del rango de movimiento, pero la parte afectada se mueve con facilidad." },
  { value: 4, label: "3", description: "Aumento considerable del tono muscular; el movimiento pasivo es difícil." },
  { value: 5, label: "4", description: "La parte afectada está rígida en flexión o extensión." },
];
const calculationExplanationEs =
  "El grado de la Escala de Ashworth Modificada es el grado único — de 0 (sin aumento del tono) a 4 (rígido) — que mejor corresponde a la resistencia sentida cuando el examinador mueve pasivamente la articulación a lo largo de su rango de movimiento. A diferencia de las escalas que suman varios ítems, la MAS es un único grado por grupo muscular evaluado.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Ashworth Modificada",
    description: "Classifica o tónus muscular numa única escala de 0 a 4 (incluindo o grau intermédio 1+), com base na resistência sentida durante a amplitude de movimento passivo.",
    definition: translateDefinition(
      "Grau do tónus muscular",
      "Selecione o grau único que melhor reflete a resistência sentida durante o movimento passivo da articulação ao longo de toda a sua amplitude.",
      GRADES_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Ashworth Modificada",
    description: "Classifica o tônus muscular em uma única escala de 0 a 4 (incluindo o grau intermediário 1+), com base na resistência sentida durante a amplitude de movimento passivo.",
    definition: translateDefinition(
      "Grau do tônus muscular",
      "Selecione o grau único que melhor reflete a resistência sentida durante o movimento passivo da articulação ao longo de toda a sua amplitude.",
      GRADES_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Ashworth Modificada",
    description: "Clasifica el tono muscular en una única escala de 0 a 4 (incluyendo el grado intermedio 1+), según la resistencia sentida durante el rango de movimiento pasivo.",
    definition: translateDefinition(
      "Grado del tono muscular",
      "Seleccione el grado único que mejor refleje la resistencia sentida durante el movimiento pasivo de la articulación a lo largo de todo su rango.",
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

console.log("Modified Ashworth Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
