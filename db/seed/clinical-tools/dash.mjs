// DASH (Disabilities of the Arm, Shoulder and Hand) — first calculator
// in a new "Upper Limb Function" category, and the first to actually
// exercise the engine's "formula" scoring branch (built into the
// original schema design but never used until now — every calculator
// so far has been "sum"). 30 items, each 1-5, scored via
// ((mean of all items) - 1) x 25 — a 0-100 result on a completely
// different scale than the raw 1-5 item values, which is what the
// engine's new minScore field (added alongside this calculator) is
// for: `sum`-scored calculators can always derive min/max from their
// items, but a formula's output can't be.
//
// Like FIM, DASH is a real copyrighted instrument (Institute for Work
// & Health) — free for non-commercial clinical/research use, but the
// exact item wording is still their IP, so item text here is
// paraphrased in this app's own words (matching the FIM precedent),
// and proprietary: true is set for the same "non-official calculator"
// notice.
//
// descendingGood: true — 1 = no difficulty/none (best), 5 = unable/
// extreme (worst) on every item, same orientation as mRS/NIHSS/RASS.
//
// Usage: node db/seed/clinical-tools/dash.mjs
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
// Most items share one of these 5 wordings; a handful of impact items
// (sleep, work/activity limitation) have their own wording to match
// what they're actually asking about.

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
const SLEEP_EN = [
  { value: 1, label: "No difficulty" },
  { value: 2, label: "Mild difficulty" },
  { value: 3, label: "Moderate difficulty" },
  { value: 4, label: "Severe difficulty" },
  { value: 5, label: "So much difficulty that I can't sleep" },
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

// 21 function items + 5 symptom items + 4 impact items = 30. Every
// item asks about difficulty/severity "because of your arm, shoulder,
// or hand problem" (function/impact items) or "over the past week"
// (symptom items) — stated once in the page intro rather than
// repeated in every item's label.
const ITEMS_EN = [
  { id: "open_jar", section: "Function", label: "Open a tight or new jar", rubric: "difficulty" },
  { id: "write", section: "Function", label: "Write", rubric: "difficulty" },
  { id: "turn_key", section: "Function", label: "Turn a key", rubric: "difficulty" },
  { id: "prepare_meal", section: "Function", label: "Prepare a meal", rubric: "difficulty" },
  { id: "push_door", section: "Function", label: "Push open a heavy door", rubric: "difficulty" },
  { id: "shelf_above_head", section: "Function", label: "Place an object on a shelf above your head", rubric: "difficulty" },
  { id: "heavy_chores", section: "Function", label: "Do heavy household chores (e.g. washing walls or floors)", rubric: "difficulty" },
  { id: "garden_yard_work", section: "Function", label: "Garden or do yard work", rubric: "difficulty" },
  { id: "make_bed", section: "Function", label: "Make a bed", rubric: "difficulty" },
  { id: "carry_bag", section: "Function", label: "Carry a shopping bag or briefcase", rubric: "difficulty" },
  { id: "carry_heavy_object", section: "Function", label: "Carry a heavy object (more than 5 kg)", rubric: "difficulty" },
  { id: "change_lightbulb", section: "Function", label: "Change an overhead lightbulb", rubric: "difficulty" },
  { id: "wash_dry_hair", section: "Function", label: "Wash or blow-dry your hair", rubric: "difficulty" },
  { id: "wash_back", section: "Function", label: "Wash your back", rubric: "difficulty" },
  { id: "put_on_sweater", section: "Function", label: "Put on a pullover sweater", rubric: "difficulty" },
  { id: "use_knife", section: "Function", label: "Use a knife to cut food", rubric: "difficulty" },
  { id: "recreation_low_effort", section: "Function", label: "Recreational activities requiring little effort (e.g. cards, knitting)", rubric: "difficulty" },
  { id: "recreation_force", section: "Function", label: "Recreational activities involving some force or impact through the arm (e.g. golf, hammering, tennis)", rubric: "difficulty" },
  { id: "recreation_free_arm", section: "Function", label: "Recreational activities where you move your arm freely (e.g. frisbee, badminton)", rubric: "difficulty" },
  { id: "transportation", section: "Function", label: "Manage transportation needs (getting from one place to another)", rubric: "difficulty" },
  { id: "sexual_activities", section: "Function", label: "Sexual activities", rubric: "difficulty" },
  { id: "pain", section: "Symptoms", label: "Arm, shoulder, or hand pain", rubric: "severity" },
  { id: "activity_pain", section: "Symptoms", label: "Arm, shoulder, or hand pain when performing a specific activity", rubric: "severity" },
  { id: "tingling", section: "Symptoms", label: "Tingling (pins and needles) in your arm, shoulder, or hand", rubric: "severity" },
  { id: "weakness", section: "Symptoms", label: "Weakness in your arm, shoulder, or hand", rubric: "severity" },
  { id: "stiffness", section: "Symptoms", label: "Stiffness in your arm, shoulder, or hand", rubric: "severity" },
  { id: "sleep", section: "Impact", label: "Difficulty sleeping because of the pain in your arm, shoulder, or hand", rubric: "sleep" },
  { id: "less_capable", section: "Impact", label: "Feeling less capable, confident, or useful because of your arm, shoulder, or hand problem", rubric: "impact" },
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
      citation: "Hudak PL, Amadio PC, Bombardier C, et al. Development of an upper extremity outcome measure: the DASH (disabilities of the arm, shoulder and hand). Am J Ind Med. 1996;29(6):602-608.",
      url: "https://www.sralab.org/rehabilitation-measures/disabilities-arm-shoulder-and-hand-questionnaire",
    },
    // DASH is a copyrighted instrument (Institute for Work & Health) —
    // free for non-commercial clinical/research use, but formal use
    // and translated versions require permission from the rights
    // holder. Same non-official notice as FIM.
    proprietary: true,
  };
}

