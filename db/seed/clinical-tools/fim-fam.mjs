// FIM+FAM (Functional Independence Measure + Functional Assessment
// Measure) — 30-item extension of FIM (fim.mjs) for brain injury
// rehabilitation, adding 12 FAM items that cover communication,
// psychosocial adjustment, and cognition in more depth than FIM's
// Social Cognition subscale alone. Same "Independence" category.
//
// The 18 original FIM items (ids, labels, instructions, the shared
// 7-level rubric) are reused verbatim from fim.mjs rather than
// re-authored — FIM+FAM does not change FIM's own items, it only adds
// items and reorganizes FIM's 2 cognitive subscales (Communication,
// Social Cognition) into 3 (Communication, Psychosocial Adjustment,
// Cognitive Function) to make room for the new ones. All 30 items —
// FIM's original 18 and FAM's new 12 alike — share the identical
// 7-level assistance rubric, so, as with FIM, the rubric is defined
// once and reused rather than authored per item.
//
// Like FIM, this is a UDSMR-adjacent proprietary instrument (FAM was
// developed by the Center for Outcome Measurement in Brain Injury as
// a supplement to the UDSMR-owned FIM) — proprietary: true, and no
// interpretation bands (no published universal severity cut-offs;
// resultNote + gradient bar is the honest fallback, same as FIM).
//
// Usage: node db/seed/clinical-tools/fim-fam.mjs
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

// ---------- Shared 7-level rubric (English source) — identical to FIM's ----------

const LEVELS_EN = [
  { value: 1, label: "Total assistance", description: "Performs less than 25% of the task, or is unable to perform it even with assistance." },
  { value: 2, label: "Maximal assistance", description: "Performs 25% to 49% of the task; the helper does most of the work." },
  { value: 3, label: "Moderate assistance", description: "Performs 50% to 74% of the task." },
  { value: 4, label: "Minimal assistance", description: "Performs 75% or more of the task, needing only minimal hands-on help." },
  { value: 5, label: "Supervision or setup", description: "Needs supervision, cueing, or setup beforehand, but no hands-on physical assistance." },
  { value: 6, label: "Modified independence", description: "Performs the task independently, but needs an assistive device, extra time, or an added safety consideration." },
  { value: 7, label: "Complete independence", description: "Performs the task safely, in a reasonable time, and without modification or assistive devices." },
];

