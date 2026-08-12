// HOOS-12 — the real validated 12-item short form of HOOS (Hip
// disability and Osteoarthritis Outcome Score), the hip counterpart to
// koos-12.mjs, per: Gandek B, Roos EM, Franklin PD, Ware JE Jr. A
// 12-item short form of the Hip disability and Osteoarthritis Outcome
// Score (HOOS-12): tests of reliability, validity and responsiveness.
// Osteoarthritis Cartilage. 2019;27(11):1495-1503. PMID 30419279.
//
// Structure confirmed from the published abstract: 4 Pain items
// (frequency + pain during sitting/lying, walking, stairs — identical
// pattern to KOOS-12), 4 Function items (standing, rising from
// sitting, getting in/out of a car, walking on an uneven surface —
// note this differs from KOOS-12's 4th Function item, which is
// twisting/pivoting), and the standard 4-item HOOS QOL scale
// (unchanged from the full HOOS). The paper reports domain-specific
// scores AND a "summary hip impact score" — the same dual-scoring
// pattern that legitimizes this app's single-combined-card design.
//
// Item wording paraphrased in this app's own words, not copied
// verbatim — same convention as every other proprietary instrument.
// proprietary: true for the "non-official calculator" notice.
//
// Scored via the shared "koos" formula (calculator-scoring.ts):
// 100 - (mean/4)*100, so higher = better.
//
// Usage: node db/seed/clinical-tools/hoos-12.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "lower-limb-function", {
  slug: "lower-limb-function",
  name: "Lower Limb Function",
  color: "green",
  position: 5,
});

const SEVERITY_EN = [
  { value: 0, label: "None" },
  { value: 1, label: "Mild" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Severe" },
  { value: 4, label: "Extreme" },
];
const FREQUENCY_PAIN_EN = [
  { value: 0, label: "Never" },
  { value: 1, label: "Monthly" },
  { value: 2, label: "Weekly" },
  { value: 3, label: "Daily" },
  { value: 4, label: "Always" },
];
const FREQUENCY_QOL_EN = [
  { value: 0, label: "Never" },
  { value: 1, label: "Monthly" },
  { value: 2, label: "Weekly" },
  { value: 3, label: "Daily" },
  { value: 4, label: "Constantly" },
];
const LIFESTYLE_EN = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Mildly" },
  { value: 2, label: "Moderately" },
  { value: 3, label: "Severely" },
  { value: 4, label: "Totally" },
];
const CONFIDENCE_EN = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Mildly" },
  { value: 2, label: "Moderately" },
  { value: 3, label: "Severely" },
  { value: 4, label: "Extremely" },
];

const PAIN_INSTR_EN = "Over the past week, rate the amount of hip pain you have experienced during this activity.";
const FN_INSTR_EN = "Over the past week, rate the degree of difficulty you have experienced with this activity because of your hip.";
const QOL_INSTR_EN = "These last four questions concern how aware you are of your hip problem and how it affects your everyday life, not a specific activity.";

const ITEMS_EN = [
  { id: "pain_frequency", section: "Pain", label: "How often do you experience hip pain?", instructions: "Over the past week.", rubric: "frequency_pain" },
  { id: "pain_sitting", section: "Pain", label: "Sitting or lying down", instructions: PAIN_INSTR_EN, rubric: "severity" },
  { id: "pain_walking", section: "Pain", label: "Walking on a flat surface", instructions: PAIN_INSTR_EN, rubric: "severity" },
  { id: "pain_stairs", section: "Pain", label: "Going up or down stairs", instructions: PAIN_INSTR_EN, rubric: "severity" },
  { id: "fn_standing", section: "Function", label: "Standing", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "fn_rising_sitting", section: "Function", label: "Rising from sitting", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "fn_car", section: "Function", label: "Getting into or out of a car", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "fn_walking_uneven", section: "Function", label: "Walking on an uneven surface", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "qol_awareness", section: "Quality of Life", label: "How often are you aware of your hip problem?", instructions: QOL_INSTR_EN, rubric: "frequency_qol" },
  { id: "qol_lifestyle", section: "Quality of Life", label: "Have you modified your lifestyle to avoid activities that could damage your hip?", instructions: QOL_INSTR_EN, rubric: "lifestyle" },
  { id: "qol_confidence", section: "Quality of Life", label: "How much are you troubled by a lack of confidence in your hip?", instructions: QOL_INSTR_EN, rubric: "confidence" },
  { id: "qol_difficulty_general", section: "Quality of Life", label: "In general, how much difficulty do you have with your hip?", instructions: QOL_INSTR_EN, rubric: "severity" },
];

