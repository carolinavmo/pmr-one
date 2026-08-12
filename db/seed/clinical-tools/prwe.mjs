// PRWE (Patient-Rated Wrist Evaluation) — third calculator in the
// "Upper Limb Function" category, third to exercise formula scoring.
// 15 items: 5 pain (rated over the past week) + 10 function, split
// into 6 "specific activities" and 4 "usual activities" — each an
// 11-point 0-10 numeric rating scale (only the endpoints labeled,
// same presentation as SPADI).
//
// Formula (registered in calculator-scoring.ts): the 5 pain items are
// summed directly (0-50); the 10 function items are summed then
// halved (0-50), so both subscales carry equal weight; the total is
// their sum (0-100) — see the "prwe" entry in FORMULAS.
// descendingGood: true (0 = best on every item).
//
// Freely available for clinical use (MacDermid 1996); no proprietary
// flag needed. No dedicated sralab.org page was found — source is
// given without a url, matching the "never guess a URL" convention.
//
// Usage: node db/seed/clinical-tools/prwe.mjs
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

// ---------- Shared rubrics (English source) ----------

function numericScale(lowLabel, highLabel) {
  return Array.from({ length: 11 }, (_, value) => ({
    value,
    label: String(value),
    description: value === 0 ? lowLabel : value === 10 ? highLabel : undefined,
  }));
}
const PAIN_SCALE_EN = numericScale("No pain", "Worst pain ever experienced");
const FUNCTION_SCALE_EN = numericScale("No difficulty", "Unable to do");

const ITEMS_EN = [
  { id: "pain_rest", section: "Pain", label: "Pain at rest", rubric: "pain" },
  { id: "pain_repeated_motion", section: "Pain", label: "Pain with a repeated wrist movement", rubric: "pain" },
  { id: "pain_lifting", section: "Pain", label: "Pain when lifting a heavy object", rubric: "pain" },
  { id: "pain_worst", section: "Pain", label: "Pain at its worst", rubric: "pain" },
  { id: "pain_frequency", section: "Pain", label: "How often you have pain", rubric: "pain" },
  { id: "turn_doorknob", section: "Specific activities", label: "Turn a doorknob using the affected hand", rubric: "function" },
  { id: "cut_meat", section: "Specific activities", label: "Cut meat using a knife in the affected hand", rubric: "function" },
  { id: "fasten_buttons", section: "Specific activities", label: "Fasten buttons on a shirt", rubric: "function" },
  { id: "push_up_from_chair", section: "Specific activities", label: "Use the affected hand to push up from a chair", rubric: "function" },
  { id: "carry_object", section: "Specific activities", label: "Carry a 4.5 kg (10 lb) object in the affected hand", rubric: "function" },
  { id: "use_bathroom_tissue", section: "Specific activities", label: "Use bathroom tissue with the affected hand", rubric: "function" },
  { id: "personal_care", section: "Usual activities", label: "Personal care activities (dressing, washing)", rubric: "function" },
  { id: "household_work", section: "Usual activities", label: "Household work (cleaning, maintenance)", rubric: "function" },
  { id: "work", section: "Usual activities", label: "Work (your usual job or everyday work)", rubric: "function" },
  { id: "recreational_activities", section: "Usual activities", label: "Recreational activities", rubric: "function" },
];

function buildDefinition(items, rubrics, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({
      id: item.id,
      section: item.section,
      label: item.label,
      numericScale: true,
      options: rubrics[item.rubric],
    })),
    scoring: { method: "formula", formula: "prwe" },
    minScore: 0,
    maxScore: 100,
    descendingGood: true,
    calculationExplanation,
    resultNote,
    source: {
      citation: "MacDermid JC. Development of a scale for patient rating of wrist pain and disability. J Hand Ther. 1996;9(2):178-183.",
    },
  };
}

const calculationExplanationEn =
  "The PRWE score combines a pain subscale and a function subscale, each item rated 0 (no pain/no difficulty) to 10 (worst pain ever/unable to do). The 5 pain items are summed directly, for a subtotal from 0 to 50. The 10 function items — 6 on specific wrist-demanding activities and 4 on broader usual activities — are summed and then halved, also giving a subtotal from 0 to 50. The pain and function subtotals are added together for a final score from 0 to 100, with a higher score indicating greater pain and disability. All 15 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to greater pain and disability.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "Less pain and disability",
  highLabel: "More pain and disability",
};

