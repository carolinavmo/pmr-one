// Lawton-Brody Instrumental Activities of Daily Living Scale — third
// Clinical Tools calculator, same "Independence" category as Barthel
// and Katz. Each domain uses the scale's own standard dichotomized
// scoring: only the single highest-functioning option in a domain is
// worth a point, every other option in that domain scores 0 — unlike
// Barthel/Katz, domains here don't all share the same option count.
// Content status: 'published', same rationale as barthel.mjs.
//
// Usage: node db/seed/clinical-tools/lawton-brody.mjs
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
      id: "telephone",
      label: "Telephone use",
      instructions: "Ability to use the telephone.",
      options: [
        { value: 1, label: "Independent", description: "Uses the telephone on their own initiative, looks up and dials numbers." },
        { value: 1, label: "Dials known numbers", description: "Dials a few well-known numbers." },
        { value: 1, label: "Answers only", description: "Answers the telephone but does not dial." },
        { value: 0, label: "Does not use", description: "Does not use the telephone at all." },
      ],
    },
    {
      id: "shopping",
      label: "Shopping",
      instructions: "Ability to shop for personal needs.",
      options: [
        { value: 1, label: "Independent", description: "Takes care of all shopping needs independently." },
        { value: 0, label: "Small purchases only", description: "Shops independently only for small purchases." },
        { value: 0, label: "Needs company", description: "Needs to be accompanied on any shopping trip." },
        { value: 0, label: "Unable", description: "Completely unable to shop." },
      ],
    },
    {
      id: "food_preparation",
      label: "Food preparation",
      instructions: "Ability to plan, prepare, and serve meals.",
      options: [
        { value: 1, label: "Independent", description: "Plans, prepares, and serves adequate meals independently." },
        { value: 0, label: "Prepares if supplied", description: "Prepares adequate meals if supplied with the ingredients." },
        { value: 0, label: "Reheats only", description: "Heats and serves prepared meals, or prepares meals but does not maintain an adequate diet." },
        { value: 0, label: "Needs meals served", description: "Needs to have meals prepared and served." },
      ],
    },
    {
      id: "housekeeping",
      label: "Housekeeping",
      instructions: "Ability to maintain the home.",
      options: [
        { value: 1, label: "Maintains home", description: "Maintains the home alone, or with occasional assistance for heavy work." },
        { value: 1, label: "Light tasks", description: "Performs light daily tasks such as dishwashing and bed-making." },
        { value: 1, label: "Light tasks, lower standard", description: "Performs light daily tasks but cannot maintain an acceptable level of cleanliness." },
        { value: 1, label: "Needs help with all tasks", description: "Needs help with all home maintenance tasks." },
        { value: 0, label: "Does not participate", description: "Does not participate in any housekeeping tasks." },
      ],
    },
    {
      id: "laundry",
      label: "Laundry",
      instructions: "Ability to do personal laundry.",
      options: [
        { value: 1, label: "Independent", description: "Does personal laundry completely." },
        { value: 1, label: "Small items only", description: "Launders small items such as socks or stockings." },
        { value: 0, label: "Unable", description: "All laundry must be done by others." },
      ],
    },
    {
      id: "transportation",
      label: "Transportation",
      instructions: "Ability to travel and get around outside the home.",
      options: [
        { value: 1, label: "Independent", description: "Travels independently on public transportation or drives their own car." },
        { value: 1, label: "Arranges own taxi", description: "Arranges their own travel via taxi, but does not otherwise use public transportation." },
        { value: 1, label: "Public transport with company", description: "Travels on public transportation when assisted or accompanied by another person." },
        { value: 0, label: "Taxi/car with assistance only", description: "Travel is limited to taxi or automobile with the assistance of another person." },
        { value: 0, label: "Does not travel", description: "Does not travel at all." },
      ],
    },
    {
      id: "medication",
      label: "Responsibility for own medication",
      instructions: "Ability to take medication correctly.",
      options: [
        { value: 1, label: "Independent", description: "Is responsible for taking medication in the correct dosages at the correct times." },
        { value: 0, label: "Needs pre-sorted doses", description: "Can take medication if it is prepared in advance in separate, pre-sorted doses." },
        { value: 0, label: "Unable", description: "Is not capable of dispensing their own medication." },
      ],
    },
    {
      id: "finances",
      label: "Ability to handle finances",
      instructions: "Ability to manage money and financial affairs.",
      options: [
        { value: 1, label: "Independent", description: "Manages financial matters independently, including budgeting, writing checks, and tracking income." },
        { value: 1, label: "Daily purchases only", description: "Manages day-to-day purchases but needs help with banking and major purchases." },
        { value: 0, label: "Unable", description: "Is incapable of handling money." },
      ],
    },
  ],
  scoring: { method: "sum" },
  maxScore: 8,
  interpretation: [
    { min: 0, max: 2, label: "Severe dependency", description: "Severe dependency in instrumental activities needed to live independently in the community.", severity: "critical" },
    { min: 3, max: 5, label: "Moderate dependency", description: "Moderate dependency; assistance needed with several instrumental activities.", severity: "serious" },
    { min: 6, max: 7, label: "Mild dependency", description: "Mild dependency; largely independent with instrumental activities.", severity: "warning" },
    { min: 8, max: 8, label: "Independent", description: "Fully independent across all eight instrumental activities of daily living.", severity: "good" },
  ],
  calculationExplanation:
    "The Lawton-Brody IADL score is the sum of the point value (0 or 1) for each of the eight instrumental activities of daily living. Within each domain, only the single highest level of independent function scores a point, so the total ranges from 0 (fully dependent) to 8 (fully independent).",
  source: {
    citation: "Lawton MP, Brody EM. Assessment of older people: self-maintaining and instrumental activities of daily living. Gerontologist. 1969;9(3):179-186.",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "lawton-brody-iadl", {
  slug: "lawton-brody-iadl",
  category_id: categoryId,
  name: "Lawton-Brody Instrumental Activities of Daily Living Scale",
  abbreviation: "IADL",
  description: "Measures independence across eight instrumental (complex) activities needed to live independently in the community, producing a score out of 8.",
  population: "Community-dwelling older adults",
  estimated_minutes_min: 5,
  estimated_minutes_max: 10,
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
    "Lawton-Brody Instrumental Activities of Daily Living Scale",
    "IADL",
    "Measures independence across eight instrumental (complex) activities needed to live independently in the community, producing a score out of 8.",
    "Community-dwelling older adults",
    5,
    10,
    JSON.stringify(definitionEn),
    "published",
    2,
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
  { label: "Uso do telefone", instructions: "Capacidade de usar o telefone.", options: [
    { label: "Independente", description: "Usa o telefone por iniciativa própria, procura e marca números." },
    { label: "Marca números conhecidos", description: "Marca alguns números bem conhecidos." },
    { label: "Só atende", description: "Atende o telefone mas não marca números." },
    { label: "Não usa", description: "Não usa o telefone de todo." },
  ]},
  { label: "Compras", instructions: "Capacidade de fazer compras para as suas necessidades pessoais.", options: [
    { label: "Independente", description: "Trata de todas as suas compras de forma independente." },
    { label: "Só pequenas compras", description: "Faz apenas pequenas compras de forma independente." },
    { label: "Precisa de acompanhamento", description: "Precisa de ser acompanhado em qualquer ida às compras." },
    { label: "Incapaz", description: "Completamente incapaz de fazer compras." },
  ]},
  { label: "Preparação de refeições", instructions: "Capacidade de planear, preparar e servir refeições.", options: [
    { label: "Independente", description: "Planeia, prepara e serve refeições adequadas de forma independente." },
    { label: "Prepara se lhe derem os ingredientes", description: "Prepara refeições adequadas se lhe fornecerem os ingredientes." },
    { label: "Só aquece", description: "Aquece e serve refeições já preparadas, ou prepara refeições mas não mantém uma dieta adequada." },
    { label: "Precisa que lhe sirvam", description: "Precisa que lhe preparem e sirvam as refeições." },
  ]},
  { label: "Trabalhos domésticos", instructions: "Capacidade de manter a casa.", options: [
    { label: "Mantém a casa", description: "Mantém a casa sozinho, ou com ajuda ocasional para trabalhos pesados." },
    { label: "Tarefas leves", description: "Realiza tarefas diárias leves como lavar a loiça e fazer a cama." },
    { label: "Tarefas leves, padrão inferior", description: "Realiza tarefas diárias leves mas não consegue manter um nível de limpeza aceitável." },
    { label: "Precisa de ajuda em tudo", description: "Precisa de ajuda em todas as tarefas domésticas." },
    { label: "Não participa", description: "Não participa em nenhuma tarefa doméstica." },
  ]},
  { label: "Lavandaria", instructions: "Capacidade de tratar da roupa pessoal.", options: [
    { label: "Independente", description: "Trata de toda a sua roupa pessoal." },
    { label: "Só peças pequenas", description: "Lava apenas peças pequenas, como meias." },
    { label: "Incapaz", description: "Toda a roupa tem de ser lavada por outra pessoa." },
  ]},
  { label: "Transporte", instructions: "Capacidade de se deslocar fora de casa.", options: [
    { label: "Independente", description: "Desloca-se de forma independente em transportes públicos ou conduz o seu próprio carro." },
    { label: "Organiza o próprio táxi", description: "Organiza as suas deslocações de táxi, mas não usa transportes públicos de outra forma." },
    { label: "Transporte público acompanhado", description: "Usa transportes públicos quando acompanhado ou assistido por outra pessoa." },
    { label: "Só táxi/carro com ajuda", description: "As deslocações limitam-se a táxi ou automóvel com a ajuda de outra pessoa." },
    { label: "Não se desloca", description: "Não se desloca de todo." },
  ]},
  { label: "Responsabilidade pela medicação", instructions: "Capacidade de tomar a medicação corretamente.", options: [
    { label: "Independente", description: "É responsável por tomar a medicação nas doses e horários corretos." },
    { label: "Precisa de doses pré-preparadas", description: "Consegue tomar a medicação se esta for preparada antecipadamente em doses separadas." },
    { label: "Incapaz", description: "Não é capaz de gerir a sua própria medicação." },
  ]},
  { label: "Gestão financeira", instructions: "Capacidade de gerir dinheiro e assuntos financeiros.", options: [
    { label: "Independente", description: "Gere os seus assuntos financeiros de forma independente, incluindo orçamento, cheques e acompanhamento de rendimentos." },
    { label: "Só compras do dia a dia", description: "Gere as compras do dia a dia mas precisa de ajuda com operações bancárias e grandes compras." },
    { label: "Incapaz", description: "É incapaz de gerir dinheiro." },
  ]},
];
const ptPtInterpretation = [
  { label: "Dependência grave", description: "Dependência grave nas atividades instrumentais necessárias para viver de forma independente na comunidade." },
  { label: "Dependência moderada", description: "Dependência moderada; é necessária assistência em várias atividades instrumentais." },
  { label: "Dependência ligeira", description: "Dependência ligeira; maioritariamente independente nas atividades instrumentais." },
  { label: "Independente", description: "Totalmente independente nas oito atividades instrumentais de vida diária." },
];
const ptPtCalculationExplanation =
  "A pontuação da Escala de Lawton & Brody é a soma do valor atribuído (0 ou 1) a cada uma das oito atividades instrumentais de vida diária. Em cada domínio, apenas o nível de funcionamento mais independente pontua, pelo que o total varia entre 0 (totalmente dependente) e 8 (totalmente independente).";

const ptBrItems = [
  { label: "Uso do telefone", instructions: "Capacidade de usar o telefone.", options: [
    { label: "Independente", description: "Usa o telefone por iniciativa própria, procura e disca números." },
    { label: "Disca números conhecidos", description: "Disca alguns números bem conhecidos." },
    { label: "Só atende", description: "Atende o telefone mas não disca." },
    { label: "Não usa", description: "Não usa o telefone de forma alguma." },
  ]},
  { label: "Compras", instructions: "Capacidade de fazer compras para suas necessidades pessoais.", options: [
    { label: "Independente", description: "Cuida de todas as suas compras de forma independente." },
    { label: "Só pequenas compras", description: "Faz apenas pequenas compras de forma independente." },
    { label: "Precisa de acompanhamento", description: "Precisa ser acompanhado em qualquer ida às compras." },
    { label: "Incapaz", description: "Completamente incapaz de fazer compras." },
  ]},
  { label: "Preparo de refeições", instructions: "Capacidade de planejar, preparar e servir refeições.", options: [
    { label: "Independente", description: "Planeja, prepara e serve refeições adequadas de forma independente." },
    { label: "Prepara se lhe fornecerem os ingredientes", description: "Prepara refeições adequadas se lhe fornecerem os ingredientes." },
    { label: "Só esquenta", description: "Esquenta e serve refeições já preparadas, ou prepara refeições mas não mantém uma dieta adequada." },
    { label: "Precisa que sirvam", description: "Precisa que preparem e sirvam as refeições para ela." },
  ]},
  { label: "Trabalhos domésticos", instructions: "Capacidade de manter a casa.", options: [
    { label: "Mantém a casa", description: "Mantém a casa sozinho, ou com ajuda ocasional para trabalhos pesados." },
    { label: "Tarefas leves", description: "Realiza tarefas diárias leves como lavar louça e arrumar a cama." },
    { label: "Tarefas leves, padrão inferior", description: "Realiza tarefas diárias leves mas não consegue manter um nível de limpeza aceitável." },
    { label: "Precisa de ajuda em tudo", description: "Precisa de ajuda em todas as tarefas domésticas." },
    { label: "Não participa", description: "Não participa de nenhuma tarefa doméstica." },
  ]},
  { label: "Lavanderia", instructions: "Capacidade de cuidar da roupa pessoal.", options: [
    { label: "Independente", description: "Cuida de toda a sua roupa pessoal." },
    { label: "Só peças pequenas", description: "Lava apenas peças pequenas, como meias." },
    { label: "Incapaz", description: "Toda a roupa precisa ser lavada por outra pessoa." },
  ]},
  { label: "Transporte", instructions: "Capacidade de se locomover fora de casa.", options: [
    { label: "Independente", description: "Se locomove de forma independente em transporte público ou dirige seu próprio carro." },
    { label: "Organiza o próprio táxi", description: "Organiza seus deslocamentos de táxi, mas não usa transporte público de outra forma." },
    { label: "Transporte público acompanhado", description: "Usa transporte público quando acompanhado ou assistido por outra pessoa." },
    { label: "Só táxi/carro com ajuda", description: "Os deslocamentos se limitam a táxi ou automóvel com a ajuda de outra pessoa." },
    { label: "Não se desloca", description: "Não se desloca de forma alguma." },
  ]},
  { label: "Responsabilidade pela medicação", instructions: "Capacidade de tomar a medicação corretamente.", options: [
    { label: "Independente", description: "É responsável por tomar a medicação nas doses e horários corretos." },
    { label: "Precisa de doses pré-preparadas", description: "Consegue tomar a medicação se ela for preparada antecipadamente em doses separadas." },
    { label: "Incapaz", description: "Não é capaz de gerenciar sua própria medicação." },
  ]},
  { label: "Gestão financeira", instructions: "Capacidade de administrar dinheiro e assuntos financeiros.", options: [
    { label: "Independente", description: "Administra seus assuntos financeiros de forma independente, incluindo orçamento, cheques e acompanhamento de renda." },
    { label: "Só compras do dia a dia", description: "Administra as compras do dia a dia mas precisa de ajuda com operações bancárias e grandes compras." },
    { label: "Incapaz", description: "É incapaz de administrar dinheiro." },
  ]},
];
const ptBrInterpretation = [
  { label: "Dependência grave", description: "Dependência grave nas atividades instrumentais necessárias para viver de forma independente na comunidade." },
  { label: "Dependência moderada", description: "Dependência moderada; é necessária assistência em várias atividades instrumentais." },
  { label: "Dependência leve", description: "Dependência leve; majoritariamente independente nas atividades instrumentais." },
  { label: "Independente", description: "Totalmente independente nas oito atividades instrumentais de vida diária." },
];
const ptBrCalculationExplanation =
  "A pontuação da Escala de Lawton & Brody é a soma do valor atribuído (0 ou 1) a cada uma das oito atividades instrumentais de vida diária. Em cada domínio, apenas o nível de funcionamento mais independente pontua, então o total varia de 0 (totalmente dependente) a 8 (totalmente independente).";

const esItems = [
  { label: "Uso del teléfono", instructions: "Capacidad de usar el teléfono.", options: [
    { label: "Independiente", description: "Usa el teléfono por iniciativa propia, busca y marca números." },
    { label: "Marca números conocidos", description: "Marca algunos números bien conocidos." },
    { label: "Solo contesta", description: "Contesta el teléfono pero no marca." },
    { label: "No lo usa", description: "No usa el teléfono en absoluto." },
  ]},
  { label: "Compras", instructions: "Capacidad de hacer compras para sus necesidades personales.", options: [
    { label: "Independiente", description: "Se encarga de todas sus compras de forma independiente." },
    { label: "Solo compras pequeñas", description: "Hace solo pequeñas compras de forma independiente." },
    { label: "Necesita compañía", description: "Necesita ser acompañado en cualquier salida de compras." },
    { label: "Incapaz", description: "Completamente incapaz de hacer compras." },
  ]},
  { label: "Preparación de comidas", instructions: "Capacidad de planificar, preparar y servir comidas.", options: [
    { label: "Independiente", description: "Planifica, prepara y sirve comidas adecuadas de forma independiente." },
    { label: "Prepara si le dan los ingredientes", description: "Prepara comidas adecuadas si le proporcionan los ingredientes." },
    { label: "Solo calienta", description: "Calienta y sirve comidas ya preparadas, o prepara comidas pero no mantiene una dieta adecuada." },
    { label: "Necesita que le sirvan", description: "Necesita que le preparen y sirvan las comidas." },
  ]},
  { label: "Tareas del hogar", instructions: "Capacidad de mantener el hogar.", options: [
    { label: "Mantiene el hogar", description: "Mantiene el hogar solo, o con ayuda ocasional para trabajos pesados." },
    { label: "Tareas ligeras", description: "Realiza tareas diarias ligeras como lavar los platos y hacer la cama." },
    { label: "Tareas ligeras, nivel inferior", description: "Realiza tareas diarias ligeras pero no puede mantener un nivel de limpieza aceptable." },
    { label: "Necesita ayuda en todo", description: "Necesita ayuda en todas las tareas del hogar." },
    { label: "No participa", description: "No participa en ninguna tarea del hogar." },
  ]},
  { label: "Lavado de ropa", instructions: "Capacidad de encargarse de la ropa personal.", options: [
    { label: "Independiente", description: "Se encarga de toda su ropa personal." },
    { label: "Solo prendas pequeñas", description: "Lava solo prendas pequeñas, como calcetines." },
    { label: "Incapaz", description: "Toda la ropa debe ser lavada por otra persona." },
  ]},
  { label: "Transporte", instructions: "Capacidad de desplazarse fuera de casa.", options: [
    { label: "Independiente", description: "Se desplaza de forma independiente en transporte público o conduce su propio coche." },
    { label: "Organiza su propio taxi", description: "Organiza sus desplazamientos en taxi, pero no usa transporte público de otra forma." },
    { label: "Transporte público acompañado", description: "Usa transporte público cuando está acompañado o asistido por otra persona." },
    { label: "Solo taxi/coche con ayuda", description: "Los desplazamientos se limitan a taxi o automóvil con la ayuda de otra persona." },
    { label: "No se desplaza", description: "No se desplaza en absoluto." },
  ]},
  { label: "Responsabilidad sobre la medicación", instructions: "Capacidad de tomar la medicación correctamente.", options: [
    { label: "Independiente", description: "Es responsable de tomar la medicación en las dosis y horarios correctos." },
    { label: "Necesita dosis preparadas", description: "Puede tomar la medicación si se le prepara con antelación en dosis separadas." },
    { label: "Incapaz", description: "No es capaz de gestionar su propia medicación." },
  ]},
  { label: "Gestión financiera", instructions: "Capacidad de gestionar el dinero y los asuntos financieros.", options: [
    { label: "Independiente", description: "Gestiona sus asuntos financieros de forma independiente, incluyendo presupuesto, cheques y seguimiento de ingresos." },
    { label: "Solo compras diarias", description: "Gestiona las compras diarias pero necesita ayuda con operaciones bancarias y grandes compras." },
    { label: "Incapaz", description: "Es incapaz de gestionar el dinero." },
  ]},
];
const esInterpretation = [
  { label: "Dependencia grave", description: "Dependencia grave en las actividades instrumentales necesarias para vivir de forma independiente en la comunidad." },
  { label: "Dependencia moderada", description: "Dependencia moderada; se necesita asistencia en varias actividades instrumentales." },
  { label: "Dependencia leve", description: "Dependencia leve; mayoritariamente independiente en las actividades instrumentales." },
  { label: "Independiente", description: "Totalmente independiente en las ocho actividades instrumentales de la vida diaria." },
];
const esCalculationExplanation =
  "La puntuación de la Escala de Lawton & Brody es la suma del valor asignado (0 o 1) a cada una de las ocho actividades instrumentales de la vida diaria. En cada dominio, solo el nivel de funcionamiento más independiente puntúa, por lo que el total va de 0 (totalmente dependiente) a 8 (totalmente independiente).";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Lawton & Brody",
    description: "Mede a independência em oito atividades instrumentais (complexas) necessárias para viver de forma independente na comunidade, produzindo uma pontuação em 8.",
    definition: translateDefinition(ptPtItems, ptPtInterpretation, ptPtCalculationExplanation),
  },
  {
    locale: "pt-br",
    name: "Escala de Lawton & Brody",
    description: "Mede a independência em oito atividades instrumentais (complexas) necessárias para viver de forma independente na comunidade, gerando uma pontuação em 8.",
    definition: translateDefinition(ptBrItems, ptBrInterpretation, ptBrCalculationExplanation),
  },
  {
    locale: "es",
    name: "Escala de Lawton & Brody",
    description: "Mide la independencia en ocho actividades instrumentales (complejas) necesarias para vivir de forma independiente en la comunidad, generando una puntuación sobre 8.",
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

console.log("Lawton-Brody IADL seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
