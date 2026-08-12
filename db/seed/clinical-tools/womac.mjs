// WOMAC (Western Ontario and McMaster Universities Osteoarthritis
// Index) — combined into ONE overall score (24 items, raw sum 0-96),
// per an explicit product decision to present it as a single card
// rather than its 3 conventionally-separate subscales (Pain 5 items,
// Stiffness 2 items, Physical Function 17 items) — the same choice
// applied to KOOS-12/HOOS-12. Every item shares the same 0-4 rubric
// (Likert 3.1 format), descendingGood: true (higher = worse, matching
// WOMAC's own convention), raw 0-96 total (the standard Likert 3.1
// scoring — not rescaled to 0-100), no official discrete severity
// bands, so resultNote is the fallback (same "no interpretation
// array" pattern as FIM/LEFS).
//
// A classic, freely-reproduced academic instrument (Bellamy et al.,
// 1988) — like Barthel/Berg/LKSS, no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/womac.mjs
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

const ITEMS_EN = [
  { id: "pain_walking", section: "Pain", label: "Walking on a flat surface" },
  { id: "pain_stairs", section: "Pain", label: "Going up or down stairs" },
  { id: "pain_night", section: "Pain", label: "At night while in bed" },
  { id: "pain_sitting", section: "Pain", label: "Sitting or lying down" },
  { id: "pain_standing", section: "Pain", label: "Standing upright" },
  { id: "stiffness_morning", section: "Stiffness", label: "Joint stiffness after first waking up in the morning" },
  { id: "stiffness_later", section: "Stiffness", label: "Joint stiffness later in the day, after sitting, lying, or resting" },
  { id: "fn_descending_stairs", section: "Function", label: "Descending stairs" },
  { id: "fn_ascending_stairs", section: "Function", label: "Ascending stairs" },
  { id: "fn_rising_sitting", section: "Function", label: "Rising from sitting" },
  { id: "fn_standing", section: "Function", label: "Standing" },
  { id: "fn_bending_floor", section: "Function", label: "Bending to the floor or picking up an object" },
  { id: "fn_walking_flat", section: "Function", label: "Walking on a flat surface" },
  { id: "fn_car", section: "Function", label: "Getting into or out of a car" },
  { id: "fn_shopping", section: "Function", label: "Going shopping" },
  { id: "fn_socks_on", section: "Function", label: "Putting on socks or stockings" },
  { id: "fn_rising_bed", section: "Function", label: "Rising from bed" },
  { id: "fn_socks_off", section: "Function", label: "Taking off socks or stockings" },
  { id: "fn_lying_bed", section: "Function", label: "Lying in bed" },
  { id: "fn_bath", section: "Function", label: "Getting into or out of the bath" },
  { id: "fn_sitting", section: "Function", label: "Sitting" },
  { id: "fn_toilet", section: "Function", label: "Getting on or off the toilet" },
  { id: "fn_heavy_chores", section: "Function", label: "Heavy domestic duties (moving heavy boxes, scrubbing floors, etc.)" },
  { id: "fn_light_chores", section: "Function", label: "Light domestic duties (cooking, dusting, etc.)" },
];

