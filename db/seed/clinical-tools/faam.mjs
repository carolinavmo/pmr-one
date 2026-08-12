// Foot and Ankle Ability Measure (FAAM) — 2 separate calculators (ADL
// subscale, 21 items; Sports subscale, 8 items), each scored and
// reported independently, same "one calculator per subscale" split as
// koos.mjs and the Boston Carpal Tunnel Questionnaire. Kept in one
// file for the same boilerplate-sharing reason as koos.mjs (shared
// category lookup, shared rubric, shared formula).
//
// Every item is 0 (unable to do) to 4 (no difficulty), and both
// subscales are scored via the new "percent4" formula
// (calculator-scoring.ts): (mean/4)*100 — already ascending-good, no
// inversion needed (unlike KOOS's "koos" formula), since a higher raw
// item value already means less difficulty.
//
// FAAM is a real copyrighted instrument (Martin et al., 2005) — free
// for non-commercial clinical/research use, item wording paraphrased
// in this app's own words (same non-verbatim approach as DASH/FIM/
// LEFS/KOOS), proprietary: true for the same "non-official
// calculator" notice.
//
// Usage: node db/seed/clinical-tools/faam.mjs
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
  { value: 0, label: "Unable to do" },
  { value: 1, label: "Extreme difficulty" },
  { value: 2, label: "Moderate difficulty" },
  { value: 3, label: "Slight difficulty" },
  { value: 4, label: "No difficulty" },
];

function buildDefinition(items, rubric, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({ id: item.id, label: item.label, options: rubric })),
    scoring: { method: "formula", formula: "percent4" },
    minScore: 0,
    maxScore: 100,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Martin RL, Irrgang JJ, Burdett RG, Conti SF, Van Swearingen JM. Evidence of validity for the Foot and Ankle Ability Measure (FAAM). Foot Ankle Int. 2005;26(11):968-983.",
      url: "https://www.sralab.org/rehabilitation-measures/foot-and-ankle-ability-measure",
    },
    proprietary: true,
  };
}

function mergeItems(sourceItems, translatedItems) {
  return sourceItems.map((item, i) => ({ ...item, ...translatedItems[i] }));
}

async function seedSubscale({ slug, position, en, translations }) {
  const definitionEn = buildDefinition(en.items, RUBRIC_EN, en.calculationExplanation, en.resultNote);
  const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", slug, {
    slug,
    category_id: categoryId,
    name: en.name,
    abbreviation: en.abbreviation,
    description: en.description,
    population: "Adults with any musculoskeletal condition of the foot or ankle",
    estimated_minutes_min: en.minutesMin,
    estimated_minutes_max: en.minutesMax,
    definition: JSON.stringify(definitionEn),
    status: "published",
    position,
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
      en.name,
      en.abbreviation,
      en.description,
      "Adults with any musculoskeletal condition of the foot or ankle",
      en.minutesMin,
      en.minutesMax,
      JSON.stringify(definitionEn),
      "published",
      position,
    ]
  );

  for (const translation of translations) {
    const definition = buildDefinition(
      mergeItems(en.items, translation.items),
      translation.rubric,
      translation.calculationExplanation,
      translation.resultNote
    );
    await upsertRelationship(
      pool,
      "clinical_calculator_translation",
      {
        calculator_id: calculatorId,
        locale: translation.locale,
        name: translation.name,
        description: translation.description,
        definition: JSON.stringify(definition),
      },
      ["calculator_id", "locale"]
    );
  }

  console.log(`FAAM ${en.abbreviation} seeded.`);
  return calculatorId;
}

// ================= ADL subscale (English source) =================

