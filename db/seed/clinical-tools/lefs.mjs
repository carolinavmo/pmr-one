// Lower Extremity Functional Scale (LEFS) — first calculator in a new
// "Lower Limb Function" category, the lower-limb counterpart to DASH's
// "Upper Limb Function" category. 20 items, every item sharing the
// same 0-4 difficulty rubric (same "one shared rubric across all
// items" shape as FIM's 7-level rubric — see fim.mjs), summed for a
// score out of 80. Ascending-good (higher = better function, unlike
// DASH's descendingGood), so descendingGood is left unset — same
// default Barthel/FIM/Katz already rely on.
//
// LEFS has no officially published discrete severity bands (unlike
// Barthel's ordinal dependency categories) — it's used clinically to
// track change over time (MDC/MCID ~9 points), so this follows FIM's
// precedent: no `interpretation` array, resultNote as the fallback
// (continuous gradient bar + label/description).
//
// LEFS is a real copyrighted instrument (Binkley et al., 1999) — free
// for non-commercial clinical/research use, item wording paraphrased
// in this app's own words (same non-verbatim approach as DASH/FIM),
// proprietary: true for the same "non-official calculator" notice.
//
// Usage: node db/seed/clinical-tools/lefs.mjs
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

const RUBRIC_EN = [
  { value: 0, label: "Extreme difficulty or unable" },
  { value: 1, label: "Quite a bit of difficulty" },
  { value: 2, label: "Moderate difficulty" },
  { value: 3, label: "A little difficulty" },
  { value: 4, label: "No difficulty" },
];

// Standard 20-item LEFS activity set, in this app's own words.
const ITEMS_EN = [
  { id: "usual_work", label: "Any of your usual work, housework, or school activities" },
  { id: "hobbies", label: "Your usual hobbies, recreational, or sporting activities" },
  { id: "bath", label: "Getting into or out of the bath" },
  { id: "walk_rooms", label: "Walking between rooms" },
  { id: "shoes_socks", label: "Putting on your shoes or socks" },
  { id: "squatting", label: "Squatting" },
  { id: "lifting", label: "Lifting an object, like a bag of groceries, from the floor" },
  { id: "light_home", label: "Performing light activities around your home" },
  { id: "heavy_home", label: "Performing heavy activities around your home" },
  { id: "car", label: "Getting into or out of a car" },
  { id: "walk_2_blocks", label: "Walking 2 blocks (about 200 metres)" },
  { id: "walk_mile", label: "Walking a mile (about 1.5 kilometres)" },
  { id: "stairs", label: "Going up or down 10 stairs (about one flight)" },
  { id: "standing_hour", label: "Standing for 1 hour" },
  { id: "sitting_hour", label: "Sitting for 1 hour" },
  { id: "running_even", label: "Running on even ground" },
  { id: "running_uneven", label: "Running on uneven ground" },
  { id: "sharp_turns", label: "Making sharp turns while running fast" },
  { id: "hopping", label: "Hopping" },
  { id: "rolling_in_bed", label: "Rolling over in bed" },
];

function buildDefinition(items, rubric, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      options: rubric,
    })),
    scoring: { method: "sum" },
    maxScore: 80,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Binkley JM, Stratford PW, Lott SA, Riddle DL. The Lower Extremity Functional Scale (LEFS): scale development, measurement properties, and clinical application. Phys Ther. 1999;79(4):371-383.",
      url: "https://www.sralab.org/rehabilitation-measures/lower-extremity-functional-scale",
    },
    proprietary: true,
  };
}

const calculationExplanationEn =
  "The LEFS score is the sum of the difficulty level (0 to 4) selected for each of the 20 everyday activities. Each item reflects how much difficulty the activity currently causes, from extreme difficulty or inability (0) to no difficulty (4), so the total ranges from 0 (maximum limitation) to 80 (no limitation). All 20 items must be answered.";

const resultNoteEn = {
  label: "A higher score corresponds to better lower limb function.",
  description: "Score and interpretation should always be contextualized clinically. A change of about 9 points is generally considered clinically meaningful.",
  lowLabel: "More limitation",
  highLabel: "Better function",
};

