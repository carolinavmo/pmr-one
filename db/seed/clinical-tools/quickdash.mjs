// QuickDASH — the 11-item short form of DASH (dash.mjs), same
// "upper-limb-function" category and the same "dash" formula
// (((mean of all items) - 1) x 25) — the formula only depends on the
// mean of whatever items are answered, so no engine change was needed,
// exactly as calculator-scoring.ts's own comment anticipated.
//
// Item selection is the standard published QuickDASH item set (6
// function + 3 symptom + 2 impact items drawn from DASH's 30), with
// wording paraphrased in this app's own words (same non-verbatim
// approach as DASH/FIM) — proprietary: true for the same reason.
//
// Usage: node db/seed/clinical-tools/quickdash.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Same category DASH created — findOrCreate just resolves the existing row.
const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "upper-limb-function", {
  slug: "upper-limb-function",
  name: "Upper Limb Function",
  color: "rose",
  position: 4,
});

const DIFFICULTY_EN = [
  { value: 1, label: "No difficulty" },
  { value: 2, label: "Mild difficulty" },
  { value: 3, label: "Moderate difficulty" },
  { value: 4, label: "Severe difficulty" },
  { value: 5, label: "Unable" },
];
const SEVERITY_EN = [
  { value: 1, label: "None" },
  { value: 2, label: "Mild" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Severe" },
  { value: 5, label: "Extreme" },
];
const IMPACT_EN = [
  { value: 1, label: "Not at all" },
  { value: 2, label: "Slightly" },
  { value: 3, label: "Moderately" },
  { value: 4, label: "Quite a bit" },
  { value: 5, label: "Extremely" },
];
const LIMITATION_EN = [
  { value: 1, label: "Not limited at all" },
  { value: 2, label: "Slightly limited" },
  { value: 3, label: "Moderately limited" },
  { value: 4, label: "Very limited" },
  { value: 5, label: "Unable" },
];

// 6 Function (difficulty) + 3 Symptoms (severity) + 2 Impact items —
// the 11-item standard QuickDASH set, same ids/wording as their DASH
// counterparts (dash.mjs) for the 9 items the two instruments share.
const ITEMS_EN = [
  { id: "open_jar", section: "Function", label: "Open a tight or new jar", rubric: "difficulty" },
  { id: "heavy_chores", section: "Function", label: "Do heavy household chores (e.g. washing walls or floors)", rubric: "difficulty" },
  { id: "carry_bag", section: "Function", label: "Carry a shopping bag or briefcase", rubric: "difficulty" },
  { id: "wash_back", section: "Function", label: "Wash your back", rubric: "difficulty" },
  { id: "use_knife", section: "Function", label: "Use a knife to cut food", rubric: "difficulty" },
  { id: "recreation_force", section: "Function", label: "Recreational activities involving some force or impact through the arm (e.g. golf, hammering, tennis)", rubric: "difficulty" },
  { id: "pain", section: "Symptoms", label: "Arm, shoulder, or hand pain", rubric: "severity" },
  { id: "activity_pain", section: "Symptoms", label: "Arm, shoulder, or hand pain when performing a specific activity", rubric: "severity" },
  { id: "tingling", section: "Symptoms", label: "Tingling (pins and needles) in your arm, shoulder, or hand", rubric: "severity" },
  { id: "social_activities", section: "Impact", label: "How much your arm, shoulder, or hand problem has interfered with your normal social activities with family, friends, neighbors, or groups", rubric: "impact" },
  { id: "work_daily_activity", section: "Impact", label: "How much your arm, shoulder, or hand problem has limited your usual work or other regular daily activities", rubric: "limitation" },
];

function buildDefinition(items, rubrics, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({
      id: item.id,
      section: item.section,
      label: item.label,
      options: rubrics[item.rubric],
    })),
    scoring: { method: "formula", formula: "dash" },
    minScore: 0,
    maxScore: 100,
    descendingGood: true,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Beaton DE, Wright JG, Katz JN. Development of the QuickDASH: comparison of three item-reduction approaches. J Bone Joint Surg Am. 2005;87(5):1038-1046.",
      url: "https://www.sralab.org/rehabilitation-measures/quick-disabilities-arm-shoulder-and-hand",
    },
    proprietary: true,
  };
}

