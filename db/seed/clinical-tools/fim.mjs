// Functional Independence Measure (FIM) — fifth Clinical Tools
// calculator, same "Independence" category as Barthel/Katz/Lawton-
// Brody. Unlike those scales, all 18 items share the identical 7-level
// assistance rubric (only the task named in item.label/instructions
// differs), so the rubric is defined once (LEVELS_EN, etc.) and reused
// across every item rather than authored per item. Items also carry
// item.section — the official 6 FIM subscales (Self-Care, Sphincter
// Control, Transfers, Locomotion, Communication, Social Cognition),
// the first calculator to actually exercise CalculatorRunner's
// subsection grouping — and item.domain, the coarser Motor/Cognitive
// split each subscale rolls up into (Motor = Self-Care + Sphincter
// Control + Transfers + Locomotion = 13 items; Cognitive = Communication
// + Social Cognition = 5 items), used only for the calculation detail's
// per-domain subtotal line.
//
// No interpretation bands are authored: FIM has no universal severity
// cut-offs (higher is better, but there's no published "0-20 = severe"
// style banding the way Barthel has) — CalculatorRunner already
// degrades gracefully with interpretation omitted (no range bar, no
// "How to interpret" card), which is the honest behavior here rather
// than inventing bands that don't exist.
//
// Usage: node db/seed/clinical-tools/fim.mjs
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

// ---------- Shared 7-level rubric (English source) ----------

const LEVELS_EN = [
  { value: 1, label: "Total assistance", description: "Performs less than 25% of the task, or is unable to perform it even with assistance." },
  { value: 2, label: "Maximal assistance", description: "Performs 25% to 49% of the task; the helper does most of the work." },
  { value: 3, label: "Moderate assistance", description: "Performs 50% to 74% of the task." },
  { value: 4, label: "Minimal assistance", description: "Performs 75% or more of the task, needing only minimal hands-on help." },
  { value: 5, label: "Supervision or setup", description: "Needs supervision, cueing, or setup beforehand, but no hands-on physical assistance." },
  { value: 6, label: "Modified independence", description: "Performs the task independently, but needs an assistive device, extra time, or an added safety consideration." },
  { value: 7, label: "Complete independence", description: "Performs the task safely, in a reasonable time, and without modification or assistive devices." },
];

const ITEMS_EN = [
  { id: "eating", domain: "Motor", section: "Self-Care", label: "Eating", instructions: "Using suitable utensils to bring food to the mouth, chewing, and swallowing, once a meal is placed in front of the person." },
  { id: "grooming", domain: "Motor", section: "Self-Care", label: "Grooming", instructions: "Oral care, hair grooming, hand washing, face washing, and either shaving or applying makeup." },
  { id: "bathing", domain: "Motor", section: "Self-Care", label: "Bathing", instructions: "Washing, rinsing, and drying the body from the neck down, excluding the back." },
  { id: "dressing_upper", domain: "Motor", section: "Self-Care", label: "Dressing — upper body", instructions: "Dressing and undressing above the waist, including donning a prosthesis or orthosis when applicable." },
  { id: "dressing_lower", domain: "Motor", section: "Self-Care", label: "Dressing — lower body", instructions: "Dressing and undressing from the waist down, including donning a prosthesis or orthosis when applicable." },
  { id: "toileting", domain: "Motor", section: "Self-Care", label: "Toileting", instructions: "Maintaining perineal hygiene and adjusting clothing before and after using the toilet or bedpan." },
  { id: "bladder", domain: "Motor", section: "Sphincter Control", label: "Bladder management", instructions: "Complete control of bladder function, including management of any equipment needed." },
  { id: "bowel", domain: "Motor", section: "Sphincter Control", label: "Bowel management", instructions: "Complete control of bowel function, including management of any equipment needed." },
  { id: "transfer_bed", domain: "Motor", section: "Transfers", label: "Transfer: bed, chair, wheelchair", instructions: "Moving to and from a bed, chair, and wheelchair, including coming to a standing position when walking is the mode of locomotion." },
  { id: "transfer_toilet", domain: "Motor", section: "Transfers", label: "Transfer: toilet", instructions: "Getting on and off a toilet." },
  { id: "transfer_tub", domain: "Motor", section: "Transfers", label: "Transfer: tub or shower", instructions: "Getting into and out of a tub or shower." },
  { id: "locomotion", domain: "Motor", section: "Locomotion", label: "Locomotion: walk or wheelchair", instructions: "Walking, once in a standing position, or propelling a wheelchair, on a level surface." },
  { id: "stairs", domain: "Motor", section: "Locomotion", label: "Stairs", instructions: "Going up and down 12 to 14 stairs indoors." },
  { id: "comprehension", domain: "Cognitive", section: "Communication", label: "Comprehension", instructions: "Understanding spoken and/or written communication." },
  { id: "expression", domain: "Cognitive", section: "Communication", label: "Expression", instructions: "Clearly expressing ideas, needs, and wants, verbally or non-verbally." },
  { id: "social_interaction", domain: "Cognitive", section: "Social Cognition", label: "Social interaction", instructions: "Getting along and participating appropriately with others in therapeutic and social situations." },
  { id: "problem_solving", domain: "Cognitive", section: "Social Cognition", label: "Problem solving", instructions: "Making reasonable, safe, and timely decisions to solve problems of daily living." },
  { id: "memory", domain: "Cognitive", section: "Social Cognition", label: "Memory", instructions: "Recognizing people, recalling daily routines, and carrying out requests without needing repeated reminders." },
];