const RUBRICS_EN = { pain: PAIN_SCALE_EN, function: FUNCTION_SCALE_EN };

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Patient-Rated Wrist Evaluation",
  abbreviation: "PRWE",
  description: "Measures wrist pain and disability across 15 items, producing a score out of 100 that reflects the degree of pain and functional limitation.",
  population: "Adults with wrist pain or dysfunction, e.g. after a distal radius fracture",
  estimated_minutes_min: 3,
  estimated_minutes_max: 6,
  definition: JSON.stringify(definition),
  status: "published",
  position: 2,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "prwe", {
  slug: "prwe",
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
    "Patient-Rated Wrist Evaluation",
    "PRWE",
    "Measures wrist pain and disability across 15 items, producing a score out of 100 that reflects the degree of pain and functional limitation.",
    "Adults with wrist pain or dysfunction, e.g. after a distal radius fracture",
    3,
    6,
    JSON.stringify(definitionEn),
    "published",
    2,
  ]
);

// ---------- Translations ----------

function translateDefinition(items, rubrics, calculationExplanation, resultNote) {
  return buildDefinition(items, rubrics, calculationExplanation, resultNote);
}

const PAIN_SCALE_PT_PT = numericScale("Sem dor", "Pior dor já sentida");
const FUNCTION_SCALE_PT_PT = numericScale("Sem dificuldade", "Incapaz de fazer");
const ITEMS_PT_PT = [
  { section: "Dor", label: "Dor em repouso" },
  { section: "Dor", label: "Dor com um movimento repetido do pulso" },
  { section: "Dor", label: "Dor ao levantar um objeto pesado" },
  { section: "Dor", label: "Dor no seu pior" },
  { section: "Dor", label: "Com que frequência sente dor" },
  { section: "Atividades específicas", label: "Rodar um puxador de porta com a mão afetada" },
  { section: "Atividades específicas", label: "Cortar carne com uma faca na mão afetada" },
  { section: "Atividades específicas", label: "Apertar botões numa camisa" },
  { section: "Atividades específicas", label: "Usar a mão afetada para se levantar de uma cadeira" },
  { section: "Atividades específicas", label: "Transportar um objeto de 4,5 kg na mão afetada" },
  { section: "Atividades específicas", label: "Usar papel higiénico com a mão afetada" },
  { section: "Atividades habituais", label: "Cuidados pessoais (vestir-se, lavar-se)" },
  { section: "Atividades habituais", label: "Trabalho doméstico (limpeza, manutenção)" },
  { section: "Atividades habituais", label: "Trabalho (o seu trabalho habitual ou tarefas do dia a dia)" },
  { section: "Atividades habituais", label: "Atividades recreativas" },
];
const calculationExplanationPtPt =
  "A pontuação do PRWE combina uma subescala de dor e uma subescala de função, cada item classificado de 0 (sem dor/sem dificuldade) a 10 (pior dor já sentida/incapaz de fazer). Os 5 itens de dor são somados diretamente, para um subtotal de 0 a 50. Os 10 itens de função — 6 sobre atividades específicas que exigem o pulso e 4 sobre atividades habituais mais amplas — são somados e depois divididos por dois, obtendo também um subtotal de 0 a 50. Os subtotais de dor e função são somados para uma pontuação final de 0 a 100, sendo que uma pontuação mais elevada indica maior dor e incapacidade. Todos os 15 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a maior dor e incapacidade.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Menor dor e incapacidade",
  highLabel: "Maior dor e incapacidade",
};

const PAIN_SCALE_PT_BR = numericScale("Sem dor", "Pior dor já sentida");
const FUNCTION_SCALE_PT_BR = numericScale("Sem dificuldade", "Incapaz de fazer");
const ITEMS_PT_BR = [
  { section: "Dor", label: "Dor em repouso" },
  { section: "Dor", label: "Dor com um movimento repetido do punho" },
  { section: "Dor", label: "Dor ao levantar um objeto pesado" },
  { section: "Dor", label: "Dor no seu pior" },
  { section: "Dor", label: "Com que frequência você sente dor" },
  { section: "Atividades específicas", label: "Girar a maçaneta de uma porta com a mão afetada" },
  { section: "Atividades específicas", label: "Cortar carne com uma faca na mão afetada" },
  { section: "Atividades específicas", label: "Abotoar uma camisa" },
  { section: "Atividades específicas", label: "Usar a mão afetada para se levantar de uma cadeira" },
  { section: "Atividades específicas", label: "Carregar um objeto de 4,5 kg na mão afetada" },
  { section: "Atividades específicas", label: "Usar papel higiênico com a mão afetada" },
  { section: "Atividades habituais", label: "Cuidados pessoais (vestir-se, lavar-se)" },
  { section: "Atividades habituais", label: "Trabalho doméstico (limpeza, manutenção)" },
  { section: "Atividades habituais", label: "Trabalho (seu trabalho habitual ou tarefas do dia a dia)" },
  { section: "Atividades habituais", label: "Atividades recreativas" },
];
const calculationExplanationPtBr =
  "A pontuação do PRWE combina uma subescala de dor e uma subescala de função, cada item classificado de 0 (sem dor/sem dificuldade) a 10 (pior dor já sentida/incapaz de fazer). Os 5 itens de dor são somados diretamente, para um subtotal de 0 a 50. Os 10 itens de função — 6 sobre atividades específicas que exigem o punho e 4 sobre atividades habituais mais amplas — são somados e depois divididos por dois, obtendo também um subtotal de 0 a 50. Os subtotais de dor e função são somados para uma pontuação final de 0 a 100, sendo que uma pontuação mais alta indica maior dor e incapacidade. Todos os 15 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a maior dor e incapacidade.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Menor dor e incapacidade",
  highLabel: "Maior dor e incapacidade",
};