const adlItemsEn = [
  { id: "standing", label: "Standing" },
  { id: "walking_even", label: "Walking on even ground" },
  { id: "walking_even_barefoot", label: "Walking on even ground without shoes" },
  { id: "walking_uphill", label: "Walking up hills" },
  { id: "walking_downhill", label: "Walking down hills" },
  { id: "stairs_up", label: "Going up stairs" },
  { id: "stairs_down", label: "Going down stairs" },
  { id: "walking_uneven", label: "Walking on uneven ground" },
  { id: "curbs", label: "Stepping up and down curbs" },
  { id: "squatting", label: "Squatting" },
  { id: "toes", label: "Coming up on your toes" },
  { id: "walking_initial", label: "Walking initially" },
  { id: "walking_5min", label: "Walking about 5 minutes or less" },
  { id: "walking_10min", label: "Walking about 10 minutes" },
  { id: "walking_15min", label: "Walking 15 minutes or more" },
  { id: "home", label: "Home responsibilities" },
  { id: "adl", label: "Activities of daily living" },
  { id: "personal_care", label: "Personal care" },
  { id: "light_work", label: "Light to moderate work (standing, walking)" },
  { id: "heavy_work", label: "Heavy work (pushing/pulling, climbing, carrying)" },
  { id: "recreation", label: "Recreational activities" },
];
const adlCalcExplEn =
  "Each of the 21 daily-activity items is scored 0 (unable to do) to 4 (no difficulty). The mean of the answered items is calculated and rescaled to a 0-100 percentage, so 100 means no difficulty with any daily activity and 0 means unable to do any of them. All 21 items must be answered.";
const adlResultNoteEn = {
  label: "A higher score corresponds to less difficulty with daily activities.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "More difficulty",
  highLabel: "Less difficulty",
};

// ================= Sports subscale (English source) =================

const sportsItemsEn = [
  { id: "running", label: "Running" },
  { id: "jumping", label: "Jumping" },
  { id: "landing", label: "Landing" },
  { id: "start_stop", label: "Starting and stopping quickly" },
  { id: "cutting", label: "Cutting and lateral movements" },
  { id: "normal_technique", label: "Performing the activity with your normal technique" },
  { id: "participate_as_long", label: "Participating in your desired sport for as long as you would like" },
  { id: "overall", label: "Overall level of function" },
];
const sportsCalcExplEn =
  "Each of the 8 sport-activity items is scored 0 (unable to do) to 4 (no difficulty). The mean of the answered items is calculated and rescaled to a 0-100 percentage, so 100 means no difficulty with any sport-related activity and 0 means unable to do any of them. All 8 items must be answered.";
const sportsResultNoteEn = {
  label: "A higher score corresponds to less difficulty with sport activities.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "More difficulty",
  highLabel: "Less difficulty",
};

// ================= PT-PT =================

const RUBRIC_PT_PT = [
  { value: 0, label: "Incapaz de fazer" },
  { value: 1, label: "Dificuldade extrema" },
  { value: 2, label: "Dificuldade moderada" },
  { value: 3, label: "Ligeira dificuldade" },
  { value: 4, label: "Sem dificuldade" },
];
const adlItemsPtPt = [
  { label: "Estar de pé" },
  { label: "Andar em superfície plana" },
  { label: "Andar em superfície plana sem sapatos" },
  { label: "Subir encostas" },
  { label: "Descer encostas" },
  { label: "Subir escadas" },
  { label: "Descer escadas" },
  { label: "Andar em superfície irregular" },
  { label: "Subir e descer passeios/lancis" },
  { label: "Agachar-se" },
  { label: "Ficar na ponta dos pés" },
  { label: "Começar a andar" },
  { label: "Andar cerca de 5 minutos ou menos" },
  { label: "Andar cerca de 10 minutos" },
  { label: "Andar 15 minutos ou mais" },
  { label: "Responsabilidades domésticas" },
  { label: "Atividades da vida diária" },
  { label: "Cuidados pessoais" },
  { label: "Trabalho leve a moderado (estar de pé, andar)" },
  { label: "Trabalho pesado (empurrar/puxar, subir, transportar)" },
  { label: "Atividades recreativas" },
];
const sportsItemsPtPt = [
  { label: "Correr" },
  { label: "Saltar" },
  { label: "Aterrar após um salto" },
  { label: "Iniciar e parar rapidamente" },
  { label: "Movimentos de corte e laterais" },
  { label: "Realizar a atividade com a sua técnica normal" },
  { label: "Participar no seu desporto pretendido durante o tempo que desejar" },
  { label: "Nível geral de função" },
];
const adlCalcExplPtPt =
  "Cada um dos 21 itens de atividades diárias é pontuado de 0 (incapaz de fazer) a 4 (sem dificuldade). Calcula-se a média dos itens respondidos e reescala-se para uma percentagem de 0 a 100, pelo que 100 significa ausência de dificuldade em qualquer atividade diária e 0 significa incapacidade de realizar todas elas. Todos os 21 itens têm de ser respondidos.";
