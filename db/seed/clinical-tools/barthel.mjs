// Barthel Index — Clinical Tools v1 pilot calculator.
//
// Content status: 'published' — this is the standard, widely-published
// 10-item Barthel Index of Activities of Daily Living (Mahoney &
// Barthel, 1965), paraphrased in this app's own words, not copied
// verbatim from any reference site. Unlike disease content (seeded
// 'draft', gated behind the Scientific Review workflow), calculators
// have no review-queue stage yet (see the Clinical Tools plan's
// non-goals) — 'published' here means "visible", the only status this
// content type currently distinguishes.
//
// Usage: node db/seed/clinical-tools/barthel.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------- Category ----------

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "independence", {
  slug: "independence",
  name: "Independence",
  color: "teal",
  position: 0,
});

// ---------- Definition (English source) ----------
// item/option ids and values are the stable keys every locale's
// translation row must reuse unchanged (see clinical-tools.ts) — only
// label/description/instructions text differs per locale below.

const definitionEn = {
  items: [
    {
      id: "feeding",
      label: "Feeding",
      instructions: "Ability to eat once food is served on a tray or table.",
      options: [
        { value: 0, label: "Unable", description: "Unable to feed self." },
        { value: 5, label: "Needs help", description: "Needs help cutting food, spreading butter, etc., but can feed self." },
        { value: 10, label: "Independent", description: "Able to feed self independently." },
      ],
    },
    {
      id: "bathing",
      label: "Bathing",
      instructions: "Ability to wash the whole body.",
      options: [
        { value: 0, label: "Dependent", description: "Needs help with bathing." },
        { value: 5, label: "Independent", description: "Bathes self independently (shower, tub, or sponge bath)." },
      ],
    },
    {
      id: "grooming",
      label: "Grooming",
      instructions: "Personal hygiene: face, hair, teeth, shaving.",
      options: [
        { value: 0, label: "Needs help", description: "Needs help with personal care." },
        { value: 5, label: "Independent", description: "Independent with face, hair, teeth and shaving (implements provided)." },
      ],
    },
    {
      id: "dressing",
      label: "Dressing",
      instructions: "Ability to put on and remove clothing.",
      options: [
        { value: 0, label: "Dependent", description: "Unable to dress self." },
        { value: 5, label: "Needs help", description: "Needs help, but can do about half unaided." },
        { value: 10, label: "Independent", description: "Independent, including buttons, zips and laces." },
      ],
    },
    {
      id: "bowels",
      label: "Bowels",
      instructions: "Bowel control over the preceding week.",
      options: [
        { value: 0, label: "Incontinent", description: "Incontinent, or needs enemas." },
        { value: 5, label: "Occasional accident", description: "Occasional accident, once a week or less." },
        { value: 10, label: "Continent", description: "Fully continent." },
      ],
    },
    {
      id: "bladder",
      label: "Bladder",
      instructions: "Bladder control over the preceding week.",
      options: [
        { value: 0, label: "Incontinent", description: "Incontinent, or catheterized and unable to manage." },
        { value: 5, label: "Occasional accident", description: "Occasional accident, up to once daily." },
        { value: 10, label: "Continent", description: "Fully continent, or manages a catheter independently." },
      ],
    },
    {
      id: "toilet_use",
      label: "Toilet use",
      instructions: "Ability to use the toilet or commode.",
      options: [
        { value: 0, label: "Dependent", description: "Unable to use the toilet without major help." },
        { value: 5, label: "Needs some help", description: "Needs some help with balance, clothing or toilet paper, but can do some things alone." },
        { value: 10, label: "Independent", description: "Independent with toilet use, including undressing, cleaning and flushing." },
      ],
    },
    {
      id: "transfers",
      label: "Transfers",
      instructions: "Moving between bed and chair.",
      options: [
        { value: 0, label: "Unable", description: "Unable to transfer; no sitting balance." },
        { value: 5, label: "Major help", description: "Major physical help (one or two people) to sit up and transfer." },
        { value: 10, label: "Minor help", description: "Minor help (physical or verbal), or supervision needed." },
        { value: 15, label: "Independent", description: "Independent, including locking a wheelchair and lifting footrests." },
      ],
    },
    {
      id: "mobility",
      label: "Mobility",
      instructions: "Movement on level surfaces, indoors or outdoors.",
      options: [
        { value: 0, label: "Immobile", description: "Immobile, or mobile less than 50 metres." },
        { value: 5, label: "Wheelchair independent", description: "Independent in a wheelchair, including corners, over 50 metres." },
        { value: 10, label: "Walks with help", description: "Walks with the help of one person, physical or verbal, over 50 metres." },
        { value: 15, label: "Independent", description: "Independent walking, may use an aid such as a cane, over 50 metres." },
      ],
    },
    {
      id: "stairs",
      label: "Stairs",
      instructions: "Ability to go up and down a flight of stairs.",
      options: [
        { value: 0, label: "Unable", description: "Unable to manage stairs." },
        { value: 5, label: "Needs help", description: "Needs help, physical, verbal, or carrying an aid." },
        { value: 10, label: "Independent", description: "Independent, may use an aid such as a handrail." },
      ],
    },
  ],
  scoring: { method: "sum" },
  maxScore: 100,
  interpretation: [
    { min: 0, max: 20, label: "Total dependency", description: "Total functional dependency for basic activities of daily living.", severity: "critical" },
    { min: 21, max: 60, label: "Severe dependency", description: "Severe dependency, requiring substantial assistance with most activities.", severity: "serious" },
    { min: 61, max: 90, label: "Moderate dependency", description: "Moderate dependency, requiring assistance with some activities.", severity: "warning" },
    { min: 91, max: 99, label: "Slight dependency", description: "Slight dependency; mostly independent with minor assistance needed.", severity: "good" },
    { min: 100, max: 100, label: "Independent", description: "Fully independent in basic activities of daily living.", severity: "good" },
  ],
  calculationExplanation:
    "The Barthel Index score is the sum of the point value assigned to the option selected for each of the 10 items. Each item is weighted according to its clinical importance and the level of assistance it typically requires, so the total ranges from 0 (fully dependent) to 100 (fully independent).",
  // Original publication, plus the widely-used Rehabilitation Measures
  // Database entry (verified reachable at authoring time) — no
  // fabricated DOI/PMID, matching this codebase's existing citation
  // convention (see plantar-fasciopathy.mjs).
  source: {
    citation: "Mahoney FI, Barthel DW. Functional evaluation: The Barthel Index. Md State Med J. 1965;14:61-65.",
    url: "https://www.sralab.org/rehabilitation-measures/barthel-index",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "barthel-index", {
  slug: "barthel-index",
  category_id: categoryId,
  name: "Barthel Index",
  abbreviation: "BI",
  description: "Measures a person's ability to perform 10 basic activities of daily living, producing a score out of 100 that reflects their level of independence.",
  population: "Adults and older adults with functional impairment",
  estimated_minutes_min: 5,
  estimated_minutes_max: 10,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 0,
});
// findOrCreate only sets these on first insert — patch every field on
// each run so re-seeding an already-existing row still picks up edits.
await pool.query(
  `UPDATE clinical_calculator
   SET category_id = $2, name = $3, abbreviation = $4, description = $5,
       population = $6, estimated_minutes_min = $7, estimated_minutes_max = $8,
       definition = $9, status = $10, position = $11
   WHERE id = $1`,
  [
    calculatorId,
    categoryId,
    "Barthel Index",
    "BI",
    "Measures a person's ability to perform 10 basic activities of daily living, producing a score out of 100 that reflects their level of independence.",
    "Adults and older adults with functional impairment",
    5,
    10,
    JSON.stringify(definitionEn),
    "published",
    0,
  ]
);

// ---------- Translations ----------
// Item/option ids and numeric values are unchanged from definitionEn —
// only label/description/instructions text is translated, per the
// COALESCE locale-fallback resolveInterpretation/scoreCalculator both
// rely on (calculator-scoring.ts matches purely on id/value, never on
// translated text).

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
    // Citation text stays unchanged across locales (scientific
    // citations aren't translated) — carried through as-is.
    source: definitionEn.source,
    interpretation: definitionEn.interpretation.map((band, i) => ({
      ...band,
      label: interpretationText[i].label,
      description: interpretationText[i].description,
    })),
  };
}

