// Duke Activity Status Index (DASI) — third calculator in "Respiratory
// Rehabilitation". 12 items, each a single yes/no toggle where "No" = 0
// and "Yes" = a fixed metabolic-equivalent weight specific to that item
// (per-item differing options, same pattern as Harris Hip Score/LKSS —
// no shared rubric). Sum-scored, max 58.2 (ascending-good: higher score
// = greater estimated functional capacity), no discrete interpretation
// bands (uses resultNote instead).
//
// A classic, freely-reproduced academic instrument (Hlatky et al.,
// 1989) — no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/dasi.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "respiratory-rehabilitation", {
  slug: "respiratory-rehabilitation",
  name: "Respiratory Rehabilitation",
  color: "cyan",
  position: 8,
});

// [id, weight, English label]
const ITEM_DEFS = [
  ["self_care", 2.75, "Can you take care of yourself — eating, dressing, bathing, or using the toilet?"],
  ["walk_indoors", 1.75, "Can you walk indoors, such as around your house?"],
  ["walk_block", 2.75, "Can you walk a block or two on level ground?"],
  ["climb_stairs", 5.50, "Can you climb a flight of stairs or walk up a hill?"],
  ["run_short_distance", 8.00, "Can you run a short distance?"],
  ["light_housework", 2.70, "Can you do light work around the house, like dusting or washing dishes?"],
  ["moderate_housework", 3.50, "Can you do moderate work around the house, like vacuuming, sweeping floors, or carrying groceries?"],
  ["heavy_housework", 8.00, "Can you do heavy work around the house, like scrubbing floors or lifting or moving heavy furniture?"],
  ["yard_work", 4.50, "Can you do yard work, like raking leaves, weeding, or pushing a power mower?"],
  ["sexual_relations", 5.25, "Can you have sexual relations?"],
  ["moderate_recreation", 6.00, "Can you take part in moderate recreational activities, like golf, bowling, dancing, doubles tennis, or throwing a baseball or football?"],
  ["strenuous_sports", 7.50, "Can you take part in strenuous sports, like swimming, singles tennis, football, basketball, or skiing?"],
];

const YES_NO_EN = (weight) => [
  { value: 0, label: "No" },
  { value: weight, label: "Yes" },
];

