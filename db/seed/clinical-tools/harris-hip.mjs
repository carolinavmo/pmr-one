// Harris Hip Score (HHS) — clinician-administered, sum-scored, 0-100
// across 4 domains: Pain (44 pts), Function (47 pts: gait + functional
// activities), Absence of Deformity (4 pts, pass/fail), and Range of
// Motion (5 pts, from the official ROM index table). Each domain is
// modeled as one or more items with their own point-valued options —
// same "items with differing option sets, not a shared rubric" shape
// as Barthel — rather than a shared Likert rubric like FIM/DASH.
//
// Deformity and Range of Motion are ordinarily assessed by the
// clinician (not patient self-report), same as this app's other
// clinician-administered scales (Berg, MRC-SS, NIHSS) — deformity is
// modeled as one all-or-nothing item (all 4 official criteria met, or
// not), and ROM as one item whose 6 options are the official index
// value bands (211-300 down to 0-30), not raw goniometry input.
//
// A classic, widely-reproduced academic instrument (Harris, 1969) —
// like Barthel/Berg/Katz, no proprietary flag is set (unlike DASH/FIM/
// KOOS/LEFS, which are modern trademarked instruments with a specific
// rights holder).
//
// Usage: node db/seed/clinical-tools/harris-hip.mjs
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

// ---------- Definition (English source) ----------

