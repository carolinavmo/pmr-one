// Standardized Five Questions (S5Q) — first calculator in a new
// "Consciousness & Cognition" category (doesn't fit Independence,
// Balance & Falls Risk, or Strength). A quick 5-command cooperation
// screen used in critical care to decide whether a patient is awake
// and cooperative enough to proceed to active strength/functional
// testing (e.g. the MRC Sum Score, seeded separately) — the same
// clinical tradition as MRC-SS (De Jonghe et al.).
//
// Structurally the simplest pattern yet: 5 items, each a plain binary
// correct/incorrect (same shape as Katz's per-item options), no shared
// multi-level rubric needed.
//
// Usage: node db/seed/clinical-tools/s5q.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "consciousness-cognition", {
  slug: "consciousness-cognition",
  name: "Consciousness & Cognition",
  color: "indigo",
  position: 3,
});

// ---------- Definition (English source) ----------

const OPTIONS_EN = [
  { value: 0, label: "Incorrect", description: "No response, or an incorrect or inconsistent response to the command." },
  { value: 1, label: "Correct", description: "Correctly performs the command." },
];

const definitionEn = {
  items: [
    { id: "open_close_eyes", label: "Open and close your eyes", instructions: "Ask the patient to open, then close, their eyes on command.", options: OPTIONS_EN },
    { id: "look_at_examiner", label: "Look at me", instructions: "Ask the patient to look at the examiner.", options: OPTIONS_EN },
    { id: "open_mouth_tongue", label: "Open your mouth and stick out your tongue", instructions: "Ask the patient to open their mouth and stick out their tongue.", options: OPTIONS_EN },
    { id: "nod_head", label: "Nod your head", instructions: "Ask the patient to nod their head.", options: OPTIONS_EN },
    { id: "raise_eyebrows", label: "Raise your eyebrows when I count to five", instructions: "Ask the patient to raise their eyebrows when the examiner finishes counting to five.", options: OPTIONS_EN },
  ],
  scoring: { method: "sum" },
  maxScore: 5,
  interpretation: [
    { min: 0, max: 2, label: "Inadequate cooperation", description: "Patient does not reliably follow commands; unlikely to cooperate with active strength or functional testing at this time.", severity: "critical" },
    { min: 3, max: 5, label: "Adequate cooperation", description: "Patient reliably follows simple commands — the threshold commonly used to proceed with active strength testing (e.g. the MRC Sum Score) or functional rehabilitation.", severity: "good" },
  ],
  calculationExplanation:
    "The S5Q score is the number of the five standardized commands — open/close the eyes, look at the examiner, open the mouth and stick out the tongue, nod the head, and raise the eyebrows on a five-count — that the patient performs correctly, out of a maximum of 5. A score of 3 or more is the threshold commonly used to indicate the patient is awake and cooperative enough to proceed with active strength testing (e.g. the MRC Sum Score) or functional rehabilitation.",
  source: {
    citation: "De Jonghe B, Sharshar T, Lefaucheur JP, et al. Paresis acquired in the intensive care unit: a prospective multicenter study. JAMA. 2002;288(22):2859-2867.",
  },
};

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Standardized Five Questions",
  abbreviation: "S5Q",
  description: "Screens a critically ill patient's level of consciousness and ability to cooperate with five simple commands, producing a score out of 5 used to decide whether the patient can safely proceed to strength or functional testing.",
  population: "Critically ill adults, particularly those recovering from sedation or delirium in the ICU",
  estimated_minutes_min: 2,
  estimated_minutes_max: 3,
  definition: JSON.stringify(definition),
  status: "published",
  position: 0,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "s5q", {
  slug: "s5q",
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
    "Standardized Five Questions",
    "S5Q",
    "Screens a critically ill patient's level of consciousness and ability to cooperate with five simple commands, producing a score out of 5 used to decide whether the patient can safely proceed to strength or functional testing.",
    "Critically ill adults, particularly those recovering from sedation or delirium in the ICU",
    2,
    3,
    JSON.stringify(definitionEn),
    "published",
    0,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemText, interpretationText, calculationExplanation, optionLabels) {
  return {
    items: definitionEn.items.map((item, i) => ({
      ...item,
      label: itemText[i].label,
      instructions: itemText[i].instructions,
      options: item.options.map((option) => ({
        ...option,
        label: optionLabels[option.value].label,
        description: optionLabels[option.value].description,
      })),
    })),
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    calculationExplanation,
    source: definitionEn.source,
    interpretation: definitionEn.interpretation.map((band, i) => ({
      ...band,
      label: interpretationText[i].label,
      description: interpretationText[i].description,
    })),
  };
}