function buildDefinition(items, rubrics, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({ id: item.id, section: item.section, label: item.label, instructions: item.instructions, options: rubrics[item.rubric] })),
    scoring: { method: "formula", formula: "koos" },
    minScore: 0,
    maxScore: 100,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Gandek B, Roos EM, Franklin PD, Ware JE Jr. A 12-item short form of the Hip disability and Osteoarthritis Outcome Score (HOOS-12): tests of reliability, validity and responsiveness. Osteoarthritis Cartilage. 2019;27(11):1495-1503.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30419279/",
    },
    proprietary: true,
  };
}

const RUBRICS_EN = { severity: SEVERITY_EN, frequency_pain: FREQUENCY_PAIN_EN, frequency_qol: FREQUENCY_QOL_EN, lifestyle: LIFESTYLE_EN, confidence: CONFIDENCE_EN };

const calculationExplanationEn =
  "HOOS-12 is the validated 12-item short form of the HOOS, covering Pain (4 items), Function (4 items), and Quality of Life (4 items, unchanged from the full HOOS). Each item is scored 0 (no problem) to 4 (extreme problem). The mean of the answered items is calculated, then inverted and rescaled to a 0-100 score — the instrument's own \"summary hip impact score\" — so 100 means no hip problems and 0 means extreme problems on every item. All 12 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to fewer hip problems.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "More problems",
  highLabel: "Fewer problems",
};

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "HOOS-12",
  abbreviation: "HOOS-12",
  description: "The validated 12-item short form of the HOOS, covering hip pain, function, and quality of life, producing a summary score out of 100 (100 = no problems).",
  population: "Adults with hip injury or hip osteoarthritis",
  estimated_minutes_min: 2,
  estimated_minutes_max: 4,
  definition: JSON.stringify(definition),
  status: "published",
  position: 2,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "hoos-12", {
  slug: "hoos-12",
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
    "HOOS-12",
    "HOOS-12",
    "The validated 12-item short form of the HOOS, covering hip pain, function, and quality of life, producing a summary score out of 100 (100 = no problems).",
    "Adults with hip injury or hip osteoarthritis",
    2,
    4,
    JSON.stringify(definitionEn),
    "published",
    2,
  ]
);

// ---------- Translations ----------

function translateDefinition(items, rubrics, calculationExplanation, resultNote) {
  return buildDefinition(items, rubrics, calculationExplanation, resultNote);
}

function mergeItems(sourceItems, translatedItems) {
  return sourceItems.map((item, i) => ({ ...item, ...translatedItems[i] }));
}