const ptPtItems = [
  { label: "Alimentação", instructions: "Capacidade de comer depois de a comida ser servida num tabuleiro ou mesa.", options: [
    { label: "Incapaz", description: "Incapaz de se alimentar sozinho." },
    { label: "Precisa de ajuda", description: "Precisa de ajuda para cortar alimentos, barrar manteiga, etc., mas consegue comer sozinho." },
    { label: "Independente", description: "Capaz de se alimentar de forma independente." },
  ]},
  { label: "Banho", instructions: "Capacidade de lavar o corpo todo.", options: [
    { label: "Dependente", description: "Precisa de ajuda para tomar banho." },
    { label: "Independente", description: "Toma banho sozinho (duche, banheira ou banho de esponja)." },
  ]},
  { label: "Higiene pessoal", instructions: "Higiene pessoal: rosto, cabelo, dentes, barba.", options: [
    { label: "Precisa de ajuda", description: "Precisa de ajuda com os cuidados pessoais." },
    { label: "Independente", description: "Independente para rosto, cabelo, dentes e barba (com os utensílios disponíveis)." },
  ]},
  { label: "Vestir", instructions: "Capacidade de vestir e despir roupa.", options: [
    { label: "Dependente", description: "Incapaz de se vestir sozinho." },
    { label: "Precisa de ajuda", description: "Precisa de ajuda, mas consegue fazer cerca de metade sem apoio." },
    { label: "Independente", description: "Independente, incluindo botões, fechos e atacadores." },
  ]},
  { label: "Intestinos", instructions: "Controlo intestinal na última semana.", options: [
    { label: "Incontinente", description: "Incontinente, ou necessita de clisteres." },
    { label: "Acidente ocasional", description: "Acidente ocasional, uma vez por semana ou menos." },
    { label: "Continente", description: "Totalmente continente." },
  ]},
  { label: "Bexiga", instructions: "Controlo vesical na última semana.", options: [
    { label: "Incontinente", description: "Incontinente, ou algaliado e incapaz de gerir a algália." },
    { label: "Acidente ocasional", description: "Acidente ocasional, até uma vez por dia." },
    { label: "Continente", description: "Totalmente continente, ou gere a algália de forma independente." },
  ]},
  { label: "Uso do WC", instructions: "Capacidade de usar a sanita ou a arrastadeira.", options: [
    { label: "Dependente", description: "Incapaz de usar o WC sem ajuda significativa." },
    { label: "Precisa de alguma ajuda", description: "Precisa de alguma ajuda com o equilíbrio, a roupa ou o papel higiénico, mas consegue fazer algumas coisas sozinho." },
    { label: "Independente", description: "Independente no uso do WC, incluindo despir, limpar-se e descarregar o autoclismo." },
  ]},
  { label: "Transferências", instructions: "Movimentação entre a cama e a cadeira.", options: [
    { label: "Incapaz", description: "Incapaz de se transferir; sem equilíbrio sentado." },
    { label: "Ajuda considerável", description: "Ajuda física considerável (uma ou duas pessoas) para se sentar e transferir." },
    { label: "Pequena ajuda", description: "Pequena ajuda (física ou verbal), ou supervisão necessária." },
    { label: "Independente", description: "Independente, incluindo travar a cadeira de rodas e levantar os apoios de pés." },
  ]},
  { label: "Mobilidade", instructions: "Deslocação em superfícies planas, dentro ou fora de casa.", options: [
    { label: "Imóvel", description: "Imóvel, ou desloca-se menos de 50 metros." },
    { label: "Independente em cadeira de rodas", description: "Independente em cadeira de rodas, incluindo curvas, por mais de 50 metros." },
    { label: "Caminha com ajuda", description: "Caminha com a ajuda de uma pessoa, física ou verbal, por mais de 50 metros." },
    { label: "Independente", description: "Caminha de forma independente, podendo usar um apoio como uma bengala, por mais de 50 metros." },
  ]},
  { label: "Escadas", instructions: "Capacidade de subir e descer um lanço de escadas.", options: [
    { label: "Incapaz", description: "Incapaz de subir ou descer escadas." },
    { label: "Precisa de ajuda", description: "Precisa de ajuda, física, verbal, ou de transportar um apoio." },
    { label: "Independente", description: "Independente, podendo usar um apoio como um corrimão." },
  ]},
];
const ptPtInterpretation = [
  { label: "Dependência total", description: "Dependência funcional total para as atividades básicas de vida diária." },
  { label: "Dependência grave", description: "Dependência grave, exigindo assistência substancial na maioria das atividades." },
  { label: "Dependência moderada", description: "Dependência moderada, exigindo assistência em algumas atividades." },
  { label: "Dependência ligeira", description: "Dependência ligeira; maioritariamente independente, com necessidade de assistência mínima." },
  { label: "Independente", description: "Totalmente independente nas atividades básicas de vida diária." },
];
const ptPtCalculationExplanation =
  "A pontuação do Índice de Barthel é a soma do valor atribuído à opção selecionada em cada um dos 10 itens. Cada item tem um peso de acordo com a sua importância clínica e o nível de assistência que normalmente exige, pelo que o total varia entre 0 (totalmente dependente) e 100 (totalmente independente).";