const OPTION_LABELS_PT_PT = {
  0: { label: "Incorreto", description: "Ausência de resposta, ou resposta incorreta ou inconsistente ao comando." },
  1: { label: "Correto", description: "Executa o comando corretamente." },
};
const ptPtItems = [
  { label: "Abra e feche os olhos", instructions: "Peça ao doente para abrir e depois fechar os olhos, por ordem." },
  { label: "Olhe para mim", instructions: "Peça ao doente para olhar para o examinador." },
  { label: "Abra a boca e deite a língua de fora", instructions: "Peça ao doente para abrir a boca e deitar a língua de fora." },
  { label: "Acene com a cabeça", instructions: "Peça ao doente para acenar com a cabeça." },
  { label: "Levante as sobrancelhas quando eu contar até cinco", instructions: "Peça ao doente para levantar as sobrancelhas quando o examinador terminar de contar até cinco." },
];
const ptPtInterpretation = [
  { label: "Cooperação inadequada", description: "O doente não segue comandos de forma fiável; é pouco provável que coopere neste momento com testes ativos de força ou funcionais." },
  { label: "Cooperação adequada", description: "O doente segue comandos simples de forma fiável — o limiar habitualmente usado para avançar para testes ativos de força (por exemplo, a Pontuação Somatória MRC) ou reabilitação funcional." },
];
const ptPtCalculationExplanation =
  "A pontuação S5Q é o número dos cinco comandos padronizados — abrir/fechar os olhos, olhar para o examinador, abrir a boca e deitar a língua de fora, acenar com a cabeça e levantar as sobrancelhas numa contagem até cinco — que o doente executa corretamente, num máximo de 5. Uma pontuação igual ou superior a 3 é o limiar habitualmente usado para indicar que o doente está desperto e suficientemente cooperante para avançar para testes ativos de força (por exemplo, a Pontuação Somatória MRC) ou reabilitação funcional.";

const OPTION_LABELS_PT_BR = {
  0: { label: "Incorreto", description: "Ausência de resposta, ou resposta incorreta ou inconsistente ao comando." },
  1: { label: "Correto", description: "Executa o comando corretamente." },
};
const ptBrItems = [
  { label: "Abra e feche os olhos", instructions: "Peça ao paciente para abrir e depois fechar os olhos, por ordem." },
  { label: "Olhe para mim", instructions: "Peça ao paciente para olhar para o examinador." },
  { label: "Abra a boca e coloque a língua para fora", instructions: "Peça ao paciente para abrir a boca e colocar a língua para fora." },
  { label: "Acene com a cabeça", instructions: "Peça ao paciente para acenar com a cabeça." },
  { label: "Levante as sobrancelhas quando eu contar até cinco", instructions: "Peça ao paciente para levantar as sobrancelhas quando o examinador terminar de contar até cinco." },
];
const ptBrInterpretation = [
  { label: "Cooperação inadequada", description: "O paciente não segue comandos de forma confiável; é pouco provável que coopere neste momento com testes ativos de força ou funcionais." },
  { label: "Cooperação adequada", description: "O paciente segue comandos simples de forma confiável — o limiar geralmente usado para avançar para testes ativos de força (por exemplo, a Pontuação Somatória MRC) ou reabilitação funcional." },
];
const ptBrCalculationExplanation =
  "A pontuação S5Q é o número dos cinco comandos padronizados — abrir/fechar os olhos, olhar para o examinador, abrir a boca e colocar a língua para fora, acenar com a cabeça e levantar as sobrancelhas em uma contagem até cinco — que o paciente executa corretamente, em um máximo de 5. Uma pontuação igual ou superior a 3 é o limiar geralmente usado para indicar que o paciente está desperto e suficientemente cooperativo para avançar para testes ativos de força (por exemplo, a Pontuação Somatória MRC) ou reabilitação funcional.";

