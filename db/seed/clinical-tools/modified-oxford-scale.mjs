// Modified Oxford Scale — fifth calculator in "Pelvic Floor
// Rehabilitation". Single-select ordinal scale (one item, pick exactly
// one of 6 grades, the result *is* that grade) — same pattern as
// Modified Ashworth/House-Brackmann. Grades run 0-5 (No contraction to
// Strong), ascending-good (higher = stronger contraction = better), so
// no descendingGood flag, unlike most other single-item-ordinal scales
// in this app.
//
// A classic, freely-reproduced clinical convention adapted from the
// Oxford/MRC muscle grading system for pelvic floor palpation
// (popularized by Jo Laycock, used as the Power component of the
// PERFECT scheme) — no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/modified-oxford-scale.mjs
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

const GRADES_EN = [
  { value: 0, label: "0 — No contraction", description: "No palpable contraction of the pelvic floor muscles." },
  { value: 1, label: "1 — Flicker", description: "A flicker or pulsation is felt." },
  { value: 2, label: "2 — Weak", description: "A weak contraction, without any lift." },
  { value: 3, label: "3 — Moderate", description: "A moderate contraction, with some lift or squeeze." },
  { value: 4, label: "4 — Good", description: "A good contraction, with lift and some resistance against the examiner's finger." },
  { value: 5, label: "5 — Strong", description: "A strong contraction, with firm lift and squeeze against resistance." },
];
const SEVERITIES = ["critical", "serious", "warning", "warning", "good", "good"];

function buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return {
    items: [
      {
        id: "oxford",
        label: itemLabel,
        instructions: itemInstructions,
        options: grades.map((g) => ({ value: g.value, label: g.label, description: g.description })),
      },
    ],
    scoring: { method: "sum" },
    maxScore: 5,
    interpretation: grades.map((g, i) => ({
      min: g.value,
      max: g.value,
      label: g.label,
      description: g.description,
      severity: SEVERITIES[i],
    })),
    calculationExplanation,
    source: {
      citation: "Laycock J, Jerwood D. Pelvic floor muscle assessment: the PERFECT scheme. Physiotherapy. 2001;87(12):631-642.",
    },
  };
}

const calculationExplanationEn =
  "The Modified Oxford Scale grade is the single grade — from 0 (no contraction) to 5 (strong) — that best matches the pelvic floor muscle contraction felt on digital (vaginal or anorectal) palpation. It is also used as the Power component of the PERFECT scheme.";

const definitionEn = buildDefinition(
  "Pelvic floor muscle strength grade",
  "Select the single grade that best reflects the strength of the pelvic floor muscle contraction felt on digital palpation.",
  GRADES_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Modified Oxford Scale",
  abbreviation: "MOS",
  description: "Grades pelvic floor muscle contraction strength on a single 0–5 scale, assessed by digital palpation.",
  population: "Adults undergoing pelvic floor muscle assessment",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definition),
  status: "published",
  position: 4,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "modified-oxford-scale", {
  slug: "modified-oxford-scale",
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
    "Modified Oxford Scale",
    "MOS",
    "Grades pelvic floor muscle contraction strength on a single 0–5 scale, assessed by digital palpation.",
    "Adults undergoing pelvic floor muscle assessment",
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
  { value: 0, label: "0 — Sem contração", description: "Nenhuma contração palpável dos músculos do pavimento pélvico." },
  { value: 1, label: "1 — Vestígio", description: "Sente-se um vestígio ou pulsação." },
  { value: 2, label: "2 — Fraca", description: "Uma contração fraca, sem qualquer elevação." },
  { value: 3, label: "3 — Moderada", description: "Uma contração moderada, com alguma elevação ou aperto." },
  { value: 4, label: "4 — Boa", description: "Uma boa contração, com elevação e alguma resistência contra o dedo do examinador." },
  { value: 5, label: "5 — Forte", description: "Uma contração forte, com elevação e aperto firmes contra resistência." },
];
const calculationExplanationPtPt =
  "O grau da Escala de Oxford Modificada é o grau único — de 0 (sem contração) a 5 (forte) — que melhor corresponde à contração dos músculos do pavimento pélvico sentida na palpação digital (vaginal ou anorretal). É também utilizado como componente de Força (Power) do esquema PERFECT.";

const GRADES_PT_BR = [
  { value: 0, label: "0 — Sem contração", description: "Nenhuma contração palpável dos músculos do assoalho pélvico." },
  { value: 1, label: "1 — Vestígio", description: "Sente-se um vestígio ou pulsação." },
  { value: 2, label: "2 — Fraca", description: "Uma contração fraca, sem qualquer elevação." },
  { value: 3, label: "3 — Moderada", description: "Uma contração moderada, com alguma elevação ou aperto." },
  { value: 4, label: "4 — Boa", description: "Uma boa contração, com elevação e alguma resistência contra o dedo do examinador." },
  { value: 5, label: "5 — Forte", description: "Uma contração forte, com elevação e aperto firmes contra resistência." },
];
const calculationExplanationPtBr =
  "O grau da Escala de Oxford Modificada é o grau único — de 0 (sem contração) a 5 (forte) — que melhor corresponde à contração dos músculos do assoalho pélvico sentida na palpação digital (vaginal ou anorretal). Também é usado como o componente de Força (Power) do esquema PERFECT.";

const GRADES_ES = [
  { value: 0, label: "0 — Sin contracción", description: "Ninguna contracción palpable de los músculos del suelo pélvico." },
  { value: 1, label: "1 — Vestigio", description: "Se percibe un vestigio o pulsación." },
  { value: 2, label: "2 — Débil", description: "Una contracción débil, sin ninguna elevación." },
  { value: 3, label: "3 — Moderada", description: "Una contracción moderada, con cierta elevación o apriete." },
  { value: 4, label: "4 — Buena", description: "Una buena contracción, con elevación y cierta resistencia contra el dedo del examinador." },
  { value: 5, label: "5 — Fuerte", description: "Una contracción fuerte, con elevación y apriete firmes contra resistencia." },
];
const calculationExplanationEs =
  "El grado de la Escala de Oxford Modificada es el grado único — de 0 (sin contracción) a 5 (fuerte) — que mejor corresponde a la contracción de los músculos del suelo pélvico percibida en la palpación digital (vaginal o anorrectal). También se usa como el componente de Fuerza (Power) del esquema PERFECT.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Oxford Modificada",
    description: "Classifica a força de contração dos músculos do pavimento pélvico numa única escala de 0 a 5, avaliada por palpação digital.",
    definition: translateDefinition(
      "Grau de força dos músculos do pavimento pélvico",
      "Selecione o grau único que melhor reflete a força da contração dos músculos do pavimento pélvico sentida na palpação digital.",
      GRADES_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Oxford Modificada",
    description: "Classifica a força de contração dos músculos do assoalho pélvico em uma única escala de 0 a 5, avaliada por palpação digital.",
    definition: translateDefinition(
      "Grau de força dos músculos do assoalho pélvico",
      "Selecione o grau único que melhor reflete a força da contração dos músculos do assoalho pélvico sentida na palpação digital.",
      GRADES_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Oxford Modificada",
    description: "Clasifica la fuerza de contracción de los músculos del suelo pélvico en una única escala de 0 a 5, evaluada por palpación digital.",
    definition: translateDefinition(
      "Grado de fuerza de los músculos del suelo pélvico",
      "Seleccione el grado único que mejor refleje la fuerza de la contracción de los músculos del suelo pélvico percibida en la palpación digital.",
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

console.log("Modified Oxford Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
