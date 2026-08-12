// KOOS-12 — the real validated 12-item short form of KOOS (Knee
// injury and Osteoarthritis Outcome Score), per:
// Gandek B, Roos EM, Franklin PD, Ware JE Jr. A 12-item short form of
// the Knee injury and Osteoarthritis Outcome Score (KOOS-12): tests of
// reliability, validity and responsiveness. Osteoarthritis Cartilage.
// 2019;27(5):762-770. PMID 30716536.
//
// Structure confirmed from the published abstract: 4 Pain items
// (frequency + pain during sitting/lying, walking, stairs), 4 Function
// items (standing, rising from sitting, getting in/out of a car,
// twisting/pivoting), and the standard 4-item KOOS QOL scale
// (unchanged from the full KOOS). The paper reports BOTH the 3 domain
// scores AND a combined "summary knee impact score" — which is what
// legitimizes this app's single-combined-card design (a genuine part
// of the instrument, not just a simplification for this app).
//
// Item wording here is paraphrased in this app's own words, not
// copied verbatim from the copyrighted questionnaire — same
// non-verbatim convention as every other proprietary instrument in
// this app (DASH, FIM, LEFS, ...). proprietary: true for the same
// "non-official calculator" notice.
//
// Scored via the shared "koos" formula (calculator-scoring.ts):
// 100 - (mean/4)*100, so higher = better, matching KOOS's convention
// (this reproduces the paper's "summary knee impact score" transform).
//
// Usage: node db/seed/clinical-tools/koos-12.mjs
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

const PAIN_INSTR_EN = "Over the past week, rate the amount of knee pain you have experienced during this activity.";
const FN_INSTR_EN = "Over the past week, rate the degree of difficulty you have experienced with this activity because of your knee.";
const QOL_INSTR_EN = "These last four questions concern how aware you are of your knee problem and how it affects your everyday life, not a specific activity.";

const ITEMS_EN = [
  { id: "pain_frequency", section: "Pain", label: "How often do you experience knee pain?", instructions: "Over the past week.", rubric: "frequency_pain" },
  { id: "pain_sitting", section: "Pain", label: "Sitting or lying down", instructions: PAIN_INSTR_EN, rubric: "severity" },
  { id: "pain_walking", section: "Pain", label: "Walking on a flat surface", instructions: PAIN_INSTR_EN, rubric: "severity" },
  { id: "pain_stairs", section: "Pain", label: "Going up or down stairs", instructions: PAIN_INSTR_EN, rubric: "severity" },
  { id: "fn_standing", section: "Function", label: "Standing", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "fn_rising_sitting", section: "Function", label: "Rising from sitting", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "fn_car", section: "Function", label: "Getting into or out of a car", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "fn_twisting", section: "Function", label: "Twisting or pivoting on your knee", instructions: FN_INSTR_EN, rubric: "severity" },
  { id: "qol_awareness", section: "Quality of Life", label: "How often are you aware of your knee problem?", instructions: QOL_INSTR_EN, rubric: "frequency_qol" },
  { id: "qol_lifestyle", section: "Quality of Life", label: "Have you modified your lifestyle to avoid activities that could damage your knee?", instructions: QOL_INSTR_EN, rubric: "lifestyle" },
  { id: "qol_confidence", section: "Quality of Life", label: "How much are you troubled by a lack of confidence in your knee?", instructions: QOL_INSTR_EN, rubric: "confidence" },
  { id: "qol_difficulty_general", section: "Quality of Life", label: "In general, how much difficulty do you have with your knee?", instructions: QOL_INSTR_EN, rubric: "severity" },
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
      citation: "Gandek B, Roos EM, Franklin PD, Ware JE Jr. A 12-item short form of the Knee injury and Osteoarthritis Outcome Score (KOOS-12): tests of reliability, validity and responsiveness. Osteoarthritis Cartilage. 2019;27(5):762-770.",
      url: "https://pubmed.ncbi.nlm.nih.gov/30716536/",
    },
    proprietary: true,
  };
}

const RUBRICS_EN = { severity: SEVERITY_EN, frequency_pain: FREQUENCY_PAIN_EN, frequency_qol: FREQUENCY_QOL_EN, lifestyle: LIFESTYLE_EN, confidence: CONFIDENCE_EN };

