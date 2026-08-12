// House-Brackmann Facial Nerve Grading System — first calculator in a
// new "Peripheral Facial Palsy" category. Single-select ordinal scale
// (one item, pick exactly one of 6 grades, the result *is* that
// grade) — same pattern as Modified Rankin Scale, `sum` over one item
// with no separate scoring method needed. descendingGood: true (Grade
// I = normal/best = 1, Grade VI = total paralysis/worst = 6).
//
// A classic, freely-reproduced academic instrument (House & Brackmann,
// 1985) — like Barthel/mRS/LKSS, no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/house-brackmann.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "peripheral-facial-palsy", {
  slug: "peripheral-facial-palsy",
  name: "Peripheral Facial Palsy",
  color: "blue",
  position: 6,
});

const GRADES_EN = [
  { value: 1, label: "I — Normal", description: "Normal facial function in all areas." },
  { value: 2, label: "II — Mild dysfunction", description: "Slight weakness noticeable only on close inspection, possibly with slight synkinesis. At rest: normal symmetry and tone. Forehead: moderate to good movement. Eye: complete closure with minimal effort. Mouth: slight asymmetry." },
  { value: 3, label: "III — Moderate dysfunction", description: "Obvious but not disfiguring difference between the two sides; noticeable but not severe synkinesis, contracture, or hemifacial spasm. At rest: normal symmetry and tone. Forehead: slight to moderate movement. Eye: complete closure with effort. Mouth: slightly weak with maximum effort." },
  { value: 4, label: "IV — Moderately severe dysfunction", description: "Obvious weakness and/or disfiguring asymmetry. At rest: normal symmetry and tone. Forehead: no movement. Eye: incomplete closure. Mouth: asymmetric with maximum effort." },
  { value: 5, label: "V — Severe dysfunction", description: "Only barely perceptible motion. At rest: asymmetry. Forehead: no movement. Eye: incomplete closure. Mouth: only slight movement." },
  { value: 6, label: "VI — Total paralysis", description: "No movement." },
];
const SEVERITIES = ["good", "good", "warning", "warning", "serious", "critical"];

