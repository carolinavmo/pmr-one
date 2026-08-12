// Foot Function Index (FFI) — 23 items (9 Pain + 9 Disability + 5
// Activity Limitation), each an 11-point 0-10 numeric rating scale (0
// = no pain/difficulty, 10 = worst pain/unable), combined into ONE
// overall 0-100 percentage score via the new "percent10" formula
// (calculator-scoring.ts) — same "single combined card" choice applied
// to KOOS-12/HOOS-12/WOMAC, rather than the instrument's conventional
// 3 subscale scores. descendingGood: true (higher = worse, matching
// FFI's own convention), no official discrete severity bands, so
// resultNote is the fallback.
//
// A classic academic instrument (Budiman-Mak et al., 1991) — like
// Barthel/Berg/LKSS/WOMAC, no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/ffi.mjs
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

// A single 0-10 numeric rating scale, reused by every item (same
// "one shared rubric, only item wording changes" shape as FIM/DASH).
const NRS_EN = Array.from({ length: 11 }, (_, value) => ({
  value,
  label:
    value === 0
      ? "0 — none"
      : value === 10
        ? "10 — worst imaginable"
        : String(value),
}));

const ITEMS_EN = [
  { id: "pain_worst", section: "Pain", label: "Your foot pain at its worst" },
  { id: "pain_first_steps", section: "Pain", label: "Pain during your first steps in the morning" },
  { id: "pain_standing_barefoot", section: "Pain", label: "Pain standing barefoot" },
  { id: "pain_walking_barefoot", section: "Pain", label: "Pain walking barefoot" },
  { id: "pain_standing_shoes", section: "Pain", label: "Pain standing in your usual shoes" },
  { id: "pain_walking_shoes", section: "Pain", label: "Pain walking in your usual shoes" },
  { id: "pain_orthotics", section: "Pain", label: "Pain walking with your orthotics or brace, if used" },
  { id: "pain_end_of_day", section: "Pain", label: "Pain at the end of the day" },
  { id: "pain_at_rest", section: "Pain", label: "Pain at rest" },
  { id: "disability_indoors", section: "Disability", label: "Difficulty walking indoors" },
  { id: "disability_outdoors", section: "Disability", label: "Difficulty walking outdoors on uneven ground" },
  { id: "disability_short_distance", section: "Disability", label: "Difficulty walking a short distance" },
  { id: "disability_long_distance", section: "Disability", label: "Difficulty walking a long distance" },
  { id: "disability_stairs_up", section: "Disability", label: "Difficulty climbing up stairs" },
  { id: "disability_stairs_down", section: "Disability", label: "Difficulty walking down stairs" },
  { id: "disability_tiptoes", section: "Disability", label: "Difficulty standing on your tiptoes" },
  { id: "disability_rising", section: "Disability", label: "Difficulty rising from a seated position" },
  { id: "disability_car", section: "Disability", label: "Difficulty getting into or out of a car" },
  { id: "activity_indoors_all_day", section: "Activity Limitation", label: "How much has your foot limited you to staying indoors most of the day?" },
  { id: "activity_bed", section: "Activity Limitation", label: "How much has your foot limited you to staying in bed most of the day?" },
  { id: "activity_limiting", section: "Activity Limitation", label: "How much has your foot limited your usual activities?" },
  { id: "activity_aid_indoors", section: "Activity Limitation", label: "How much have you needed a walking aid indoors because of your foot?" },
  { id: "activity_aid_outdoors", section: "Activity Limitation", label: "How much have you needed a walking aid outdoors because of your foot?" },
];