const calculationExplanationEn =
  "KOOS-12 is the validated 12-item short form of the KOOS, covering Pain (4 items), Function (4 items), and Quality of Life (4 items, unchanged from the full KOOS). Each item is scored 0 (no problem) to 4 (extreme problem). The mean of the answered items is calculated, then inverted and rescaled to a 0-100 score — the instrument's own \"summary knee impact score\" — so 100 means no knee problems and 0 means extreme problems on every item. All 12 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to fewer knee problems.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "More problems",
  highLabel: "Fewer problems",
};

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "KOOS-12",
  abbreviation: "KOOS-12",
  description: "The validated 12-item short form of the KOOS, covering knee pain, function, and quality of life, producing a summary score out of 100 (100 = no problems).",
  population: "Adults with knee injury or knee osteoarthritis",
  estimated_minutes_min: 2,
  estimated_minutes_max: 4,
  definition: JSON.stringify(definition),
  status: "published",
  position: 1,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "koos-12", {
  slug: "koos-12",
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
    "KOOS-12",
    "KOOS-12",
    "The validated 12-item short form of the KOOS, covering knee pain, function, and quality of life, producing a summary score out of 100 (100 = no problems).",
    "Adults with knee injury or knee osteoarthritis",
    2,
    4,
    JSON.stringify(definitionEn),
    "published",
    1,
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
const PAIN_INSTR_PT_PT = "Na última semana, avalie a intensidade da dor no joelho que sentiu durante esta atividade.";
const FN_INSTR_PT_PT = "Na última semana, avalie o grau de dificuldade que sentiu nesta atividade por causa do joelho.";
const QOL_INSTR_PT_PT = "Estas últimas quatro perguntas dizem respeito à consciência que tem do problema no joelho e ao impacto no seu dia a dia, não a uma atividade específica.";
const ITEMS_PT_PT = [
  { section: "Dor", label: "Com que frequência sente dor no joelho?", instructions: "Na última semana." },
  { section: "Dor", label: "Sentado ou deitado", instructions: PAIN_INSTR_PT_PT },
  { section: "Dor", label: "Ao caminhar em superfície plana", instructions: PAIN_INSTR_PT_PT },
  { section: "Dor", label: "Ao subir ou descer escadas", instructions: PAIN_INSTR_PT_PT },
  { section: "Função", label: "Estar de pé", instructions: FN_INSTR_PT_PT },
  { section: "Função", label: "Levantar-se de estar sentado", instructions: FN_INSTR_PT_PT },
  { section: "Função", label: "Entrar ou sair de um carro", instructions: FN_INSTR_PT_PT },
  { section: "Função", label: "Ao torcer ou rodar o joelho", instructions: FN_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Com que frequência está consciente do problema no joelho?", instructions: QOL_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Modificou o seu estilo de vida para evitar atividades que possam prejudicar o joelho?", instructions: QOL_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Em que medida a falta de confiança no joelho o(a) incomoda?", instructions: QOL_INSTR_PT_PT },
  { section: "Qualidade de Vida", label: "Em geral, que dificuldade sente com o seu joelho?", instructions: QOL_INSTR_PT_PT },
];
const calculationExplanationPtPt =
  "O KOOS-12 é a versão curta validada de 12 itens da KOOS, cobrindo Dor (4 itens), Função (4 itens) e Qualidade de Vida (4 itens, sem alterações em relação à KOOS completa). Cada item é pontuado de 0 (nenhum problema) a 4 (problema extremo). Calcula-se a média dos itens respondidos, inverte-se e reescala-se para uma pontuação de 0 a 100 — a \"pontuação sumária de impacto no joelho\" do próprio instrumento — pelo que 100 significa ausência de problemas no joelho e 0 significa problemas extremos em todos os itens. Todos os 12 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a menos problemas no joelho.",
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
const PAIN_INSTR_PT_BR = "Na última semana, avalie a intensidade da dor no joelho que você sentiu durante esta atividade.";
const FN_INSTR_PT_BR = "Na última semana, avalie o grau de dificuldade que você sentiu nesta atividade por causa do joelho.";
const QOL_INSTR_PT_BR = "Estas últimas quatro perguntas dizem respeito ao quanto você percebe o problema no joelho e ao impacto no seu dia a dia, não a uma atividade específica.";
const ITEMS_PT_BR = [
  { section: "Dor", label: "Com que frequência você sente dor no joelho?", instructions: "Na última semana." },
  { section: "Dor", label: "Sentado ou deitado", instructions: PAIN_INSTR_PT_BR },
  { section: "Dor", label: "Ao andar em superfície plana", instructions: PAIN_INSTR_PT_BR },
  { section: "Dor", label: "Ao subir ou descer escadas", instructions: PAIN_INSTR_PT_BR },
  { section: "Função", label: "Ficar em pé", instructions: FN_INSTR_PT_BR },
  { section: "Função", label: "Levantar-se de estar sentado", instructions: FN_INSTR_PT_BR },
  { section: "Função", label: "Entrar ou sair de um carro", instructions: FN_INSTR_PT_BR },
  { section: "Função", label: "Ao torcer ou girar o joelho", instructions: FN_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "Com que frequência você está consciente do problema no joelho?", instructions: QOL_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "Você modificou seu estilo de vida para evitar atividades que possam prejudicar o joelho?", instructions: QOL_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "O quanto a falta de confiança no joelho te incomoda?", instructions: QOL_INSTR_PT_BR },
  { section: "Qualidade de Vida", label: "Em geral, qual o grau de dificuldade que você sente com o seu joelho?", instructions: QOL_INSTR_PT_BR },
];
const calculationExplanationPtBr =
  "O KOOS-12 é a versão curta validada de 12 itens da KOOS, cobrindo Dor (4 itens), Função (4 itens) e Qualidade de Vida (4 itens, sem alterações em relação à KOOS completa). Cada item é pontuado de 0 (nenhum problema) a 4 (problema extremo). Calcula-se a média dos itens respondidos, inverte-se e reescala-se para uma pontuação de 0 a 100 — a \"pontuação resumo de impacto no joelho\" do próprio instrumento — de forma que 100 significa ausência de problemas no joelho e 0 significa problemas extremos em todos os itens. Todos os 12 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a menos problemas no joelho.",
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
const PAIN_INSTR_ES = "En la última semana, valore la cantidad de dolor de rodilla que ha sentido durante esta actividad.";
const FN_INSTR_ES = "En la última semana, valore el grado de dificultad que ha sentido en esta actividad debido a su rodilla.";
const QOL_INSTR_ES = "Estas últimas cuatro preguntas se refieren a lo consciente que es del problema en su rodilla y a cómo afecta a su vida diaria, no a una actividad específica.";
const ITEMS_ES = [
  { section: "Dolor", label: "¿Con qué frecuencia siente dolor en la rodilla?", instructions: "En la última semana." },
  { section: "Dolor", label: "Sentado o acostado", instructions: PAIN_INSTR_ES },
  { section: "Dolor", label: "Al caminar sobre superficie plana", instructions: PAIN_INSTR_ES },
  { section: "Dolor", label: "Al subir o bajar escaleras", instructions: PAIN_INSTR_ES },
  { section: "Función", label: "De pie", instructions: FN_INSTR_ES },
  { section: "Función", label: "Levantarse de estar sentado", instructions: FN_INSTR_ES },
  { section: "Función", label: "Entrar o salir de un coche", instructions: FN_INSTR_ES },
  { section: "Función", label: "Al girar o pivotar sobre la rodilla", instructions: FN_INSTR_ES },
  { section: "Calidad de Vida", label: "¿Con qué frecuencia es consciente del problema en su rodilla?", instructions: QOL_INSTR_ES },
  { section: "Calidad de Vida", label: "¿Ha modificado su estilo de vida para evitar actividades que puedan dañar su rodilla?", instructions: QOL_INSTR_ES },
  { section: "Calidad de Vida", label: "¿Cuánto le molesta la falta de confianza en su rodilla?", instructions: QOL_INSTR_ES },
  { section: "Calidad de Vida", label: "En general, ¿cuánta dificultad tiene con su rodilla?", instructions: QOL_INSTR_ES },
];
const calculationExplanationEs =
  "El KOOS-12 es la forma corta validada de 12 ítems de la KOOS, que cubre Dolor (4 ítems), Función (4 ítems) y Calidad de Vida (4 ítems, sin cambios respecto a la KOOS completa). Cada ítem se puntúa de 0 (ningún problema) a 4 (problema extremo). Se calcula la media de los ítems respondidos, se invierte y se reescala a una puntuación de 0 a 100 — la \"puntuación resumen de impacto en la rodilla\" del propio instrumento — por lo que 100 significa ausencia de problemas de rodilla y 0 significa problemas extremos en todos los ítems. Los 12 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a menos problemas de rodilla.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Más problemas",
  highLabel: "Menos problemas",
};

const translations = [
  {
    locale: "pt-pt",
    name: "KOOS-12",
    description: "A versão curta validada de 12 itens da KOOS, cobrindo a dor, a função e a qualidade de vida do joelho, produzindo uma pontuação sumária em 100 (100 = sem problemas).",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_PT), { severity: SEVERITY_PT_PT, frequency_pain: FREQUENCY_PAIN_PT_PT, frequency_qol: FREQUENCY_QOL_PT_PT, lifestyle: LIFESTYLE_PT_PT, confidence: CONFIDENCE_PT_PT }, calculationExplanationPtPt, resultNotePtPt),
  },
  {
    locale: "pt-br",
    name: "KOOS-12",
    description: "A versão curta validada de 12 itens da KOOS, cobrindo a dor, a função e a qualidade de vida do joelho, gerando uma pontuação resumo em 100 (100 = sem problemas).",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_BR), { severity: SEVERITY_PT_BR, frequency_pain: FREQUENCY_PAIN_PT_BR, frequency_qol: FREQUENCY_QOL_PT_BR, lifestyle: LIFESTYLE_PT_BR, confidence: CONFIDENCE_PT_BR }, calculationExplanationPtBr, resultNotePtBr),
  },
  {
    locale: "es",
    name: "KOOS-12",
    description: "La forma corta validada de 12 ítems de la KOOS, que cubre el dolor, la función y la calidad de vida de la rodilla, generando una puntuación resumen sobre 100 (100 = sin problemas).",
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

console.log("KOOS-12 seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
