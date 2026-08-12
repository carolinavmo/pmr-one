// Sunnybrook Facial Grading System — second calculator in "Peripheral
// Facial Palsy", alongside house-brackmann.mjs. Unlike every other
// calculator so far, its 13 items aren't all the same shape: 3 Resting
// Symmetry items (0-1 each), 5 Voluntary Movement items (1-5 each),
// and 5 Synkinesis items (0-3 each, same 5 expressions as Movement) —
// scored via the new "sunnybrook" formula (calculator-scoring.ts),
// which slices the 13 answered values by fixed index (same slicing
// convention as spadi/prwe): (Movement sum x 4) - (Resting sum x 5) -
// Synkinesis sum, clamped to 0-100 (100 = normal). Item order in this
// file MUST stay resting(3) -> movement(5) -> synkinesis(5) for the
// formula's slicing to line up correctly.
//
// A classic, freely-reproduced academic instrument (Ross, Fradet,
// Nedzelski, 1996) — like Barthel/House-Brackmann/LKSS, no proprietary
// flag is set.
//
// Usage: node db/seed/clinical-tools/sunnybrook.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "peripheral-facial-palsy", {
  slug: "peripheral-facial-palsy",
  name: "Peripheral Facial Palsy",
  color: "blue",
  position: 6,
});

const RESTING_EYE_EN = [
  { value: 0, label: "Normal" },
  { value: 1, label: "Narrow" },
  { value: 1, label: "Wide (e.g. after eyelid surgery)" },
  { value: 1, label: "Other abnormality" },
];
const RESTING_CHEEK_EN = [
  { value: 0, label: "Normal" },
  { value: 1, label: "Nasolabial fold less pronounced" },
  { value: 1, label: "Nasolabial fold more pronounced" },
  { value: 1, label: "Nasolabial fold absent" },
];
const RESTING_MOUTH_EN = [
  { value: 0, label: "Normal" },
  { value: 1, label: "Corner of mouth dropped" },
  { value: 1, label: "Corner of mouth pulled up or out" },
  { value: 1, label: "Other abnormality" },
];
const MOVEMENT_EN = [
  { value: 1, label: "No movement" },
  { value: 2, label: "Slight movement" },
  { value: 3, label: "Moderate movement, near symmetrical" },
  { value: 4, label: "Near-normal movement" },
  { value: 5, label: "Normal, symmetrical movement" },
];
const SYNKINESIS_EN = [
  { value: 0, label: "None" },
  { value: 1, label: "Mild" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Severe" },
];

// Order matters — see file header. Each item's `rubric` key selects
// its own options via RUBRICS below (unlike a shared-rubric scale,
// nearly every item here has a distinct option set).
const ITEMS_EN = [
  { id: "resting_eye", section: "Resting Symmetry", label: "Eye", rubric: "resting_eye" },
  { id: "resting_cheek", section: "Resting Symmetry", label: "Cheek (nasolabial fold)", rubric: "resting_cheek" },
  { id: "resting_mouth", section: "Resting Symmetry", label: "Mouth", rubric: "resting_mouth" },
  { id: "move_forehead", section: "Voluntary Movement", label: "Forehead wrinkle", rubric: "movement" },
  { id: "move_eye", section: "Voluntary Movement", label: "Gentle eye closure", rubric: "movement" },
  { id: "move_smile", section: "Voluntary Movement", label: "Open-mouth smile", rubric: "movement" },
  { id: "move_snarl", section: "Voluntary Movement", label: "Snarl (nose wrinkle)", rubric: "movement" },
  { id: "move_pucker", section: "Voluntary Movement", label: "Lip pucker", rubric: "movement" },
  { id: "syn_forehead", section: "Synkinesis", label: "Forehead wrinkle", rubric: "synkinesis" },
  { id: "syn_eye", section: "Synkinesis", label: "Gentle eye closure", rubric: "synkinesis" },
  { id: "syn_smile", section: "Synkinesis", label: "Open-mouth smile", rubric: "synkinesis" },
  { id: "syn_snarl", section: "Synkinesis", label: "Snarl (nose wrinkle)", rubric: "synkinesis" },
  { id: "syn_pucker", section: "Synkinesis", label: "Lip pucker", rubric: "synkinesis" },
];

function buildDefinition(items, rubrics, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({ id: item.id, section: item.section, label: item.label, options: rubrics[item.rubric] })),
    scoring: { method: "formula", formula: "sunnybrook" },
    minScore: 0,
    maxScore: 100,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Ross BG, Fradet G, Nedzelski JM. Development of a sensitive clinical facial grading system. Otolaryngol Head Neck Surg. 1996;114(3):380-386.",
    },
  };
}