const sportsCalcExplPtPt =
  "Cada um dos 8 itens de atividade desportiva é pontuado de 0 (incapaz de fazer) a 4 (sem dificuldade). Calcula-se a média dos itens respondidos e reescala-se para uma percentagem de 0 a 100, pelo que 100 significa ausência de dificuldade em qualquer atividade desportiva e 0 significa incapacidade de realizar todas elas. Todos os 8 itens têm de ser respondidos.";

// ================= PT-BR =================

const RUBRIC_PT_BR = [
  { value: 0, label: "Incapaz de fazer" },
  { value: 1, label: "Dificuldade extrema" },
  { value: 2, label: "Dificuldade moderada" },
  { value: 3, label: "Leve dificuldade" },
  { value: 4, label: "Sem dificuldade" },
];
const adlItemsPtBr = [
  { label: "Ficar em pé" },
  { label: "Andar em superfície plana" },
  { label: "Andar em superfície plana sem sapatos" },
  { label: "Subir ladeiras" },
  { label: "Descer ladeiras" },
  { label: "Subir escadas" },
  { label: "Descer escadas" },
  { label: "Andar em superfície irregular" },
  { label: "Subir e descer meio-fios" },
  { label: "Agachar" },
  { label: "Ficar na ponta dos pés" },
  { label: "Começar a andar" },
  { label: "Andar cerca de 5 minutos ou menos" },
  { label: "Andar cerca de 10 minutos" },
  { label: "Andar 15 minutos ou mais" },
  { label: "Responsabilidades domésticas" },
  { label: "Atividades da vida diária" },
  { label: "Cuidados pessoais" },
  { label: "Trabalho leve a moderado (ficar em pé, andar)" },
  { label: "Trabalho pesado (empurrar/puxar, subir, carregar)" },
  { label: "Atividades recreativas" },
];
const sportsItemsPtBr = [
  { label: "Correr" },
  { label: "Pular" },
  { label: "Aterrissar após um pulo" },
  { label: "Começar e parar rapidamente" },
  { label: "Movimentos de corte e laterais" },
  { label: "Realizar a atividade com sua técnica normal" },
  { label: "Participar do seu esporte desejado pelo tempo que quiser" },
  { label: "Nível geral de função" },
];
const adlCalcExplPtBr =
  "Cada um dos 21 itens de atividades diárias é pontuado de 0 (incapaz de fazer) a 4 (sem dificuldade). Calcula-se a média dos itens respondidos e reescala-se para uma porcentagem de 0 a 100, de forma que 100 significa ausência de dificuldade em qualquer atividade diária e 0 significa incapacidade de realizar todas elas. Todos os 21 itens precisam ser respondidos.";
const sportsCalcExplPtBr =
  "Cada um dos 8 itens de atividade esportiva é pontuado de 0 (incapaz de fazer) a 4 (sem dificuldade). Calcula-se a média dos itens respondidos e reescala-se para uma porcentagem de 0 a 100, de forma que 100 significa ausência de dificuldade em qualquer atividade esportiva e 0 significa incapacidade de realizar todas elas. Todos os 8 itens precisam ser respondidos.";

// ================= ES =================