const calculationExplanationEn =
  "The DASH score is calculated from the 30 items — 21 on the difficulty of everyday activities, 5 on symptom severity, and 4 on the problem's impact on sleep, confidence, social activities, and daily function. The mean of all 30 answers (1 to 5) is calculated, 1 is subtracted, and the result is multiplied by 25, producing a score from 0 (no disability) to 100 (most severe disability). All 30 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to greater disability.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "Less disability",
  highLabel: "More disability",
};

const RUBRICS_EN = { difficulty: DIFFICULTY_EN, severity: SEVERITY_EN, sleep: SLEEP_EN, impact: IMPACT_EN, limitation: LIMITATION_EN };

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Disabilities of the Arm, Shoulder and Hand",
  abbreviation: "DASH",
  description: "Measures self-reported difficulty, symptoms, and the daily impact of an upper limb problem across 30 items, producing a score out of 100 that reflects the degree of disability.",
  population: "Adults with any musculoskeletal disorder of the arm, shoulder, or hand",
  estimated_minutes_min: 5,
  estimated_minutes_max: 10,
  definition: JSON.stringify(definition),
  status: "published",
  position: 0,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "dash", {
  slug: "dash",
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
    "Disabilities of the Arm, Shoulder and Hand",
    "DASH",
    "Measures self-reported difficulty, symptoms, and the daily impact of an upper limb problem across 30 items, producing a score out of 100 that reflects the degree of disability.",
    "Adults with any musculoskeletal disorder of the arm, shoulder, or hand",
    5,
    10,
    JSON.stringify(definitionEn),
    "published",
    0,
  ]
);