const RUBRICS_EN = {
  resting_eye: RESTING_EYE_EN,
  resting_cheek: RESTING_CHEEK_EN,
  resting_mouth: RESTING_MOUTH_EN,
  movement: MOVEMENT_EN,
  synkinesis: SYNKINESIS_EN,
};

const calculationExplanationEn =
  "The Sunnybrook composite score combines three parts, each rated separately for the eye, cheek/mouth, forehead, smile, and other expressions: Resting Symmetry (3 items, each 0 = normal or 1 = abnormal), Voluntary Movement (5 items, each 1 = no movement to 5 = normal movement), and Synkinesis (5 items, each 0 = none to 3 = severe). The score is calculated as (Movement total x 4) minus (Resting Symmetry total x 5) minus the Synkinesis total, producing a result from 0 (total paralysis) to 100 (normal facial function). All 13 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to better facial function.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "Worse function",
  highLabel: "Better function",
};

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Sunnybrook Facial Grading System",
  abbreviation: "Sunnybrook",
  description: "Rates resting symmetry, voluntary movement, and synkinesis across 13 items, producing a composite score out of 100 (100 = normal facial function).",
  population: "Adults or children with facial nerve palsy",
  estimated_minutes_min: 5,
  estimated_minutes_max: 8,
  definition: JSON.stringify(definition),
  status: "published",
  position: 1,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "sunnybrook", {
  slug: "sunnybrook",
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
    "Sunnybrook Facial Grading System",
    "Sunnybrook",
    "Rates resting symmetry, voluntary movement, and synkinesis across 13 items, producing a composite score out of 100 (100 = normal facial function).",
    "Adults or children with facial nerve palsy",
    5,
    8,
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

// ---------- PT-PT ----------
const RESTING_EYE_PT_PT = [
  { value: 0, label: "Normal" }, { value: 1, label: "Estreito" }, { value: 1, label: "Largo (ex.: após cirurgia palpebral)" }, { value: 1, label: "Outra anomalia" },
];
const RESTING_CHEEK_PT_PT = [
  { value: 0, label: "Normal" }, { value: 1, label: "Sulco nasogeniano menos pronunciado" }, { value: 1, label: "Sulco nasogeniano mais pronunciado" }, { value: 1, label: "Sulco nasogeniano ausente" },
];
const RESTING_MOUTH_PT_PT = [
  { value: 0, label: "Normal" }, { value: 1, label: "Canto da boca descaído" }, { value: 1, label: "Canto da boca puxado para cima ou para fora" }, { value: 1, label: "Outra anomalia" },
];
const MOVEMENT_PT_PT = [
  { value: 1, label: "Sem movimento" }, { value: 2, label: "Movimento ligeiro" }, { value: 3, label: "Movimento moderado, quase simétrico" }, { value: 4, label: "Movimento quase normal" }, { value: 5, label: "Movimento normal e simétrico" },
];
const SYNKINESIS_PT_PT = [
  { value: 0, label: "Nenhuma" }, { value: 1, label: "Ligeira" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" },
];
const ITEMS_PT_PT = [
  { section: "Simetria em Repouso", label: "Olho" },
  { section: "Simetria em Repouso", label: "Bochecha (sulco nasogeniano)" },
  { section: "Simetria em Repouso", label: "Boca" },
  { section: "Movimento Voluntário", label: "Enrugar a testa" },
  { section: "Movimento Voluntário", label: "Encerramento suave do olho" },
  { section: "Movimento Voluntário", label: "Sorriso de boca aberta" },
  { section: "Movimento Voluntário", label: "Franzir o nariz" },
  { section: "Movimento Voluntário", label: "Franzir os lábios" },
  { section: "Sincinesia", label: "Enrugar a testa" },
  { section: "Sincinesia", label: "Encerramento suave do olho" },
  { section: "Sincinesia", label: "Sorriso de boca aberta" },
  { section: "Sincinesia", label: "Franzir o nariz" },
  { section: "Sincinesia", label: "Franzir os lábios" },
];
const calculationExplanationPtPt =
  "A pontuação composta de Sunnybrook combina três partes, cada uma avaliada separadamente para o olho, bochecha/boca, testa, sorriso e outras expressões: Simetria em Repouso (3 itens, cada um 0 = normal ou 1 = anómalo), Movimento Voluntário (5 itens, cada um de 1 = sem movimento a 5 = movimento normal) e Sincinesia (5 itens, cada um de 0 = nenhuma a 3 = grave). A pontuação é calculada como (total do Movimento x 4) menos (total da Simetria em Repouso x 5) menos o total da Sincinesia, produzindo um resultado de 0 (paralisia total) a 100 (função facial normal). Todos os 13 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a melhor função facial.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Pior função",
  highLabel: "Melhor função",
};

// ---------- PT-BR ----------
const RESTING_EYE_PT_BR = [
  { value: 0, label: "Normal" }, { value: 1, label: "Estreito" }, { value: 1, label: "Largo (ex.: após cirurgia palpebral)" }, { value: 1, label: "Outra anormalidade" },
];
const RESTING_CHEEK_PT_BR = [
  { value: 0, label: "Normal" }, { value: 1, label: "Sulco nasolabial menos pronunciado" }, { value: 1, label: "Sulco nasolabial mais pronunciado" }, { value: 1, label: "Sulco nasolabial ausente" },
];
const RESTING_MOUTH_PT_BR = [
  { value: 0, label: "Normal" }, { value: 1, label: "Canto da boca caído" }, { value: 1, label: "Canto da boca puxado para cima ou para fora" }, { value: 1, label: "Outra anormalidade" },
];
const MOVEMENT_PT_BR = [
  { value: 1, label: "Sem movimento" }, { value: 2, label: "Movimento leve" }, { value: 3, label: "Movimento moderado, quase simétrico" }, { value: 4, label: "Movimento quase normal" }, { value: 5, label: "Movimento normal e simétrico" },
];
const SYNKINESIS_PT_BR = [
  { value: 0, label: "Nenhuma" }, { value: 1, label: "Leve" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" },
];
const ITEMS_PT_BR = [
  { section: "Simetria em Repouso", label: "Olho" },
  { section: "Simetria em Repouso", label: "Bochecha (sulco nasolabial)" },
  { section: "Simetria em Repouso", label: "Boca" },
  { section: "Movimento Voluntário", label: "Enrugar a testa" },
  { section: "Movimento Voluntário", label: "Fechamento suave do olho" },
  { section: "Movimento Voluntário", label: "Sorriso de boca aberta" },
  { section: "Movimento Voluntário", label: "Franzir o nariz" },
  { section: "Movimento Voluntário", label: "Franzir os lábios" },
  { section: "Sincinesia", label: "Enrugar a testa" },
  { section: "Sincinesia", label: "Fechamento suave do olho" },
  { section: "Sincinesia", label: "Sorriso de boca aberta" },
  { section: "Sincinesia", label: "Franzir o nariz" },
  { section: "Sincinesia", label: "Franzir os lábios" },
];
const calculationExplanationPtBr =
  "A pontuação composta de Sunnybrook combina três partes, cada uma avaliada separadamente para o olho, bochecha/boca, testa, sorriso e outras expressões: Simetria em Repouso (3 itens, cada um 0 = normal ou 1 = anormal), Movimento Voluntário (5 itens, cada um de 1 = sem movimento a 5 = movimento normal) e Sincinesia (5 itens, cada um de 0 = nenhuma a 3 = grave). A pontuação é calculada como (total do Movimento x 4) menos (total da Simetria em Repouso x 5) menos o total da Sincinesia, gerando um resultado de 0 (paralisia total) a 100 (função facial normal). Todos os 13 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a melhor função facial.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Pior função",
  highLabel: "Melhor função",
};

// ---------- ES ----------
const RESTING_EYE_ES = [
  { value: 0, label: "Normal" }, { value: 1, label: "Estrecho" }, { value: 1, label: "Ancho (p. ej., tras cirugía palpebral)" }, { value: 1, label: "Otra anomalía" },
];
const RESTING_CHEEK_ES = [
  { value: 0, label: "Normal" }, { value: 1, label: "Surco nasogeniano menos pronunciado" }, { value: 1, label: "Surco nasogeniano más pronunciado" }, { value: 1, label: "Surco nasogeniano ausente" },
];
const RESTING_MOUTH_ES = [
  { value: 0, label: "Normal" }, { value: 1, label: "Comisura bucal caída" }, { value: 1, label: "Comisura bucal traccionada hacia arriba o hacia afuera" }, { value: 1, label: "Otra anomalía" },
];
const MOVEMENT_ES = [
  { value: 1, label: "Sin movimiento" }, { value: 2, label: "Movimiento leve" }, { value: 3, label: "Movimiento moderado, casi simétrico" }, { value: 4, label: "Movimiento casi normal" }, { value: 5, label: "Movimiento normal y simétrico" },
];
const SYNKINESIS_ES = [
  { value: 0, label: "Ninguna" }, { value: 1, label: "Leve" }, { value: 2, label: "Moderada" }, { value: 3, label: "Grave" },
];
const ITEMS_ES = [
  { section: "Simetría en Reposo", label: "Ojo" },
  { section: "Simetría en Reposo", label: "Mejilla (surco nasogeniano)" },
  { section: "Simetría en Reposo", label: "Boca" },
  { section: "Movimiento Voluntario", label: "Arrugar la frente" },
  { section: "Movimiento Voluntario", label: "Cierre suave del ojo" },
  { section: "Movimiento Voluntario", label: "Sonrisa con boca abierta" },
  { section: "Movimiento Voluntario", label: "Arrugar la nariz" },
  { section: "Movimiento Voluntario", label: "Fruncir los labios" },
  { section: "Sincinesia", label: "Arrugar la frente" },
  { section: "Sincinesia", label: "Cierre suave del ojo" },
  { section: "Sincinesia", label: "Sonrisa con boca abierta" },
  { section: "Sincinesia", label: "Arrugar la nariz" },
  { section: "Sincinesia", label: "Fruncir los labios" },
];
const calculationExplanationEs =
  "La puntuación compuesta de Sunnybrook combina tres partes, cada una evaluada por separado para el ojo, la mejilla/boca, la frente, la sonrisa y otras expresiones: Simetría en Reposo (3 ítems, cada uno 0 = normal o 1 = anómalo), Movimiento Voluntario (5 ítems, cada uno de 1 = sin movimiento a 5 = movimiento normal) y Sincinesia (5 ítems, cada uno de 0 = ninguna a 3 = grave). La puntuación se calcula como (total del Movimiento x 4) menos (total de la Simetría en Reposo x 5) menos el total de la Sincinesia, produciendo un resultado de 0 (parálisis total) a 100 (función facial normal). Los 13 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a una mejor función facial.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Peor función",
  highLabel: "Mejor función",
};