const SEVERITY_PT_PT = [
  { value: 0, label: "Nenhuma" }, { value: 1, label: "Ligeira" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" }, { value: 4, label: "Extrema" },
];
const FREQUENCY_PAIN_PT_PT = [
  { value: 0, label: "Nunca" }, { value: 1, label: "Mensalmente" }, { value: 2, label: "Semanalmente" }, { value: 3, label: "Diariamente" }, { value: 4, label: "Sempre" },
];
const FREQUENCY_QOL_PT_PT = [
  { value: 0, label: "Nunca" }, { value: 1, label: "Mensalmente" }, { value: 2, label: "Semanalmente" }, { value: 3, label: "Diariamente" }, { value: 4, label: "Constantemente" },
];
const LIFESTYLE_PT_PT = [
  { value: 0, label: "Nada" }, { value: 1, label: "Ligeiramente" }, { value: 2, label: "Moderadamente" }, { value: 3, label: "Gravemente" }, { value: 4, label: "Totalmente" },
];
const CONFIDENCE_PT_PT = [
  { value: 0, label: "Nada" }, { value: 1, label: "Ligeiramente" }, { value: 2, label: "Moderadamente" }, { value: 3, label: "Gravemente" }, { value: 4, label: "Extremamente" },
];
const PAIN_INSTR_PT_PT = "Na última semana, avalie a intensidade da dor na anca que sentiu durante esta atividade.";
const FN_INSTR_PT_PT = "Na última semana, avalie o grau de dificuldade que sentiu nesta atividade por causa da anca.";
const QOL_INSTR_PT_PT = "Estas últimas quatro perguntas dizem respeito à consciência que tem do problema na anca e ao impacto no seu dia a dia, não a uma atividade específica.";
const ITEMS_PT_PT = [
  { section: "Dor", label: "Com que frequência sente dor na anca?", instructions: "Na última semana." },
  { section: "Dor", label: "Sentado ou deitado", instructions: PAIN_INSTR_PT_PT },
  { section: "Dor", label: "Ao caminhar em superfície plana", instructions: PAIN_INSTR_PT_PT },
  { section: "Dor", label: "Ao subir ou descer escadas", instructions: PAIN_INSTR_PT_PT },
  { section: "Função", label: "Estar de pé", instructions: FN_INSTR_PT_PT },
  { section: "Função", label: "Levantar-se de estar sentado", instructions: FN_INSTR_PT_PT },
  { section: "Função", label: "Entrar ou sair de um carro", instructions: FN_INSTR_PT_PT },
  { section: "Função", label: "Andar em superfície irregular", instructions: FN_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Com que frequência está consciente do problema na anca?", instructions: QOL_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Modificou o seu estilo de vida para evitar atividades que possam prejudicar a anca?", instructions: QOL_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Em que medida a falta de confiança na anca o(a) incomoda?", instructions: QOL_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Em geral, que dificuldade sente com a sua anca?", instructions: QOL_INSTR_PT_PT },
];
const calculationExplanationPtPt =
  "O HOOS-12 é a versão curta validada de 12 itens da HOOS, cobrindo Dor (4 itens), Função (4 itens) e Qualidade de Vida (4 itens, sem alterações em relação à HOOS completa). Cada item é pontuado de 0 (nenhum problema) a 4 (problema extremo). Calcula-se a média dos itens respondidos, inverte-se e reescala-se para uma pontuação de 0 a 100 — a \"pontuação sumária de impacto na anca\" do próprio instrumento — pelo que 100 significa ausência de problemas na anca e 0 significa problemas extremos em todos os itens. Todos os 12 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a menos problemas na anca.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Mais problemas",
  highLabel: "Menos problemas",
};