const calculationExplanationEn =
  "The QuickDASH score is calculated from 11 items — 6 on the difficulty of everyday activities, 3 on symptom severity, and 2 on the problem's impact on social activities and daily function. The mean of all 11 answers (1 to 5) is calculated, 1 is subtracted, and the result is multiplied by 25, producing a score from 0 (no disability) to 100 (most severe disability). All 11 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to greater disability.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "Less disability",
  highLabel: "More disability",
};

const RUBRICS_EN = { difficulty: DIFFICULTY_EN, severity: SEVERITY_EN, impact: IMPACT_EN, limitation: LIMITATION_EN };

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Quick Disabilities of the Arm, Shoulder and Hand",
  abbreviation: "QuickDASH",
  description: "An 11-item short form of the DASH, measuring self-reported difficulty, symptoms, and daily impact of an upper limb problem, producing a score out of 100 that reflects the degree of disability.",
  population: "Adults with any musculoskeletal disorder of the arm, shoulder, or hand",
  estimated_minutes_min: 2,
  estimated_minutes_max: 5,
  definition: JSON.stringify(definition),
  status: "published",
  position: 1,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "quickdash", {
  slug: "quickdash",
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
    "Quick Disabilities of the Arm, Shoulder and Hand",
    "QuickDASH",
    "An 11-item short form of the DASH, measuring self-reported difficulty, symptoms, and daily impact of an upper limb problem, producing a score out of 100 that reflects the degree of disability.",
    "Adults with any musculoskeletal disorder of the arm, shoulder, or hand",
    2,
    5,
    JSON.stringify(definitionEn),
    "published",
    1,
  ]
);

// ---------- Translations ----------
// Wording for the 9 shared items copied verbatim from dash.mjs's own
// PT-PT/PT-BR/ES translations, so QuickDASH and DASH always read
// identically for the items they share.

function translateDefinition(items, rubrics, calculationExplanation, resultNote) {
  return buildDefinition(items, rubrics, calculationExplanation, resultNote);
}

