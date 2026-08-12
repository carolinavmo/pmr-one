// Boston Carpal Tunnel Questionnaire (BCTQ) — Functional Status
// Scale. Companion to boston-ctq-symptom-severity.mjs — see that
// file's header for why the two BCTQ subscales are kept as separate
// calculators. 8 items, each rated 1 (no difficulty) to 5 (cannot do
// at all due to hand/wrist symptoms); score is the plain mean.
// descendingGood: true.
//
// Usage: node db/seed/clinical-tools/boston-ctq-functional-status.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "upper-limb-function", {
  slug: "upper-limb-function",
  name: "Upper Limb Function",
  color: "rose",
  position: 4,
});

// ---------- Definition (English source) ----------

const DIFFICULTY_EN = [
  { value: 1, label: "No difficulty" },
  { value: 2, label: "Mild difficulty" },
  { value: 3, label: "Moderate difficulty" },
  { value: 4, label: "Severe difficulty" },
  { value: 5, label: "Cannot do at all due to hand or wrist symptoms" },
];

const ITEMS_EN = [
  { id: "writing", label: "Writing" },
  { id: "buttoning_clothes", label: "Buttoning of clothes" },
  { id: "holding_book", label: "Holding a book while reading" },
  { id: "gripping_phone", label: "Gripping of a telephone handle" },
  { id: "opening_jars", label: "Opening of jars" },
  { id: "household_chores", label: "Household chores" },
  { id: "carrying_grocery_bags", label: "Carrying of grocery bags" },
  { id: "bathing_dressing", label: "Bathing and dressing" },
];

function buildDefinition(items, difficultyLevels, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      options: difficultyLevels,
    })),
    scoring: { method: "formula", formula: "mean" },
    minScore: 1,
    maxScore: 5,
    descendingGood: true,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Levine DW, Simmons BP, Koris MJ, et al. A self-administered questionnaire for the assessment of severity of symptoms and functional status in carpal tunnel syndrome. J Bone Joint Surg Am. 1993;75(11):1585-1592.",
    },
  };
}

const calculationExplanationEn =
  "The Functional Status Scale score is the mean of 8 items, each rated from 1 (no difficulty) to 5 (cannot do at all due to hand or wrist symptoms), covering everyday tasks that depend on hand function. The result stays on the same 1 to 5 scale as the individual items — it is not converted to a 0-100 score. All 8 items must be answered. This is one of the two BCTQ subscales; the Symptom Severity Scale is scored and reported separately.";

const resultNoteEn = {
  label: "A higher score corresponds to greater functional limitation.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "Less limitation",
  highLabel: "More limitation",
};

const definitionEn = buildDefinition(ITEMS_EN, DIFFICULTY_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Boston Carpal Tunnel Questionnaire — Functional Status Scale",
  abbreviation: "BCTQ-FSS",
  description: "Measures difficulty performing 8 everyday hand-dependent tasks due to carpal tunnel symptoms, producing a mean score from 1 to 5.",
  population: "Adults with suspected or confirmed carpal tunnel syndrome",
  estimated_minutes_min: 2,
  estimated_minutes_max: 4,
  definition: JSON.stringify(definition),
  status: "published",
  position: 4,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "boston-ctq-functional-status", {
  slug: "boston-ctq-functional-status",
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
    "Boston Carpal Tunnel Questionnaire — Functional Status Scale",
    "BCTQ-FSS",
    "Measures difficulty performing 8 everyday hand-dependent tasks due to carpal tunnel symptoms, producing a mean score from 1 to 5.",
    "Adults with suspected or confirmed carpal tunnel syndrome",
    2,
    4,
    JSON.stringify(definitionEn),
    "published",
    4,
  ]
);

// ---------- Translations ----------

function translateDefinition(items, difficultyLevels, calculationExplanation, resultNote) {
  return buildDefinition(items, difficultyLevels, calculationExplanation, resultNote);
}

const DIFFICULTY_PT_PT = [
  { value: 1, label: "Sem dificuldade" },
  { value: 2, label: "Dificuldade ligeira" },
  { value: 3, label: "Dificuldade moderada" },
  { value: 4, label: "Dificuldade grave" },
  { value: 5, label: "Incapaz de fazer devido aos sintomas na mão ou pulso" },
];
const ITEMS_PT_PT = [
  { label: "Escrever" },
  { label: "Apertar botões da roupa" },
  { label: "Segurar um livro enquanto lê" },
  { label: "Segurar o auscultador do telefone" },
  { label: "Abrir frascos" },
  { label: "Tarefas domésticas" },
  { label: "Transportar sacos de compras" },
  { label: "Tomar banho e vestir-se" },
];
const calculationExplanationPtPt =
  "A pontuação da Escala de Estado Funcional é a média de 8 itens, cada um classificado de 1 (sem dificuldade) a 5 (incapaz de fazer devido aos sintomas na mão ou pulso), sobre tarefas do dia a dia que dependem da função da mão. O resultado mantém-se na mesma escala de 1 a 5 dos itens individuais — não é convertido numa pontuação de 0 a 100. Todos os 8 itens têm de ser respondidos. Esta é uma das duas subescalas do BCTQ; a Escala de Gravidade dos Sintomas é pontuada e reportada separadamente.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a maior limitação funcional.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Menor limitação",
  highLabel: "Maior limitação",
};