const RUBRIC_ES = [
  { value: 0, label: "Incapaz de hacerlo" },
  { value: 1, label: "Dificultad extrema" },
  { value: 2, label: "Dificultad moderada" },
  { value: 3, label: "Ligera dificultad" },
  { value: 4, label: "Sin dificultad" },
];
const adlItemsEs = [
  { label: "Estar de pie" },
  { label: "Caminar sobre superficie plana" },
  { label: "Caminar sobre superficie plana sin zapatos" },
  { label: "Subir cuestas" },
  { label: "Bajar cuestas" },
  { label: "Subir escaleras" },
  { label: "Bajar escaleras" },
  { label: "Caminar sobre superficie irregular" },
  { label: "Subir y bajar bordillos" },
  { label: "Ponerse en cuclillas" },
  { label: "Ponerse de puntillas" },
  { label: "Comenzar a caminar" },
  { label: "Caminar unos 5 minutos o menos" },
  { label: "Caminar unos 10 minutos" },
  { label: "Caminar 15 minutos o más" },
  { label: "Responsabilidades del hogar" },
  { label: "Actividades de la vida diaria" },
  { label: "Cuidado personal" },
  { label: "Trabajo ligero a moderado (de pie, caminando)" },
  { label: "Trabajo pesado (empujar/tirar, subir, cargar)" },
  { label: "Actividades recreativas" },
];
const sportsItemsEs = [
  { label: "Correr" },
  { label: "Saltar" },
  { label: "Aterrizar después de un salto" },
  { label: "Comenzar y detenerse rápidamente" },
  { label: "Movimientos de corte y laterales" },
  { label: "Realizar la actividad con su técnica normal" },
  { label: "Participar en su deporte deseado durante el tiempo que desee" },
  { label: "Nivel general de función" },
];
const adlCalcExplEs =
  "Cada uno de los 21 ítems de actividades diarias se puntúa de 0 (incapaz de hacerlo) a 4 (sin dificultad). Se calcula la media de los ítems respondidos y se reescala a un porcentaje de 0 a 100, por lo que 100 significa ausencia de dificultad en cualquier actividad diaria y 0 significa incapacidad para realizar todas ellas. Los 21 ítems deben responderse.";
const sportsCalcExplEs =
  "Cada uno de los 8 ítems de actividad deportiva se puntúa de 0 (incapaz de hacerlo) a 4 (sin dificultad). Se calcula la media de los ítems respondidos y se reescala a un porcentaje de 0 a 100, por lo que 100 significa ausencia de dificultad en cualquier actividad deportiva y 0 significa incapacidad para realizar todas ellas. Los 8 ítems deben responderse.";

// ================= Seed both subscales =================

await seedSubscale({
  slug: "faam-adl",
  position: 7,
  en: {
    name: "Foot and Ankle Ability Measure — Activities of Daily Living",
    abbreviation: "FAAM-ADL",
    description: "Measures difficulty performing 21 everyday activities due to a foot or ankle problem, producing a score out of 100 that reflects daily function (100 = no difficulty).",
    minutesMin: 5,
    minutesMax: 8,
    items: adlItemsEn,
    calculationExplanation: adlCalcExplEn,
    resultNote: adlResultNoteEn,
  },
  translations: [
    {
      locale: "pt-pt",
      name: "Foot and Ankle Ability Measure — Atividades da Vida Diária",
      description: "Mede a dificuldade em realizar 21 atividades do dia a dia devido a um problema no pé ou tornozelo, produzindo uma pontuação em 100 que reflete a função diária (100 = sem dificuldade).",
      items: adlItemsPtPt,
      rubric: RUBRIC_PT_PT,
      calculationExplanation: adlCalcExplPtPt,
      resultNote: {
        label: "Uma pontuação mais elevada corresponde a menos dificuldade nas atividades diárias.",
        description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
        lowLabel: "Mais dificuldade",
        highLabel: "Menos dificuldade",
      },
    },
    {
      locale: "pt-br",
      name: "Foot and Ankle Ability Measure — Atividades da Vida Diária",
      description: "Mede a dificuldade em realizar 21 atividades do dia a dia devido a um problema no pé ou tornozelo, gerando uma pontuação em 100 que reflete a função diária (100 = sem dificuldade).",
      items: adlItemsPtBr,
      rubric: RUBRIC_PT_BR,
      calculationExplanation: adlCalcExplPtBr,
      resultNote: {
        label: "Uma pontuação mais alta corresponde a menos dificuldade nas atividades diárias.",
        description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
        lowLabel: "Mais dificuldade",
        highLabel: "Menos dificuldade",
      },
    },
    {
      locale: "es",
      name: "Foot and Ankle Ability Measure — Actividades de la Vida Diaria",
      description: "Mide la dificultad para realizar 21 actividades cotidianas debido a un problema en el pie o tobillo, generando una puntuación sobre 100 que refleja la función diaria (100 = sin dificultad).",
      items: adlItemsEs,
      rubric: RUBRIC_ES,
      calculationExplanation: adlCalcExplEs,
      resultNote: {
        label: "Una puntuación más alta corresponde a menos dificultad con las actividades diarias.",
        description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
        lowLabel: "Más dificultad",
        highLabel: "Menos dificultad",
      },
    },
  ],
});

