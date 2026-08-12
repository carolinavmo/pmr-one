// Katz Index of Independence in Activities of Daily Living — second
// Clinical Tools calculator, same "Independence" category as the
// Barthel Index. Content status: 'published', same rationale as
// barthel.mjs (see that file's header comment).
//
// Usage: node db/seed/clinical-tools/katz.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "independence", {
  slug: "independence",
  name: "Independence",
  color: "teal",
  position: 0,
});

// ---------- Definition (English source) ----------

const definitionEn = {
  items: [
    {
      id: "bathing",
      label: "Bathing",
      instructions: "Ability to wash the whole body, by sponge, tub, or shower.",
      options: [
        { value: 0, label: "Dependent", description: "Needs help with more than one part of the body, getting in or out of the tub or shower, or does not bathe self at all." },
        { value: 1, label: "Independent", description: "Bathes self completely, or needs help with only a single part of the body such as the back." },
      ],
    },
    {
      id: "dressing",
      label: "Dressing",
      instructions: "Ability to select clothing and get dressed.",
      options: [
        { value: 0, label: "Dependent", description: "Needs help with dressing, or stays partly or completely undressed." },
        { value: 1, label: "Independent", description: "Gets clothes and dresses completely without assistance, except for tying shoes." },
      ],
    },
    {
      id: "toileting",
      label: "Toileting",
      instructions: "Ability to go to the toilet, use it, and clean up afterward.",
      options: [
        { value: 0, label: "Dependent", description: "Needs help getting to and using the toilet, cleaning up, or uses a bedpan or commode." },
        { value: 1, label: "Independent", description: "Gets to and uses the toilet, cleans up, and arranges clothing without assistance (may use a cane, walker, or a bedpan or commode at night)." },
      ],
    },
    {
      id: "transferring",
      label: "Transferring",
      instructions: "Ability to move into and out of bed and a chair.",
      options: [
        { value: 0, label: "Dependent", description: "Needs help moving from bed to chair, or requires a complete transfer." },
        { value: 1, label: "Independent", description: "Moves in and out of bed and chair without assistance (may use a cane or walker)." },
      ],
    },
    {
      id: "continence",
      label: "Continence",
      instructions: "Bladder and bowel control.",
      options: [
        { value: 0, label: "Dependent", description: "Is partially or totally incontinent of bowel or bladder, or needs partial or total help managing this (including catheters or a scheduled toileting routine)." },
        { value: 1, label: "Independent", description: "Controls bladder and bowel completely." },
      ],
    },
    {
      id: "feeding",
      label: "Feeding",
      instructions: "Ability to eat without assistance.",
      options: [
        { value: 0, label: "Dependent", description: "Needs partial or total help with feeding, or is fed by tube or intravenously." },
        { value: 1, label: "Independent", description: "Feeds self without assistance (excludes cutting meat and buttering bread)." },
      ],
    },
  ],
  scoring: { method: "sum" },
  maxScore: 6,
  interpretation: [
    { min: 0, max: 1, label: "Very severe dependency", description: "Very severe functional dependency, needing extensive assistance with basic self-care.", severity: "critical" },
    { min: 2, max: 3, label: "Severe dependency", description: "Severe functional impairment across multiple basic activities of daily living.", severity: "serious" },
    { min: 4, max: 4, label: "Moderate dependency", description: "Moderate functional impairment; assistance needed with several activities.", severity: "warning" },
    { min: 5, max: 5, label: "Mild dependency", description: "Mild functional impairment; largely independent with occasional assistance.", severity: "good" },
    { min: 6, max: 6, label: "Independent", description: "Fully independent across all six basic activities of daily living.", severity: "good" },
  ],
  calculationExplanation:
    "The Katz Index score is the sum of the point value (0 or 1) for each of the six basic activities of daily living. Each activity is scored as either independent or dependent, so the total ranges from 0 (fully dependent) to 6 (fully independent).",
  source: {
    citation: "Katz S, Ford AB, Moskowitz RW, Jackson BA, Jaffe MW. Studies of illness in the aged. The index of ADL: a standardized measure of biological and psychosocial function. JAMA. 1963;185:914-919.",
    url: "https://www.sralab.org/rehabilitation-measures/katz-index-independence-activities-daily-living",
  },
};

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Katz Index of Independence in Activities of Daily Living",
  abbreviation: "Katz ADL",
  description: "Measures independence across six basic activities of daily living, producing a score out of 6 that reflects overall functional status.",
  population: "Older adults and patients with chronic illness",
  estimated_minutes_min: 3,
  estimated_minutes_max: 5,
  definition: JSON.stringify(definition),
  status: "published",
  position: 1,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "katz-index", {
  slug: "katz-index",
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
    "Katz Index of Independence in Activities of Daily Living",
    "Katz ADL",
    "Measures independence across six basic activities of daily living, producing a score out of 6 that reflects overall functional status.",
    "Older adults and patients with chronic illness",
    3,
    5,
    JSON.stringify(definitionEn),
    "published",
    1,
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
  { label: "Banho", instructions: "Capacidade de lavar o corpo todo, por esponja, banheira ou duche.", options: [
    { label: "Dependente", description: "Precisa de ajuda com mais do que uma parte do corpo, para entrar ou sair da banheira ou duche, ou não toma banho sozinho." },
    { label: "Independente", description: "Toma banho completamente sozinho, ou só precisa de ajuda numa única parte do corpo, como as costas." },
  ]},
  { label: "Vestir", instructions: "Capacidade de escolher roupa e vestir-se.", options: [
    { label: "Dependente", description: "Precisa de ajuda para se vestir, ou permanece parcial ou totalmente despido." },
    { label: "Independente", description: "Escolhe a roupa e veste-se completamente sem ajuda, exceto para atar os sapatos." },
  ]},
  { label: "Uso do WC", instructions: "Capacidade de ir à casa de banho, usá-la e limpar-se depois.", options: [
    { label: "Dependente", description: "Precisa de ajuda para ir e usar a casa de banho, para se limpar, ou usa arrastadeira ou cadeira sanitária." },
    { label: "Independente", description: "Vai e usa a casa de banho, limpa-se e ajeita a roupa sem ajuda (pode usar bengala, andarilho, ou arrastadeira/cadeira sanitária à noite)." },
  ]},
  { label: "Transferências", instructions: "Capacidade de se movimentar entre a cama e a cadeira.", options: [
    { label: "Dependente", description: "Precisa de ajuda para se mover da cama para a cadeira, ou necessita de transferência completa." },
    { label: "Independente", description: "Move-se entre a cama e a cadeira sem ajuda (pode usar bengala ou andarilho)." },
  ]},
  { label: "Continência", instructions: "Controlo vesical e intestinal.", options: [
    { label: "Dependente", description: "É parcial ou totalmente incontinente de intestino ou bexiga, ou precisa de ajuda parcial ou total para o controlar (incluindo algálias ou uma rotina programada de idas à casa de banho)." },
    { label: "Independente", description: "Controla completamente a bexiga e o intestino." },
  ]},
  { label: "Alimentação", instructions: "Capacidade de comer sem ajuda.", options: [
    { label: "Dependente", description: "Precisa de ajuda parcial ou total para se alimentar, ou é alimentado por sonda ou via intravenosa." },
    { label: "Independente", description: "Alimenta-se sem ajuda (exclui cortar carne e barrar pão)." },
  ]},
];
const ptPtInterpretation = [
  { label: "Dependência muito grave", description: "Dependência funcional muito grave, exigindo assistência extensa nos cuidados pessoais básicos." },
  { label: "Dependência grave", description: "Défice funcional grave em várias atividades básicas de vida diária." },
  { label: "Dependência moderada", description: "Défice funcional moderado; é necessária assistência em várias atividades." },
  { label: "Dependência ligeira", description: "Défice funcional ligeiro; maioritariamente independente, com assistência ocasional." },
  { label: "Independente", description: "Totalmente independente nas seis atividades básicas de vida diária." },
];
const ptPtCalculationExplanation =
  "A pontuação do Índice de Katz é a soma do valor atribuído (0 ou 1) a cada uma das seis atividades básicas de vida diária. Cada atividade é classificada como independente ou dependente, pelo que o total varia entre 0 (totalmente dependente) e 6 (totalmente independente).";