const ptBrItems = [
  { label: "Alimentação", instructions: "Capacidade de se alimentar depois de a comida ser servida em uma bandeja ou mesa.", options: [
    { label: "Incapaz", description: "Incapaz de se alimentar sozinho." },
    { label: "Precisa de ajuda", description: "Precisa de ajuda para cortar alimentos, passar manteiga, etc., mas consegue comer sozinho." },
    { label: "Independente", description: "Capaz de se alimentar de forma independente." },
  ]},
  { label: "Banho", instructions: "Capacidade de lavar o corpo todo.", options: [
    { label: "Dependente", description: "Precisa de ajuda para tomar banho." },
    { label: "Independente", description: "Toma banho sozinho (chuveiro, banheira ou banho de esponja)." },
  ]},
  { label: "Higiene pessoal", instructions: "Higiene pessoal: rosto, cabelo, dentes, barba.", options: [
    { label: "Precisa de ajuda", description: "Precisa de ajuda com os cuidados pessoais." },
    { label: "Independente", description: "Independente para rosto, cabelo, dentes e barba (com os utensílios disponíveis)." },
  ]},
  { label: "Vestir-se", instructions: "Capacidade de vestir e tirar roupas.", options: [
    { label: "Dependente", description: "Incapaz de se vestir sozinho." },
    { label: "Precisa de ajuda", description: "Precisa de ajuda, mas consegue fazer cerca de metade sem apoio." },
    { label: "Independente", description: "Independente, incluindo botões, zíperes e cadarços." },
  ]},
  { label: "Intestinos", instructions: "Controle intestinal na última semana.", options: [
    { label: "Incontinente", description: "Incontinente, ou precisa de enemas." },
    { label: "Acidente ocasional", description: "Acidente ocasional, uma vez por semana ou menos." },
    { label: "Continente", description: "Totalmente continente." },
  ]},
  { label: "Bexiga", instructions: "Controle vesical na última semana.", options: [
    { label: "Incontinente", description: "Incontinente, ou com sonda vesical e incapaz de manejá-la." },
    { label: "Acidente ocasional", description: "Acidente ocasional, até uma vez por dia." },
    { label: "Continente", description: "Totalmente continente, ou manuseia a sonda de forma independente." },
  ]},
  { label: "Uso do banheiro", instructions: "Capacidade de usar o vaso sanitário ou a comadre.", options: [
    { label: "Dependente", description: "Incapaz de usar o banheiro sem ajuda significativa." },
    { label: "Precisa de alguma ajuda", description: "Precisa de alguma ajuda com o equilíbrio, a roupa ou o papel higiênico, mas consegue fazer algumas coisas sozinho." },
    { label: "Independente", description: "Independente no uso do banheiro, incluindo se despir, se limpar e dar descarga." },
  ]},
  { label: "Transferências", instructions: "Movimentação entre a cama e a cadeira.", options: [
    { label: "Incapaz", description: "Incapaz de se transferir; sem equilíbrio sentado." },
    { label: "Ajuda considerável", description: "Ajuda física considerável (uma ou duas pessoas) para sentar e se transferir." },
    { label: "Pequena ajuda", description: "Pequena ajuda (física ou verbal), ou supervisão necessária." },
    { label: "Independente", description: "Independente, incluindo travar a cadeira de rodas e levantar os apoios de pés." },
  ]},
  { label: "Mobilidade", instructions: "Deslocamento em superfícies planas, dentro ou fora de casa.", options: [
    { label: "Imóvel", description: "Imóvel, ou se desloca menos de 50 metros." },
    { label: "Independente em cadeira de rodas", description: "Independente em cadeira de rodas, incluindo curvas, por mais de 50 metros." },
    { label: "Anda com ajuda", description: "Anda com a ajuda de uma pessoa, física ou verbal, por mais de 50 metros." },
    { label: "Independente", description: "Anda de forma independente, podendo usar um apoio como uma bengala, por mais de 50 metros." },
  ]},
  { label: "Escadas", instructions: "Capacidade de subir e descer um lance de escadas.", options: [
    { label: "Incapaz", description: "Incapaz de subir ou descer escadas." },
    { label: "Precisa de ajuda", description: "Precisa de ajuda, física, verbal, ou de carregar um apoio." },
    { label: "Independente", description: "Independente, podendo usar um apoio como um corrimão." },
  ]},
];
const ptBrInterpretation = [
  { label: "Dependência total", description: "Dependência funcional total para as atividades básicas de vida diária." },
  { label: "Dependência grave", description: "Dependência grave, exigindo assistência substancial na maioria das atividades." },
  { label: "Dependência moderada", description: "Dependência moderada, exigindo assistência em algumas atividades." },
  { label: "Dependência leve", description: "Dependência leve; majoritariamente independente, com necessidade de assistência mínima." },
  { label: "Independente", description: "Totalmente independente nas atividades básicas de vida diária." },
];
const ptBrCalculationExplanation =
  "A pontuação do Índice de Barthel é a soma do valor atribuído à opção selecionada em cada um dos 10 itens. Cada item tem um peso de acordo com sua importância clínica e o nível de assistência que normalmente exige, então o total varia de 0 (totalmente dependente) a 100 (totalmente independente).";