const definitionEn = {
  items: ITEMS_EN.map((item) => ({ id: item.id, section: item.section, label: item.label, options: SEVERITY_EN })),
  scoring: { method: "sum" },
  maxScore: 96,
  descendingGood: true,
  calculationExplanation:
    "The WOMAC total score is the sum of the 24 items — 5 on pain, 2 on stiffness, and 17 on physical function — each rated 0 (none) to 4 (extreme), for a raw total from 0 (no problems) to 96 (worst possible). This is the standard Likert 3.1 raw scoring; it is not rescaled to a 0-100 percentage. All 24 items must be answered.",
  resultNote: {
    label: "A higher score corresponds to worse pain, stiffness, and function.",
    description: "Score and interpretation should always be contextualized clinically.",
    lowLabel: "Fewer problems",
    highLabel: "More problems",
  },
  source: {
    citation: "Bellamy N, Buchanan WW, Goldsmith CH, Campbell J, Stitt LW. Validation study of WOMAC: a health status instrument for measuring clinically important patient relevant outcomes to antirheumatic drug therapy in patients with osteoarthritis of the hip or knee. J Rheumatol. 1988;15(12):1833-1840.",
    url: "https://www.sralab.org/rehabilitation-measures/western-ontario-and-mcmaster-universities-osteoarthritis-index",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "womac", {
  slug: "womac",
  category_id: categoryId,
  name: "Western Ontario and McMaster Universities Osteoarthritis Index",
  abbreviation: "WOMAC",
  description: "Measures hip or knee osteoarthritis pain, stiffness, and physical function across 24 items, producing a raw score out of 96 (0 = no problems).",
  population: "Adults with hip or knee osteoarthritis",
  estimated_minutes_min: 5,
  estimated_minutes_max: 8,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 4,
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
    "Western Ontario and McMaster Universities Osteoarthritis Index",
    "WOMAC",
    "Measures hip or knee osteoarthritis pain, stiffness, and physical function across 24 items, producing a raw score out of 96 (0 = no problems).",
    "Adults with hip or knee osteoarthritis",
    5,
    8,
    JSON.stringify(definitionEn),
    "published",
    4,
  ]
);

// ---------- Translations ----------

function buildTranslated(itemLabels, rubric, calculationExplanation, resultNote) {
  return {
    items: ITEMS_EN.map((item, i) => ({ id: item.id, section: item.section, label: itemLabels[i].label, options: rubric })),
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    descendingGood: true,
    calculationExplanation,
    resultNote,
    source: definitionEn.source,
  };
}

const SEVERITY_PT_PT = [
  { value: 0, label: "Nenhuma" }, { value: 1, label: "Ligeira" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" }, { value: 4, label: "Extrema" },
];
const ITEMS_PT_PT = [
  { label: "Ao caminhar em superfície plana" },
  { label: "Ao subir ou descer escadas" },
  { label: "Durante a noite, na cama" },
  { label: "Sentado ou deitado" },
  { label: "De pé" },
  { label: "Rigidez articular ao acordar de manhã" },
  { label: "Rigidez articular mais tarde no dia, depois de estar sentado, deitado ou em repouso" },
  { label: "Descer escadas" },
  { label: "Subir escadas" },
  { label: "Levantar-se de estar sentado" },
  { label: "Estar de pé" },
  { label: "Inclinar-se para o chão ou apanhar um objeto" },
  { label: "Andar em superfície plana" },
  { label: "Entrar ou sair de um carro" },
  { label: "Ir às compras" },
  { label: "Calçar meias" },
  { label: "Levantar-se da cama" },
  { label: "Descalçar meias" },
  { label: "Estar deitado na cama" },
  { label: "Entrar ou sair da banheira" },
  { label: "Estar sentado" },
  { label: "Sentar-se ou levantar-se da sanita" },
  { label: "Tarefas domésticas pesadas (mover caixas pesadas, esfregar o chão, etc.)" },
  { label: "Tarefas domésticas leves (cozinhar, limpar o pó, etc.)" },
];
const calculationExplanationPtPt =
  "A pontuação total WOMAC é a soma dos 24 itens — 5 sobre dor, 2 sobre rigidez e 17 sobre função física — cada um pontuado de 0 (nenhuma) a 4 (extrema), para um total bruto de 0 (sem problemas) a 96 (o pior possível). Esta é a pontuação bruta padrão Likert 3.1; não é reescalada para uma percentagem de 0 a 100. Todos os 24 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a pior dor, rigidez e função.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Menos problemas",
  highLabel: "Mais problemas",
};

const SEVERITY_PT_BR = [
  { value: 0, label: "Nenhuma" }, { value: 1, label: "Leve" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" }, { value: 4, label: "Extrema" },
];
const ITEMS_PT_BR = [
  { label: "Ao andar em superfície plana" },
  { label: "Ao subir ou descer escadas" },
  { label: "Durante a noite, na cama" },
  { label: "Sentado ou deitado" },
  { label: "Em pé" },
  { label: "Rigidez articular ao acordar de manhã" },
  { label: "Rigidez articular mais tarde no dia, depois de ficar sentado, deitado ou em repouso" },
  { label: "Descer escadas" },
  { label: "Subir escadas" },
  { label: "Levantar-se de estar sentado" },
  { label: "Ficar em pé" },
  { label: "Inclinar-se para o chão ou pegar um objeto" },
  { label: "Andar em superfície plana" },
  { label: "Entrar ou sair de um carro" },
  { label: "Ir às compras" },
  { label: "Calçar meias" },
  { label: "Levantar-se da cama" },
  { label: "Tirar as meias" },
  { label: "Ficar deitado na cama" },
  { label: "Entrar ou sair da banheira" },
  { label: "Ficar sentado" },
  { label: "Sentar-se ou levantar-se do vaso sanitário" },
  { label: "Tarefas domésticas pesadas (mover caixas pesadas, esfregar o chão, etc.)" },
  { label: "Tarefas domésticas leves (cozinhar, tirar o pó, etc.)" },
];
const calculationExplanationPtBr =
  "A pontuação total WOMAC é a soma dos 24 itens — 5 sobre dor, 2 sobre rigidez e 17 sobre função física — cada um pontuado de 0 (nenhuma) a 4 (extrema), para um total bruto de 0 (sem problemas) a 96 (o pior possível). Esta é a pontuação bruta padrão Likert 3.1; não é reescalada para uma porcentagem de 0 a 100. Todos os 24 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a pior dor, rigidez e função.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Menos problemas",
  highLabel: "Mais problemas",
};

const SEVERITY_ES = [
  { value: 0, label: "Ninguna" }, { value: 1, label: "Leve" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" }, { value: 4, label: "Extrema" },
];
const ITEMS_ES = [
  { label: "Al caminar sobre superficie plana" },
  { label: "Al subir o bajar escaleras" },
  { label: "Durante la noche, en la cama" },
  { label: "Sentado o acostado" },
  { label: "De pie" },
  { label: "Rigidez articular al despertarse por la mañana" },
  { label: "Rigidez articular más tarde en el día, después de estar sentado, acostado o en reposo" },
  { label: "Bajar escaleras" },
  { label: "Subir escaleras" },
  { label: "Levantarse de estar sentado" },
  { label: "Estar de pie" },
  { label: "Agacharse hacia el suelo o recoger un objeto" },
  { label: "Caminar sobre superficie plana" },
  { label: "Entrar o salir de un coche" },
  { label: "Ir de compras" },
  { label: "Ponerse los calcetines o medias" },
  { label: "Levantarse de la cama" },
  { label: "Quitarse los calcetines o medias" },
  { label: "Estar acostado en la cama" },
  { label: "Entrar o salir de la bañera" },
  { label: "Estar sentado" },
  { label: "Sentarse o levantarse del inodoro" },
  { label: "Tareas domésticas pesadas (mover cajas pesadas, fregar el suelo, etc.)" },
  { label: "Tareas domésticas ligeras (cocinar, quitar el polvo, etc.)" },
];
const calculationExplanationEs =
  "La puntuación total WOMAC es la suma de los 24 ítems — 5 sobre dolor, 2 sobre rigidez y 17 sobre función física — cada uno puntuado de 0 (ninguna) a 4 (extrema), para un total en bruto de 0 (sin problemas) a 96 (el peor posible). Esta es la puntuación en bruto estándar Likert 3.1; no se reescala a un porcentaje de 0 a 100. Los 24 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a peor dolor, rigidez y función.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Menos problemas",
  highLabel: "Más problemas",
};

const translations = [
  {
    locale: "pt-pt",
    name: "Índice de Osteoartrite das Universidades de Western Ontario e McMaster",
    description: "Mede a dor, a rigidez e a função física na osteoartrite da anca ou do joelho em 24 itens, produzindo uma pontuação bruta em 96 (0 = sem problemas).",
    definition: buildTranslated(ITEMS_PT_PT, SEVERITY_PT_PT, calculationExplanationPtPt, resultNotePtPt),
  },
  {
    locale: "pt-br",
    name: "Índice de Osteoartrite das Universidades de Western Ontario e McMaster",
    description: "Mede a dor, a rigidez e a função física na osteoartrite do quadril ou do joelho em 24 itens, gerando uma pontuação bruta em 96 (0 = sem problemas).",
    definition: buildTranslated(ITEMS_PT_BR, SEVERITY_PT_BR, calculationExplanationPtBr, resultNotePtBr),
  },
  {
    locale: "es",
    name: "Índice de Osteoartritis de las Universidades de Western Ontario y McMaster",
    description: "Mide el dolor, la rigidez y la función física en la osteoartritis de cadera o rodilla en 24 ítems, generando una puntuación en bruto sobre 96 (0 = sin problemas).",
    definition: buildTranslated(ITEMS_ES, SEVERITY_ES, calculationExplanationEs, resultNoteEs),
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

console.log("WOMAC seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