function buildDefinition(items, levels, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({
      id: item.id,
      domain: item.domain,
      section: item.section,
      label: item.label,
      instructions: item.instructions,
      options: levels.map((level) => ({ value: level.value, label: level.label, description: level.description })),
    })),
    scoring: { method: "sum" },
    maxScore: 126,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Keith RA, Granger CV, Hamilton BB, Sherwin FS. The functional independence measure: a new tool for rehabilitation. Adv Clin Rehabil. 1987;1:6-18.",
      url: "https://www.sralab.org/rehabilitation-measures/functional-independence-measure",
    },
    // No interpretation bands — see file header comment. resultNote is
    // the fallback shown in its place (label/description) plus the
    // continuous gradient range bar's endpoint labels.
  };
}

const calculationExplanationEn =
  "The FIM score is the sum of the level (1 to 7) selected for each of the 18 items — 13 motor items and 5 cognitive items. Each level reflects how much assistance is needed, from total assistance (1) to complete independence (7), so the total ranges from 18 (total assistance on every item) to 126 (complete independence on every item).";

const resultNoteEn = {
  label: "A higher score corresponds to greater independence.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "More dependence",
  highLabel: "More independence",
};

const definitionEn = buildDefinition(ITEMS_EN, LEVELS_EN, calculationExplanationEn, resultNoteEn);

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "fim", {
  slug: "fim",
  category_id: categoryId,
  name: "Functional Independence Measure",
  abbreviation: "FIM",
  description: "Measures independence across 18 motor and cognitive activities of daily living, producing a score out of 126 that reflects the level of assistance required.",
  population: "Adults undergoing inpatient rehabilitation",
  estimated_minutes_min: 15,
  estimated_minutes_max: 20,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 3,
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
    "Functional Independence Measure",
    "FIM",
    "Measures independence across 18 motor and cognitive activities of daily living, producing a score out of 126 that reflects the level of assistance required.",
    "Adults undergoing inpatient rehabilitation",
    15,
    20,
    JSON.stringify(definitionEn),
    "published",
    3,
  ]
);

// ---------- Translations ----------
// Only the shared rubric (7 levels) and 18 item labels/instructions
// need translating — no per-item, per-option authoring, since every
// item reuses the same rubric. section stays untranslated at the data
// level ("Motor"/"Cognitive") but is overridden per translation below
// like every other field.

function translateDefinition(items, levels, calculationExplanation, resultNote) {
  return buildDefinition(items, levels, calculationExplanation, resultNote);
}