const DIFFICULTY_PT_BR = [
  { value: 1, label: "Sem dificuldade" },
  { value: 2, label: "Dificuldade leve" },
  { value: 3, label: "Dificuldade moderada" },
  { value: 4, label: "Dificuldade grave" },
  { value: 5, label: "Incapaz de fazer devido aos sintomas na mão ou punho" },
];
const ITEMS_PT_BR = [
  { label: "Escrever" },
  { label: "Abotoar roupas" },
  { label: "Segurar um livro enquanto lê" },
  { label: "Segurar o fone de telefone" },
  { label: "Abrir potes" },
  { label: "Tarefas domésticas" },
  { label: "Carregar sacolas de compras" },
  { label: "Tomar banho e se vestir" },
];
const calculationExplanationPtBr =
  "A pontuação da Escala de Status Funcional é a média de 8 itens, cada um classificado de 1 (sem dificuldade) a 5 (incapaz de fazer devido aos sintomas na mão ou punho), sobre tarefas do dia a dia que dependem da função da mão. O resultado permanece na mesma escala de 1 a 5 dos itens individuais — não é convertido em uma pontuação de 0 a 100. Todos os 8 itens precisam ser respondidos. Esta é uma das duas subescalas do BCTQ; a Escala de Gravidade dos Sintomas é pontuada e reportada separadamente.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a maior limitação funcional.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Menor limitação",
  highLabel: "Maior limitação",
};

const DIFFICULTY_ES = [
  { value: 1, label: "Sin dificultad" },
  { value: 2, label: "Dificultad leve" },
  { value: 3, label: "Dificultad moderada" },
  { value: 4, label: "Dificultad grave" },
  { value: 5, label: "Incapaz de hacerlo debido a los síntomas en la mano o muñeca" },
];
const ITEMS_ES = [
  { label: "Escribir" },
  { label: "Abrochar botones de la ropa" },
  { label: "Sostener un libro mientras lee" },
  { label: "Sujetar el auricular del teléfono" },
  { label: "Abrir frascos" },
  { label: "Tareas domésticas" },
  { label: "Cargar bolsas de la compra" },
  { label: "Bañarse y vestirse" },
];
const calculationExplanationEs =
  "La puntuación de la Escala de Estado Funcional es la media de 8 ítems, cada uno calificado de 1 (sin dificultad) a 5 (incapaz de hacerlo debido a los síntomas en la mano o muñeca), sobre tareas cotidianas que dependen de la función de la mano. El resultado se mantiene en la misma escala de 1 a 5 que los ítems individuales — no se convierte en una puntuación de 0 a 100. Los 8 ítems deben responderse. Esta es una de las dos subescalas del BCTQ; la Escala de Gravedad de los Síntomas se puntúa y reporta por separado.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a mayor limitación funcional.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Menor limitación",
  highLabel: "Mayor limitación",
};

function mergeItems(sourceItems, translatedItems) {
  return sourceItems.map((item, i) => ({ ...item, ...translatedItems[i] }));
}

const translations = [
  {
    locale: "pt-pt",
    name: "Questionário de Boston para o Túnel Cárpico — Escala de Estado Funcional",
    description: "Mede a dificuldade em realizar 8 tarefas do dia a dia que dependem da mão, devido aos sintomas do túnel cárpico, produzindo uma pontuação média de 1 a 5.",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_PT), DIFFICULTY_PT_PT, calculationExplanationPtPt, resultNotePtPt),
  },
  {
    locale: "pt-br",
    name: "Questionário de Boston para Túnel do Carpo — Escala de Status Funcional",
    description: "Mede a dificuldade em realizar 8 tarefas do dia a dia que dependem da mão, devido aos sintomas da síndrome do túnel do carpo, gerando uma pontuação média de 1 a 5.",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_BR), DIFFICULTY_PT_BR, calculationExplanationPtBr, resultNotePtBr),
  },
  {
    locale: "es",
    name: "Cuestionario de Boston para el Túnel Carpiano — Escala de Estado Funcional",
    description: "Mide la dificultad para realizar 8 tareas cotidianas que dependen de la mano, debido a los síntomas del túnel carpiano, generando una puntuación media de 1 a 5.",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_ES), DIFFICULTY_ES, calculationExplanationEs, resultNoteEs),
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

console.log("Boston CTQ Functional Status Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
