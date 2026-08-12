// SPADI (Shoulder Pain and Disability Index) — second calculator in
// the "Upper Limb Function" category, second to exercise the
// formula-scoring branch. 13 items, each an 11-point 0-10 numeric
// rating scale (only the two endpoints are labeled, matching how the
// instrument is actually presented on paper) — 5 pain items, then 8
// disability items. Freely available for clinical use (Roach et al.
// 1991); no proprietary flag needed, unlike DASH/FIM.
//
// Formula (registered in calculator-scoring.ts): pain items summed
// and normalized against their own 0-50 max, disability items summed
// and normalized against their own 0-80 max, the two percentages
// averaged — see the "spadi" entry in the FORMULAS registry for the
// exact arithmetic. descendingGood: true (0 = best on every item).
//
// Usage: node db/seed/clinical-tools/spadi.mjs
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
const PAIN_SCALE_EN = numericScale("No pain", "Worst pain imaginable");
const DISABILITY_SCALE_EN = numericScale("No difficulty", "So difficult it required help");

const ITEMS_EN = [
  { id: "pain_worst", section: "Pain", label: "Pain at its worst", rubric: "pain" },
  { id: "pain_lying", section: "Pain", label: "Pain when lying on the involved side", rubric: "pain" },
  { id: "pain_reach_high_shelf", section: "Pain", label: "Pain reaching for something on a high shelf", rubric: "pain" },
  { id: "pain_touch_neck", section: "Pain", label: "Pain touching the back of your neck", rubric: "pain" },
  { id: "pain_push", section: "Pain", label: "Pain pushing with the involved arm", rubric: "pain" },
  { id: "wash_hair", section: "Disability", label: "Washing your hair", rubric: "disability" },
  { id: "wash_back", section: "Disability", label: "Washing your back", rubric: "disability" },
  { id: "put_on_undershirt", section: "Disability", label: "Putting on an undershirt or pullover sweater", rubric: "disability" },
  { id: "put_on_shirt", section: "Disability", label: "Putting on a shirt that buttons down the front", rubric: "disability" },
  { id: "put_on_pants", section: "Disability", label: "Putting on your pants", rubric: "disability" },
  { id: "place_high_shelf", section: "Disability", label: "Placing an object on a high shelf", rubric: "disability" },
  { id: "carry_heavy_object", section: "Disability", label: "Carrying a heavy object of 4.5 kg (10 lb)", rubric: "disability" },
  { id: "remove_back_pocket", section: "Disability", label: "Removing something from your back pocket", rubric: "disability" },
];

function buildDefinition(items, rubrics, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({
      id: item.id,
      section: item.section,
      label: item.label,
      options: rubrics[item.rubric],
    })),
    scoring: { method: "formula", formula: "spadi" },
    minScore: 0,
    maxScore: 100,
    descendingGood: true,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Roach KE, Budiman-Mak E, Songsiridej N, Lertratanakul Y. Development of a shoulder pain and disability index. Arthritis Care Res. 1991;4(4):143-149.",
      url: "https://www.sralab.org/rehabilitation-measures/shoulder-pain-and-disability-index",
    },
  };
}

const calculationExplanationEn =
  "The SPADI score combines two subscales, each rated 0 (no pain/no difficulty) to 10 (worst pain imaginable/so difficult it required help) per item. The 5 pain items are summed and expressed as a percentage of their maximum possible total (50); the 8 disability items are summed and expressed as a percentage of their maximum possible total (80). The two percentages are averaged for a final score from 0 to 100, with a higher score indicating greater pain and disability. All 13 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to greater pain and disability.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "Less pain and disability",
  highLabel: "More pain and disability",
};