const PAIN_SCALE_ES = numericScale("Sin dolor", "El peor dolor jamás sentido");
const FUNCTION_SCALE_ES = numericScale("Sin dificultad", "Incapaz de hacerlo");
const ITEMS_ES = [
  { section: "Dolor", label: "Dolor en reposo" },
  { section: "Dolor", label: "Dolor con un movimiento repetido de la muñeca" },
  { section: "Dolor", label: "Dolor al levantar un objeto pesado" },
  { section: "Dolor", label: "Dolor en su peor momento" },
  { section: "Dolor", label: "Con qué frecuencia siente dolor" },
  { section: "Actividades específicas", label: "Girar el pomo de una puerta con la mano afectada" },
  { section: "Actividades específicas", label: "Cortar carne con un cuchillo en la mano afectada" },
  { section: "Actividades específicas", label: "Abrochar botones en una camisa" },
  { section: "Actividades específicas", label: "Usar la mano afectada para levantarse de una silla" },
  { section: "Actividades específicas", label: "Cargar un objeto de 4,5 kg en la mano afectada" },
  { section: "Actividades específicas", label: "Usar papel higiénico con la mano afectada" },
  { section: "Actividades habituales", label: "Cuidado personal (vestirse, lavarse)" },
  { section: "Actividades habituales", label: "Trabajo doméstico (limpieza, mantenimiento)" },
  { section: "Actividades habituales", label: "Trabajo (su trabajo habitual o tareas cotidianas)" },
  { section: "Actividades habituales", label: "Actividades recreativas" },
];
const calculationExplanationEs =
  "La puntuación del PRWE combina una subescala de dolor y una subescala de función, cada ítem calificado de 0 (sin dolor/sin dificultad) a 10 (el peor dolor jamás sentido/incapaz de hacerlo). Los 5 ítems de dolor se suman directamente, para un subtotal de 0 a 50. Los 10 ítems de función — 6 sobre actividades específicas que exigen la muñeca y 4 sobre actividades habituales más amplias — se suman y luego se dividen entre dos, obteniendo también un subtotal de 0 a 50. Los subtotales de dolor y función se suman para una puntuación final de 0 a 100, donde una puntuación más alta indica mayor dolor y discapacidad. Los 15 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a mayor dolor y discapacidad.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Menor dolor y discapacidad",
  highLabel: "Mayor dolor y discapacidad",
};

function mergeItems(sourceItems, translatedItems) {
  return sourceItems.map((item, i) => ({ ...item, ...translatedItems[i] }));
}

const translations = [
  {
    locale: "pt-pt",
    name: "Avaliação do Pulso Classificada pelo Doente",
    description: "Mede a dor e a incapacidade do pulso em 15 itens, produzindo uma pontuação em 100 que reflete o grau de dor e limitação funcional.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_PT),
      { pain: PAIN_SCALE_PT_PT, function: FUNCTION_SCALE_PT_PT },
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Avaliação do Punho Classificada pelo Paciente",
    description: "Mede a dor e a incapacidade do punho em 15 itens, gerando uma pontuação em 100 que reflete o grau de dor e limitação funcional.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_BR),
      { pain: PAIN_SCALE_PT_BR, function: FUNCTION_SCALE_PT_BR },
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "Evaluación de la Muñeca Calificada por el Paciente",
    description: "Mide el dolor y la discapacidad de la muñeca en 15 ítems, generando una puntuación sobre 100 que refleja el grado de dolor y limitación funcional.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_ES),
      { pain: PAIN_SCALE_ES, function: FUNCTION_SCALE_ES },
      calculationExplanationEs,
      resultNoteEs
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

console.log("PRWE seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