const SEVERITY_PT_BR = [
  { value: 0, label: "Nenhuma" }, { value: 1, label: "Leve" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" }, { value: 4, label: "Extrema" },
];
const FREQUENCY_PAIN_PT_BR = [
  { value: 0, label: "Nunca" }, { value: 1, label: "Mensalmente" }, { value: 2, label: "Semanalmente" }, { value: 3, label: "Diariamente" }, { value: 4, label: "Sempre" },
];
const FREQUENCY_QOL_PT_BR = [
  { value: 0, label: "Nunca" }, { value: 1, label: "Mensalmente" }, { value: 2, label: "Semanalmente" }, { value: 3, label: "Diariamente" }, { value: 4, label: "Constantemente" },
];
const LIFESTYLE_PT_BR = [
  { value: 0, label: "Nada" }, { value: 1, label: "Levemente" }, { value: 2, label: "Moderadamente" }, { value: 3, label: "Gravemente" }, { value: 4, label: "Totalmente" },
];
const CONFIDENCE_PT_BR = [
  { value: 0, label: "Nada" }, { value: 1, label: "Levemente" }, { value: 2, label: "Moderadamente" }, { value: 3, label: "Gravemente" }, { value: 4, label: "Extremamente" },
];
const PAIN_INSTR_PT_BR = "Na última semana, avalie a intensidade da dor no quadril que você sentiu durante esta atividade.";
const FN_INSTR_PT_BR = "Na última semana, avalie o grau de dificuldade que você sentiu nesta atividade por causa do quadril.";
const QOL_INSTR_PT_BR = "Estas últimas quatro perguntas dizem respeito ao quanto você percebe o problema no quadril e ao impacto no seu dia a dia, não a uma atividade específica.";
const ITEMS_PT_BR = [
  { section: "Dor", label: "Com que frequência você sente dor no quadril?", instructions: "Na última semana." },
  { section: "Dor", label: "Sentado ou deitado", instructions: PAIN_INSTR_PT_BR },
  { section: "Dor", label: "Ao andar em superfície plana", instructions: PAIN_INSTR_PT_BR },
  { section: "Dor", label: "Ao subir ou descer escadas", instructions: PAIN_INSTR_PT_BR },
  { section: "Função", label: "Ficar em pé", instructions: FN_INSTR_PT_BR },
  { section: "Função", label: "Levantar-se de estar sentado", instructions: FN_INSTR_PT_BR },
  { section: "Função", label: "Entrar ou sair de um carro", instructions: FN_INSTR_PT_BR },
  { section: "Função", label: "Andar em superfície irregular", instructions: FN_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "Com que frequência você está consciente do problema no quadril?", instructions: QOL_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "Você modificou seu estilo de vida para evitar atividades que possam prejudicar o quadril?", instructions: QOL_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "O quanto a falta de confiança no quadril te incomoda?", instructions: QOL_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "Em geral, qual o grau de dificuldade que você sente com o seu quadril?", instructions: QOL_INSTR_PT_BR },
];
const calculationExplanationPtBr =
  "O HOOS-12 é a versão curta validada de 12 itens da HOOS, cobrindo Dor (4 itens), Função (4 itens) e Qualidade de Vida (4 itens, sem alterações em relação à HOOS completa). Cada item é pontuado de 0 (nenhum problema) a 4 (problema extremo). Calcula-se a média dos itens respondidos, inverte-se e reescala-se para uma pontuação de 0 a 100 — a \"pontuação resumo de impacto no quadril\" do próprio instrumento — de forma que 100 significa ausência de problemas no quadril e 0 significa problemas extremos em todos os itens. Todos os 12 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a menos problemas no quadril.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Mais problemas",
  highLabel: "Menos problemas",
};