const RUBRICS_EN = { pain: PAIN_SCALE_EN, disability: DISABILITY_SCALE_EN };

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Shoulder Pain and Disability Index",
  abbreviation: "SPADI",
  description: "Measures shoulder pain severity and disability across 13 items, producing a score out of 100 that reflects the degree of pain and functional limitation.",
  population: "Adults with shoulder pain of any cause",
  estimated_minutes_min: 3,
  estimated_minutes_max: 5,
  definition: JSON.stringify(definition),
  status: "published",
  position: 1,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "spadi", {
  slug: "spadi",
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
    "Shoulder Pain and Disability Index",
    "SPADI",
    "Measures shoulder pain severity and disability across 13 items, producing a score out of 100 that reflects the degree of pain and functional limitation.",
    "Adults with shoulder pain of any cause",
    3,
    5,
    JSON.stringify(definitionEn),
    "published",
    1,
  ]
);

// ---------- Translations ----------

function translateDefinition(items, rubrics, calculationExplanation, resultNote) {
  return buildDefinition(items, rubrics, calculationExplanation, resultNote);
}

function numericScaleTranslated(lowLabel, highLabel) {
  return numericScale(lowLabel, highLabel);
}

const PAIN_SCALE_PT_PT = numericScaleTranslated("Sem dor", "Pior dor imaginável");
const DISABILITY_SCALE_PT_PT = numericScaleTranslated("Sem dificuldade", "Tão difícil que precisou de ajuda");
const ITEMS_PT_PT = [
  { section: "Dor", label: "Dor no seu pior" },
  { section: "Dor", label: "Dor ao deitar-se sobre o lado afetado" },
  { section: "Dor", label: "Dor ao alcançar algo numa prateleira alta" },
  { section: "Dor", label: "Dor ao tocar a parte de trás do pescoço" },
  { section: "Dor", label: "Dor ao empurrar com o braço afetado" },
  { section: "Incapacidade", label: "Lavar o cabelo" },
  { section: "Incapacidade", label: "Lavar as costas" },
  { section: "Incapacidade", label: "Vestir uma camisola interior ou um pulôver" },
  { section: "Incapacidade", label: "Vestir uma camisa que abotoa à frente" },
  { section: "Incapacidade", label: "Vestir as calças" },
  { section: "Incapacidade", label: "Colocar um objeto numa prateleira alta" },
  { section: "Incapacidade", label: "Transportar um objeto pesado de 4,5 kg" },
  { section: "Incapacidade", label: "Retirar algo do bolso de trás" },
];
const calculationExplanationPtPt =
  "A pontuação do SPADI combina duas subescalas, cada item classificado de 0 (sem dor/sem dificuldade) a 10 (pior dor imaginável/tão difícil que precisou de ajuda). Os 5 itens de dor são somados e expressos como percentagem do total máximo possível (50); os 8 itens de incapacidade são somados e expressos como percentagem do total máximo possível (80). As duas percentagens são calculadas em média para uma pontuação final de 0 a 100, sendo que uma pontuação mais elevada indica maior dor e incapacidade. Todos os 13 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a maior dor e incapacidade.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Menor dor e incapacidade",
  highLabel: "Maior dor e incapacidade",
};

const PAIN_SCALE_PT_BR = numericScaleTranslated("Sem dor", "Pior dor imaginável");
const DISABILITY_SCALE_PT_BR = numericScaleTranslated("Sem dificuldade", "Tão difícil que precisou de ajuda");
const ITEMS_PT_BR = [
  { section: "Dor", label: "Dor no seu pior" },
  { section: "Dor", label: "Dor ao deitar sobre o lado afetado" },
  { section: "Dor", label: "Dor ao alcançar algo em uma prateleira alta" },
  { section: "Dor", label: "Dor ao tocar a parte de trás do pescoço" },
  { section: "Dor", label: "Dor ao empurrar com o braço afetado" },
  { section: "Incapacidade", label: "Lavar o cabelo" },
  { section: "Incapacidade", label: "Lavar as costas" },
  { section: "Incapacidade", label: "Vestir uma camiseta ou um suéter" },
  { section: "Incapacidade", label: "Vestir uma camisa que abotoa na frente" },
  { section: "Incapacidade", label: "Vestir as calças" },
  { section: "Incapacidade", label: "Colocar um objeto em uma prateleira alta" },
  { section: "Incapacidade", label: "Carregar um objeto pesado de 4,5 kg" },
  { section: "Incapacidade", label: "Retirar algo do bolso de trás" },
];
const calculationExplanationPtBr =
  "A pontuação do SPADI combina duas subescalas, cada item classificado de 0 (sem dor/sem dificuldade) a 10 (pior dor imaginável/tão difícil que precisou de ajuda). Os 5 itens de dor são somados e expressos como porcentagem do total máximo possível (50); os 8 itens de incapacidade são somados e expressos como porcentagem do total máximo possível (80). As duas porcentagens são calculadas em média para uma pontuação final de 0 a 100, sendo que uma pontuação mais alta indica maior dor e incapacidade. Todos os 13 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a maior dor e incapacidade.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Menor dor e incapacidade",
  highLabel: "Maior dor e incapacidade",
};