// ---------- Translations ----------

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
const SLEEP_PT_PT = [
  { value: 1, label: "Sem dificuldade" },
  { value: 2, label: "Dificuldade ligeira" },
  { value: 3, label: "Dificuldade moderada" },
  { value: 4, label: "Dificuldade grave" },
  { value: 5, label: "Tanta dificuldade que não consigo dormir" },
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
  { section: "Função", label: "Escrever" },
  { section: "Função", label: "Rodar uma chave" },
  { section: "Função", label: "Preparar uma refeição" },
  { section: "Função", label: "Empurrar uma porta pesada" },
  { section: "Função", label: "Colocar um objeto numa prateleira acima da cabeça" },
  { section: "Função", label: "Fazer tarefas domésticas pesadas (por exemplo, lavar paredes ou o chão)" },
  { section: "Função", label: "Jardinagem ou trabalho no quintal" },
  { section: "Função", label: "Fazer a cama" },
  { section: "Função", label: "Transportar um saco de compras ou uma pasta" },
  { section: "Função", label: "Transportar um objeto pesado (mais de 5 kg)" },
  { section: "Função", label: "Mudar uma lâmpada acima da cabeça" },
  { section: "Função", label: "Lavar ou secar o cabelo com secador" },
  { section: "Função", label: "Lavar as costas" },
  { section: "Função", label: "Vestir uma camisola" },
  { section: "Função", label: "Usar uma faca para cortar comida" },
  { section: "Função", label: "Atividades recreativas que exigem pouco esforço (por exemplo, cartas, tricô)" },
  { section: "Função", label: "Atividades recreativas com alguma força ou impacto através do braço (por exemplo, golfe, martelar, ténis)" },
  { section: "Função", label: "Atividades recreativas em que move o braço livremente (por exemplo, frisbee, badmínton)" },
  { section: "Função", label: "Gerir as necessidades de transporte (deslocar-se de um local para outro)" },
  { section: "Função", label: "Atividade sexual" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão ao realizar uma atividade específica" },
  { section: "Sintomas", label: "Formigueiro no braço, ombro ou mão" },
  { section: "Sintomas", label: "Fraqueza no braço, ombro ou mão" },
  { section: "Sintomas", label: "Rigidez no braço, ombro ou mão" },
  { section: "Impacto", label: "Dificuldade em dormir devido à dor no braço, ombro ou mão" },
  { section: "Impacto", label: "Sentir-se menos capaz, menos confiante ou menos útil devido ao problema no braço, ombro ou mão" },
  { section: "Impacto", label: "Em que medida o problema no braço, ombro ou mão interferiu com as suas atividades sociais habituais com a família, amigos, vizinhos ou grupos" },
  { section: "Impacto", label: "Em que medida o problema no braço, ombro ou mão limitou o seu trabalho habitual ou outras atividades diárias" },
];
const calculationExplanationPtPt =
  "A pontuação da DASH é calculada a partir dos 30 itens — 21 sobre a dificuldade em atividades do dia a dia, 5 sobre a gravidade dos sintomas, e 4 sobre o impacto do problema no sono, na confiança, nas atividades sociais e no funcionamento diário. Calcula-se a média das 30 respostas (1 a 5), subtrai-se 1, e multiplica-se o resultado por 25, produzindo uma pontuação de 0 (sem incapacidade) a 100 (incapacidade mais grave). Todos os 30 itens têm de ser respondidos.";
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
const SLEEP_PT_BR = [
  { value: 1, label: "Sem dificuldade" },
  { value: 2, label: "Dificuldade leve" },
  { value: 3, label: "Dificuldade moderada" },
  { value: 4, label: "Dificuldade grave" },
  { value: 5, label: "Tanta dificuldade que não consigo dormir" },
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
  { section: "Função", label: "Escrever" },
  { section: "Função", label: "Girar uma chave" },
  { section: "Função", label: "Preparar uma refeição" },
  { section: "Função", label: "Empurrar uma porta pesada" },
  { section: "Função", label: "Colocar um objeto em uma prateleira acima da cabeça" },
  { section: "Função", label: "Fazer tarefas domésticas pesadas (por exemplo, lavar paredes ou o chão)" },
  { section: "Função", label: "Jardinagem ou trabalho no quintal" },
  { section: "Função", label: "Arrumar a cama" },
  { section: "Função", label: "Carregar uma sacola de compras ou uma pasta" },
  { section: "Função", label: "Carregar um objeto pesado (mais de 5 kg)" },
  { section: "Função", label: "Trocar uma lâmpada acima da cabeça" },
  { section: "Função", label: "Lavar ou secar o cabelo com secador" },
  { section: "Função", label: "Lavar as costas" },
  { section: "Função", label: "Vestir um suéter" },
  { section: "Função", label: "Usar uma faca para cortar comida" },
  { section: "Função", label: "Atividades recreativas que exigem pouco esforço (por exemplo, cartas, tricô)" },
  { section: "Função", label: "Atividades recreativas com alguma força ou impacto através do braço (por exemplo, golfe, martelar, tênis)" },
  { section: "Função", label: "Atividades recreativas em que você move o braço livremente (por exemplo, frisbee, badminton)" },
  { section: "Função", label: "Cuidar das necessidades de transporte (se deslocar de um lugar para outro)" },
  { section: "Função", label: "Atividade sexual" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão" },
  { section: "Sintomas", label: "Dor no braço, ombro ou mão ao realizar uma atividade específica" },
  { section: "Sintomas", label: "Formigamento no braço, ombro ou mão" },
  { section: "Sintomas", label: "Fraqueza no braço, ombro ou mão" },
  { section: "Sintomas", label: "Rigidez no braço, ombro ou mão" },
  { section: "Impacto", label: "Dificuldade para dormir devido à dor no braço, ombro ou mão" },
  { section: "Impacto", label: "Sentir-se menos capaz, menos confiante ou menos útil devido ao problema no braço, ombro ou mão" },
  { section: "Impacto", label: "O quanto o problema no braço, ombro ou mão interferiu nas suas atividades sociais habituais com família, amigos, vizinhos ou grupos" },
  { section: "Impacto", label: "O quanto o problema no braço, ombro ou mão limitou o seu trabalho habitual ou outras atividades diárias" },
];
const calculationExplanationPtBr =
  "A pontuação da DASH é calculada a partir dos 30 itens — 21 sobre a dificuldade em atividades do dia a dia, 5 sobre a gravidade dos sintomas, e 4 sobre o impacto do problema no sono, na confiança, nas atividades sociais e no funcionamento diário. Calcula-se a média das 30 respostas (1 a 5), subtrai-se 1, e multiplica-se o resultado por 25, produzindo uma pontuação de 0 (sem incapacidade) a 100 (incapacidade mais grave). Todos os 30 itens precisam ser respondidos.";
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
const SLEEP_ES = [
  { value: 1, label: "Sin dificultad" },
  { value: 2, label: "Dificultad leve" },
  { value: 3, label: "Dificultad moderada" },
  { value: 4, label: "Dificultad grave" },
  { value: 5, label: "Tanta dificultad que no puedo dormir" },
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
  { section: "Función", label: "Escribir" },
  { section: "Función", label: "Girar una llave" },
  { section: "Función", label: "Preparar una comida" },
  { section: "Función", label: "Empujar una puerta pesada" },
  { section: "Función", label: "Colocar un objeto en un estante por encima de la cabeza" },
  { section: "Función", label: "Hacer tareas domésticas pesadas (por ejemplo, lavar paredes o el suelo)" },
  { section: "Función", label: "Jardinería o trabajo en el jardín" },
  { section: "Función", label: "Hacer la cama" },
  { section: "Función", label: "Cargar una bolsa de compras o un maletín" },
  { section: "Función", label: "Cargar un objeto pesado (más de 5 kg)" },
  { section: "Función", label: "Cambiar una bombilla por encima de la cabeza" },
  { section: "Función", label: "Lavarse o secarse el pelo con secador" },
  { section: "Función", label: "Lavarse la espalda" },
  { section: "Función", label: "Ponerse un suéter" },
  { section: "Función", label: "Usar un cuchillo para cortar comida" },
  { section: "Función", label: "Actividades recreativas que requieren poco esfuerzo (por ejemplo, cartas, tejer)" },
  { section: "Función", label: "Actividades recreativas con algo de fuerza o impacto a través del brazo (por ejemplo, golf, martillar, tenis)" },
  { section: "Función", label: "Actividades recreativas en las que mueve el brazo libremente (por ejemplo, frisbee, bádminton)" },
  { section: "Función", label: "Gestionar las necesidades de transporte (desplazarse de un lugar a otro)" },
  { section: "Función", label: "Actividad sexual" },
  { section: "Síntomas", label: "Dolor en el brazo, hombro o mano" },
  { section: "Síntomas", label: "Dolor en el brazo, hombro o mano al realizar una actividad específica" },
  { section: "Síntomas", label: "Hormigueo en el brazo, hombro o mano" },
  { section: "Síntomas", label: "Debilidad en el brazo, hombro o mano" },
  { section: "Síntomas", label: "Rigidez en el brazo, hombro o mano" },
  { section: "Impacto", label: "Dificultad para dormir debido al dolor en el brazo, hombro o mano" },
  { section: "Impacto", label: "Sentirse menos capaz, menos seguro o menos útil debido al problema en el brazo, hombro o mano" },
  { section: "Impacto", label: "En qué medida el problema en el brazo, hombro o mano ha interferido con sus actividades sociales habituales con familiares, amigos, vecinos o grupos" },
  { section: "Impacto", label: "En qué medida el problema en el brazo, hombro o mano ha limitado su trabajo habitual u otras actividades diarias" },
];
const calculationExplanationEs =
  "La puntuación de la DASH se calcula a partir de los 30 ítems — 21 sobre la dificultad en actividades cotidianas, 5 sobre la gravedad de los síntomas, y 4 sobre el impacto del problema en el sueño, la confianza, las actividades sociales y el funcionamiento diario. Se calcula la media de las 30 respuestas (1 a 5), se resta 1, y el resultado se multiplica por 25, produciendo una puntuación de 0 (sin discapacidad) a 100 (discapacidad más grave). Los 30 ítems deben responderse.";
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
    name: "Incapacidades do Braço, Ombro e Mão",
    description: "Mede a dificuldade percebida, os sintomas e o impacto diário de um problema no membro superior em 30 itens, produzindo uma pontuação em 100 que reflete o grau de incapacidade.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_PT),
      { difficulty: DIFFICULTY_PT_PT, severity: SEVERITY_PT_PT, sleep: SLEEP_PT_PT, impact: IMPACT_PT_PT, limitation: LIMITATION_PT_PT },
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Incapacidades do Braço, Ombro e Mão",
    description: "Mede a dificuldade percebida, os sintomas e o impacto diário de um problema no membro superior em 30 itens, gerando uma pontuação em 100 que reflete o grau de incapacidade.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_BR),
      { difficulty: DIFFICULTY_PT_BR, severity: SEVERITY_PT_BR, sleep: SLEEP_PT_BR, impact: IMPACT_PT_BR, limitation: LIMITATION_PT_BR },
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "Discapacidades del Brazo, Hombro y Mano",
    description: "Mide la dificultad percibida, los síntomas y el impacto diario de un problema en el miembro superior en 30 ítems, generando una puntuación sobre 100 que refleja el grado de discapacidad.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_ES),
      { difficulty: DIFFICULTY_ES, severity: SEVERITY_ES, sleep: SLEEP_ES, impact: IMPACT_ES, limitation: LIMITATION_ES },
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

console.log("DASH seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