const definitionEn = buildDefinition(ITEMS_EN, RUBRIC_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Lower Extremity Functional Scale",
  abbreviation: "LEFS",
  description: "Measures difficulty performing 20 everyday physical activities due to a lower limb problem, producing a score out of 80 that reflects the level of function.",
  population: "Adults with any musculoskeletal condition of the lower limb",
  estimated_minutes_min: 5,
  estimated_minutes_max: 10,
  definition: JSON.stringify(definition),
  status: "published",
  position: 0,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "lefs", {
  slug: "lefs",
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
    "Lower Extremity Functional Scale",
    "LEFS",
    "Measures difficulty performing 20 everyday physical activities due to a lower limb problem, producing a score out of 80 that reflects the level of function.",
    "Adults with any musculoskeletal condition of the lower limb",
    5,
    10,
    JSON.stringify(definitionEn),
    "published",
    0,
  ]
);

// ---------- Translations ----------

function translateDefinition(items, rubric, calculationExplanation, resultNote) {
  return buildDefinition(items, rubric, calculationExplanation, resultNote);
}

const RUBRIC_PT_PT = [
  { value: 0, label: "Dificuldade extrema ou incapaz" },
  { value: 1, label: "Bastante dificuldade" },
  { value: 2, label: "Dificuldade moderada" },
  { value: 3, label: "Pouca dificuldade" },
  { value: 4, label: "Sem dificuldade" },
];
const ITEMS_PT_PT = [
  { label: "Qualquer uma das suas atividades habituais de trabalho, tarefas domésticas ou escolares" },
  { label: "Os seus passatempos, atividades recreativas ou desportivas habituais" },
  { label: "Entrar ou sair da banheira" },
  { label: "Andar entre divisões" },
  { label: "Calçar sapatos ou meias" },
  { label: "Agachar-se" },
  { label: "Levantar um objeto do chão, como um saco de compras" },
  { label: "Realizar atividades leves em casa" },
  { label: "Realizar atividades pesadas em casa" },
  { label: "Entrar ou sair de um carro" },
  { label: "Andar 2 quarteirões (cerca de 200 metros)" },
  { label: "Andar um quilómetro e meio" },
  { label: "Subir ou descer 10 degraus (cerca de um lanço de escadas)" },
  { label: "Estar de pé durante 1 hora" },
  { label: "Estar sentado durante 1 hora" },
  { label: "Correr em terreno plano" },
  { label: "Correr em terreno irregular" },
  { label: "Fazer mudanças bruscas de direção enquanto corre depressa" },
  { label: "Saltar ao pé-coxinho" },
  { label: "Virar-se na cama" },
];
const calculationExplanationPtPt =
  "A pontuação da LEFS é a soma do nível de dificuldade (0 a 4) selecionado para cada uma das 20 atividades do dia a dia. Cada item reflete a dificuldade atual sentida na atividade, desde dificuldade extrema ou incapacidade (0) até sem dificuldade (4), pelo que o total varia entre 0 (limitação máxima) e 80 (sem limitação). Todos os 20 itens têm de ser respondidos.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a melhor função do membro inferior.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente. Uma alteração de cerca de 9 pontos é geralmente considerada clinicamente significativa.",
  lowLabel: "Maior limitação",
  highLabel: "Melhor função",
};

const RUBRIC_PT_BR = [
  { value: 0, label: "Dificuldade extrema ou incapaz" },
  { value: 1, label: "Bastante dificuldade" },
  { value: 2, label: "Dificuldade moderada" },
  { value: 3, label: "Pouca dificuldade" },
  { value: 4, label: "Sem dificuldade" },
];
const ITEMS_PT_BR = [
  { label: "Qualquer uma de suas atividades habituais de trabalho, tarefas domésticas ou escolares" },
  { label: "Seus hobbies, atividades recreativas ou esportivas habituais" },
  { label: "Entrar ou sair da banheira" },
  { label: "Andar entre cômodos" },
  { label: "Calçar sapatos ou meias" },
  { label: "Agachar" },
  { label: "Levantar um objeto do chão, como uma sacola de compras" },
  { label: "Realizar atividades leves em casa" },
  { label: "Realizar atividades pesadas em casa" },
  { label: "Entrar ou sair de um carro" },
  { label: "Andar 2 quarteirões (cerca de 200 metros)" },
  { label: "Andar um quilômetro e meio" },
  { label: "Subir ou descer 10 degraus (cerca de um lance de escada)" },
  { label: "Ficar em pé durante 1 hora" },
  { label: "Ficar sentado durante 1 hora" },
  { label: "Correr em terreno plano" },
  { label: "Correr em terreno irregular" },
  { label: "Fazer mudanças bruscas de direção enquanto corre rápido" },
  { label: "Pular em um pé só" },
  { label: "Virar-se na cama" },
];
const calculationExplanationPtBr =
  "A pontuação da LEFS é a soma do nível de dificuldade (0 a 4) selecionado para cada uma das 20 atividades do dia a dia. Cada item reflete a dificuldade atual sentida na atividade, desde dificuldade extrema ou incapacidade (0) até sem dificuldade (4), de forma que o total varia de 0 (limitação máxima) a 80 (sem limitação). Todos os 20 itens precisam ser respondidos.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a melhor função do membro inferior.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente. Uma mudança de cerca de 9 pontos costuma ser considerada clinicamente significativa.",
  lowLabel: "Maior limitação",
  highLabel: "Melhor função",
};