const definitionEn = {
  items: ITEM_DEFS.map(([id, weight, label]) => ({ id, label, options: YES_NO_EN(weight) })),
  scoring: { method: "sum" },
  maxScore: 58.2,
  resultNote: {
    label: "A higher score corresponds to greater estimated functional capacity.",
    description: "The DASI score can also be converted to an estimated peak oxygen uptake using VO2peak (mL/kg/min) = 0.43 × DASI + 9.6.",
    lowLabel: "Lower functional capacity",
    highLabel: "Higher functional capacity",
  },
  calculationExplanation:
    "The DASI score is the sum of the weights of every activity the patient can perform without assistance, out of a maximum of 58.2. Each of the 12 activities carries its own fixed weight reflecting its metabolic demand; answering \"No\" contributes 0.",
  source: {
    citation: "Hlatky MA, Boineau RE, Higginbotham MB, et al. A brief self-administered questionnaire to determine functional capacity (the Duke Activity Status Index). Am J Cardiol. 1989;64(10):651-654.",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "dasi", {
  slug: "dasi",
  category_id: categoryId,
  name: "Duke Activity Status Index",
  abbreviation: "DASI",
  description: "A 12-item self-report questionnaire estimating functional capacity from everyday activities, each weighted by its metabolic demand.",
  population: "Adults, particularly those with or at risk of cardiac or respiratory disease",
  estimated_minutes_min: 2,
  estimated_minutes_max: 4,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 2,
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
    "Duke Activity Status Index",
    "DASI",
    "A 12-item self-report questionnaire estimating functional capacity from everyday activities, each weighted by its metabolic demand.",
    "Adults, particularly those with or at risk of cardiac or respiratory disease",
    2,
    4,
    JSON.stringify(definitionEn),
    "published",
    2,
  ]
);

// ---------- Translations ----------

function localizedOptions(weight, noLabel, yesLabel) {
  return [
    { value: 0, label: noLabel },
    { value: weight, label: yesLabel },
  ];
}

const ITEMS_PT_PT = [
  "Consegue cuidar de si mesmo — comer, vestir-se, tomar banho ou usar a casa de banho?",
  "Consegue andar dentro de casa, por exemplo pela sua casa?",
  "Consegue andar um ou dois quarteirões em terreno plano?",
  "Consegue subir um lanço de escadas ou uma encosta?",
  "Consegue correr uma curta distância?",
  "Consegue fazer trabalho leve em casa, como tirar o pó ou lavar a loiça?",
  "Consegue fazer trabalho moderado em casa, como aspirar, varrer ou transportar compras?",
  "Consegue fazer trabalho pesado em casa, como esfregar o chão ou levantar ou mover móveis pesados?",
  "Consegue fazer trabalho de jardim, como apanhar folhas, arrancar ervas daninhas ou empurrar um corta-relvas?",
  "Consegue ter relações sexuais?",
  "Consegue participar em atividades recreativas moderadas, como golfe, bowling, dança, ténis a pares ou lançar uma bola?",
  "Consegue participar em desportos extenuantes, como natação, ténis a singulares, futebol, basquetebol ou esqui?",
];
const resultNotePtPt = {
  label: "Uma pontuação mais alta corresponde a maior capacidade funcional estimada.",
  description: "A pontuação DASI também pode ser convertida numa estimativa do consumo máximo de oxigénio: VO2máx (mL/kg/min) = 0,43 × DASI + 9,6.",
  lowLabel: "Menor capacidade funcional",
  highLabel: "Maior capacidade funcional",
};
const calculationExplanationPtPt =
  "A pontuação DASI é a soma dos pesos de todas as atividades que o doente consegue realizar sem ajuda, até um máximo de 58,2. Cada uma das 12 atividades tem o seu próprio peso fixo, refletindo a sua exigência metabólica; responder \"Não\" contribui com 0.";

const ITEMS_PT_BR = [
  "Você consegue cuidar de si mesmo — comer, vestir-se, tomar banho ou usar o banheiro?",
  "Você consegue andar dentro de casa, por exemplo pela sua casa?",
  "Você consegue andar um ou dois quarteirões em terreno plano?",
  "Você consegue subir um lance de escada ou uma ladeira?",
  "Você consegue correr uma curta distância?",
  "Você consegue fazer trabalho leve em casa, como tirar o pó ou lavar a louça?",
  "Você consegue fazer trabalho moderado em casa, como aspirar, varrer ou carregar compras?",
  "Você consegue fazer trabalho pesado em casa, como esfregar o chão ou levantar ou mover móveis pesados?",
  "Você consegue fazer trabalho de jardim, como juntar folhas, arrancar ervas daninhas ou empurrar um cortador de grama?",
  "Você consegue ter relações sexuais?",
  "Você consegue participar de atividades recreativas moderadas, como golfe, boliche, dança, tênis em duplas ou arremessar uma bola?",
  "Você consegue participar de esportes extenuantes, como natação, tênis individual, futebol americano, basquete ou esqui?",
];
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a maior capacidade funcional estimada.",
  description: "A pontuação DASI também pode ser convertida em uma estimativa do consumo máximo de oxigênio: VO2máx (mL/kg/min) = 0,43 × DASI + 9,6.",
  lowLabel: "Menor capacidade funcional",
  highLabel: "Maior capacidade funcional",
};
const calculationExplanationPtBr =
  "A pontuação DASI é a soma dos pesos de todas as atividades que o paciente consegue realizar sem ajuda, até um máximo de 58,2. Cada uma das 12 atividades tem seu próprio peso fixo, refletindo sua exigência metabólica; responder \"Não\" contribui com 0.";