const LEVELS_PT_PT = [
  { value: 1, label: "Assistência total", description: "Realiza menos de 25% da tarefa, ou é incapaz de a realizar mesmo com ajuda." },
  { value: 2, label: "Assistência máxima", description: "Realiza entre 25% e 49% da tarefa; a maior parte do esforço é feita pelo ajudante." },
  { value: 3, label: "Assistência moderada", description: "Realiza entre 50% e 74% da tarefa." },
  { value: 4, label: "Assistência mínima", description: "Realiza 75% ou mais da tarefa, precisando apenas de ajuda física mínima." },
  { value: 5, label: "Supervisão ou preparação", description: "Precisa de supervisão, indicações verbais ou preparação prévia, mas não de contacto físico." },
  { value: 6, label: "Independência modificada", description: "Realiza a tarefa de forma independente, mas precisa de um dispositivo auxiliar, de mais tempo, ou de um cuidado de segurança adicional." },
  { value: 7, label: "Independência completa", description: "Realiza a tarefa em segurança, em tempo razoável, e sem modificações ou dispositivos auxiliares." },
];
const ITEMS_PT_PT = [
  { domain: "Motor", section: "Autocuidados", label: "Alimentação", instructions: "Utilizar utensílios adequados para levar a comida à boca, mastigar e engolir, quando a refeição já está servida." },
  { domain: "Motor", section: "Autocuidados", label: "Higiene pessoal", instructions: "Higiene oral, arranjo do cabelo, lavagem das mãos, lavagem da face, e barbear-se ou maquilhar-se." },
  { domain: "Motor", section: "Autocuidados", label: "Banho", instructions: "Lavar, enxaguar e secar o corpo do pescoço para baixo, excluindo as costas." },
  { domain: "Motor", section: "Autocuidados", label: "Vestir — metade superior", instructions: "Vestir e despir roupa acima da cintura, incluindo colocar uma prótese ou ortótese quando aplicável." },
  { domain: "Motor", section: "Autocuidados", label: "Vestir — metade inferior", instructions: "Vestir e despir roupa da cintura para baixo, incluindo colocar uma prótese ou ortótese quando aplicável." },
  { domain: "Motor", section: "Autocuidados", label: "Utilização da sanita", instructions: "Manter a higiene perineal e ajustar a roupa antes e depois de usar a sanita ou a arrastadeira." },
  { domain: "Motor", section: "Controlo de Esfíncteres", label: "Controlo vesical", instructions: "Controlo completo da função vesical, incluindo a gestão de qualquer equipamento necessário." },
  { domain: "Motor", section: "Controlo de Esfíncteres", label: "Controlo intestinal", instructions: "Controlo completo da função intestinal, incluindo a gestão de qualquer equipamento necessário." },
  { domain: "Motor", section: "Transferências", label: "Transferência: cama, cadeira e cadeira de rodas", instructions: "Mover-se de e para a cama, a cadeira e a cadeira de rodas, incluindo pôr-se de pé quando a marcha é o modo de locomoção." },
  { domain: "Motor", section: "Transferências", label: "Transferência: sanita", instructions: "Sentar-se e levantar-se da sanita." },
  { domain: "Motor", section: "Transferências", label: "Transferência: banheira ou duche", instructions: "Entrar e sair da banheira ou do duche." },
  { domain: "Motor", section: "Locomoção", label: "Locomoção: marcha ou cadeira de rodas", instructions: "Caminhar, uma vez de pé, ou deslocar-se em cadeira de rodas, numa superfície plana." },
  { domain: "Motor", section: "Locomoção", label: "Escadas", instructions: "Subir e descer entre 12 e 14 degraus no interior." },
  { domain: "Cognitivo", section: "Comunicação", label: "Compreensão", instructions: "Compreender comunicação falada e/ou escrita." },
  { domain: "Cognitivo", section: "Comunicação", label: "Expressão", instructions: "Exprimir claramente ideias, necessidades e vontades, de forma verbal ou não verbal." },
  { domain: "Cognitivo", section: "Consciência do Mundo Exterior", label: "Interação social", instructions: "Relacionar-se e participar de forma adequada com outras pessoas em situações terapêuticas e sociais." },
  { domain: "Cognitivo", section: "Consciência do Mundo Exterior", label: "Resolução de problemas", instructions: "Tomar decisões razoáveis, seguras e oportunas para resolver problemas da vida diária." },
  { domain: "Cognitivo", section: "Consciência do Mundo Exterior", label: "Memória", instructions: "Reconhecer pessoas, recordar rotinas diárias, e cumprir pedidos sem precisar de lembretes repetidos." },
];
const calculationExplanationPtPt =
  "A pontuação da MIF é a soma do nível (1 a 7) selecionado para cada um dos 18 itens — 13 itens motores e 5 itens cognitivos. Cada nível reflete a quantidade de assistência necessária, desde assistência total (1) até independência completa (7), pelo que o total varia entre 18 (assistência total em todos os itens) e 126 (independência completa em todos os itens).";