const ptBrItems = [
  { label: "Banho", instructions: "Capacidade de lavar o corpo todo, por esponja, banheira ou chuveiro.", options: [
    { label: "Dependente", description: "Precisa de ajuda com mais de uma parte do corpo, para entrar ou sair da banheira ou chuveiro, ou não toma banho sozinho." },
    { label: "Independente", description: "Toma banho completamente sozinho, ou só precisa de ajuda em uma única parte do corpo, como as costas." },
  ]},
  { label: "Vestir-se", instructions: "Capacidade de escolher roupas e se vestir.", options: [
    { label: "Dependente", description: "Precisa de ajuda para se vestir, ou permanece parcial ou totalmente sem roupa." },
    { label: "Independente", description: "Escolhe as roupas e se veste completamente sem ajuda, exceto para amarrar os sapatos." },
  ]},
  { label: "Uso do banheiro", instructions: "Capacidade de ir ao banheiro, usá-lo e se limpar depois.", options: [
    { label: "Dependente", description: "Precisa de ajuda para ir e usar o banheiro, para se limpar, ou usa comadre ou cadeira higiênica." },
    { label: "Independente", description: "Vai e usa o banheiro, se limpa e ajeita a roupa sem ajuda (pode usar bengala, andador, ou comadre/cadeira higiênica à noite)." },
  ]},
  { label: "Transferências", instructions: "Capacidade de se movimentar entre a cama e a cadeira.", options: [
    { label: "Dependente", description: "Precisa de ajuda para se mover da cama para a cadeira, ou necessita de transferência completa." },
    { label: "Independente", description: "Se move entre a cama e a cadeira sem ajuda (pode usar bengala ou andador)." },
  ]},
  { label: "Continência", instructions: "Controle vesical e intestinal.", options: [
    { label: "Dependente", description: "É parcial ou totalmente incontinente de intestino ou bexiga, ou precisa de ajuda parcial ou total para controlar isso (incluindo sondas ou uma rotina programada de idas ao banheiro)." },
    { label: "Independente", description: "Controla completamente a bexiga e o intestino." },
  ]},
  { label: "Alimentação", instructions: "Capacidade de comer sem ajuda.", options: [
    { label: "Dependente", description: "Precisa de ajuda parcial ou total para se alimentar, ou é alimentado por sonda ou via intravenosa." },
    { label: "Independente", description: "Se alimenta sem ajuda (exclui cortar carne e passar manteiga no pão)." },
  ]},
];
const ptBrInterpretation = [
  { label: "Dependência muito grave", description: "Dependência funcional muito grave, exigindo assistência extensa nos cuidados pessoais básicos." },
  { label: "Dependência grave", description: "Déficit funcional grave em várias atividades básicas de vida diária." },
  { label: "Dependência moderada", description: "Déficit funcional moderado; é necessária assistência em várias atividades." },
  { label: "Dependência leve", description: "Déficit funcional leve; majoritariamente independente, com assistência ocasional." },
  { label: "Independente", description: "Totalmente independente nas seis atividades básicas de vida diária." },
];
const ptBrCalculationExplanation =
  "A pontuação do Índice de Katz é a soma do valor atribuído (0 ou 1) a cada uma das seis atividades básicas de vida diária. Cada atividade é classificada como independente ou dependente, então o total varia de 0 (totalmente dependente) a 6 (totalmente independente).";