const ITEMS_ES = [
  "¿Puede cuidar de sí mismo — comer, vestirse, bañarse o usar el baño?",
  "¿Puede caminar dentro de casa, por ejemplo por su casa?",
  "¿Puede caminar una o dos manzanas en terreno llano?",
  "¿Puede subir un tramo de escaleras o una cuesta?",
  "¿Puede correr una corta distancia?",
  "¿Puede hacer trabajo ligero en casa, como quitar el polvo o lavar los platos?",
  "¿Puede hacer trabajo moderado en casa, como aspirar, barrer o cargar la compra?",
  "¿Puede hacer trabajo pesado en casa, como fregar el suelo o levantar o mover muebles pesados?",
  "¿Puede hacer trabajo de jardín, como rastrillar hojas, quitar malas hierbas o empujar un cortacésped?",
  "¿Puede tener relaciones sexuales?",
  "¿Puede participar en actividades recreativas moderadas, como golf, bolos, baile, tenis dobles o lanzar una pelota?",
  "¿Puede participar en deportes extenuantes, como natación, tenis individual, fútbol, baloncesto o esquí?",
];
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a una mayor capacidad funcional estimada.",
  description: "La puntuación DASI también puede convertirse en una estimación del consumo máximo de oxígeno: VO2máx (mL/kg/min) = 0,43 × DASI + 9,6.",
  lowLabel: "Menor capacidad funcional",
  highLabel: "Mayor capacidad funcional",
};
const calculationExplanationEs =
  "La puntuación DASI es la suma de los pesos de todas las actividades que el paciente puede realizar sin ayuda, hasta un máximo de 58,2. Cada una de las 12 actividades tiene su propio peso fijo, que refleja su demanda metabólica; responder \"No\" aporta 0.";

function withLocalizedYesNo(items, noLabel, yesLabel) {
  return items.map((label, i) => ({ id: ITEM_DEFS[i][0], label, options: localizedOptions(ITEM_DEFS[i][1], noLabel, yesLabel) }));
}

const translations = [
  {
    locale: "pt-pt",
    name: "Índice de Estado de Atividade de Duke",
    description: "Um questionário de autorrelato com 12 itens que estima a capacidade funcional a partir de atividades do dia a dia, cada uma ponderada pela sua exigência metabólica.",
    definition: {
      items: withLocalizedYesNo(ITEMS_PT_PT, "Não", "Sim"),
      scoring: definitionEn.scoring,
      maxScore: definitionEn.maxScore,
      resultNote: resultNotePtPt,
      calculationExplanation: calculationExplanationPtPt,
      source: definitionEn.source,
    },
  },
  {
    locale: "pt-br",
    name: "Índice de Status de Atividade de Duke",
    description: "Um questionário de autorrelato com 12 itens que estima a capacidade funcional a partir de atividades do dia a dia, cada uma ponderada por sua exigência metabólica.",
    definition: {
      items: withLocalizedYesNo(ITEMS_PT_BR, "Não", "Sim"),
      scoring: definitionEn.scoring,
      maxScore: definitionEn.maxScore,
      resultNote: resultNotePtBr,
      calculationExplanation: calculationExplanationPtBr,
      source: definitionEn.source,
    },
  },
  {
    locale: "es",
    name: "Índice de Estado de Actividad de Duke",
    description: "Un cuestionario autoadministrado de 12 ítems que estima la capacidad funcional a partir de actividades cotidianas, cada una ponderada según su demanda metabólica.",
    definition: {
      items: withLocalizedYesNo(ITEMS_ES, "No", "Sí"),
      scoring: definitionEn.scoring,
      maxScore: definitionEn.maxScore,
      resultNote: resultNoteEs,
      calculationExplanation: calculationExplanationEs,
      source: definitionEn.source,
    },
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

console.log("DASI seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