const translations = [
  {
    locale: "pt-pt",
    name: "Sistema de Graduação Facial de Sunnybrook",
    description: "Avalia a simetria em repouso, o movimento voluntário e a sincinesia em 13 itens, produzindo uma pontuação composta em 100 (100 = função facial normal).",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_PT),
      { resting_eye: RESTING_EYE_PT_PT, resting_cheek: RESTING_CHEEK_PT_PT, resting_mouth: RESTING_MOUTH_PT_PT, movement: MOVEMENT_PT_PT, synkinesis: SYNKINESIS_PT_PT },
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Sistema de Graduação Facial de Sunnybrook",
    description: "Avalia a simetria em repouso, o movimento voluntário e a sincinesia em 13 itens, gerando uma pontuação composta em 100 (100 = função facial normal).",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_BR),
      { resting_eye: RESTING_EYE_PT_BR, resting_cheek: RESTING_CHEEK_PT_BR, resting_mouth: RESTING_MOUTH_PT_BR, movement: MOVEMENT_PT_BR, synkinesis: SYNKINESIS_PT_BR },
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "Sistema de Graduación Facial de Sunnybrook",
    description: "Evalúa la simetría en reposo, el movimiento voluntario y la sincinesia en 13 ítems, generando una puntuación compuesta sobre 100 (100 = función facial normal).",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_ES),
      { resting_eye: RESTING_EYE_ES, resting_cheek: RESTING_CHEEK_ES, resting_mouth: RESTING_MOUTH_ES, movement: MOVEMENT_ES, synkinesis: SYNKINESIS_ES },
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

console.log("Sunnybrook seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