// 16 Motor items (13 from FIM + 3 new FAM items: swallowing, car
// transfer, community access) followed by 14 Cognitive items (5 from
// FIM + 9 new FAM items: reading, writing, speech intelligibility,
// emotional status, adjustment to limitations, employability,
// orientation, attention, safety judgment).
const ITEMS_EN = [
  { id: "eating", domain: "Motor", section: "Self-Care", label: "Eating", instructions: "Using suitable utensils to bring food to the mouth, chewing, and swallowing, once a meal is placed in front of the person." },
  { id: "grooming", domain: "Motor", section: "Self-Care", label: "Grooming", instructions: "Oral care, hair grooming, hand washing, face washing, and either shaving or applying makeup." },
  { id: "bathing", domain: "Motor", section: "Self-Care", label: "Bathing", instructions: "Washing, rinsing, and drying the body from the neck down, excluding the back." },
  { id: "dressing_upper", domain: "Motor", section: "Self-Care", label: "Dressing — upper body", instructions: "Dressing and undressing above the waist, including donning a prosthesis or orthosis when applicable." },
  { id: "dressing_lower", domain: "Motor", section: "Self-Care", label: "Dressing — lower body", instructions: "Dressing and undressing from the waist down, including donning a prosthesis or orthosis when applicable." },
  { id: "toileting", domain: "Motor", section: "Self-Care", label: "Toileting", instructions: "Maintaining perineal hygiene and adjusting clothing before and after using the toilet or bedpan." },
  { id: "swallowing", domain: "Motor", section: "Self-Care", label: "Swallowing", instructions: "Managing the safe intake of food and liquid of varying consistencies, without aspiration, coughing, or choking." },
  { id: "bladder", domain: "Motor", section: "Sphincter Control", label: "Bladder management", instructions: "Complete control of bladder function, including management of any equipment needed." },
  { id: "bowel", domain: "Motor", section: "Sphincter Control", label: "Bowel management", instructions: "Complete control of bowel function, including management of any equipment needed." },
  { id: "transfer_bed", domain: "Motor", section: "Transfers", label: "Transfer: bed, chair, wheelchair", instructions: "Moving to and from a bed, chair, and wheelchair, including coming to a standing position when walking is the mode of locomotion." },
  { id: "transfer_toilet", domain: "Motor", section: "Transfers", label: "Transfer: toilet", instructions: "Getting on and off a toilet." },
  { id: "transfer_tub", domain: "Motor", section: "Transfers", label: "Transfer: tub or shower", instructions: "Getting into and out of a tub or shower." },
  { id: "transfer_car", domain: "Motor", section: "Transfers", label: "Transfer: car", instructions: "Getting into and out of a car or van, including any transfer to and from a wheelchair." },
  { id: "locomotion", domain: "Motor", section: "Locomotion", label: "Locomotion: walk or wheelchair", instructions: "Walking, once in a standing position, or propelling a wheelchair, on a level surface." },
  { id: "stairs", domain: "Motor", section: "Locomotion", label: "Stairs", instructions: "Going up and down 12 to 14 stairs indoors." },
  { id: "community_access", domain: "Motor", section: "Locomotion", label: "Community access", instructions: "Getting safely to and around places outside the home — for example a shop, workplace, or clinic — using whatever means of transportation and mobility are available." },
  { id: "comprehension", domain: "Cognitive", section: "Communication", label: "Comprehension", instructions: "Understanding spoken and/or written communication." },
  { id: "expression", domain: "Cognitive", section: "Communication", label: "Expression", instructions: "Clearly expressing ideas, needs, and wants, verbally or non-verbally." },
  { id: "reading", domain: "Cognitive", section: "Communication", label: "Reading", instructions: "Understanding written material well enough to follow instructions, keep a schedule, or otherwise function day to day." },
  { id: "writing", domain: "Cognitive", section: "Communication", label: "Writing", instructions: "Producing legible, organized written communication — for example a note or a form — sufficient for daily needs." },
  { id: "speech_intelligibility", domain: "Cognitive", section: "Communication", label: "Speech intelligibility", instructions: "How clearly and understandably the person speaks, independent of the content of what is being said." },
  { id: "social_interaction", domain: "Cognitive", section: "Psychosocial Adjustment", label: "Social interaction", instructions: "Getting along and participating appropriately with others in therapeutic and social situations." },
  { id: "emotional_status", domain: "Cognitive", section: "Psychosocial Adjustment", label: "Emotional status", instructions: "Managing mood and emotional responses appropriately across situations, without distress, lability, or blunting that interferes with function." },
  { id: "adjustment_to_limitations", domain: "Cognitive", section: "Psychosocial Adjustment", label: "Adjustment to limitations", instructions: "Recognizing and coming to terms with the impact of the current impairment or disability on daily life and future plans." },
  { id: "employability", domain: "Cognitive", section: "Psychosocial Adjustment", label: "Employability", instructions: "Capacity to meet the physical, cognitive, and behavioral demands of employment or an equivalent productive role, such as school or homemaking, given the current level of function." },
  { id: "problem_solving", domain: "Cognitive", section: "Cognitive Function", label: "Problem solving", instructions: "Making reasonable, safe, and timely decisions to solve problems of daily living." },
  { id: "memory", domain: "Cognitive", section: "Cognitive Function", label: "Memory", instructions: "Recognizing people, recalling daily routines, and carrying out requests without needing repeated reminders." },
  { id: "orientation", domain: "Cognitive", section: "Cognitive Function", label: "Orientation", instructions: "Knowing who, where, and when — person, place, and time — and using that awareness appropriately throughout the day." },
  { id: "attention", domain: "Cognitive", section: "Cognitive Function", label: "Attention", instructions: "Sustaining and appropriately shifting focus on a task or conversation, without being unduly distracted, for as long as the situation requires." },
  { id: "safety_judgment", domain: "Cognitive", section: "Cognitive Function", label: "Safety judgment", instructions: "Recognizing hazards and making safe decisions in daily activities, including calling for help appropriately when needed." },
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
    maxScore: 210,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Hall KM, Hamilton BB, Gordon WA, Zasler ND. Characteristics and comparisons of functional assessment indices: Disability Rating Scale, Functional Independence Measure, and Functional Assessment Measure. J Head Trauma Rehabil. 1993;8(2):60-74.",
      url: "https://www.sralab.org/rehabilitation-measures/functional-assessment-measure",
    },
    // FIM+FAM incorporates FIM (UDSMR-owned) plus the FAM extension —
    // same non-official notice as FIM, regardless of locale.
    proprietary: true,
    // No interpretation bands — same rationale as FIM: no published
    // universal severity cut-offs. resultNote is the fallback.
  };
}

