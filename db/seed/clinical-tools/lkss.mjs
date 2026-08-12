// Lysholm Knee Scoring Scale (LKSS) — classic 8-item, sum-scored knee
// instrument (Tegner & Lysholm, 1985), each item its own point-valued
// option set (like Barthel/Harris Hip Score, not a shared rubric),
// total 0-100. A well-established academic instrument — like Barthel/
// Berg/Katz/Harris Hip Score, no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/lkss.mjs
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

const definitionEn = {
  items: [
    {
      id: "limp",
      label: "Limp",
      options: [
        { value: 0, label: "Severe and constant" },
        { value: 3, label: "Slight or periodical" },
        { value: 5, label: "None" },
      ],
    },
    {
      id: "support",
      label: "Support",
      options: [
        { value: 0, label: "Weight-bearing impossible" },
        { value: 2, label: "Stick or crutch" },
        { value: 5, label: "None" },
      ],
    },
    {
      id: "locking",
      label: "Locking sensation",
      options: [
        { value: 0, label: "Locked joint on examination" },
        { value: 2, label: "Locks frequently" },
        { value: 6, label: "Locks occasionally" },
        { value: 10, label: "Catching sensation but no locking" },
        { value: 15, label: "No locking, no catching sensation" },
      ],
    },
    {
      id: "instability",
      label: "Giving way",
      options: [
        { value: 0, label: "Gives way at every step" },
        { value: 5, label: "Often, in daily activities" },
        { value: 10, label: "Occasionally, in daily activities" },
        { value: 15, label: "Frequently during athletics or other strenuous activities (unable to participate)" },
        { value: 20, label: "Rarely during athletics or other strenuous activities" },
        { value: 25, label: "Never gives way" },
      ],
    },
    {
      id: "pain",
      label: "Pain",
      options: [
        { value: 0, label: "Constant" },
        { value: 5, label: "Marked, on or after walking less than 2 km" },
        { value: 10, label: "Marked, on or after walking more than 2 km" },
        { value: 15, label: "Marked, during strenuous activities" },
        { value: 20, label: "Inconstant and slight, during strenuous activities" },
        { value: 25, label: "None" },
      ],
    },
    {
      id: "swelling",
      label: "Swelling",
      options: [
        { value: 0, label: "Constant" },
        { value: 2, label: "On ordinary activities" },
        { value: 6, label: "On strenuous activities" },
        { value: 10, label: "None" },
      ],
    },
    {
      id: "stairs",
      label: "Climbing stairs",
      options: [
        { value: 0, label: "Impossible" },
        { value: 2, label: "One step at a time" },
        { value: 6, label: "Slightly impaired" },
        { value: 10, label: "No problems" },
      ],
    },
    {
      id: "squatting",
      label: "Squatting",
      options: [
        { value: 0, label: "Impossible" },
        { value: 2, label: "Not beyond 90°" },
        { value: 4, label: "Slightly impaired" },
        { value: 5, label: "No problems" },
      ],
    },
  ],
  scoring: { method: "sum" },
  maxScore: 100,
  interpretation: [
    { min: 0, max: 64, label: "Poor", description: "Poor knee function.", severity: "serious" },
    { min: 65, max: 83, label: "Fair", description: "Fair knee function.", severity: "warning" },
    { min: 84, max: 94, label: "Good", description: "Good knee function.", severity: "good" },
    { min: 95, max: 100, label: "Excellent", description: "Excellent knee function.", severity: "good" },
  ],
  calculationExplanation:
    "The Lysholm Knee Score is the sum of the point value assigned to the option selected for each of the 8 items — limp, support, locking, giving way, pain, swelling, stair-climbing, and squatting — for a total out of 100.",
  source: {
    citation: "Tegner Y, Lysholm J. Rating systems in the evaluation of knee ligament injuries. Clin Orthop Relat Res. 1985;(198):43-49.",
    url: "https://www.sralab.org/rehabilitation-measures/lysholm-knee-scoring-scale",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "lkss", {
  slug: "lkss",
  category_id: categoryId,
  name: "Lysholm Knee Scoring Scale",
  abbreviation: "LKSS",
  description: "Rates knee limp, support, locking, instability, pain, swelling, and function across 8 items, producing a score out of 100 that reflects overall knee status.",
  population: "Adults with knee ligament injury or other knee pathology",
  estimated_minutes_min: 3,
  estimated_minutes_max: 5,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 3,
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
    "Lysholm Knee Scoring Scale",
    "LKSS",
    "Rates knee limp, support, locking, instability, pain, swelling, and function across 8 items, producing a score out of 100 that reflects overall knee status.",
    "Adults with knee ligament injury or other knee pathology",
    3,
    5,
    JSON.stringify(definitionEn),
    "published",
    3,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemText, interpretationText, calculationExplanation) {
  return {
    items: definitionEn.items.map((item, i) => ({
      ...item,
      label: itemText[i].label,
      options: item.options.map((option, j) => ({ ...option, label: itemText[i].options[j] })),
    })),
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    calculationExplanation,
    source: definitionEn.source,
    interpretation: definitionEn.interpretation.map((band, i) => ({ ...band, label: interpretationText[i].label, description: interpretationText[i].description })),
  };
}

const ptPtItems = [
  { label: "Claudicação", options: ["Grave e constante", "Ligeira ou periódica", "Nenhuma"] },
  { label: "Apoio", options: ["Impossível apoiar o peso", "Bengala ou canadiana", "Nenhum"] },
  { label: "Sensação de bloqueio", options: ["Joelho bloqueado no exame", "Bloqueia frequentemente", "Bloqueia ocasionalmente", "Sensação de encravamento mas sem bloqueio", "Sem bloqueio, sem sensação de encravamento"] },
  { label: "Falseio (instabilidade)", options: ["Falseia a cada passo", "Frequentemente, nas atividades diárias", "Ocasionalmente, nas atividades diárias", "Frequentemente durante atividades desportivas ou extenuantes (incapaz de participar)", "Raramente durante atividades desportivas ou extenuantes", "Nunca falseia"] },
  { label: "Dor", options: ["Constante", "Marcada, ao caminhar ou após caminhar menos de 2 km", "Marcada, ao caminhar ou após caminhar mais de 2 km", "Marcada, durante atividades extenuantes", "Inconstante e ligeira, durante atividades extenuantes", "Nenhuma"] },
  { label: "Inchaço", options: ["Constante", "Nas atividades habituais", "Nas atividades extenuantes", "Nenhum"] },
  { label: "Subir escadas", options: ["Impossível", "Um degrau de cada vez", "Ligeiramente afetado", "Sem problemas"] },
  { label: "Agachar-se", options: ["Impossível", "Não além dos 90°", "Ligeiramente afetado", "Sem problemas"] },
];
const ptPtInterpretation = [
  { label: "Fraco", description: "Função do joelho fraca." },
  { label: "Razoável", description: "Função do joelho razoável." },
  { label: "Boa", description: "Boa função do joelho." },
  { label: "Excelente", description: "Excelente função do joelho." },
];
const calculationExplanationPtPt =
  "A pontuação Lysholm é a soma do valor atribuído à opção selecionada para cada um dos 8 itens — claudicação, apoio, bloqueio, falseio, dor, inchaço, subir escadas e agachar — para um total em 100.";

const ptBrItems = [
  { label: "Claudicação", options: ["Grave e constante", "Leve ou periódica", "Nenhuma"] },
  { label: "Apoio", options: ["Impossível apoiar o peso", "Bengala ou muleta", "Nenhum"] },
  { label: "Sensação de travamento", options: ["Joelho travado no exame", "Trava frequentemente", "Trava ocasionalmente", "Sensação de engano mas sem travamento", "Sem travamento, sem sensação de engano"] },
  { label: "Falseio (instabilidade)", options: ["Falseia a cada passo", "Frequentemente, nas atividades diárias", "Ocasionalmente, nas atividades diárias", "Frequentemente durante atividades esportivas ou extenuantes (incapaz de participar)", "Raramente durante atividades esportivas ou extenuantes", "Nunca falseia"] },
  { label: "Dor", options: ["Constante", "Marcante, ao andar ou após andar menos de 2 km", "Marcante, ao andar ou após andar mais de 2 km", "Marcante, durante atividades extenuantes", "Inconstante e leve, durante atividades extenuantes", "Nenhuma"] },
  { label: "Inchaço", options: ["Constante", "Nas atividades habituais", "Nas atividades extenuantes", "Nenhum"] },
  { label: "Subir escadas", options: ["Impossível", "Um degrau de cada vez", "Levemente afetado", "Sem problemas"] },
  { label: "Agachar", options: ["Impossível", "Não além dos 90°", "Levemente afetado", "Sem problemas"] },
];
const ptBrInterpretation = [
  { label: "Fraco", description: "Função do joelho fraca." },
  { label: "Razoável", description: "Função do joelho razoável." },
  { label: "Boa", description: "Boa função do joelho." },
  { label: "Excelente", description: "Excelente função do joelho." },
];
const calculationExplanationPtBr =
  "A pontuação Lysholm é a soma do valor atribuído à opção selecionada para cada um dos 8 itens — claudicação, apoio, travamento, falseio, dor, inchaço, subir escadas e agachar — para um total em 100.";

const esItems = [
  { label: "Cojera", options: ["Grave y constante", "Leve o periódica", "Ninguna"] },
  { label: "Apoyo", options: ["Imposible apoyar el peso", "Bastón o muleta", "Ninguno"] },
  { label: "Sensación de bloqueo", options: ["Rodilla bloqueada en el examen", "Se bloquea frecuentemente", "Se bloquea ocasionalmente", "Sensación de enganche pero sin bloqueo", "Sin bloqueo, sin sensación de enganche"] },
  { label: "Fallo (inestabilidad)", options: ["Falla en cada paso", "Frecuentemente, en las actividades diarias", "Ocasionalmente, en las actividades diarias", "Frecuentemente durante actividades deportivas o extenuantes (incapaz de participar)", "Raramente durante actividades deportivas o extenuantes", "Nunca falla"] },
  { label: "Dolor", options: ["Constante", "Marcado, al caminar o después de caminar menos de 2 km", "Marcado, al caminar o después de caminar más de 2 km", "Marcado, durante actividades extenuantes", "Inconstante y leve, durante actividades extenuantes", "Ninguno"] },
  { label: "Hinchazón", options: ["Constante", "En las actividades habituales", "En las actividades extenuantes", "Ninguna"] },
  { label: "Subir escaleras", options: ["Imposible", "Un escalón a la vez", "Levemente afectado", "Sin problemas"] },
  { label: "Ponerse en cuclillas", options: ["Imposible", "No más allá de 90°", "Levemente afectado", "Sin problemas"] },
];
const esInterpretation = [
  { label: "Deficiente", description: "Función de rodilla deficiente." },
  { label: "Aceptable", description: "Función de rodilla aceptable." },
  { label: "Buena", description: "Buena función de rodilla." },
  { label: "Excelente", description: "Excelente función de rodilla." },
];
const calculationExplanationEs =
  "La puntuación Lysholm es la suma del valor asignado a la opción seleccionada para cada uno de los 8 ítems — cojera, apoyo, bloqueo, fallo, dolor, hinchazón, subir escaleras y ponerse en cuclillas — para un total sobre 100.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Pontuação do Joelho de Lysholm",
    description: "Avalia a claudicação, o apoio, o bloqueio, o falseio, a dor, o inchaço e a função do joelho em 8 itens, produzindo uma pontuação em 100 que reflete o estado geral do joelho.",
    definition: translateDefinition(ptPtItems, ptPtInterpretation, calculationExplanationPtPt),
  },
  {
    locale: "pt-br",
    name: "Escala de Pontuação do Joelho de Lysholm",
    description: "Avalia a claudicação, o apoio, o travamento, o falseio, a dor, o inchaço e a função do joelho em 8 itens, gerando uma pontuação em 100 que reflete o estado geral do joelho.",
    definition: translateDefinition(ptBrItems, ptBrInterpretation, calculationExplanationPtBr),
  },
  {
    locale: "es",
    name: "Escala de Puntuación de Rodilla de Lysholm",
    description: "Evalúa la cojera, el apoyo, el bloqueo, el fallo, el dolor, la hinchazón y la función de la rodilla en 8 ítems, generando una puntuación sobre 100 que refleja el estado general de la rodilla.",
    definition: translateDefinition(esItems, esInterpretation, calculationExplanationEs),
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

console.log("LKSS seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