function buildDefinition(itemLabel, itemInstructions, grades, calculationExplanation) {
  return {
    items: [
      {
        id: "hb",
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
      citation: "House JW, Brackmann DE. Facial nerve grading system. Otolaryngol Head Neck Surg. 1985;93(2):146-147.",
      url: "https://www.sralab.org/rehabilitation-measures/house-brackmann-scale",
    },
  };
}

const calculationExplanationEn =
  "The House-Brackmann grade is the single grade — from I (normal) to VI (total paralysis) — that best matches the patient's overall facial nerve function, based on the resting symmetry and the movement of the forehead, eye, and mouth. Unlike scales that sum multiple item scores, House-Brackmann is one global clinical judgment.";

const definitionEn = buildDefinition(
  "Overall facial nerve function",
  "Select the single grade that best reflects the patient's current facial function, considering resting symmetry and forehead, eye, and mouth movement.",
  GRADES_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "House-Brackmann Facial Nerve Grading System",
  abbreviation: "HB",
  description: "Grades overall facial nerve function on a single I–VI scale, from normal to total paralysis, most often used after Bell's palsy or other facial nerve injury.",
  population: "Adults or children with facial nerve palsy",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definition),
  status: "published",
  position: 0,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "house-brackmann", {
  slug: "house-brackmann",
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
    "House-Brackmann Facial Nerve Grading System",
    "HB",
    "Grades overall facial nerve function on a single I–VI scale, from normal to total paralysis, most often used after Bell's palsy or other facial nerve injury.",
    "Adults or children with facial nerve palsy",
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
  { value: 1, label: "I — Normal", description: "Função facial normal em todas as áreas." },
  { value: 2, label: "II — Disfunção ligeira", description: "Fraqueza ligeira percetível apenas numa observação atenta, possivelmente com sincinesia ligeira. Em repouso: simetria e tónus normais. Testa: movimento moderado a bom. Olho: encerramento completo com esforço mínimo. Boca: assimetria ligeira." },
  { value: 3, label: "III — Disfunção moderada", description: "Diferença óbvia mas não desfigurante entre os dois lados; sincinesia, contratura ou espasmo hemifacial percetíveis mas não graves. Em repouso: simetria e tónus normais. Testa: movimento ligeiro a moderado. Olho: encerramento completo com esforço. Boca: ligeiramente fraca com esforço máximo." },
  { value: 4, label: "IV — Disfunção moderadamente grave", description: "Fraqueza óbvia e/ou assimetria desfigurante. Em repouso: simetria e tónus normais. Testa: sem movimento. Olho: encerramento incompleto. Boca: assimétrica com esforço máximo." },
  { value: 5, label: "V — Disfunção grave", description: "Apenas movimento mal percetível. Em repouso: assimetria. Testa: sem movimento. Olho: encerramento incompleto. Boca: apenas ligeiro movimento." },
  { value: 6, label: "VI — Paralisia total", description: "Sem movimento." },
];
const calculationExplanationPtPt =
  "O grau de House-Brackmann é o grau único — de I (normal) a VI (paralisia total) — que melhor corresponde à função global do nervo facial do doente, com base na simetria em repouso e no movimento da testa, do olho e da boca. Ao contrário de escalas que somam vários itens, House-Brackmann é um único julgamento clínico global.";

const GRADES_PT_BR = [
  { value: 1, label: "I — Normal", description: "Função facial normal em todas as áreas." },
  { value: 2, label: "II — Disfunção leve", description: "Fraqueza leve percebida apenas em observação atenta, possivelmente com sincinesia leve. Em repouso: simetria e tônus normais. Testa: movimento moderado a bom. Olho: fechamento completo com esforço mínimo. Boca: assimetria leve." },
  { value: 3, label: "III — Disfunção moderada", description: "Diferença óbvia mas não desfigurante entre os dois lados; sincinesia, contratura ou espasmo hemifacial perceptíveis mas não graves. Em repouso: simetria e tônus normais. Testa: movimento leve a moderado. Olho: fechamento completo com esforço. Boca: levemente fraca com esforço máximo." },
  { value: 4, label: "IV — Disfunção moderadamente grave", description: "Fraqueza óbvia e/ou assimetria desfigurante. Em repouso: simetria e tônus normais. Testa: sem movimento. Olho: fechamento incompleto. Boca: assimétrica com esforço máximo." },
  { value: 5, label: "V — Disfunção grave", description: "Apenas movimento mal perceptível. Em repouso: assimetria. Testa: sem movimento. Olho: fechamento incompleto. Boca: apenas leve movimento." },
  { value: 6, label: "VI — Paralisia total", description: "Sem movimento." },
];
const calculationExplanationPtBr =
  "O grau de House-Brackmann é o grau único — de I (normal) a VI (paralisia total) — que melhor corresponde à função global do nervo facial do paciente, com base na simetria em repouso e no movimento da testa, do olho e da boca. Diferente de escalas que somam vários itens, House-Brackmann é um único julgamento clínico global.";

const GRADES_ES = [
  { value: 1, label: "I — Normal", description: "Función facial normal en todas las áreas." },
  { value: 2, label: "II — Disfunción leve", description: "Debilidad leve perceptible solo con una observación atenta, posiblemente con sincinesia leve. En reposo: simetría y tono normales. Frente: movimiento moderado a bueno. Ojo: cierre completo con esfuerzo mínimo. Boca: asimetría leve." },
  { value: 3, label: "III — Disfunción moderada", description: "Diferencia obvia pero no desfigurante entre los dos lados; sincinesia, contractura o espasmo hemifacial perceptibles pero no graves. En reposo: simetría y tono normales. Frente: movimiento leve a moderado. Ojo: cierre completo con esfuerzo. Boca: ligeramente débil con esfuerzo máximo." },
  { value: 4, label: "IV — Disfunción moderadamente grave", description: "Debilidad obvia y/o asimetría desfigurante. En reposo: simetría y tono normales. Frente: sin movimiento. Ojo: cierre incompleto. Boca: asimétrica con esfuerzo máximo." },
  { value: 5, label: "V — Disfunción grave", description: "Solo movimiento apenas perceptible. En reposo: asimetría. Frente: sin movimiento. Ojo: cierre incompleto. Boca: solo ligero movimiento." },
  { value: 6, label: "VI — Parálisis total", description: "Sin movimiento." },
];
const calculationExplanationEs =
  "El grado de House-Brackmann es el grado único — de I (normal) a VI (parálisis total) — que mejor corresponde a la función global del nervio facial del paciente, según la simetría en reposo y el movimiento de la frente, el ojo y la boca. A diferencia de las escalas que suman varios ítems, House-Brackmann es un único juicio clínico global.";

const translations = [
  {
    locale: "pt-pt",
    name: "Sistema de Graduação do Nervo Facial de House-Brackmann",
    description: "Classifica a função global do nervo facial numa única escala de I a VI, de normal a paralisia total, usada sobretudo após paralisia de Bell ou outra lesão do nervo facial.",
    definition: translateDefinition(
      "Função global do nervo facial",
      "Selecione o grau único que melhor reflete a função facial atual do doente, considerando a simetria em repouso e o movimento da testa, do olho e da boca.",
      GRADES_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Sistema de Graduação do Nervo Facial de House-Brackmann",
    description: "Classifica a função global do nervo facial em uma única escala de I a VI, de normal a paralisia total, usada principalmente após paralisia de Bell ou outra lesão do nervo facial.",
    definition: translateDefinition(
      "Função global do nervo facial",
      "Selecione o grau único que melhor reflete a função facial atual do paciente, considerando a simetria em repouso e o movimento da testa, do olho e da boca.",
      GRADES_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Sistema de Graduación del Nervio Facial de House-Brackmann",
    description: "Clasifica la función global del nervio facial en una única escala de I a VI, de normal a parálisis total, utilizada sobre todo tras la parálisis de Bell u otra lesión del nervio facial.",
    definition: translateDefinition(
      "Función global del nervio facial",
      "Seleccione el grado único que mejor refleje la función facial actual del paciente, considerando la simetría en reposo y el movimiento de la frente, el ojo y la boca.",
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

console.log("House-Brackmann seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