const calculationExplanationEn =
  "The FIM+FAM score is the sum of the level (1 to 7) selected for each of the 30 items — 16 motor items and 14 cognitive items. Each level reflects how much assistance is needed, from total assistance (1) to complete independence (7), so the total ranges from 30 (total assistance on every item) to 210 (complete independence on every item). The 18 FIM items retain their original scoring; the 12 FAM items added for brain injury rehabilitation — covering swallowing, community mobility, communication, psychosocial adjustment, and cognition — use the identical 7-level rubric.";

const resultNoteEn = {
  label: "A higher score corresponds to greater independence.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "More dependence",
  highLabel: "More independence",
};

const definitionEn = buildDefinition(ITEMS_EN, LEVELS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "FIM+FAM",
  abbreviation: "FIM+FAM",
  description: "Extends the FIM with 12 additional items covering communication, psychosocial adjustment, and cognition, producing a score out of 210 for use in brain injury rehabilitation.",
  population: "Adults undergoing inpatient rehabilitation after traumatic or acquired brain injury",
  estimated_minutes_min: 20,
  estimated_minutes_max: 30,
  definition: JSON.stringify(definition),
  status: "published",
  position: 6,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "fim-fam", {
  slug: "fim-fam",
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
    "FIM+FAM",
    "FIM+FAM",
    "Extends the FIM with 12 additional items covering communication, psychosocial adjustment, and cognition, producing a score out of 210 for use in brain injury rehabilitation.",
    "Adults undergoing inpatient rehabilitation after traumatic or acquired brain injury",
    20,
    30,
    JSON.stringify(definitionEn),
    "published",
    6,
  ]
);