const definitionEn = {
  items: [
    {
      id: "pain",
      label: "Pain",
      options: [
        { value: 0, label: "Totally disabled", description: "Crippled by pain, bedridden." },
        { value: 10, label: "Marked", description: "Marked pain, serious limitation of activities." },
        { value: 20, label: "Moderate", description: "Moderate pain, tolerable but makes concessions; some limitation of ordinary activity or work; occasional pain medication needed." },
        { value: 30, label: "Mild", description: "Mild pain, no effect on average activities; rare moderate pain with unusual activity; may take aspirin." },
        { value: 40, label: "Slight, occasional", description: "Slight, occasional pain with no compromise in activities." },
        { value: 44, label: "None", description: "No pain, or ignores it." },
      ],
    },
    {
      id: "limp",
      label: "Limp",
      instructions: "Gait.",
      options: [
        { value: 0, label: "Severe", description: "" },
        { value: 5, label: "Moderate", description: "" },
        { value: 8, label: "Slight", description: "" },
        { value: 11, label: "None", description: "" },
      ],
    },
    {
      id: "support",
      label: "Walking support",
      instructions: "Gait.",
      options: [
        { value: 0, label: "Two crutches or unable to walk", description: "" },
        { value: 2, label: "Two canes", description: "" },
        { value: 3, label: "One crutch", description: "" },
        { value: 5, label: "Cane, most of the time", description: "" },
        { value: 7, label: "Cane, for long walks", description: "" },
        { value: 11, label: "None", description: "" },
      ],
    },
    {
      id: "distance_walked",
      label: "Distance walked",
      instructions: "Gait.",
      options: [
        { value: 0, label: "Bed and chair only", description: "" },
        { value: 2, label: "Indoors only", description: "" },
        { value: 5, label: "Two or three blocks", description: "" },
        { value: 8, label: "Six blocks", description: "" },
        { value: 11, label: "Unlimited", description: "" },
      ],
    },
    {
      id: "stairs",
      label: "Climbing stairs",
      instructions: "Functional activities.",
      options: [
        { value: 0, label: "Unable to climb stairs", description: "" },
        { value: 1, label: "In any manner", description: "" },
        { value: 2, label: "Normally, using a railing", description: "" },
        { value: 4, label: "Normally, without using a railing", description: "" },
      ],
    },
    {
      id: "shoes_socks",
      label: "Putting on shoes and socks",
      instructions: "Functional activities.",
      options: [
        { value: 0, label: "Unable", description: "" },
        { value: 2, label: "With difficulty", description: "" },
        { value: 4, label: "With ease", description: "" },
      ],
    },
    {
      id: "sitting",
      label: "Sitting",
      instructions: "Functional activities.",
      options: [
        { value: 0, label: "Unable to sit comfortably in any chair", description: "" },
        { value: 3, label: "On a high chair for half an hour", description: "" },
        { value: 5, label: "Comfortably in an ordinary chair for one hour", description: "" },
      ],
    },
    {
      id: "public_transportation",
      label: "Use of public transportation",
      instructions: "Functional activities.",
      options: [
        { value: 0, label: "Unable to use public transportation", description: "" },
        { value: 1, label: "Able to use public transportation", description: "" },
      ],
    },
    {
      id: "deformity",
      label: "Absence of deformity",
      instructions: "All four criteria must be met for the full 4 points: less than 10° fixed adduction, less than 10° fixed internal rotation in extension, limb-length discrepancy under 3.2 cm, and less than 30° fixed flexion contracture.",
      options: [
        { value: 0, label: "Does not meet all 4 criteria", description: "" },
        { value: 4, label: "Meets all 4 criteria", description: "No significant hip deformity." },
      ],
    },
    {
      id: "range_of_motion",
      label: "Range of motion",
      instructions: "From the official index value (sum of flexion, abduction, adduction, external rotation, and internal rotation, each weighted by its own index factor).",
      options: [
        { value: 0, label: "Index value 0–30" },
        { value: 1, label: "Index value 31–60" },
        { value: 2, label: "Index value 61–100" },
        { value: 3, label: "Index value 101–160" },
        { value: 4, label: "Index value 161–210" },
        { value: 5, label: "Index value 211–300" },
      ],
    },
  ],
  scoring: { method: "sum" },
  maxScore: 100,
  interpretation: [
    { min: 0, max: 69, label: "Poor", description: "Poor hip function.", severity: "serious" },
    { min: 70, max: 79, label: "Fair", description: "Fair hip function.", severity: "warning" },
    { min: 80, max: 89, label: "Good", description: "Good hip function.", severity: "good" },
    { min: 90, max: 100, label: "Excellent", description: "Excellent hip function.", severity: "good" },
  ],
  calculationExplanation:
    "The Harris Hip Score is the sum of the point value assigned to the option selected for each of the 10 items — Pain (up to 44 points), gait and functional activities (up to 47 points), absence of deformity (up to 4 points), and range of motion (up to 5 points) — for a total out of 100. Deformity and range of motion are ordinarily assessed by the examining clinician rather than reported by the patient.",
  source: {
    citation: "Harris WH. Traumatic arthritis of the hip after dislocation and acetabular fractures: treatment by mold arthroplasty. An end-result study using a new method of result evaluation. J Bone Joint Surg Am. 1969;51(4):737-755.",
    url: "https://www.sralab.org/rehabilitation-measures/harris-hip-score",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "harris-hip-score", {
  slug: "harris-hip-score",
  category_id: categoryId,
  name: "Harris Hip Score",
  abbreviation: "HHS",
  description: "Rates hip pain, function, deformity, and range of motion, producing a score out of 100 that reflects overall hip status.",
  population: "Adults with hip pathology or following hip replacement surgery",
  estimated_minutes_min: 5,
  estimated_minutes_max: 8,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 6,
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
    "Harris Hip Score",
    "HHS",
    "Rates hip pain, function, deformity, and range of motion, producing a score out of 100 that reflects overall hip status.",
    "Adults with hip pathology or following hip replacement surgery",
    5,
    8,
    JSON.stringify(definitionEn),
    "published",
    6,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemText, interpretationText, calculationExplanation) {
  return {
    items: definitionEn.items.map((item, i) => ({
      ...item,
      label: itemText[i].label,
      instructions: itemText[i].instructions,
      options: item.options.map((option, j) => ({
        ...option,
        label: itemText[i].options[j].label,
        description: itemText[i].options[j].description,
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

const ptPtItems = [
  { label: "Dor", instructions: undefined, options: [
    { label: "Totalmente incapacitado", description: "Incapacitado pela dor, acamado." },
    { label: "Marcada", description: "Dor marcada, limitação séria das atividades." },
    { label: "Moderada", description: "Dor moderada, tolerável mas com concessões; alguma limitação da atividade habitual ou do trabalho; ocasionalmente precisa de medicação." },
    { label: "Ligeira", description: "Dor ligeira, sem efeito nas atividades habituais; raramente dor moderada com atividade invulgar; pode tomar aspirina." },
    { label: "Ligeira, ocasional", description: "Dor ligeira e ocasional, sem comprometer as atividades." },
    { label: "Nenhuma", description: "Sem dor, ou ignora-a." },
  ]},
  { label: "Claudicação", instructions: "Marcha.", options: [
    { label: "Grave", description: "" }, { label: "Moderada", description: "" }, { label: "Ligeira", description: "" }, { label: "Nenhuma", description: "" },
  ]},
  { label: "Apoio ao caminhar", instructions: "Marcha.", options: [
    { label: "Duas canadianas ou incapaz de andar", description: "" },
    { label: "Duas bengalas", description: "" },
    { label: "Uma canadiana", description: "" },
    { label: "Bengala, a maior parte do tempo", description: "" },
    { label: "Bengala, para caminhadas longas", description: "" },
    { label: "Nenhum", description: "" },
  ]},
  { label: "Distância percorrida", instructions: "Marcha.", options: [
    { label: "Apenas cama e cadeira", description: "" },
    { label: "Apenas dentro de casa", description: "" },
    { label: "Dois ou três quarteirões", description: "" },
    { label: "Seis quarteirões", description: "" },
    { label: "Ilimitada", description: "" },
  ]},
  { label: "Subir escadas", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz de subir escadas", description: "" },
    { label: "De qualquer forma", description: "" },
    { label: "Normalmente, usando o corrimão", description: "" },
    { label: "Normalmente, sem usar o corrimão", description: "" },
  ]},
  { label: "Calçar sapatos e meias", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz", description: "" }, { label: "Com dificuldade", description: "" }, { label: "Com facilidade", description: "" },
  ]},
  { label: "Sentar-se", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz de se sentar confortavelmente em qualquer cadeira", description: "" },
    { label: "Numa cadeira alta durante meia hora", description: "" },
    { label: "Confortavelmente numa cadeira normal durante uma hora", description: "" },
  ]},
  { label: "Uso de transportes públicos", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz de usar transportes públicos", description: "" },
    { label: "Capaz de usar transportes públicos", description: "" },
  ]},
  { label: "Ausência de deformidade", instructions: "Os quatro critérios têm de ser cumpridos para os 4 pontos completos: menos de 10° de adução fixa, menos de 10° de rotação interna fixa em extensão, discrepância no comprimento do membro inferior a 3,2 cm, e menos de 30° de contratura em flexão fixa.", options: [
    { label: "Não cumpre os 4 critérios", description: "" },
    { label: "Cumpre os 4 critérios", description: "Sem deformidade significativa da anca." },
  ]},
  { label: "Amplitude de movimento", instructions: "A partir do valor de índice oficial (soma da flexão, abdução, adução, rotação externa e rotação interna, cada uma ponderada pelo seu próprio fator de índice).", options: [
    { label: "Valor de índice 0–30" },
    { label: "Valor de índice 31–60" },
    { label: "Valor de índice 61–100" },
    { label: "Valor de índice 101–160" },
    { label: "Valor de índice 161–210" },
    { label: "Valor de índice 211–300" },
  ]},
];
const ptPtInterpretation = [
  { label: "Fraco", description: "Função da anca fraca." },
  { label: "Razoável", description: "Função da anca razoável." },
  { label: "Boa", description: "Boa função da anca." },
  { label: "Excelente", description: "Excelente função da anca." },
];
const calculationExplanationPtPt =
  "A pontuação Harris Hip Score é a soma do valor atribuído à opção selecionada para cada um dos 10 itens — Dor (até 44 pontos), marcha e atividades funcionais (até 47 pontos), ausência de deformidade (até 4 pontos) e amplitude de movimento (até 5 pontos) — para um total em 100. A deformidade e a amplitude de movimento são normalmente avaliadas pelo clínico examinador, e não reportadas pelo doente.";

const ptBrItems = [
  { label: "Dor", instructions: undefined, options: [
    { label: "Totalmente incapacitado", description: "Incapacitado pela dor, acamado." },
    { label: "Marcante", description: "Dor marcante, limitação séria das atividades." },
    { label: "Moderada", description: "Dor moderada, tolerável mas com concessões; alguma limitação da atividade habitual ou do trabalho; ocasionalmente precisa de medicação." },
    { label: "Leve", description: "Dor leve, sem efeito nas atividades habituais; raramente dor moderada com atividade incomum; pode tomar aspirina." },
    { label: "Leve, ocasional", description: "Dor leve e ocasional, sem comprometer as atividades." },
    { label: "Nenhuma", description: "Sem dor, ou ignora-a." },
  ]},
  { label: "Claudicação", instructions: "Marcha.", options: [
    { label: "Grave", description: "" }, { label: "Moderada", description: "" }, { label: "Leve", description: "" }, { label: "Nenhuma", description: "" },
  ]},
  { label: "Apoio para caminhar", instructions: "Marcha.", options: [
    { label: "Duas muletas ou incapaz de andar", description: "" },
    { label: "Duas bengalas", description: "" },
    { label: "Uma muleta", description: "" },
    { label: "Bengala, na maior parte do tempo", description: "" },
    { label: "Bengala, para caminhadas longas", description: "" },
    { label: "Nenhum", description: "" },
  ]},
  { label: "Distância percorrida", instructions: "Marcha.", options: [
    { label: "Apenas cama e cadeira", description: "" },
    { label: "Apenas dentro de casa", description: "" },
    { label: "Dois ou três quarteirões", description: "" },
    { label: "Seis quarteirões", description: "" },
    { label: "Ilimitada", description: "" },
  ]},
  { label: "Subir escadas", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz de subir escadas", description: "" },
    { label: "De qualquer forma", description: "" },
    { label: "Normalmente, usando o corrimão", description: "" },
    { label: "Normalmente, sem usar o corrimão", description: "" },
  ]},
  { label: "Calçar sapatos e meias", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz", description: "" }, { label: "Com dificuldade", description: "" }, { label: "Com facilidade", description: "" },
  ]},
  { label: "Sentar-se", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz de sentar-se confortavelmente em qualquer cadeira", description: "" },
    { label: "Em uma cadeira alta durante meia hora", description: "" },
    { label: "Confortavelmente em uma cadeira comum durante uma hora", description: "" },
  ]},
  { label: "Uso de transporte público", instructions: "Atividades funcionais.", options: [
    { label: "Incapaz de usar transporte público", description: "" },
    { label: "Capaz de usar transporte público", description: "" },
  ]},
  { label: "Ausência de deformidade", instructions: "Os quatro critérios precisam ser cumpridos para os 4 pontos completos: menos de 10° de adução fixa, menos de 10° de rotação interna fixa em extensão, discrepância no comprimento do membro a 3,2 cm, e menos de 30° de contratura em flexão fixa.", options: [
    { label: "Não cumpre os 4 critérios", description: "" },
    { label: "Cumpre os 4 critérios", description: "Sem deformidade significativa do quadril." },
  ]},
  { label: "Amplitude de movimento", instructions: "A partir do valor de índice oficial (soma da flexão, abdução, adução, rotação externa e rotação interna, cada uma ponderada pelo seu próprio fator de índice).", options: [
    { label: "Valor de índice 0–30" },
    { label: "Valor de índice 31–60" },
    { label: "Valor de índice 61–100" },
    { label: "Valor de índice 101–160" },
    { label: "Valor de índice 161–210" },
    { label: "Valor de índice 211–300" },
  ]},
];
const ptBrInterpretation = [
  { label: "Fraco", description: "Função do quadril fraca." },
  { label: "Razoável", description: "Função do quadril razoável." },
  { label: "Boa", description: "Boa função do quadril." },
  { label: "Excelente", description: "Excelente função do quadril." },
];
const calculationExplanationPtBr =
  "A pontuação Harris Hip Score é a soma do valor atribuído à opção selecionada para cada um dos 10 itens — Dor (até 44 pontos), marcha e atividades funcionais (até 47 pontos), ausência de deformidade (até 4 pontos) e amplitude de movimento (até 5 pontos) — para um total em 100. A deformidade e a amplitude de movimento são normalmente avaliadas pelo clínico examinador, e não relatadas pelo paciente.";

const esItems = [
  { label: "Dolor", instructions: undefined, options: [
    { label: "Totalmente discapacitado", description: "Incapacitado por el dolor, en cama." },
    { label: "Marcado", description: "Dolor marcado, limitación grave de las actividades." },
    { label: "Moderado", description: "Dolor moderado, tolerable pero con concesiones; alguna limitación de la actividad habitual o del trabajo; ocasionalmente necesita medicación." },
    { label: "Leve", description: "Dolor leve, sin efecto en las actividades habituales; rara vez dolor moderado con actividad inusual; puede tomar aspirina." },
    { label: "Leve, ocasional", description: "Dolor leve y ocasional, sin comprometer las actividades." },
    { label: "Ninguno", description: "Sin dolor, o lo ignora." },
  ]},
  { label: "Cojera", instructions: "Marcha.", options: [
    { label: "Grave", description: "" }, { label: "Moderada", description: "" }, { label: "Leve", description: "" }, { label: "Ninguna", description: "" },
  ]},
  { label: "Apoyo para caminar", instructions: "Marcha.", options: [
    { label: "Dos muletas o incapaz de caminar", description: "" },
    { label: "Dos bastones", description: "" },
    { label: "Una muleta", description: "" },
    { label: "Bastón, la mayor parte del tiempo", description: "" },
    { label: "Bastón, para caminatas largas", description: "" },
    { label: "Ninguno", description: "" },
  ]},
  { label: "Distancia caminada", instructions: "Marcha.", options: [
    { label: "Solo cama y silla", description: "" },
    { label: "Solo dentro de casa", description: "" },
    { label: "Dos o tres manzanas", description: "" },
    { label: "Seis manzanas", description: "" },
    { label: "Ilimitada", description: "" },
  ]},
  { label: "Subir escaleras", instructions: "Actividades funcionales.", options: [
    { label: "Incapaz de subir escaleras", description: "" },
    { label: "De cualquier manera", description: "" },
    { label: "Normalmente, usando el pasamanos", description: "" },
    { label: "Normalmente, sin usar el pasamanos", description: "" },
  ]},
  { label: "Ponerse zapatos y calcetines", instructions: "Actividades funcionales.", options: [
    { label: "Incapaz", description: "" }, { label: "Con dificultad", description: "" }, { label: "Con facilidad", description: "" },
  ]},
  { label: "Sentarse", instructions: "Actividades funcionales.", options: [
    { label: "Incapaz de sentarse cómodamente en cualquier silla", description: "" },
    { label: "En una silla alta durante media hora", description: "" },
    { label: "Cómodamente en una silla normal durante una hora", description: "" },
  ]},
  { label: "Uso de transporte público", instructions: "Actividades funcionales.", options: [
    { label: "Incapaz de usar transporte público", description: "" },
    { label: "Capaz de usar transporte público", description: "" },
  ]},
  { label: "Ausencia de deformidad", instructions: "Los cuatro criterios deben cumplirse para los 4 puntos completos: menos de 10° de aducción fija, menos de 10° de rotación interna fija en extensión, discrepancia en la longitud de la extremidad menor a 3,2 cm, y menos de 30° de contractura en flexión fija.", options: [
    { label: "No cumple los 4 criterios", description: "" },
    { label: "Cumple los 4 criterios", description: "Sin deformidad significativa de la cadera." },
  ]},
  { label: "Rango de movimiento", instructions: "A partir del valor de índice oficial (suma de la flexión, abducción, aducción, rotación externa y rotación interna, cada una ponderada por su propio factor de índice).", options: [
    { label: "Valor de índice 0–30" },
    { label: "Valor de índice 31–60" },
    { label: "Valor de índice 61–100" },
    { label: "Valor de índice 101–160" },
    { label: "Valor de índice 161–210" },
    { label: "Valor de índice 211–300" },
  ]},
];
const esInterpretation = [
  { label: "Deficiente", description: "Función de cadera deficiente." },
  { label: "Aceptable", description: "Función de cadera aceptable." },
  { label: "Buena", description: "Buena función de cadera." },
  { label: "Excelente", description: "Excelente función de cadera." },
];
const calculationExplanationEs =
  "La puntuación Harris Hip Score es la suma del valor asignado a la opción seleccionada para cada uno de los 10 ítems — Dolor (hasta 44 puntos), marcha y actividades funcionales (hasta 47 puntos), ausencia de deformidad (hasta 4 puntos) y rango de movimiento (hasta 5 puntos) — para un total sobre 100. La deformidad y el rango de movimiento normalmente son evaluados por el clínico examinador, no reportados por el paciente.";

const translations = [
  {
    locale: "pt-pt",
    name: "Harris Hip Score",
    description: "Avalia a dor, a função, a deformidade e a amplitude de movimento da anca, produzindo uma pontuação em 100 que reflete o estado geral da anca.",
    definition: translateDefinition(ptPtItems, ptPtInterpretation, calculationExplanationPtPt),
  },
  {
    locale: "pt-br",
    name: "Harris Hip Score",
    description: "Avalia a dor, a função, a deformidade e a amplitude de movimento do quadril, gerando uma pontuação em 100 que reflete o estado geral do quadril.",
    definition: translateDefinition(ptBrItems, ptBrInterpretation, calculationExplanationPtBr),
  },
  {
    locale: "es",
    name: "Harris Hip Score",
    description: "Evalúa el dolor, la función, la deformidad y el rango de movimiento de la cadera, generando una puntuación sobre 100 que refleja el estado general de la cadera.",
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

console.log("Harris Hip Score seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