const PAIN_SCALE_ES = numericScaleTranslated("Sin dolor", "El peor dolor imaginable");
const DISABILITY_SCALE_ES = numericScaleTranslated("Sin dificultad", "Tan difícil que necesitó ayuda");
const ITEMS_ES = [
  { section: "Dolor", label: "Dolor en su peor momento" },
  { section: "Dolor", label: "Dolor al acostarse sobre el lado afectado" },
  { section: "Dolor", label: "Dolor al alcanzar algo en un estante alto" },
  { section: "Dolor", label: "Dolor al tocarse la parte posterior del cuello" },
  { section: "Dolor", label: "Dolor al empujar con el brazo afectado" },
  { section: "Discapacidad", label: "Lavarse el pelo" },
  { section: "Discapacidad", label: "Lavarse la espalda" },
  { section: "Discapacidad", label: "Ponerse una camiseta interior o un suéter" },
  { section: "Discapacidad", label: "Ponerse una camisa que se abotona por delante" },
  { section: "Discapacidad", label: "Ponerse los pantalones" },
  { section: "Discapacidad", label: "Colocar un objeto en un estante alto" },
  { section: "Discapacidad", label: "Cargar un objeto pesado de 4,5 kg" },
  { section: "Discapacidad", label: "Sacar algo del bolsillo trasero" },
];
const calculationExplanationEs =
  "La puntuación del SPADI combina dos subescalas, cada ítem calificado de 0 (sin dolor/sin dificultad) a 10 (el peor dolor imaginable/tan difícil que necesitó ayuda). Los 5 ítems de dolor se suman y se expresan como porcentaje del total máximo posible (50); los 8 ítems de discapacidad se suman y se expresan como porcentaje del total máximo posible (80). Los dos porcentajes se promedian para obtener una puntuación final de 0 a 100, donde una puntuación más alta indica mayor dolor y discapacidad. Los 13 ítems deben responderse.";
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
    name: "Índice de Dor e Incapacidade do Ombro",
    description: "Mede a gravidade da dor no ombro e a incapacidade em 13 itens, produzindo uma pontuação em 100 que reflete o grau de dor e limitação funcional.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_PT),
      { pain: PAIN_SCALE_PT_PT, disability: DISABILITY_SCALE_PT_PT },
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Índice de Dor e Incapacidade do Ombro",
    description: "Mede a gravidade da dor no ombro e a incapacidade em 13 itens, gerando uma pontuação em 100 que reflete o grau de dor e limitação funcional.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_BR),
      { pain: PAIN_SCALE_PT_BR, disability: DISABILITY_SCALE_PT_BR },
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "Índice de Dolor y Discapacidad del Hombro",
    description: "Mide la gravedad del dolor de hombro y la discapacidad en 13 ítems, generando una puntuación sobre 100 que refleja el grado de dolor y limitación funcional.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_ES),
      { pain: PAIN_SCALE_ES, disability: DISABILITY_SCALE_ES },
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

console.log("SPADI seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