const DIFFICULTY_PT_PT = [
  { value: 1, label: "Sem dificuldade" },
  { value: 2, label: "Dificuldade ligeira" },
  { value: 3, label: "Dificuldade moderada" },
  { value: 4, label: "Dificuldade grave" },
  { value: 5, label: "Incapaz" },
];
const SEVERITY_PT_PT = [
  { value: 1, label: "Nenhuma" },
  { value: 2, label: "Ligeira" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Extrema" },
];
const IMPACT_PT_PT = [
  { value: 1, label: "Nada" },
  { value: 2, label: "Ligeiramente" },
  { value: 3, label: "Moderadamente" },
  { value: 4, label: "Bastante" },
  { value: 5, label: "Extremamente" },
];
const LIMITATION_PT_PT = [
  { value: 1, label: "Nada limitado" },
  { value: 2, label: "Ligeiramente limitado" },
  { value: 3, label: "Moderadamente limitado" },
  { value: 4, label: "Muito limitado" },
  { value: 5, label: "Incapaz" },
];
const ITEMS_PT_PT = [
  { section: "Função", label: "Abrir um frasco novo ou apertado" },
  { section: "Função", label: "Fazer tarefas domésticas pesadas (por exemplo, lavar paredes ou o chão)" },
  { section: "Função", label: "Transportar um saco de compras ou uma pasta" },
  { section: "Função", label: "Lavar as costas" },
  { section: "Função", label: "Usar uma faca para cortar comida" },
  { section: "Função", label: "Atividades recreativas com alguma força ou impacto através do braço (por exemplo, golfe, martelar, ténis)" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão ao realizar uma atividade específica" },
  { section: "Sintomas", label: "Formigueiro no braço, ombro ou mão" },
  { section: "Impacto", label: "Em que medida o problema no braço, ombro ou mão interferiu com as suas atividades sociais habituais com a família, amigos, vizinhos ou grupos" },
  { section: "Impacto", label: "Em que medida o problema no braço, ombro ou mão limitou o seu trabalho habitual ou outras atividades diárias" },
];
const calculationExplanationPtPt =
  "A pontuação do QuickDASH é calculada a partir de 11 itens — 6 sobre a dificuldade em atividades do dia a dia, 3 sobre a gravidade dos sintomas, e 2 sobre o impacto do problema nas atividades sociais e no funcionamento diário. Calcula-se a média das 11 respostas (1 a 5), subtrai-se 1, e multiplica-se o resultado por 25, produzindo uma pontuação de 0 (sem incapacidade) a 100 (incapacidade mais grave). Todos os 11 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a maior incapacidade.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Menor incapacidade",
  highLabel: "Maior incapacidade",
};

const DIFFICULTY_PT_BR = [
  { value: 1, label: "Sem dificuldade" },
  { value: 2, label: "Dificuldade leve" },
  { value: 3, label: "Dificuldade moderada" },
  { value: 4, label: "Dificuldade grave" },
  { value: 5, label: "Incapaz" },
];
const SEVERITY_PT_BR = [
  { value: 1, label: "Nenhuma" },
  { value: 2, label: "Leve" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Extrema" },
];
const IMPACT_PT_BR = [
  { value: 1, label: "Nada" },
  { value: 2, label: "Levemente" },
  { value: 3, label: "Moderadamente" },
  { value: 4, label: "Bastante" },
  { value: 5, label: "Extremamente" },
];
const LIMITATION_PT_BR = [
  { value: 1, label: "Nada limitado" },
  { value: 2, label: "Levemente limitado" },
  { value: 3, label: "Moderadamente limitado" },
  { value: 4, label: "Muito limitado" },
  { value: 5, label: "Incapaz" },
];
const ITEMS_PT_BR = [
  { section: "Função", label: "Abrir um pote novo ou apertado" },
  { section: "Função", label: "Fazer tarefas domésticas pesadas (por exemplo, lavar paredes ou o chão)" },
  { section: "Função", label: "Carregar uma sacola de compras ou uma pasta" },
  { section: "Função", label: "Lavar as costas" },
  { section: "Função", label: "Usar uma faca para cortar comida" },
  { section: "Função", label: "Atividades recreativas com alguma força ou impacto através do braço (por exemplo, golfe, martelar, tênis)" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão ao realizar uma atividade específica" },
  { section: "Sintomas", label: "Formigamento no braço, ombro ou mão" },
  { section: "Impacto", label: "O quanto o problema no braço, ombro ou mão interferiu nas suas atividades sociais habituais com família, amigos, vizinhos ou grupos" },
  { section: "Impacto", label: "O quanto o problema no braço, ombro ou mão limitou o seu trabalho habitual ou outras atividades diárias" },
];
const calculationExplanationPtBr =
  "A pontuação do QuickDASH é calculada a partir de 11 itens — 6 sobre a dificuldade em atividades do dia a dia, 3 sobre a gravidade dos sintomas, e 2 sobre o impacto do problema nas atividades sociais e no funcionamento diário. Calcula-se a média das 11 respostas (1 a 5), subtrai-se 1, e multiplica-se o resultado por 25, produzindo uma pontuação de 0 (sem incapacidade) a 100 (incapacidade mais grave). Todos os 11 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a maior incapacidade.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Menor incapacidade",
  highLabel: "Maior incapacidade",
};

const DIFFICULTY_ES = [
  { value: 1, label: "Sin dificultad" },
  { value: 2, label: "Dificultad leve" },
  { value: 3, label: "Dificultad moderada" },
  { value: 4, label: "Dificultad grave" },
  { value: 5, label: "Incapaz" },
];
const SEVERITY_ES = [
  { value: 1, label: "Ninguna" },
  { value: 2, label: "Leve" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Extrema" },
];
const IMPACT_ES = [
  { value: 1, label: "Nada" },
  { value: 2, label: "Levemente" },
  { value: 3, label: "Moderadamente" },
  { value: 4, label: "Bastante" },
  { value: 5, label: "Extremadamente" },
];
const LIMITATION_ES = [
  { value: 1, label: "Nada limitado" },
  { value: 2, label: "Levemente limitado" },
  { value: 3, label: "Moderadamente limitado" },
  { value: 4, label: "Muy limitado" },
  { value: 5, label: "Incapaz" },
];
const ITEMS_ES = [
  { section: "Función", label: "Abrir un frasco nuevo o apretado" },
  { section: "Función", label: "Hacer tareas domésticas pesadas (por ejemplo, lavar paredes o el suelo)" },
  { section: "Función", label: "Cargar una bolsa de compras o un maletín" },
  { section: "Función", label: "Lavarse la espalda" },
  { section: "Función", label: "Usar un cuchillo para cortar comida" },
  { section: "Función", label: "Actividades recreativas con algo de fuerza o impacto a través del brazo (por ejemplo, golf, martillar, tenis)" },
  { section: "Síntomas", label: "Dolor en el brazo, hombro o mano" },
  { section: "Síntomas", label: "Dolor en el brazo, hombro o mano al realizar una actividad específica" },
  { section: "Síntomas", label: "Hormigueo en el brazo, hombro o mano" },
  { section: "Impacto", label: "En qué medida el problema en el brazo, hombro o mano ha interferido con sus actividades sociales habituales con familiares, amigos, vecinos o grupos" },
  { section: "Impacto", label: "En qué medida el problema en el brazo, hombro o mano ha limitado su trabajo habitual u otras actividades diarias" },
];
const calculationExplanationEs =
  "La puntuación del QuickDASH se calcula a partir de 11 ítems — 6 sobre la dificultad en actividades cotidianas, 3 sobre la gravedad de los síntomas, y 2 sobre el impacto del problema en las actividades sociales y el funcionamiento diario. Se calcula la media de las 11 respuestas (1 a 5), se resta 1, y el resultado se multiplica por 25, produciendo una puntuación de 0 (sin discapacidad) a 100 (discapacidad más grave). Los 11 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a mayor discapacidad.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Menor discapacidad",
  highLabel: "Mayor discapacidad",
};

function mergeItems(sourceItems, translatedItems) {
  return sourceItems.map((item, i) => ({ ...item, ...translatedItems[i] }));
}

const translations = [
  {
    locale: "pt-pt",
    name: "Quick-DASH — Incapacidades do Braço, Ombro e Mão",
    description: "Versão curta de 11 itens da DASH, medindo a dificuldade percebida, os sintomas e o impacto diário de um problema no membro superior, produzindo uma pontuação em 100 que reflete o grau de incapacidade.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_PT),
      { difficulty: DIFFICULTY_PT_PT, severity: SEVERITY_PT_PT, impact: IMPACT_PT_PT, limitation: LIMITATION_PT_PT },
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Quick-DASH — Incapacidades do Braço, Ombro e Mão",
    description: "Versão curta de 11 itens da DASH, medindo a dificuldade percebida, os sintomas e o impacto diário de um problema no membro superior, gerando uma pontuação em 100 que reflete o grau de incapacidade.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_BR),
      { difficulty: DIFFICULTY_PT_BR, severity: SEVERITY_PT_BR, impact: IMPACT_PT_BR, limitation: LIMITATION_PT_BR },
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "Quick-DASH — Discapacidades del Brazo, Hombro y Mano",
    description: "Versión corta de 11 ítems de la DASH, que mide la dificultad percibida, los síntomas y el impacto diario de un problema en el miembro superior, generando una puntuación sobre 100 que refleja el grado de discapacidad.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_ES),
      { difficulty: DIFFICULTY_ES, severity: SEVERITY_ES, impact: IMPACT_ES, limitation: LIMITATION_ES },
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

console.log("QuickDASH seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