// ---------- Translations ----------
// The rubric and 18 original-FIM item labels/instructions are reused
// verbatim from fim.mjs's own translations (same source text, same
// UK/Portuguese vs Brazilian-Portuguese terminology choices already
// established there); only the 12 new FAM items' text and the 3
// reorganized cognitive section names are newly authored here.

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
  { domain: "Motor", section: "Autocuidados", label: "Deglutição", instructions: "Gerir a ingestão segura de alimentos e líquidos de diferentes consistências, sem aspiração, tosse ou engasgamento." },
  { domain: "Motor", section: "Controlo de Esfíncteres", label: "Controlo vesical", instructions: "Controlo completo da função vesical, incluindo a gestão de qualquer equipamento necessário." },
  { domain: "Motor", section: "Controlo de Esfíncteres", label: "Controlo intestinal", instructions: "Controlo completo da função intestinal, incluindo a gestão de qualquer equipamento necessário." },
  { domain: "Motor", section: "Transferências", label: "Transferência: cama, cadeira e cadeira de rodas", instructions: "Mover-se de e para a cama, a cadeira e a cadeira de rodas, incluindo pôr-se de pé quando a marcha é o modo de locomoção." },
  { domain: "Motor", section: "Transferências", label: "Transferência: sanita", instructions: "Sentar-se e levantar-se da sanita." },
  { domain: "Motor", section: "Transferências", label: "Transferência: banheira ou duche", instructions: "Entrar e sair da banheira ou do duche." },
  { domain: "Motor", section: "Transferências", label: "Transferência: automóvel", instructions: "Entrar e sair de um automóvel ou carrinha, incluindo qualquer transferência de e para uma cadeira de rodas." },
  { domain: "Motor", section: "Locomoção", label: "Locomoção: marcha ou cadeira de rodas", instructions: "Caminhar, uma vez de pé, ou deslocar-se em cadeira de rodas, numa superfície plana." },
  { domain: "Motor", section: "Locomoção", label: "Escadas", instructions: "Subir e descer entre 12 e 14 degraus no interior." },
  { domain: "Motor", section: "Locomoção", label: "Acesso à comunidade", instructions: "Deslocar-se com segurança a locais fora de casa — por exemplo, uma loja, o local de trabalho ou uma clínica — usando os meios de transporte e mobilidade disponíveis." },
  { domain: "Cognitivo", section: "Comunicação", label: "Compreensão", instructions: "Compreender comunicação falada e/ou escrita." },
  { domain: "Cognitivo", section: "Comunicação", label: "Expressão", instructions: "Exprimir claramente ideias, necessidades e vontades, de forma verbal ou não verbal." },
  { domain: "Cognitivo", section: "Comunicação", label: "Leitura", instructions: "Compreender material escrito o suficiente para seguir instruções, cumprir um horário, ou funcionar no dia a dia." },
  { domain: "Cognitivo", section: "Comunicação", label: "Escrita", instructions: "Produzir comunicação escrita legível e organizada — por exemplo, uma nota ou um formulário — suficiente para as necessidades diárias." },
  { domain: "Cognitivo", section: "Comunicação", label: "Inteligibilidade da fala", instructions: "O grau de clareza e compreensibilidade da fala da pessoa, independentemente do conteúdo do que é dito." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Interação social", instructions: "Relacionar-se e participar de forma adequada com outras pessoas em situações terapêuticas e sociais." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Estado emocional", instructions: "Gerir o humor e as respostas emocionais de forma adequada em diferentes situações, sem sofrimento, labilidade ou embotamento que interfiram no funcionamento." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Adaptação às limitações", instructions: "Reconhecer e aceitar o impacto da incapacidade ou limitação atual na vida diária e nos planos futuros." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Empregabilidade", instructions: "Capacidade de responder às exigências físicas, cognitivas e comportamentais de um emprego ou de um papel produtivo equivalente, como estudar ou gerir a casa, dado o nível atual de funcionamento." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Resolução de problemas", instructions: "Tomar decisões razoáveis, seguras e oportunas para resolver problemas da vida diária." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Memória", instructions: "Reconhecer pessoas, recordar rotinas diárias, e cumprir pedidos sem precisar de lembretes repetidos." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Orientação", instructions: "Saber quem, onde e quando — pessoa, lugar e tempo — e usar essa noção de forma adequada ao longo do dia." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Atenção", instructions: "Manter e direcionar adequadamente o foco numa tarefa ou conversa, sem se distrair indevidamente, durante o tempo que a situação exigir." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Juízo de segurança", instructions: "Reconhecer perigos e tomar decisões seguras nas atividades diárias, incluindo pedir ajuda de forma adequada quando necessário." },
];
const calculationExplanationPtPt =
  "A pontuação da FIM+FAM é a soma do nível (1 a 7) selecionado para cada um dos 30 itens — 16 itens motores e 14 itens cognitivos. Cada nível reflete a quantidade de assistência necessária, desde assistência total (1) até independência completa (7), pelo que o total varia entre 30 (assistência total em todos os itens) e 210 (independência completa em todos os itens). Os 18 itens da MIF mantêm a sua pontuação original; os 12 itens FAM adicionados para a reabilitação de lesão cerebral — cobrindo deglutição, mobilidade na comunidade, comunicação, ajustamento psicossocial e cognição — usam a mesma escala de 7 níveis.";
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
  { domain: "Motor", section: "Autocuidados", label: "Deglutição", instructions: "Gerenciar a ingestão segura de alimentos e líquidos de diferentes consistências, sem aspiração, tosse ou engasgo." },
  { domain: "Motor", section: "Controle de Esfíncteres", label: "Controle vesical", instructions: "Controle completo da função vesical, incluindo o manejo de qualquer equipamento necessário." },
  { domain: "Motor", section: "Controle de Esfíncteres", label: "Controle intestinal", instructions: "Controle completo da função intestinal, incluindo o manejo de qualquer equipamento necessário." },
  { domain: "Motor", section: "Transferências", label: "Transferência: cama, cadeira e cadeira de rodas", instructions: "Mover-se de e para a cama, a cadeira e a cadeira de rodas, incluindo ficar em pé quando a marcha é o modo de locomoção." },
  { domain: "Motor", section: "Transferências", label: "Transferência: vaso sanitário", instructions: "Sentar-se e levantar-se do vaso sanitário." },
  { domain: "Motor", section: "Transferências", label: "Transferência: banheira ou chuveiro", instructions: "Entrar e sair da banheira ou do chuveiro." },
  { domain: "Motor", section: "Transferências", label: "Transferência: carro", instructions: "Entrar e sair de um carro ou van, incluindo qualquer transferência de e para uma cadeira de rodas." },
  { domain: "Motor", section: "Locomoção", label: "Locomoção: marcha ou cadeira de rodas", instructions: "Caminhar, uma vez em pé, ou se deslocar em cadeira de rodas, em uma superfície plana." },
  { domain: "Motor", section: "Locomoção", label: "Escadas", instructions: "Subir e descer entre 12 e 14 degraus em ambiente interno." },
  { domain: "Motor", section: "Locomoção", label: "Acesso à comunidade", instructions: "Deslocar-se com segurança a locais fora de casa — por exemplo, uma loja, o local de trabalho ou uma clínica — usando os meios de transporte e mobilidade disponíveis." },
  { domain: "Cognitivo", section: "Comunicação", label: "Compreensão", instructions: "Compreender comunicação falada e/ou escrita." },
  { domain: "Cognitivo", section: "Comunicação", label: "Expressão", instructions: "Expressar claramente ideias, necessidades e vontades, de forma verbal ou não verbal." },
  { domain: "Cognitivo", section: "Comunicação", label: "Leitura", instructions: "Compreender material escrito o suficiente para seguir instruções, cumprir uma agenda, ou funcionar no dia a dia." },
  { domain: "Cognitivo", section: "Comunicação", label: "Escrita", instructions: "Produzir comunicação escrita legível e organizada — por exemplo, um bilhete ou um formulário — suficiente para as necessidades diárias." },
  { domain: "Cognitivo", section: "Comunicação", label: "Inteligibilidade da fala", instructions: "O quão clara e compreensível é a fala da pessoa, independentemente do conteúdo do que é dito." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Interação social", instructions: "Relacionar-se e participar de forma adequada com outras pessoas em situações terapêuticas e sociais." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Estado emocional", instructions: "Gerenciar o humor e as respostas emocionais de forma adequada em diferentes situações, sem sofrimento, labilidade ou embotamento que interfiram no funcionamento." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Adaptação às limitações", instructions: "Reconhecer e aceitar o impacto da incapacidade ou limitação atual na vida diária e nos planos futuros." },
  { domain: "Cognitivo", section: "Ajustamento Psicossocial", label: "Empregabilidade", instructions: "Capacidade de atender às demandas físicas, cognitivas e comportamentais de um emprego ou de um papel produtivo equivalente, como estudar ou cuidar da casa, dado o nível atual de funcionamento." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Resolução de problemas", instructions: "Tomar decisões razoáveis, seguras e oportunas para resolver problemas da vida diária." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Memória", instructions: "Reconhecer pessoas, lembrar rotinas diárias, e cumprir pedidos sem precisar de lembretes repetidos." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Orientação", instructions: "Saber quem, onde e quando — pessoa, lugar e tempo — e usar essa noção de forma adequada ao longo do dia." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Atenção", instructions: "Manter e direcionar adequadamente o foco em uma tarefa ou conversa, sem se distrair indevidamente, pelo tempo que a situação exigir." },
  { domain: "Cognitivo", section: "Função Cognitiva", label: "Julgamento de segurança", instructions: "Reconhecer perigos e tomar decisões seguras nas atividades diárias, incluindo pedir ajuda de forma adequada quando necessário." },
];
const calculationExplanationPtBr =
  "A pontuação da FIM+FAM é a soma do nível (1 a 7) selecionado para cada um dos 30 itens — 16 itens motores e 14 itens cognitivos. Cada nível reflete a quantidade de assistência necessária, desde assistência total (1) até independência completa (7), então o total varia de 30 (assistência total em todos os itens) a 210 (independência completa em todos os itens). Os 18 itens da FIM mantêm sua pontuação original; os 12 itens FAM adicionados para a reabilitação de lesão cerebral — cobrindo deglutição, mobilidade na comunidade, comunicação, ajustamento psicossocial e cognição — usam a mesma escala de 7 níveis.";
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
  { domain: "Motor", section: "Autocuidado", label: "Deglución", instructions: "Gestionar la ingesta segura de alimentos y líquidos de diferentes consistencias, sin aspiración, tos ni atragantamiento." },
  { domain: "Motor", section: "Control de Esfínteres", label: "Control vesical", instructions: "Control completo de la función vesical, incluyendo el manejo de cualquier equipo necesario." },
  { domain: "Motor", section: "Control de Esfínteres", label: "Control intestinal", instructions: "Control completo de la función intestinal, incluyendo el manejo de cualquier equipo necesario." },
  { domain: "Motor", section: "Transferencias", label: "Traslado: cama, silla y silla de ruedas", instructions: "Moverse hacia y desde la cama, la silla y la silla de ruedas, incluyendo ponerse de pie cuando la marcha es el modo de desplazamiento." },
  { domain: "Motor", section: "Transferencias", label: "Traslado: retrete", instructions: "Sentarse y levantarse del retrete." },
  { domain: "Motor", section: "Transferencias", label: "Traslado: bañera o ducha", instructions: "Entrar y salir de la bañera o la ducha." },
  { domain: "Motor", section: "Transferencias", label: "Traslado: automóvil", instructions: "Entrar y salir de un automóvil o furgoneta, incluyendo cualquier traslado hacia y desde una silla de ruedas." },
  { domain: "Motor", section: "Locomoción", label: "Desplazamiento: marcha o silla de ruedas", instructions: "Caminar, una vez de pie, o desplazarse en silla de ruedas, sobre una superficie plana." },
  { domain: "Motor", section: "Locomoción", label: "Escaleras", instructions: "Subir y bajar entre 12 y 14 escalones en interiores." },
  { domain: "Motor", section: "Locomoción", label: "Acceso a la comunidad", instructions: "Desplazarse con seguridad a lugares fuera del hogar — por ejemplo, una tienda, el lugar de trabajo o una clínica — usando los medios de transporte y movilidad disponibles." },
  { domain: "Cognitivo", section: "Comunicación", label: "Comprensión", instructions: "Comprender comunicación hablada y/o escrita." },
  { domain: "Cognitivo", section: "Comunicación", label: "Expresión", instructions: "Expresar claramente ideas, necesidades y deseos, de forma verbal o no verbal." },
  { domain: "Cognitivo", section: "Comunicación", label: "Lectura", instructions: "Comprender material escrito lo suficiente como para seguir instrucciones, mantener un horario, o desenvolverse en el día a día." },
  { domain: "Cognitivo", section: "Comunicación", label: "Escritura", instructions: "Producir comunicación escrita legible y organizada — por ejemplo, una nota o un formulario — suficiente para las necesidades diarias." },
  { domain: "Cognitivo", section: "Comunicación", label: "Inteligibilidad del habla", instructions: "Cuán clara y comprensible es el habla de la persona, independientemente del contenido de lo que se dice." },
  { domain: "Cognitivo", section: "Ajuste Psicosocial", label: "Interacción social", instructions: "Relacionarse y participar de forma adecuada con otras personas en situaciones terapéuticas y sociales." },
  { domain: "Cognitivo", section: "Ajuste Psicosocial", label: "Estado emocional", instructions: "Manejar el estado de ánimo y las respuestas emocionales de forma adecuada en distintas situaciones, sin angustia, labilidad o embotamiento que interfieran con el funcionamiento." },
  { domain: "Cognitivo", section: "Ajuste Psicosocial", label: "Adaptación a las limitaciones", instructions: "Reconocer y aceptar el impacto de la discapacidad o limitación actual en la vida diaria y en los planes futuros." },
  { domain: "Cognitivo", section: "Ajuste Psicosocial", label: "Empleabilidad", instructions: "Capacidad de responder a las exigencias físicas, cognitivas y conductuales de un empleo o de un rol productivo equivalente, como estudiar o llevar el hogar, dado el nivel actual de funcionamiento." },
  { domain: "Cognitivo", section: "Función Cognitiva", label: "Resolución de problemas", instructions: "Tomar decisiones razonables, seguras y oportunas para resolver problemas de la vida diaria." },
  { domain: "Cognitivo", section: "Función Cognitiva", label: "Memoria", instructions: "Reconocer personas, recordar rutinas diarias, y cumplir peticiones sin necesitar recordatorios repetidos." },
  { domain: "Cognitivo", section: "Función Cognitiva", label: "Orientación", instructions: "Saber quién, dónde y cuándo — persona, lugar y tiempo — y usar esa conciencia de forma adecuada a lo largo del día." },
  { domain: "Cognitivo", section: "Función Cognitiva", label: "Atención", instructions: "Mantener y dirigir adecuadamente el foco en una tarea o conversación, sin distraerse indebidamente, durante el tiempo que la situación exija." },
  { domain: "Cognitivo", section: "Función Cognitiva", label: "Juicio de seguridad", instructions: "Reconocer peligros y tomar decisiones seguras en las actividades diarias, incluyendo pedir ayuda de forma adecuada cuando sea necesario." },
];
const calculationExplanationEs =
  "La puntuación de la FIM+FAM es la suma del nivel (1 a 7) seleccionado para cada uno de los 30 ítems — 16 ítems motores y 14 ítems cognitivos. Cada nivel refleja la cantidad de asistencia necesaria, desde asistencia total (1) hasta independencia completa (7), por lo que el total va de 30 (asistencia total en todos los ítems) a 210 (independencia completa en todos los ítems). Los 18 ítems de la FIM mantienen su puntuación original; los 12 ítems FAM añadidos para la rehabilitación de lesión cerebral — que cubren deglución, movilidad comunitaria, comunicación, ajuste psicosocial y cognición — utilizan la misma escala de 7 niveles.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a mayor independencia.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Mayor dependencia",
  highLabel: "Mayor independencia",
};

const translations = [
  {
    locale: "pt-pt",
    name: "MIF+FAM",
    description: "Estende a MIF com 12 itens adicionais que cobrem comunicação, ajustamento psicossocial e cognição, produzindo uma pontuação em 210 para uso na reabilitação de lesão cerebral.",
    definition: translateDefinition(
      ITEMS_EN.map((item, i) => ({ ...ITEMS_PT_PT[i], id: item.id })),
      LEVELS_PT_PT,
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "FIM+FAM",
    description: "Estende a FIM com 12 itens adicionais que cobrem comunicação, ajustamento psicossocial e cognição, gerando uma pontuação em 210 para uso na reabilitação de lesão cerebral.",
    definition: translateDefinition(
      ITEMS_EN.map((item, i) => ({ ...ITEMS_PT_BR[i], id: item.id })),
      LEVELS_PT_BR,
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "FIM+FAM",
    description: "Amplía la FIM con 12 ítems adicionales que cubren comunicación, ajuste psicosocial y cognición, generando una puntuación sobre 210 para su uso en la rehabilitación de lesión cerebral.",
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

console.log("FIM+FAM seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