const resultNotePtPt = {
  label: "Maior pontuação corresponde a maior independência.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Maior dependência",
  highLabel: "Maior independência",
};

const LEVELS_PT_BR = [
  { value: 1, label: "Assistência total", description: "Realiza menos de 25% da tarefa, ou é incapaz de realizá-la mesmo com ajuda." },
  { value: 2, label: "Assistência máxima", description: "Realiza entre 25% e 49% da tarefa; a maior parte do esforço é feita pelo cuidador." },
  { value: 3, label: "Assistência moderada", description: "Realiza entre 50% e 74% da tarefa." },
  { value: 4, label: "Assistência mínima", description: "Realiza 75% ou mais da tarefa, precisando apenas de ajuda física mínima." },
  { value: 5, label: "Supervisão ou preparação", description: "Precisa de supervisão, indicações verbais ou preparação prévia, mas não de contato físico." },
  { value: 6, label: "Independência modificada", description: "Realiza a tarefa de forma independente, mas precisa de um dispositivo auxiliar, de mais tempo, ou de um cuidado de segurança adicional." },
  { value: 7, label: "Independência completa", description: "Realiza a tarefa com segurança, em tempo razoável, e sem modificações ou dispositivos auxiliares." },
];
const ITEMS_PT_BR = [
  { domain: "Motor", section: "Autocuidados", label: "Alimentação", instructions: "Utilizar utensílios adequados para levar a comida à boca, mastigar e engolir, quando a refeição já está servida." },
  { domain: "Motor", section: "Autocuidados", label: "Higiene pessoal", instructions: "Higiene oral, arrumar o cabelo, lavar as mãos, lavar o rosto, e fazer a barba ou se maquiar." },
  { domain: "Motor", section: "Autocuidados", label: "Banho", instructions: "Lavar, enxaguar e secar o corpo do pescoço para baixo, excluindo as costas." },
  { domain: "Motor", section: "Autocuidados", label: "Vestir-se — parte superior", instructions: "Vestir e tirar roupas acima da cintura, incluindo colocar uma prótese ou órtese quando aplicável." },
  { domain: "Motor", section: "Autocuidados", label: "Vestir-se — parte inferior", instructions: "Vestir e tirar roupas da cintura para baixo, incluindo colocar uma prótese ou órtese quando aplicável." },
  { domain: "Motor", section: "Autocuidados", label: "Uso do banheiro", instructions: "Manter a higiene perineal e ajustar a roupa antes e depois de usar o vaso sanitário ou a comadre." },
  { domain: "Motor", section: "Controle de Esfíncteres", label: "Controle vesical", instructions: "Controle completo da função vesical, incluindo o manejo de qualquer equipamento necessário." },
  { domain: "Motor", section: "Controle de Esfíncteres", label: "Controle intestinal", instructions: "Controle completo da função intestinal, incluindo o manejo de qualquer equipamento necessário." },
  { domain: "Motor", section: "Transferências", label: "Transferência: cama, cadeira e cadeira de rodas", instructions: "Mover-se de e para a cama, a cadeira e a cadeira de rodas, incluindo ficar em pé quando a marcha é o modo de locomoção." },
  { domain: "Motor", section: "Transferências", label: "Transferência: vaso sanitário", instructions: "Sentar-se e levantar-se do vaso sanitário." },
  { domain: "Motor", section: "Transferências", label: "Transferência: banheira ou chuveiro", instructions: "Entrar e sair da banheira ou do chuveiro." },
  { domain: "Motor", section: "Locomoção", label: "Locomoção: marcha ou cadeira de rodas", instructions: "Caminhar, uma vez em pé, ou se deslocar em cadeira de rodas, em uma superfície plana." },
  { domain: "Motor", section: "Locomoção", label: "Escadas", instructions: "Subir e descer entre 12 e 14 degraus em ambiente interno." },
  { domain: "Cognitivo", section: "Comunicação", label: "Compreensão", instructions: "Compreender comunicação falada e/ou escrita." },
  { domain: "Cognitivo", section: "Comunicação", label: "Expressão", instructions: "Expressar claramente ideias, necessidades e vontades, de forma verbal ou não verbal." },
  { domain: "Cognitivo", section: "Consciência do Mundo Exterior", label: "Interação social", instructions: "Relacionar-se e participar de forma adequada com outras pessoas em situações terapêuticas e sociais." },
  { domain: "Cognitivo", section: "Consciência do Mundo Exterior", label: "Resolução de problemas", instructions: "Tomar decisões razoáveis, seguras e oportunas para resolver problemas da vida diária." },
  { domain: "Cognitivo", section: "Consciência do Mundo Exterior", label: "Memória", instructions: "Reconhecer pessoas, lembrar rotinas diárias, e cumprir pedidos sem precisar de lembretes repetidos." },
];
const calculationExplanationPtBr =
  "A pontuação da FIM é a soma do nível (1 a 7) selecionado para cada um dos 18 itens — 13 itens motores e 5 itens cognitivos. Cada nível reflete a quantidade de assistência necessária, desde assistência total (1) até independência completa (7), então o total varia de 18 (assistência total em todos os itens) a 126 (independência completa em todos os itens).";