const definitionEn = {
  items: ITEMS_EN.map((item) => ({ id: item.id, section: item.section, label: item.label, options: NRS_EN })),
  scoring: { method: "formula", formula: "percent10" },
  minScore: 0,
  maxScore: 100,
  descendingGood: true,
  calculationExplanation:
    "Each of the 23 items — 9 on pain, 9 on disability, and 5 on activity limitation — is rated on a 0 (none) to 10 (worst imaginable) scale. The mean of the answered items is calculated and rescaled to a 0-100 percentage, so 0 means no foot problems and 100 means the worst possible on every item. All 23 items must be answered.",
  resultNote: {
    label: "A higher score corresponds to worse foot pain and disability.",
    description: "Score and interpretation should always be contextualized clinically.",
    lowLabel: "Fewer problems",
    highLabel: "More problems",
  },
  source: {
    citation: "Budiman-Mak E, Conrad KJ, Roach KE. The Foot Function Index: a measure of foot pain and disability. J Clin Epidemiol. 1991;44(6):561-570.",
    url: "https://www.sralab.org/rehabilitation-measures/foot-function-index",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "ffi", {
  slug: "ffi",
  category_id: categoryId,
  name: "Foot Function Index",
  abbreviation: "FFI",
  description: "Measures foot pain, disability, and activity limitation across 23 items, producing a score out of 100 (0 = no problems).",
  population: "Adults with any foot or ankle condition",
  estimated_minutes_min: 4,
  estimated_minutes_max: 6,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 5,
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
    "Foot Function Index",
    "FFI",
    "Measures foot pain, disability, and activity limitation across 23 items, producing a score out of 100 (0 = no problems).",
    "Adults with any foot or ankle condition",
    4,
    6,
    JSON.stringify(definitionEn),
    "published",
    5,
  ]
);

// ---------- Translations ----------

function nrsScale(zeroLabel, tenLabel) {
  return Array.from({ length: 11 }, (_, value) => ({
    value,
    label: value === 0 ? `0 — ${zeroLabel}` : value === 10 ? `10 — ${tenLabel}` : String(value),
  }));
}

function buildTranslated(itemLabels, rubric, calculationExplanation, resultNote) {
  return {
    items: ITEMS_EN.map((item, i) => ({ id: item.id, section: item.section, label: itemLabels[i].label, options: rubric })),
    scoring: definitionEn.scoring,
    minScore: definitionEn.minScore,
    maxScore: definitionEn.maxScore,
    descendingGood: true,
    calculationExplanation,
    resultNote,
    source: definitionEn.source,
  };
}

const ITEMS_PT_PT = [
  { label: "A sua dor no pé no seu pior momento" },
  { label: "Dor nos primeiros passos de manhã" },
  { label: "Dor ao estar de pé descalço" },
  { label: "Dor ao caminhar descalço" },
  { label: "Dor ao estar de pé com o calçado habitual" },
  { label: "Dor ao caminhar com o calçado habitual" },
  { label: "Dor ao caminhar com ortóteses ou ortótese, se utilizada" },
  { label: "Dor ao final do dia" },
  { label: "Dor em repouso" },
  { label: "Dificuldade em andar dentro de casa" },
  { label: "Dificuldade em andar ao ar livre em terreno irregular" },
  { label: "Dificuldade em andar uma curta distância" },
  { label: "Dificuldade em andar uma longa distância" },
  { label: "Dificuldade em subir escadas" },
  { label: "Dificuldade em descer escadas" },
  { label: "Dificuldade em ficar na ponta dos pés" },
  { label: "Dificuldade em levantar-se de estar sentado" },
  { label: "Dificuldade em entrar ou sair de um carro" },
  { label: "Em que medida o seu pé o(a) limitou a ficar em casa a maior parte do dia?" },
  { label: "Em que medida o seu pé o(a) limitou a ficar na cama a maior parte do dia?" },
  { label: "Em que medida o seu pé limitou as suas atividades habituais?" },
  { label: "Em que medida precisou de um apoio para andar dentro de casa devido ao seu pé?" },
  { label: "Em que medida precisou de um apoio para andar ao ar livre devido ao seu pé?" },
];
const calculationExplanationPtPt =
  "Cada um dos 23 itens — 9 sobre dor, 9 sobre incapacidade e 5 sobre limitação de atividades — é pontuado numa escala de 0 (nenhuma) a 10 (a pior imaginável). Calcula-se a média dos itens respondidos e reescala-se para uma percentagem de 0 a 100, pelo que 0 significa ausência de problemas no pé e 100 significa o pior possível em todos os itens. Todos os 23 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a pior dor e incapacidade no pé.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Menos problemas",
  highLabel: "Mais problemas",
};