const RUBRIC_ES = [
  { value: 0, label: "Dificultad extrema o incapaz" },
  { value: 1, label: "Bastante dificultad" },
  { value: 2, label: "Dificultad moderada" },
  { value: 3, label: "Poca dificultad" },
  { value: 4, label: "Sin dificultad" },
];
const ITEMS_ES = [
  { label: "Cualquiera de sus actividades habituales de trabajo, tareas domésticas o escolares" },
  { label: "Sus pasatiempos, actividades recreativas o deportivas habituales" },
  { label: "Entrar o salir de la bañera" },
  { label: "Caminar entre habitaciones" },
  { label: "Ponerse los zapatos o calcetines" },
  { label: "Ponerse en cuclillas" },
  { label: "Levantar un objeto del suelo, como una bolsa de compras" },
  { label: "Realizar actividades ligeras en casa" },
  { label: "Realizar actividades pesadas en casa" },
  { label: "Entrar o salir de un coche" },
  { label: "Caminar 2 manzanas (unos 200 metros)" },
  { label: "Caminar un kilómetro y medio" },
  { label: "Subir o bajar 10 escalones (aproximadamente un tramo de escaleras)" },
  { label: "Estar de pie durante 1 hora" },
  { label: "Estar sentado durante 1 hora" },
  { label: "Correr en terreno llano" },
  { label: "Correr en terreno irregular" },
  { label: "Hacer giros bruscos mientras corre rápido" },
  { label: "Saltar a la pata coja" },
  { label: "Darse la vuelta en la cama" },
];
const calculationExplanationEs =
  "La puntuación de la LEFS es la suma del nivel de dificultad (0 a 4) seleccionado para cada una de las 20 actividades cotidianas. Cada ítem refleja la dificultad actual que causa la actividad, desde dificultad extrema o incapacidad (0) hasta sin dificultad (4), por lo que el total varía de 0 (limitación máxima) a 80 (sin limitación). Los 20 ítems deben responderse.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a una mejor función del miembro inferior.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente. Un cambio de aproximadamente 9 puntos suele considerarse clínicamente significativo.",
  lowLabel: "Mayor limitación",
  highLabel: "Mejor función",
};

function mergeItems(sourceItems, translatedItems) {
  return sourceItems.map((item, i) => ({ ...item, ...translatedItems[i] }));
}

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Função dos Membros Inferiores",
    description: "Mede a dificuldade em realizar 20 atividades físicas do dia a dia devido a um problema no membro inferior, produzindo uma pontuação em 80 que reflete o nível de função.",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_PT), RUBRIC_PT_PT, calculationExplanationPtPt, resultNotePtPt),
  },
  {
    locale: "pt-br",
    name: "Escala de Função dos Membros Inferiores",
    description: "Mede a dificuldade em realizar 20 atividades físicas do dia a dia devido a um problema no membro inferior, gerando uma pontuação em 80 que reflete o nível de função.",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_PT_BR), RUBRIC_PT_BR, calculationExplanationPtBr, resultNotePtBr),
  },
  {
    locale: "es",
    name: "Escala de Función de la Extremidad Inferior",
    description: "Mide la dificultad para realizar 20 actividades físicas cotidianas debido a un problema en el miembro inferior, generando una puntuación sobre 80 que refleja el nivel de función.",
    definition: translateDefinition(mergeItems(ITEMS_EN, ITEMS_ES), RUBRIC_ES, calculationExplanationEs, resultNoteEs),
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

console.log("LEFS seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