const resultNotePtBr = {
  label: "Maior pontuação corresponde a maior independência.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Maior dependência",
  highLabel: "Maior independência",
};

const LEVELS_ES = [
  { value: 1, label: "Asistencia total", description: "Realiza menos del 25% de la tarea, o es incapaz de realizarla incluso con ayuda." },
  { value: 2, label: "Asistencia máxima", description: "Realiza entre el 25% y el 49% de la tarea; la mayor parte del esfuerzo lo hace el cuidador." },
  { value: 3, label: "Asistencia moderada", description: "Realiza entre el 50% y el 74% de la tarea." },
  { value: 4, label: "Asistencia mínima", description: "Realiza el 75% o más de la tarea, necesitando solo ayuda física mínima." },
  { value: 5, label: "Supervisión o preparación", description: "Necesita supervisión, indicaciones verbales o preparación previa, pero no contacto físico." },
  { value: 6, label: "Independencia modificada", description: "Realiza la tarea de forma independiente, pero necesita un dispositivo de ayuda, más tiempo, o una consideración de seguridad adicional." },
  { value: 7, label: "Independencia completa", description: "Realiza la tarea con seguridad, en un tiempo razonable, y sin modificaciones ni dispositivos de ayuda." },
];
const ITEMS_ES = [
  { domain: "Motor", section: "Autocuidado", label: "Alimentación", instructions: "Usar utensilios adecuados para llevar la comida a la boca, masticar y tragar, una vez servida la comida." },
  { domain: "Motor", section: "Autocuidado", label: "Aseo personal", instructions: "Higiene oral, arreglo del cabello, lavado de manos, lavado de la cara, y afeitarse o maquillarse." },
  { domain: "Motor", section: "Autocuidado", label: "Baño", instructions: "Lavar, enjuagar y secar el cuerpo desde el cuello hacia abajo, excluyendo la espalda." },
  { domain: "Motor", section: "Autocuidado", label: "Vestirse — mitad superior", instructions: "Vestirse y desvestirse por encima de la cintura, incluyendo colocarse una prótesis u ortesis cuando corresponda." },
  { domain: "Motor", section: "Autocuidado", label: "Vestirse — mitad inferior", instructions: "Vestirse y desvestirse desde la cintura hacia abajo, incluyendo colocarse una prótesis u ortesis cuando corresponda." },
  { domain: "Motor", section: "Autocuidado", label: "Uso del retrete", instructions: "Mantener la higiene perineal y ajustar la ropa antes y después de usar el retrete o la cuña." },
  { domain: "Motor", section: "Control de Esfínteres", label: "Control vesical", instructions: "Control completo de la función vesical, incluyendo el manejo de cualquier equipo necesario." },
  { domain: "Motor", section: "Control de Esfínteres", label: "Control intestinal", instructions: "Control completo de la función intestinal, incluyendo el manejo de cualquier equipo necesario." },
  { domain: "Motor", section: "Transferencias", label: "Traslado: cama, silla y silla de ruedas", instructions: "Moverse hacia y desde la cama, la silla y la silla de ruedas, incluyendo ponerse de pie cuando la marcha es el modo de desplazamiento." },
  { domain: "Motor", section: "Transferencias", label: "Traslado: retrete", instructions: "Sentarse y levantarse del retrete." },
  { domain: "Motor", section: "Transferencias", label: "Traslado: bañera o ducha", instructions: "Entrar y salir de la bañera o la ducha." },
  { domain: "Motor", section: "Locomoción", label: "Desplazamiento: marcha o silla de ruedas", instructions: "Caminar, una vez de pie, o desplazarse en silla de ruedas, sobre una superficie plana." },
  { domain: "Motor", section: "Locomoción", label: "Escaleras", instructions: "Subir y bajar entre 12 y 14 escalones en interiores." },
  { domain: "Cognitivo", section: "Comunicación", label: "Comprensión", instructions: "Comprender comunicación hablada y/o escrita." },
  { domain: "Cognitivo", section: "Comunicación", label: "Expresión", instructions: "Expresar claramente ideas, necesidades y deseos, de forma verbal o no verbal." },
  { domain: "Cognitivo", section: "Cognición Social", label: "Interacción social", instructions: "Relacionarse y participar de forma adecuada con otras personas en situaciones terapéuticas y sociales." },
  { domain: "Cognitivo", section: "Cognición Social", label: "Resolución de problemas", instructions: "Tomar decisiones razonables, seguras y oportunas para resolver problemas de la vida diaria." },
  { domain: "Cognitivo", section: "Cognición Social", label: "Memoria", instructions: "Reconocer personas, recordar rutinas diarias, y cumplir peticiones sin necesitar recordatorios repetidos." },
];
const calculationExplanationEs =
  "La puntuación de la FIM es la suma del nivel (1 a 7) seleccionado para cada uno de los 18 ítems — 13 ítems motores y 5 ítems cognitivos. Cada nivel refleja la cantidad de asistencia necesaria, desde asistencia total (1) hasta independencia completa (7), por lo que el total va de 18 (asistencia total en todos los ítems) a 126 (independencia completa en todos los ítems).";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a mayor independencia.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Mayor dependencia",
  highLabel: "Mayor independencia",
};

const translations = [
  {
    locale: "pt-pt",
    name: "Medida de Independência Funcional",
    description: "Mede a independência em 18 atividades motoras e cognitivas de vida diária, produzindo uma pontuação em 126 que reflete o nível de assistência necessário.",
    definition: translateDefinition(
      ITEMS_EN.map((item, i) => ({ ...ITEMS_PT_PT[i], id: item.id })),
      LEVELS_PT_PT,
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Medida de Independência Funcional",
    description: "Mede a independência em 18 atividades motoras e cognitivas de vida diária, gerando uma pontuação em 126 que reflete o nível de assistência necessário.",
    definition: translateDefinition(
      ITEMS_EN.map((item, i) => ({ ...ITEMS_PT_BR[i], id: item.id })),
      LEVELS_PT_BR,
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "Medida de Independencia Funcional",
    description: "Mide la independencia en 18 actividades motoras y cognitivas de la vida diaria, generando una puntuación sobre 126 que refleja el nivel de asistencia necesario.",
    definition: translateDefinition(
      ITEMS_EN.map((item, i) => ({ ...ITEMS_ES[i], id: item.id })),
      LEVELS_ES,
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

console.log("FIM seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