const SEVERITY_ES = [
  { value: 0, label: "Ninguna" }, { value: 1, label: "Leve" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" }, { value: 4, label: "Extrema" },
];
const FREQUENCY_PAIN_ES = [
  { value: 0, label: "Nunca" }, { value: 1, label: "Mensualmente" }, { value: 2, label: "Semanalmente" }, { value: 3, label: "Diariamente" }, { value: 4, label: "Siempre" },
];
const FREQUENCY_QOL_ES = [
  { value: 0, label: "Nunca" }, { value: 1, label: "Mensualmente" }, { value: 2, label: "Semanalmente" }, { value: 3, label: "Diariamente" }, { value: 4, label: "Constantemente" },
];
const LIFESTYLE_ES = [
  { value: 0, label: "Nada" }, { value: 1, label: "Levemente" }, { value: 2, label: "Moderadamente" }, { value: 3, label: "Gravemente" }, { value: 4, label: "Totalmente" },
];
const CONFIDENCE_ES = [
  { value: 0, label: "Nada" }, { value: 1, label: "Levemente" }, { value: 2, label: "Moderadamente" }, { value: 3, label: "Gravemente" }, { value: 4, label: "Extremadamente" },
];
const PAIN_INSTR_ES = "En la última semana, valore la cantidad de dolor de cadera que ha sentido durante esta actividad.";
const FN_INSTR_ES = "En la última semana, valore el grado de dificultad que ha sentido en esta actividad debido a su cadera.";
const QOL_INSTR_ES = "Estas últimas cuatro preguntas se refieren a lo consciente que es del problema en su cadera y a cómo afecta a su vida diaria, no a una actividad específica.";
const ITEMS_ES = [
  { section: "Dolor", label: "¿Con qué frecuencia siente dolor en la cadera?", instructions: "En la última semana." },
  { section: "Dolor", label: "Sentado o acostado", instructions: PAIN_INSTR_ES },
  { section: "Dolor", label: "Al caminar sobre superficie plana", instructions: PAIN_INSTR_ES },
  { section: "Dolor", label: "Al subir o bajar escaleras", instructions: PAIN_INSTR_ES },
  { section: "Función", label: "De pie", instructions: FN_INSTR_ES },
  { section: "Función", label: "Levantarse de estar sentado", instructions: FN_INSTR_ES },
  { section: "Función", label: "Entrar o salir de un coche", instructions: FN_INSTR_ES },
  { section: "Función", label: "Caminar sobre superficie irregular", instructions: FN_INSTR_ES },
  { section: "Calidad de Vida", label: "¿Con qué frecuencia es consciente del problema en su cadera?", instructions: QOL_INSTR_ES },
  { section: "Calidad de Vida", label: "¿Ha modificado su estilo de vida para evitar actividades que puedan dañar su cadera?", instructions: QOL_INSTR_ES },
  { section: "Calidad de Vida", label: "¿Cuánto le molesta la falta de confianza en su cadera?", instructions: QOL_INSTR_ES },
  { section: "Calidad de Vida", label: "En general, ¿cuánta dificultad tiene con su cadera?", instructions: QOL_INSTR_ES },
];
const calculationExplanationEs =
  "El HOOS-12 es la forma corta validada de 12 ítems de la HOOS, que cubre Dolor (4 ítems), Función (4 ítems) y Calidad de Vida (4 ítems, sin cambios respecto a la HOOS completa). Cada ítem se puntúa de 0 (ningún problema) a 4 (problema extremo). Se calcula la media de los ítems respondidos, se invierte y se reescala a una puntuación de 0 a 100 — la \"puntuación resumen de impacto en la cadera\" del propio instrumento — por lo que 100 significa ausencia de problemas de cadera y 0 significa problemas extremos en todos los ítems. Los 12 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a menos problemas de cadera.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Más problemas",
  highLabel: "Menos problemas",
};

const translations = [
  {
    locale: "pt-pt",
    name: "HOOS-12",
    description: "A versão curta validada de 12 itens da HOOS, cobrindo a dor, a função e a qualidade de vida da anca, produzindo uma pontuação sumária em 100 (100 = sem problemas).",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_PT), { severity: SEVERITY_PT_PT, frequency_pain: FREQUENCY_PAIN_PT_PT, frequency_qol: FREQUENCY_QOL_PT_PT, lifestyle: LIFESTYLE_PT_PT, confidence: CONFIDENCE_PT_PT }, calculationExplanationPtPt, resultNotePtPt),
  },
  {
    locale: "pt-br",
    name: "HOOS-12",
    description: "A versão curta validada de 12 itens da HOOS, cobrindo a dor, a função e a qualidade de vida do quadril, gerando uma pontuação resumo em 100 (100 = sem problemas).",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_BR), { severity: SEVERITY_PT_BR, frequency_pain: FREQUENCY_PAIN_PT_BR, frequency_qol: FREQUENCY_QOL_PT_BR, lifestyle: LIFESTYLE_PT_BR, confidence: CONFIDENCE_PT_BR }, calculationExplanationPtBr, resultNotePtBr),
  },
  {
    locale: "es",
    name: "HOOS-12",
    description: "La forma corta validada de 12 ítems de la HOOS, que cubre el dolor, la función y la calidad de vida de la cadera, generando una puntuación resumen sobre 100 (100 = sin problemas).",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_ES), { severity: SEVERITY_ES, frequency_pain: FREQUENCY_PAIN_ES, frequency_qol: FREQUENCY_QOL_ES, lifestyle: LIFESTYLE_ES, confidence: CONFIDENCE_ES }, calculationExplanationEs, resultNoteEs),
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

console.log("HOOS-12 seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