const esItems = [
  { label: "Baño", instructions: "Capacidad de lavarse todo el cuerpo, con esponja, bañera o ducha.", options: [
    { label: "Dependiente", description: "Necesita ayuda con más de una parte del cuerpo, para entrar o salir de la bañera o ducha, o no se baña solo." },
    { label: "Independiente", description: "Se baña completamente solo, o solo necesita ayuda en una única parte del cuerpo, como la espalda." },
  ]},
  { label: "Vestirse", instructions: "Capacidad de elegir la ropa y vestirse.", options: [
    { label: "Dependiente", description: "Necesita ayuda para vestirse, o permanece parcial o totalmente sin vestir." },
    { label: "Independiente", description: "Elige la ropa y se viste completamente sin ayuda, excepto para atarse los zapatos." },
  ]},
  { label: "Uso del retrete", instructions: "Capacidad de ir al retrete, usarlo y asearse después.", options: [
    { label: "Dependiente", description: "Necesita ayuda para ir y usar el retrete, para asearse, o usa cuña o silla sanitaria." },
    { label: "Independiente", description: "Va y usa el retrete, se asea y se arregla la ropa sin ayuda (puede usar bastón, andador, o cuña/silla sanitaria por la noche)." },
  ]},
  { label: "Traslados", instructions: "Capacidad de moverse entre la cama y la silla.", options: [
    { label: "Dependiente", description: "Necesita ayuda para moverse de la cama a la silla, o requiere un traslado completo." },
    { label: "Independiente", description: "Se mueve entre la cama y la silla sin ayuda (puede usar bastón o andador)." },
  ]},
  { label: "Continencia", instructions: "Control vesical e intestinal.", options: [
    { label: "Dependiente", description: "Es parcial o totalmente incontinente de intestino o vejiga, o necesita ayuda parcial o total para controlarlo (incluyendo sondas o una rutina programada de idas al retrete)." },
    { label: "Independiente", description: "Controla completamente la vejiga y el intestino." },
  ]},
  { label: "Alimentación", instructions: "Capacidad de comer sin ayuda.", options: [
    { label: "Dependiente", description: "Necesita ayuda parcial o total para alimentarse, o es alimentado por sonda o vía intravenosa." },
    { label: "Independiente", description: "Se alimenta sin ayuda (excluye cortar la carne y untar mantequilla en el pan)." },
  ]},
];
const esInterpretation = [
  { label: "Dependencia muy grave", description: "Dependencia funcional muy grave, que requiere asistencia extensa en el autocuidado básico." },
  { label: "Dependencia grave", description: "Déficit funcional grave en varias actividades básicas de la vida diaria." },
  { label: "Dependencia moderada", description: "Déficit funcional moderado; se necesita asistencia en varias actividades." },
  { label: "Dependencia leve", description: "Déficit funcional leve; mayoritariamente independiente, con asistencia ocasional." },
  { label: "Independiente", description: "Totalmente independiente en las seis actividades básicas de la vida diaria." },
];
const esCalculationExplanation =
  "La puntuación del Índice de Katz es la suma del valor asignado (0 o 1) a cada una de las seis actividades básicas de la vida diaria. Cada actividad se clasifica como independiente o dependiente, por lo que el total va de 0 (totalmente dependiente) a 6 (totalmente independiente).";

const translations = [
  {
    locale: "pt-pt",
    name: "Índice de Katz",
    description: "Mede a independência em seis atividades básicas de vida diária, produzindo uma pontuação em 6 que reflete o estado funcional geral.",
    definition: translateDefinition(ptPtItems, ptPtInterpretation, ptPtCalculationExplanation),
  },
  {
    locale: "pt-br",
    name: "Índice de Katz",
    description: "Mede a independência em seis atividades básicas de vida diária, gerando uma pontuação em 6 que reflete o estado funcional geral.",
    definition: translateDefinition(ptBrItems, ptBrInterpretation, ptBrCalculationExplanation),
  },
  {
    locale: "es",
    name: "Índice de Katz",
    description: "Mide la independencia en seis actividades básicas de la vida diaria, generando una puntuación sobre 6 que refleja el estado funcional general.",
    definition: translateDefinition(esItems, esInterpretation, esCalculationExplanation),
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

console.log("Katz Index seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