const ITEMS_PT_BR = [
  { label: "Sua dor no pé no seu pior momento" },
  { label: "Dor nos primeiros passos de manhã" },
  { label: "Dor ao ficar em pé descalço" },
  { label: "Dor ao andar descalço" },
  { label: "Dor ao ficar em pé com o calçado habitual" },
  { label: "Dor ao andar com o calçado habitual" },
  { label: "Dor ao andar com órteses, se utilizadas" },
  { label: "Dor ao final do dia" },
  { label: "Dor em repouso" },
  { label: "Dificuldade para andar dentro de casa" },
  { label: "Dificuldade para andar ao ar livre em terreno irregular" },
  { label: "Dificuldade para andar uma curta distância" },
  { label: "Dificuldade para andar uma longa distância" },
  { label: "Dificuldade para subir escadas" },
  { label: "Dificuldade para descer escadas" },
  { label: "Dificuldade para ficar na ponta dos pés" },
  { label: "Dificuldade para levantar-se de estar sentado" },
  { label: "Dificuldade para entrar ou sair de um carro" },
  { label: "O quanto seu pé te limitou a ficar em casa a maior parte do dia?" },
  { label: "O quanto seu pé te limitou a ficar na cama a maior parte do dia?" },
  { label: "O quanto seu pé limitou suas atividades habituais?" },
  { label: "O quanto você precisou de um apoio para andar dentro de casa devido ao seu pé?" },
  { label: "O quanto você precisou de um apoio para andar ao ar livre devido ao seu pé?" },
];
const calculationExplanationPtBr =
  "Cada um dos 23 itens — 9 sobre dor, 9 sobre incapacidade e 5 sobre limitação de atividades — é pontuado em uma escala de 0 (nenhuma) a 10 (a pior imaginável). Calcula-se a média dos itens respondidos e reescala-se para uma porcentagem de 0 a 100, de forma que 0 significa ausência de problemas no pé e 100 significa o pior possível em todos os itens. Todos os 23 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a pior dor e incapacidade no pé.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Menos problemas",
  highLabel: "Mais problemas",
};

const ITEMS_ES = [
  { label: "Su dolor de pie en su peor momento" },
  { label: "Dolor en los primeros pasos por la mañana" },
  { label: "Dolor al estar de pie descalzo" },
  { label: "Dolor al caminar descalzo" },
  { label: "Dolor al estar de pie con su calzado habitual" },
  { label: "Dolor al caminar con su calzado habitual" },
  { label: "Dolor al caminar con ortesis, si las usa" },
  { label: "Dolor al final del día" },
  { label: "Dolor en reposo" },
  { label: "Dificultad para caminar dentro de casa" },
  { label: "Dificultad para caminar al aire libre en terreno irregular" },
  { label: "Dificultad para caminar una distancia corta" },
  { label: "Dificultad para caminar una distancia larga" },
  { label: "Dificultad para subir escaleras" },
  { label: "Dificultad para bajar escaleras" },
  { label: "Dificultad para ponerse de puntillas" },
  { label: "Dificultad para levantarse de estar sentado" },
  { label: "Dificultad para entrar o salir de un coche" },
  { label: "¿Cuánto le ha limitado su pie a quedarse en casa la mayor parte del día?" },
  { label: "¿Cuánto le ha limitado su pie a quedarse en cama la mayor parte del día?" },
  { label: "¿Cuánto le ha limitado su pie sus actividades habituales?" },
  { label: "¿Cuánto ha necesitado un apoyo para caminar dentro de casa debido a su pie?" },
  { label: "¿Cuánto ha necesitado un apoyo para caminar al aire libre debido a su pie?" },
];
const calculationExplanationEs =
  "Cada uno de los 23 ítems — 9 sobre dolor, 9 sobre discapacidad y 5 sobre limitación de actividades — se puntúa en una escala de 0 (ninguno) a 10 (el peor imaginable). Se calcula la media de los ítems respondidos y se reescala a un porcentaje de 0 a 100, por lo que 0 significa ausencia de problemas en el pie y 100 significa lo peor posible en todos los ítems. Los 23 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a peor dolor y discapacidad del pie.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Menos problemas",
  highLabel: "Más problemas",
};

const translations = [
  {
    locale: "pt-pt",
    name: "Índice de Função do Pé",
    description: "Mede a dor, a incapacidade e a limitação de atividades do pé em 23 itens, produzindo uma pontuação em 100 (0 = sem problemas).",
    definition: buildTranslated(ITEMS_PT_PT, nrsScale("nenhuma", "a pior imaginável"), calculationExplanationPtPt, resultNotePtPt),
  },
  {
    locale: "pt-br",
    name: "Índice de Função do Pé",
    description: "Mede a dor, a incapacidade e a limitação de atividades do pé em 23 itens, gerando uma pontuação em 100 (0 = sem problemas).",
    definition: buildTranslated(ITEMS_PT_BR, nrsScale("nenhuma", "a pior imaginável"), calculationExplanationPtBr, resultNotePtBr),
  },
  {
    locale: "es",
    name: "Índice de Función del Pie",
    description: "Mide el dolor, la discapacidad y la limitación de actividades del pie en 23 ítems, generando una puntuación sobre 100 (0 = sin problemas).",
    definition: buildTranslated(ITEMS_ES, nrsScale("ninguno", "el peor imaginable"), calculationExplanationEs, resultNoteEs),
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

console.log("FFI seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