await seedSubscale({
  slug: "faam-sports",
  position: 8,
  en: {
    name: "Foot and Ankle Ability Measure — Sports",
    abbreviation: "FAAM-Sports",
    description: "Measures difficulty performing 8 sport-related activities due to a foot or ankle problem, producing a score out of 100 that reflects sport function (100 = no difficulty).",
    minutesMin: 2,
    minutesMax: 3,
    items: sportsItemsEn,
    calculationExplanation: sportsCalcExplEn,
    resultNote: sportsResultNoteEn,
  },
  translations: [
    {
      locale: "pt-pt",
      name: "Foot and Ankle Ability Measure — Desporto",
      description: "Mede a dificuldade em realizar 8 atividades desportivas devido a um problema no pé ou tornozelo, produzindo uma pontuação em 100 que reflete a função desportiva (100 = sem dificuldade).",
      items: sportsItemsPtPt,
      rubric: RUBRIC_PT_PT,
      calculationExplanation: sportsCalcExplPtPt,
      resultNote: {
        label: "Uma pontuação mais elevada corresponde a menos dificuldade em atividades desportivas.",
        description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
        lowLabel: "Mais dificuldade",
        highLabel: "Menos dificuldade",
      },
    },
    {
      locale: "pt-br",
      name: "Foot and Ankle Ability Measure — Esportes",
      description: "Mede a dificuldade em realizar 8 atividades esportivas devido a um problema no pé ou tornozelo, gerando uma pontuação em 100 que reflete a função esportiva (100 = sem dificuldade).",
      items: sportsItemsPtBr,
      rubric: RUBRIC_PT_BR,
      calculationExplanation: sportsCalcExplPtBr,
      resultNote: {
        label: "Uma pontuação mais alta corresponde a menos dificuldade em atividades esportivas.",
        description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
        lowLabel: "Mais dificuldade",
        highLabel: "Menos dificuldade",
      },
    },
    {
      locale: "es",
      name: "Foot and Ankle Ability Measure — Deportes",
      description: "Mide la dificultad para realizar 8 actividades deportivas debido a un problema en el pie o tobillo, generando una puntuación sobre 100 que refleja la función deportiva (100 = sin dificultad).",
      items: sportsItemsEs,
      rubric: RUBRIC_ES,
      calculationExplanation: sportsCalcExplEs,
      resultNote: {
        label: "Una puntuación más alta corresponde a menos dificultad con las actividades deportivas.",
        description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
        lowLabel: "Más dificultad",
        highLabel: "Menos dificultad",
      },
    },
  ],
});

console.log("Both FAAM subscales seeded.");
console.log({ categoryId });

await pool.end();