const esItems = [
  { label: "Alimentación", instructions: "Capacidad de comer una vez servida la comida en una bandeja o mesa.", options: [
    { label: "Incapaz", description: "Incapaz de alimentarse solo." },
    { label: "Necesita ayuda", description: "Necesita ayuda para cortar alimentos, untar mantequilla, etc., pero puede comer solo." },
    { label: "Independiente", description: "Capaz de alimentarse de forma independiente." },
  ]},
  { label: "Baño", instructions: "Capacidad de lavarse todo el cuerpo.", options: [
    { label: "Dependiente", description: "Necesita ayuda para bañarse." },
    { label: "Independiente", description: "Se baña solo (ducha, bañera o baño de esponja)." },
  ]},
  { label: "Aseo personal", instructions: "Higiene personal: cara, cabello, dientes, afeitado.", options: [
    { label: "Necesita ayuda", description: "Necesita ayuda con el aseo personal." },
    { label: "Independiente", description: "Independiente para cara, cabello, dientes y afeitado (con los utensilios disponibles)." },
  ]},
  { label: "Vestirse", instructions: "Capacidad de ponerse y quitarse la ropa.", options: [
    { label: "Dependiente", description: "Incapaz de vestirse solo." },
    { label: "Necesita ayuda", description: "Necesita ayuda, pero puede hacer aproximadamente la mitad sin apoyo." },
    { label: "Independiente", description: "Independiente, incluyendo botones, cremalleras y cordones." },
  ]},
  { label: "Deposiciones", instructions: "Control intestinal durante la última semana.", options: [
    { label: "Incontinente", description: "Incontinente, o necesita enemas." },
    { label: "Accidente ocasional", description: "Accidente ocasional, una vez por semana o menos." },
    { label: "Continente", description: "Totalmente continente." },
  ]},
  { label: "Vejiga", instructions: "Control vesical durante la última semana.", options: [
    { label: "Incontinente", description: "Incontinente, o sondado e incapaz de manejar la sonda." },
    { label: "Accidente ocasional", description: "Accidente ocasional, hasta una vez al día." },
    { label: "Continente", description: "Totalmente continente, o maneja la sonda de forma independiente." },
  ]},
  { label: "Uso del retrete", instructions: "Capacidad de usar el inodoro o la cuña.", options: [
    { label: "Dependiente", description: "Incapaz de usar el retrete sin ayuda importante." },
    { label: "Necesita algo de ayuda", description: "Necesita algo de ayuda con el equilibrio, la ropa o el papel higiénico, pero puede hacer algunas cosas solo." },
    { label: "Independiente", description: "Independiente en el uso del retrete, incluyendo desvestirse, limpiarse y tirar de la cadena." },
  ]},
  { label: "Traslados", instructions: "Desplazamiento entre la cama y la silla.", options: [
    { label: "Incapaz", description: "Incapaz de trasladarse; sin equilibrio sentado." },
    { label: "Ayuda considerable", description: "Ayuda física considerable (una o dos personas) para sentarse y trasladarse." },
    { label: "Ayuda mínima", description: "Ayuda mínima (física o verbal), o supervisión necesaria." },
    { label: "Independiente", description: "Independiente, incluyendo frenar la silla de ruedas y levantar los reposapiés." },
  ]},
  { label: "Movilidad", instructions: "Desplazamiento en superficies llanas, dentro o fuera de casa.", options: [
    { label: "Inmóvil", description: "Inmóvil, o se desplaza menos de 50 metros." },
    { label: "Independiente en silla de ruedas", description: "Independiente en silla de ruedas, incluyendo esquinas, más de 50 metros." },
    { label: "Camina con ayuda", description: "Camina con la ayuda de una persona, física o verbal, más de 50 metros." },
    { label: "Independiente", description: "Camina de forma independiente, pudiendo usar una ayuda como un bastón, más de 50 metros." },
  ]},
  { label: "Escaleras", instructions: "Capacidad de subir y bajar un tramo de escaleras.", options: [
    { label: "Incapaz", description: "Incapaz de subir o bajar escaleras." },
    { label: "Necesita ayuda", description: "Necesita ayuda, física, verbal, o de llevar una ayuda técnica." },
    { label: "Independiente", description: "Independiente, pudiendo usar una ayuda como una barandilla." },
  ]},
];
const esInterpretation = [
  { label: "Dependencia total", description: "Dependencia funcional total para las actividades básicas de la vida diaria." },
  { label: "Dependencia grave", description: "Dependencia grave, que requiere asistencia sustancial en la mayoría de las actividades." },
  { label: "Dependencia moderada", description: "Dependencia moderada, que requiere asistencia en algunas actividades." },
  { label: "Dependencia leve", description: "Dependencia leve; mayoritariamente independiente, con necesidad de asistencia mínima." },
  { label: "Independiente", description: "Totalmente independiente en las actividades básicas de la vida diaria." },
];
const esCalculationExplanation =
  "La puntuación del Índice de Barthel es la suma del valor asignado a la opción seleccionada en cada uno de los 10 ítems. Cada ítem tiene un peso según su importancia clínica y el nivel de asistencia que suele requerir, por lo que el total va de 0 (totalmente dependiente) a 100 (totalmente independiente).";

const translations = [
  {
    locale: "pt-pt",
    name: "Índice de Barthel",
    description: "Mede a capacidade de uma pessoa para realizar 10 atividades básicas de vida diária, produzindo uma pontuação em 100 que reflete o seu nível de independência.",
    definition: translateDefinition(ptPtItems, ptPtInterpretation, ptPtCalculationExplanation),
  },
  {
    locale: "pt-br",
    name: "Índice de Barthel",
    description: "Mede a capacidade de uma pessoa de realizar 10 atividades básicas de vida diária, gerando uma pontuação em 100 que reflete seu nível de independência.",
    definition: translateDefinition(ptBrItems, ptBrInterpretation, ptBrCalculationExplanation),
  },
  {
    locale: "es",
    name: "Índice de Barthel",
    description: "Mide la capacidad de una persona para realizar 10 actividades básicas de la vida diaria, generando una puntuación sobre 100 que refleja su nivel de independencia.",
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

console.log("Barthel Index seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