const OPTION_LABELS_ES = {
  0: { label: "Incorrecto", description: "Ausencia de respuesta, o respuesta incorrecta o inconsistente a la orden." },
  1: { label: "Correcto", description: "Ejecuta la orden correctamente." },
};
const esItems = [
  { label: "Abra y cierre los ojos", instructions: "Pida al paciente que abra y luego cierre los ojos, en ese orden." },
  { label: "Míreme", instructions: "Pida al paciente que mire al examinador." },
  { label: "Abra la boca y saque la lengua", instructions: "Pida al paciente que abra la boca y saque la lengua." },
  { label: "Asienta con la cabeza", instructions: "Pida al paciente que asienta con la cabeza." },
  { label: "Levante las cejas cuando cuente hasta cinco", instructions: "Pida al paciente que levante las cejas cuando el examinador termine de contar hasta cinco." },
];
const esInterpretation = [
  { label: "Cooperación inadecuada", description: "El paciente no sigue las órdenes de forma fiable; es poco probable que coopere en este momento con pruebas activas de fuerza o funcionales." },
  { label: "Cooperación adecuada", description: "El paciente sigue órdenes simples de forma fiable — el umbral habitualmente utilizado para avanzar a pruebas activas de fuerza (por ejemplo, la Puntuación Suma MRC) o rehabilitación funcional." },
];
const esCalculationExplanation =
  "La puntuación S5Q es el número de las cinco órdenes estandarizadas — abrir/cerrar los ojos, mirar al examinador, abrir la boca y sacar la lengua, asentir con la cabeza y levantar las cejas al contar hasta cinco — que el paciente ejecuta correctamente, con un máximo de 5. Una puntuación igual o superior a 3 es el umbral habitualmente utilizado para indicar que el paciente está despierto y lo bastante cooperador como para avanzar a pruebas activas de fuerza (por ejemplo, la Puntuación Suma MRC) o rehabilitación funcional.";

const translations = [
  {
    locale: "pt-pt",
    name: "Cinco Perguntas Padronizadas",
    description: "Avalia o nível de consciência e a capacidade de cooperação de um doente crítico através de cinco comandos simples, produzindo uma pontuação em 5 usada para decidir se o doente pode avançar em segurança para testes de força ou funcionais.",
    definition: translateDefinition(ptPtItems, ptPtInterpretation, ptPtCalculationExplanation, OPTION_LABELS_PT_PT),
  },
  {
    locale: "pt-br",
    name: "Cinco Perguntas Padronizadas",
    description: "Avalia o nível de consciência e a capacidade de cooperação de um paciente crítico por meio de cinco comandos simples, gerando uma pontuação em 5 usada para decidir se o paciente pode avançar com segurança para testes de força ou funcionais.",
    definition: translateDefinition(ptBrItems, ptBrInterpretation, ptBrCalculationExplanation, OPTION_LABELS_PT_BR),
  },
  {
    locale: "es",
    name: "Cinco Preguntas Estandarizadas",
    description: "Evalúa el nivel de conciencia y la capacidad de cooperación de un paciente crítico mediante cinco órdenes simples, generando una puntuación sobre 5 utilizada para decidir si el paciente puede avanzar de forma segura a pruebas de fuerza o funcionales.",
    definition: translateDefinition(esItems, esInterpretation, esCalculationExplanation, OPTION_LABELS_ES),
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

console.log("S5Q seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
