// Berg Balance Scale — fourth Clinical Tools calculator, first in a
// new "Balance & Falls Risk" category (distinct from Barthel/Katz/
// Lawton-Brody's "Independence" family — this measures balance
// performance, not ADL independence). Content status: 'published',
// same rationale as barthel.mjs.
//
// Usage: node db/seed/clinical-tools/berg.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "balance-falls-risk", {
  slug: "balance-falls-risk",
  name: "Balance & Falls Risk",
  color: "sky",
  position: 1,
});

// ---------- Definition (English source) ----------

const definitionEn = {
  items: [
    {
      id: "sit_to_stand",
      label: "Sitting to standing",
      instructions: "Please stand up. Try not to use your hands for support.",
      options: [
        { value: 0, label: "Unable", description: "Needs moderate or maximal assistance to stand." },
        { value: 1, label: "Minimal assistance", description: "Needs minimal assistance to stand or to stabilize." },
        { value: 2, label: "Hands, several attempts", description: "Able to stand using hands after several attempts." },
        { value: 3, label: "Independent, uses hands", description: "Able to stand independently using hands." },
        { value: 4, label: "Independent", description: "Able to stand without using hands and stabilize independently." },
      ],
    },
    {
      id: "standing_unsupported",
      label: "Standing unsupported",
      instructions: "Please stand for two minutes without holding on.",
      options: [
        { value: 0, label: "Unable", description: "Unable to stand for 30 seconds unassisted." },
        { value: 1, label: "Several attempts needed", description: "Needs several attempts to stand for 30 seconds unsupported." },
        { value: 2, label: "30 seconds", description: "Able to stand for 30 seconds unsupported." },
        { value: 3, label: "2 minutes, supervised", description: "Able to stand for 2 minutes with supervision." },
        { value: 4, label: "2 minutes, independent", description: "Able to stand safely for 2 minutes." },
      ],
    },
    {
      id: "sitting_unsupported",
      label: "Sitting unsupported",
      instructions: "Please sit with your arms folded for 2 minutes, feet on the floor.",
      options: [
        { value: 0, label: "Unable", description: "Unable to sit without support for 10 seconds." },
        { value: 1, label: "10 seconds", description: "Able to sit for 10 seconds." },
        { value: 2, label: "30 seconds", description: "Able to sit for 30 seconds." },
        { value: 3, label: "2 minutes, supervised", description: "Able to sit for 2 minutes under supervision." },
        { value: 4, label: "2 minutes, independent", description: "Able to sit safely and securely for 2 minutes." },
      ],
    },
    {
      id: "standing_to_sitting",
      label: "Standing to sitting",
      instructions: "Please sit down.",
      options: [
        { value: 0, label: "Needs assistance", description: "Needs assistance to sit." },
        { value: 1, label: "Independent, uncontrolled", description: "Sits independently but the descent is uncontrolled." },
        { value: 2, label: "Uses legs", description: "Uses the back of the legs against the chair to control the descent." },
        { value: 3, label: "Uses hands", description: "Controls the descent using the hands." },
        { value: 4, label: "Independent, minimal hand use", description: "Sits safely with minimal use of the hands." },
      ],
    },
    {
      id: "transfers",
      label: "Transfers",
      instructions: "Transfer toward a seat with armrests and toward a seat without armrests.",
      options: [
        { value: 0, label: "Two people assist", description: "Needs two people to assist or supervise to be safe." },
        { value: 1, label: "One person assists", description: "Needs one person to assist." },
        { value: 2, label: "Verbal cues / supervision", description: "Able to transfer with verbal cueing and/or supervision." },
        { value: 3, label: "Hands, safely", description: "Able to transfer safely with definite use of the hands." },
        { value: 4, label: "Independent, minimal hand use", description: "Able to transfer safely with only minor use of the hands." },
      ],
    },
    {
      id: "standing_eyes_closed",
      label: "Standing with eyes closed",
      instructions: "Please close your eyes and stand still for 10 seconds.",
      options: [
        { value: 0, label: "Needs help", description: "Needs help to keep from falling." },
        { value: 1, label: "Unable to hold 3 seconds", description: "Unable to keep the eyes closed for 3 seconds but stays steady." },
        { value: 2, label: "3 seconds", description: "Able to stand for 3 seconds." },
        { value: 3, label: "10 seconds, supervised", description: "Able to stand for 10 seconds with supervision." },
        { value: 4, label: "10 seconds, independent", description: "Able to stand safely for 10 seconds." },
      ],
    },
    {
      id: "standing_feet_together",
      label: "Standing with feet together",
      instructions: "Please place your feet together and stand without holding on.",
      options: [
        { value: 0, label: "Needs help, under 15 seconds", description: "Needs help to attain the position and unable to hold it for 15 seconds." },
        { value: 1, label: "Needs help, 15 seconds", description: "Needs help to attain the position but able to hold it for 15 seconds." },
        { value: 2, label: "Independent, 30 seconds", description: "Able to place the feet together independently and hold for 30 seconds." },
        { value: 3, label: "Independent, 1 minute, supervised", description: "Able to place the feet together independently and hold for 1 minute with supervision." },
        { value: 4, label: "Independent, 1 minute", description: "Able to place the feet together independently and hold safely for 1 minute." },
      ],
    },
    {
      id: "reaching_forward",
      label: "Reaching forward",
      instructions: "Lift the arm to 90°, stretch out the fingers, and reach forward as far as possible.",
      options: [
        { value: 0, label: "Loses balance", description: "Loses balance while attempting, or requires external support." },
        { value: 1, label: "Reaches, supervised", description: "Reaches forward but needs supervision." },
        { value: 2, label: "More than 5 cm", description: "Can reach forward safely more than 5 cm." },
        { value: 3, label: "More than 12.5 cm", description: "Can reach forward safely more than 12.5 cm." },
        { value: 4, label: "More than 25 cm", description: "Can reach forward confidently more than 25 cm." },
      ],
    },
    {
      id: "pick_up_object",
      label: "Picking up an object from the floor",
      instructions: "Pick up the shoe or slipper placed in front of the feet.",
      options: [
        { value: 0, label: "Unable", description: "Unable to try, or needs assistance to keep from losing balance or falling." },
        { value: 1, label: "Unable, supervised", description: "Unable to pick it up and needs supervision while trying." },
        { value: 2, label: "Unable, independent balance", description: "Unable to pick it up but reaches to within 2-5 cm of the object and keeps balance independently." },
        { value: 3, label: "Able, supervised", description: "Able to pick up the object but needs supervision." },
        { value: 4, label: "Able, safely", description: "Able to pick up the object easily and safely." },
      ],
    },
    {
      id: "turning_look_behind",
      label: "Turning to look behind",
      instructions: "Turn to look directly behind, over the left shoulder, then repeat to the right.",
      options: [
        { value: 0, label: "Needs assistance", description: "Needs assistance to keep from losing balance or falling." },
        { value: 1, label: "Supervised", description: "Needs supervision when turning." },
        { value: 2, label: "One side only", description: "Turns sideways only but maintains balance." },
        { value: 3, label: "One side better", description: "Looks behind from one side only; the other side shows less weight shift." },
        { value: 4, label: "Both sides", description: "Looks behind from both sides with good weight shift." },
      ],
    },
    {
      id: "turn_360",
      label: "Turning 360 degrees",
      instructions: "Turn all the way around in a full circle, pause, then turn a full circle the other way.",
      options: [
        { value: 0, label: "Needs assistance", description: "Needs assistance while turning." },
        { value: 1, label: "Close supervision", description: "Needs close supervision or verbal cueing." },
        { value: 2, label: "Slow", description: "Able to turn 360° safely but slowly." },
        { value: 3, label: "One side, 4 seconds or less", description: "Able to turn 360° safely in 4 seconds or less, one direction only." },
        { value: 4, label: "Both sides, 4 seconds or less", description: "Able to turn 360° safely in 4 seconds or less, both directions." },
      ],
    },
    {
      id: "alternate_step",
      label: "Placing alternate foot on a step",
      instructions: "Place each foot alternately on the step or stool until each foot has touched it four times.",
      options: [
        { value: 0, label: "Unable", description: "Unable to try, or needs assistance to prevent falling." },
        { value: 1, label: "More than 2 steps, minimal assistance", description: "Able to complete more than 2 steps, needs minimal assistance." },
        { value: 2, label: "4 steps, supervised", description: "Able to complete 4 steps without assistance but with supervision." },
        { value: 3, label: "8 steps, more than 20s", description: "Able to stand independently and complete 8 steps in more than 20 seconds." },
        { value: 4, label: "8 steps, 20s or less", description: "Able to stand independently and safely complete 8 steps in 20 seconds or less." },
      ],
    },
    {
      id: "tandem_stance",
      label: "Standing with one foot in front",
      instructions: "Place one foot directly in front of the other and stand.",
      options: [
        { value: 0, label: "Loses balance", description: "Loses balance while stepping or standing." },
        { value: 1, label: "Needs help, 15 seconds", description: "Needs help to step but can hold the position for 15 seconds." },
        { value: 2, label: "Small step, 30 seconds", description: "Able to place the foot ahead independently and hold for 30 seconds." },
        { value: 3, label: "Step ahead and aside, 30 seconds", description: "Able to place the foot ahead of the other independently and hold for 30 seconds." },
        { value: 4, label: "Tandem, 30 seconds", description: "Able to place the foot directly in line with the other independently and hold for 30 seconds." },
      ],
    },
    {
      id: "one_leg_stand",
      label: "Standing on one leg",
      instructions: "Stand on one leg for as long as possible without holding on.",
      options: [
        { value: 0, label: "Unable", description: "Unable to try, or needs assistance to prevent falling." },
        { value: 1, label: "Under 3 seconds", description: "Tries to lift the leg, unable to hold it for 3 seconds, but remains standing independently." },
        { value: 2, label: "3 seconds or more", description: "Able to lift the leg independently and hold for 3 seconds or more." },
        { value: 3, label: "5 to 10 seconds", description: "Able to lift the leg independently and hold for 5 to 10 seconds." },
        { value: 4, label: "More than 10 seconds", description: "Able to lift the leg independently and hold for more than 10 seconds." },
      ],
    },
  ],
  scoring: { method: "sum" },
  maxScore: 56,
  interpretation: [
    { min: 0, max: 20, label: "High fall risk", description: "Severe balance impairment, associated with a high risk of falling; typically wheelchair-bound or requiring substantial assistance.", severity: "critical" },
    { min: 21, max: 40, label: "Medium fall risk", description: "Moderate balance impairment, associated with a medium risk of falling; typically ambulates with assistance.", severity: "warning" },
    { min: 41, max: 56, label: "Low fall risk", description: "Balance is largely intact, associated with a low risk of falling; typically independently ambulatory.", severity: "good" },
  ],
  calculationExplanation:
    "The Berg Balance Scale score is the sum of the point value (0 to 4) assigned to the performance level achieved on each of the 14 balance tasks, so the total ranges from 0 (severe balance impairment) to 56 (intact balance).",
  source: {
    citation: "Berg K, Wood-Dauphinee S, Williams JI, Maki B. Measuring balance in the elderly: validation of an instrument. Can J Public Health. 1992;83 Suppl 2:S7-11.",
    url: "https://www.sralab.org/rehabilitation-measures/berg-balance-scale",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "berg-balance-scale", {
  slug: "berg-balance-scale",
  category_id: categoryId,
  name: "Berg Balance Scale",
  abbreviation: "BBS",
  description: "Assesses static and dynamic balance across 14 functional tasks, producing a score out of 56 that reflects fall risk.",
  population: "Older adults and patients with balance impairment",
  estimated_minutes_min: 15,
  estimated_minutes_max: 20,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 0,
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
    "Berg Balance Scale",
    "BBS",
    "Assesses static and dynamic balance across 14 functional tasks, producing a score out of 56 that reflects fall risk.",
    "Older adults and patients with balance impairment",
    15,
    20,
    JSON.stringify(definitionEn),
    "published",
    0,
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
  { label: "Sentado para de pé", instructions: "Por favor, levante-se. Tente não usar as mãos como apoio.", options: [
    { label: "Incapaz", description: "Precisa de assistência moderada ou máxima para se levantar." },
    { label: "Assistência mínima", description: "Precisa de assistência mínima para se levantar ou estabilizar." },
    { label: "Mãos, várias tentativas", description: "Consegue levantar-se usando as mãos após várias tentativas." },
    { label: "Independente, usa as mãos", description: "Consegue levantar-se de forma independente usando as mãos." },
    { label: "Independente", description: "Consegue levantar-se sem usar as mãos e estabilizar-se de forma independente." },
  ]},
  { label: "De pé sem apoio", instructions: "Por favor, fique de pé durante dois minutos sem se segurar.", options: [
    { label: "Incapaz", description: "Incapaz de ficar de pé 30 segundos sem ajuda." },
    { label: "Várias tentativas", description: "Precisa de várias tentativas para ficar de pé 30 segundos sem apoio." },
    { label: "30 segundos", description: "Consegue ficar de pé 30 segundos sem apoio." },
    { label: "2 minutos, supervisionado", description: "Consegue ficar de pé 2 minutos com supervisão." },
    { label: "2 minutos, independente", description: "Consegue ficar de pé com segurança durante 2 minutos." },
  ]},
  { label: "Sentado sem apoio", instructions: "Por favor, sente-se com os braços cruzados durante 2 minutos, pés no chão.", options: [
    { label: "Incapaz", description: "Incapaz de se sentar sem apoio durante 10 segundos." },
    { label: "10 segundos", description: "Consegue sentar-se durante 10 segundos." },
    { label: "30 segundos", description: "Consegue sentar-se durante 30 segundos." },
    { label: "2 minutos, supervisionado", description: "Consegue sentar-se durante 2 minutos sob supervisão." },
    { label: "2 minutos, independente", description: "Consegue sentar-se com segurança e estabilidade durante 2 minutos." },
  ]},
  { label: "De pé para sentado", instructions: "Por favor, sente-se.", options: [
    { label: "Precisa de assistência", description: "Precisa de assistência para se sentar." },
    { label: "Independente, descontrolado", description: "Senta-se de forma independente mas com descida descontrolada." },
    { label: "Usa as pernas", description: "Usa a parte de trás das pernas contra a cadeira para controlar a descida." },
    { label: "Usa as mãos", description: "Controla a descida usando as mãos." },
    { label: "Independente, uso mínimo das mãos", description: "Senta-se com segurança com uso mínimo das mãos." },
  ]},
  { label: "Transferências", instructions: "Transfira-se para um assento com apoios de braço e para um sem apoios de braço.", options: [
    { label: "Duas pessoas assistem", description: "Precisa de duas pessoas para assistir ou supervisionar em segurança." },
    { label: "Uma pessoa assiste", description: "Precisa de uma pessoa para assistir." },
    { label: "Indicações verbais/supervisão", description: "Consegue transferir-se com indicações verbais e/ou supervisão." },
    { label: "Mãos, com segurança", description: "Consegue transferir-se com segurança usando claramente as mãos." },
    { label: "Independente, uso mínimo das mãos", description: "Consegue transferir-se com segurança usando as mãos apenas ligeiramente." },
  ]},
  { label: "De pé de olhos fechados", instructions: "Por favor, feche os olhos e fique parado durante 10 segundos.", options: [
    { label: "Precisa de ajuda", description: "Precisa de ajuda para não cair." },
    { label: "Incapaz de aguentar 3 segundos", description: "Incapaz de manter os olhos fechados 3 segundos mas mantém-se estável." },
    { label: "3 segundos", description: "Consegue ficar de pé durante 3 segundos." },
    { label: "10 segundos, supervisionado", description: "Consegue ficar de pé 10 segundos com supervisão." },
    { label: "10 segundos, independente", description: "Consegue ficar de pé com segurança durante 10 segundos." },
  ]},
  { label: "De pé com os pés juntos", instructions: "Por favor, junte os pés e fique de pé sem se segurar.", options: [
    { label: "Precisa de ajuda, menos de 15 segundos", description: "Precisa de ajuda para atingir a posição e incapaz de a manter 15 segundos." },
    { label: "Precisa de ajuda, 15 segundos", description: "Precisa de ajuda para atingir a posição mas consegue mantê-la 15 segundos." },
    { label: "Independente, 30 segundos", description: "Consegue juntar os pés de forma independente e manter 30 segundos." },
    { label: "Independente, 1 minuto, supervisionado", description: "Consegue juntar os pés de forma independente e manter 1 minuto com supervisão." },
    { label: "Independente, 1 minuto", description: "Consegue juntar os pés de forma independente e manter com segurança durante 1 minuto." },
  ]},
  { label: "Alcance à frente", instructions: "Eleve o braço a 90°, estique os dedos e alcance para a frente o mais que conseguir.", options: [
    { label: "Perde o equilíbrio", description: "Perde o equilíbrio ao tentar, ou precisa de apoio externo." },
    { label: "Alcança, supervisionado", description: "Alcança para a frente mas precisa de supervisão." },
    { label: "Mais de 5 cm", description: "Consegue alcançar com segurança mais de 5 cm." },
    { label: "Mais de 12,5 cm", description: "Consegue alcançar com segurança mais de 12,5 cm." },
    { label: "Mais de 25 cm", description: "Consegue alcançar com confiança mais de 25 cm." },
  ]},
  { label: "Apanhar um objeto do chão", instructions: "Apanhe o sapato ou chinelo colocado à frente dos pés.", options: [
    { label: "Incapaz", description: "Incapaz de tentar, ou precisa de ajuda para não perder o equilíbrio ou cair." },
    { label: "Incapaz, supervisionado", description: "Incapaz de apanhar e precisa de supervisão ao tentar." },
    { label: "Incapaz, equilíbrio independente", description: "Incapaz de apanhar mas alcança a 2-5 cm do objeto e mantém o equilíbrio de forma independente." },
    { label: "Capaz, supervisionado", description: "Consegue apanhar o objeto mas precisa de supervisão." },
    { label: "Capaz, com segurança", description: "Consegue apanhar o objeto facilmente e com segurança." },
  ]},
  { label: "Virar-se para olhar para trás", instructions: "Vire-se para olhar diretamente para trás, sobre o ombro esquerdo, e depois repita para o direito.", options: [
    { label: "Precisa de assistência", description: "Precisa de assistência para não perder o equilíbrio ou cair." },
    { label: "Supervisionado", description: "Precisa de supervisão ao virar-se." },
    { label: "Apenas um lado", description: "Vira-se apenas de lado mas mantém o equilíbrio." },
    { label: "Um lado melhor", description: "Olha para trás apenas de um lado; o outro lado mostra menos transferência de peso." },
    { label: "Ambos os lados", description: "Olha para trás de ambos os lados com boa transferência de peso." },
  ]},
  { label: "Girar 360 graus", instructions: "Dê uma volta completa, faça uma pausa, e depois gire na direção contrária.", options: [
    { label: "Precisa de assistência", description: "Precisa de assistência ao girar." },
    { label: "Supervisão próxima", description: "Precisa de supervisão próxima ou indicações verbais." },
    { label: "Lento", description: "Consegue girar 360° com segurança mas lentamente." },
    { label: "Um lado, até 4 segundos", description: "Consegue girar 360° com segurança em 4 segundos ou menos, apenas numa direção." },
    { label: "Ambos os lados, até 4 segundos", description: "Consegue girar 360° com segurança em 4 segundos ou menos, em ambas as direções." },
  ]},
  { label: "Colocar o pé alternadamente num degrau", instructions: "Coloque cada pé alternadamente no degrau ou banco até cada pé o ter tocado quatro vezes.", options: [
    { label: "Incapaz", description: "Incapaz de tentar, ou precisa de ajuda para prevenir quedas." },
    { label: "Mais de 2 passos, assistência mínima", description: "Consegue completar mais de 2 passos, precisa de assistência mínima." },
    { label: "4 passos, supervisionado", description: "Consegue completar 4 passos sem assistência mas com supervisão." },
    { label: "8 passos, mais de 20s", description: "Consegue ficar de pé de forma independente e completar 8 passos em mais de 20 segundos." },
    { label: "8 passos, até 20s", description: "Consegue ficar de pé de forma independente e completar com segurança 8 passos em 20 segundos ou menos." },
  ]},
  { label: "De pé com um pé à frente", instructions: "Coloque um pé diretamente à frente do outro e fique de pé.", options: [
    { label: "Perde o equilíbrio", description: "Perde o equilíbrio ao dar o passo ou ao ficar de pé." },
    { label: "Precisa de ajuda, 15 segundos", description: "Precisa de ajuda para dar o passo mas consegue manter a posição 15 segundos." },
    { label: "Passo pequeno, 30 segundos", description: "Consegue colocar o pé à frente de forma independente e manter 30 segundos." },
    { label: "Passo à frente e ao lado, 30 segundos", description: "Consegue colocar o pé à frente do outro de forma independente e manter 30 segundos." },
    { label: "Tandem, 30 segundos", description: "Consegue colocar o pé diretamente alinhado com o outro de forma independente e manter 30 segundos." },
  ]},
  { label: "De pé sobre uma perna", instructions: "Fique de pé sobre uma perna o máximo de tempo possível sem se segurar.", options: [
    { label: "Incapaz", description: "Incapaz de tentar, ou precisa de ajuda para prevenir quedas." },
    { label: "Menos de 3 segundos", description: "Tenta levantar a perna, incapaz de manter 3 segundos, mas mantém-se de pé de forma independente." },
    { label: "3 segundos ou mais", description: "Consegue levantar a perna de forma independente e manter 3 segundos ou mais." },
    { label: "5 a 10 segundos", description: "Consegue levantar a perna de forma independente e manter 5 a 10 segundos." },
    { label: "Mais de 10 segundos", description: "Consegue levantar a perna de forma independente e manter mais de 10 segundos." },
  ]},
];
const ptPtInterpretation = [
  { label: "Risco elevado de queda", description: "Défice grave de equilíbrio, associado a um risco elevado de queda; geralmente dependente de cadeira de rodas ou de assistência substancial." },
  { label: "Risco médio de queda", description: "Défice moderado de equilíbrio, associado a um risco médio de queda; geralmente deambula com assistência." },
  { label: "Risco baixo de queda", description: "Equilíbrio maioritariamente preservado, associado a um risco baixo de queda; geralmente deambula de forma independente." },
];
const ptPtCalculationExplanation =
  "A pontuação da Escala de Berg é a soma do valor atribuído (0 a 4) ao nível de desempenho alcançado em cada uma das 14 tarefas de equilíbrio, pelo que o total varia entre 0 (défice grave de equilíbrio) e 56 (equilíbrio intacto).";

const ptBrItems = [
  { label: "Sentado para em pé", instructions: "Por favor, levante-se. Tente não usar as mãos como apoio.", options: [
    { label: "Incapaz", description: "Precisa de assistência moderada ou máxima para se levantar." },
    { label: "Assistência mínima", description: "Precisa de assistência mínima para se levantar ou se estabilizar." },
    { label: "Mãos, várias tentativas", description: "Consegue se levantar usando as mãos após várias tentativas." },
    { label: "Independente, usa as mãos", description: "Consegue se levantar de forma independente usando as mãos." },
    { label: "Independente", description: "Consegue se levantar sem usar as mãos e se estabilizar de forma independente." },
  ]},
  { label: "Em pé sem apoio", instructions: "Por favor, fique em pé durante dois minutos sem se segurar.", options: [
    { label: "Incapaz", description: "Incapaz de ficar em pé 30 segundos sem ajuda." },
    { label: "Várias tentativas", description: "Precisa de várias tentativas para ficar em pé 30 segundos sem apoio." },
    { label: "30 segundos", description: "Consegue ficar em pé 30 segundos sem apoio." },
    { label: "2 minutos, supervisionado", description: "Consegue ficar em pé 2 minutos com supervisão." },
    { label: "2 minutos, independente", description: "Consegue ficar em pé com segurança durante 2 minutos." },
  ]},
  { label: "Sentado sem apoio", instructions: "Por favor, sente-se com os braços cruzados durante 2 minutos, pés no chão.", options: [
    { label: "Incapaz", description: "Incapaz de se sentar sem apoio durante 10 segundos." },
    { label: "10 segundos", description: "Consegue se sentar durante 10 segundos." },
    { label: "30 segundos", description: "Consegue se sentar durante 30 segundos." },
    { label: "2 minutos, supervisionado", description: "Consegue se sentar durante 2 minutos sob supervisão." },
    { label: "2 minutos, independente", description: "Consegue se sentar com segurança e estabilidade durante 2 minutos." },
  ]},
  { label: "Em pé para sentado", instructions: "Por favor, sente-se.", options: [
    { label: "Precisa de assistência", description: "Precisa de assistência para se sentar." },
    { label: "Independente, descontrolado", description: "Senta-se de forma independente mas com descida descontrolada." },
    { label: "Usa as pernas", description: "Usa a parte de trás das pernas contra a cadeira para controlar a descida." },
    { label: "Usa as mãos", description: "Controla a descida usando as mãos." },
    { label: "Independente, uso mínimo das mãos", description: "Senta-se com segurança com uso mínimo das mãos." },
  ]},
  { label: "Transferências", instructions: "Transfira-se para um assento com apoios de braço e para um sem apoios de braço.", options: [
    { label: "Duas pessoas ajudam", description: "Precisa de duas pessoas para ajudar ou supervisionar com segurança." },
    { label: "Uma pessoa ajuda", description: "Precisa de uma pessoa para ajudar." },
    { label: "Comandos verbais/supervisão", description: "Consegue se transferir com comandos verbais e/ou supervisão." },
    { label: "Mãos, com segurança", description: "Consegue se transferir com segurança usando claramente as mãos." },
    { label: "Independente, uso mínimo das mãos", description: "Consegue se transferir com segurança usando as mãos apenas levemente." },
  ]},
  { label: "Em pé de olhos fechados", instructions: "Por favor, feche os olhos e fique parado durante 10 segundos.", options: [
    { label: "Precisa de ajuda", description: "Precisa de ajuda para não cair." },
    { label: "Incapaz de aguentar 3 segundos", description: "Incapaz de manter os olhos fechados por 3 segundos mas se mantém estável." },
    { label: "3 segundos", description: "Consegue ficar em pé durante 3 segundos." },
    { label: "10 segundos, supervisionado", description: "Consegue ficar em pé 10 segundos com supervisão." },
    { label: "10 segundos, independente", description: "Consegue ficar em pé com segurança durante 10 segundos." },
  ]},
  { label: "Em pé com os pés juntos", instructions: "Por favor, junte os pés e fique em pé sem se segurar.", options: [
    { label: "Precisa de ajuda, menos de 15 segundos", description: "Precisa de ajuda para atingir a posição e incapaz de mantê-la por 15 segundos." },
    { label: "Precisa de ajuda, 15 segundos", description: "Precisa de ajuda para atingir a posição mas consegue mantê-la por 15 segundos." },
    { label: "Independente, 30 segundos", description: "Consegue juntar os pés de forma independente e manter por 30 segundos." },
    { label: "Independente, 1 minuto, supervisionado", description: "Consegue juntar os pés de forma independente e manter por 1 minuto com supervisão." },
    { label: "Independente, 1 minuto", description: "Consegue juntar os pés de forma independente e manter com segurança durante 1 minuto." },
  ]},
  { label: "Alcance à frente", instructions: "Eleve o braço a 90°, estique os dedos e alcance à frente o máximo que conseguir.", options: [
    { label: "Perde o equilíbrio", description: "Perde o equilíbrio ao tentar, ou precisa de apoio externo." },
    { label: "Alcança, supervisionado", description: "Alcança à frente mas precisa de supervisão." },
    { label: "Mais de 5 cm", description: "Consegue alcançar com segurança mais de 5 cm." },
    { label: "Mais de 12,5 cm", description: "Consegue alcançar com segurança mais de 12,5 cm." },
    { label: "Mais de 25 cm", description: "Consegue alcançar com confiança mais de 25 cm." },
  ]},
  { label: "Pegar um objeto do chão", instructions: "Pegue o sapato ou chinelo colocado à frente dos pés.", options: [
    { label: "Incapaz", description: "Incapaz de tentar, ou precisa de ajuda para não perder o equilíbrio ou cair." },
    { label: "Incapaz, supervisionado", description: "Incapaz de pegar e precisa de supervisão ao tentar." },
    { label: "Incapaz, equilíbrio independente", description: "Incapaz de pegar mas alcança a 2-5 cm do objeto e mantém o equilíbrio de forma independente." },
    { label: "Capaz, supervisionado", description: "Consegue pegar o objeto mas precisa de supervisão." },
    { label: "Capaz, com segurança", description: "Consegue pegar o objeto facilmente e com segurança." },
  ]},
  { label: "Virar-se para olhar para trás", instructions: "Vire-se para olhar diretamente para trás, sobre o ombro esquerdo, e depois repita para o direito.", options: [
    { label: "Precisa de assistência", description: "Precisa de assistência para não perder o equilíbrio ou cair." },
    { label: "Supervisionado", description: "Precisa de supervisão ao virar-se." },
    { label: "Apenas um lado", description: "Vira-se apenas de lado mas mantém o equilíbrio." },
    { label: "Um lado melhor", description: "Olha para trás apenas de um lado; o outro lado mostra menos transferência de peso." },
    { label: "Ambos os lados", description: "Olha para trás de ambos os lados com boa transferência de peso." },
  ]},
  { label: "Girar 360 graus", instructions: "Dê uma volta completa, faça uma pausa, e depois gire na direção contrária.", options: [
    { label: "Precisa de assistência", description: "Precisa de assistência ao girar." },
    { label: "Supervisão próxima", description: "Precisa de supervisão próxima ou comandos verbais." },
    { label: "Lento", description: "Consegue girar 360° com segurança mas lentamente." },
    { label: "Um lado, até 4 segundos", description: "Consegue girar 360° com segurança em 4 segundos ou menos, apenas em uma direção." },
    { label: "Ambos os lados, até 4 segundos", description: "Consegue girar 360° com segurança em 4 segundos ou menos, em ambas as direções." },
  ]},
  { label: "Colocar o pé alternadamente em um degrau", instructions: "Coloque cada pé alternadamente no degrau ou banquinho até cada pé tê-lo tocado quatro vezes.", options: [
    { label: "Incapaz", description: "Incapaz de tentar, ou precisa de ajuda para prevenir quedas." },
    { label: "Mais de 2 passos, assistência mínima", description: "Consegue completar mais de 2 passos, precisa de assistência mínima." },
    { label: "4 passos, supervisionado", description: "Consegue completar 4 passos sem assistência mas com supervisão." },
    { label: "8 passos, mais de 20s", description: "Consegue ficar em pé de forma independente e completar 8 passos em mais de 20 segundos." },
    { label: "8 passos, até 20s", description: "Consegue ficar em pé de forma independente e completar com segurança 8 passos em 20 segundos ou menos." },
  ]},
  { label: "Em pé com um pé à frente", instructions: "Coloque um pé diretamente à frente do outro e fique em pé.", options: [
    { label: "Perde o equilíbrio", description: "Perde o equilíbrio ao dar o passo ou ao ficar em pé." },
    { label: "Precisa de ajuda, 15 segundos", description: "Precisa de ajuda para dar o passo mas consegue manter a posição por 15 segundos." },
    { label: "Passo pequeno, 30 segundos", description: "Consegue colocar o pé à frente de forma independente e manter por 30 segundos." },
    { label: "Passo à frente e ao lado, 30 segundos", description: "Consegue colocar o pé à frente do outro de forma independente e manter por 30 segundos." },
    { label: "Tandem, 30 segundos", description: "Consegue colocar o pé diretamente alinhado com o outro de forma independente e manter por 30 segundos." },
  ]},
  { label: "Em pé sobre uma perna", instructions: "Fique em pé sobre uma perna o máximo de tempo possível sem se segurar.", options: [
    { label: "Incapaz", description: "Incapaz de tentar, ou precisa de ajuda para prevenir quedas." },
    { label: "Menos de 3 segundos", description: "Tenta levantar a perna, incapaz de manter por 3 segundos, mas se mantém em pé de forma independente." },
    { label: "3 segundos ou mais", description: "Consegue levantar a perna de forma independente e manter por 3 segundos ou mais." },
    { label: "5 a 10 segundos", description: "Consegue levantar a perna de forma independente e manter por 5 a 10 segundos." },
    { label: "Mais de 10 segundos", description: "Consegue levantar a perna de forma independente e manter por mais de 10 segundos." },
  ]},
];
const ptBrInterpretation = [
  { label: "Risco alto de queda", description: "Déficit grave de equilíbrio, associado a um risco alto de queda; geralmente dependente de cadeira de rodas ou de assistência substancial." },
  { label: "Risco médio de queda", description: "Déficit moderado de equilíbrio, associado a um risco médio de queda; geralmente deambula com assistência." },
  { label: "Risco baixo de queda", description: "Equilíbrio majoritariamente preservado, associado a um risco baixo de queda; geralmente deambula de forma independente." },
];
const ptBrCalculationExplanation =
  "A pontuação da Escala de Berg é a soma do valor atribuído (0 a 4) ao nível de desempenho alcançado em cada uma das 14 tarefas de equilíbrio, então o total varia de 0 (déficit grave de equilíbrio) a 56 (equilíbrio intacto).";

const esItems = [
  { label: "Sentado a de pie", instructions: "Por favor, póngase de pie. Intente no usar las manos como apoyo.", options: [
    { label: "Incapaz", description: "Necesita asistencia moderada o máxima para ponerse de pie." },
    { label: "Asistencia mínima", description: "Necesita asistencia mínima para ponerse de pie o estabilizarse." },
    { label: "Manos, varios intentos", description: "Puede ponerse de pie usando las manos tras varios intentos." },
    { label: "Independiente, usa las manos", description: "Puede ponerse de pie de forma independiente usando las manos." },
    { label: "Independiente", description: "Puede ponerse de pie sin usar las manos y estabilizarse de forma independiente." },
  ]},
  { label: "De pie sin apoyo", instructions: "Por favor, permanezca de pie durante dos minutos sin sujetarse.", options: [
    { label: "Incapaz", description: "Incapaz de permanecer de pie 30 segundos sin ayuda." },
    { label: "Varios intentos", description: "Necesita varios intentos para permanecer de pie 30 segundos sin apoyo." },
    { label: "30 segundos", description: "Puede permanecer de pie 30 segundos sin apoyo." },
    { label: "2 minutos, supervisado", description: "Puede permanecer de pie 2 minutos con supervisión." },
    { label: "2 minutos, independiente", description: "Puede permanecer de pie con seguridad durante 2 minutos." },
  ]},
  { label: "Sentado sin apoyo", instructions: "Por favor, siéntese con los brazos cruzados durante 2 minutos, pies en el suelo.", options: [
    { label: "Incapaz", description: "Incapaz de sentarse sin apoyo durante 10 segundos." },
    { label: "10 segundos", description: "Puede sentarse durante 10 segundos." },
    { label: "30 segundos", description: "Puede sentarse durante 30 segundos." },
    { label: "2 minutos, supervisado", description: "Puede sentarse durante 2 minutos bajo supervisión." },
    { label: "2 minutos, independiente", description: "Puede sentarse con seguridad y estabilidad durante 2 minutos." },
  ]},
  { label: "De pie a sentado", instructions: "Por favor, siéntese.", options: [
    { label: "Necesita asistencia", description: "Necesita asistencia para sentarse." },
    { label: "Independiente, descontrolado", description: "Se sienta de forma independiente pero con descenso descontrolado." },
    { label: "Usa las piernas", description: "Usa la parte posterior de las piernas contra la silla para controlar el descenso." },
    { label: "Usa las manos", description: "Controla el descenso usando las manos." },
    { label: "Independiente, uso mínimo de las manos", description: "Se sienta con seguridad usando mínimamente las manos." },
  ]},
  { label: "Transferencias", instructions: "Transfiérase hacia un asiento con reposabrazos y hacia uno sin reposabrazos.", options: [
    { label: "Dos personas asisten", description: "Necesita dos personas para asistir o supervisar con seguridad." },
    { label: "Una persona asiste", description: "Necesita una persona para asistir." },
    { label: "Indicaciones verbales/supervisión", description: "Puede transferirse con indicaciones verbales y/o supervisión." },
    { label: "Manos, con seguridad", description: "Puede transferirse con seguridad usando claramente las manos." },
    { label: "Independiente, uso mínimo de las manos", description: "Puede transferirse con seguridad usando las manos solo levemente." },
  ]},
  { label: "De pie con los ojos cerrados", instructions: "Por favor, cierre los ojos y permanezca quieto durante 10 segundos.", options: [
    { label: "Necesita ayuda", description: "Necesita ayuda para no caerse." },
    { label: "Incapaz de aguantar 3 segundos", description: "Incapaz de mantener los ojos cerrados 3 segundos pero se mantiene estable." },
    { label: "3 segundos", description: "Puede permanecer de pie durante 3 segundos." },
    { label: "10 segundos, supervisado", description: "Puede permanecer de pie 10 segundos con supervisión." },
    { label: "10 segundos, independiente", description: "Puede permanecer de pie con seguridad durante 10 segundos." },
  ]},
  { label: "De pie con los pies juntos", instructions: "Por favor, junte los pies y permanezca de pie sin sujetarse.", options: [
    { label: "Necesita ayuda, menos de 15 segundos", description: "Necesita ayuda para alcanzar la posición e incapaz de mantenerla 15 segundos." },
    { label: "Necesita ayuda, 15 segundos", description: "Necesita ayuda para alcanzar la posición pero puede mantenerla 15 segundos." },
    { label: "Independiente, 30 segundos", description: "Puede juntar los pies de forma independiente y mantener 30 segundos." },
    { label: "Independiente, 1 minuto, supervisado", description: "Puede juntar los pies de forma independiente y mantener 1 minuto con supervisión." },
    { label: "Independiente, 1 minuto", description: "Puede juntar los pies de forma independiente y mantener con seguridad durante 1 minuto." },
  ]},
  { label: "Alcance hacia adelante", instructions: "Levante el brazo a 90°, estire los dedos y alcance hacia adelante lo más posible.", options: [
    { label: "Pierde el equilibrio", description: "Pierde el equilibrio al intentarlo, o requiere apoyo externo." },
    { label: "Alcanza, supervisado", description: "Alcanza hacia adelante pero necesita supervisión." },
    { label: "Más de 5 cm", description: "Puede alcanzar con seguridad más de 5 cm." },
    { label: "Más de 12,5 cm", description: "Puede alcanzar con seguridad más de 12,5 cm." },
    { label: "Más de 25 cm", description: "Puede alcanzar con confianza más de 25 cm." },
  ]},
  { label: "Recoger un objeto del suelo", instructions: "Recoja el zapato o la zapatilla colocados delante de los pies.", options: [
    { label: "Incapaz", description: "Incapaz de intentarlo, o necesita ayuda para no perder el equilibrio o caerse." },
    { label: "Incapaz, supervisado", description: "Incapaz de recogerlo y necesita supervisión al intentarlo." },
    { label: "Incapaz, equilibrio independiente", description: "Incapaz de recogerlo pero alcanza a 2-5 cm del objeto y mantiene el equilibrio de forma independiente." },
    { label: "Capaz, supervisado", description: "Puede recoger el objeto pero necesita supervisión." },
    { label: "Capaz, con seguridad", description: "Puede recoger el objeto fácilmente y con seguridad." },
  ]},
  { label: "Girar para mirar hacia atrás", instructions: "Gire para mirar directamente hacia atrás, sobre el hombro izquierdo, y luego repita hacia el derecho.", options: [
    { label: "Necesita asistencia", description: "Necesita asistencia para no perder el equilibrio o caerse." },
    { label: "Supervisado", description: "Necesita supervisión al girar." },
    { label: "Solo un lado", description: "Gira solo de lado pero mantiene el equilibrio." },
    { label: "Un lado mejor", description: "Mira hacia atrás solo de un lado; el otro lado muestra menos transferencia de peso." },
    { label: "Ambos lados", description: "Mira hacia atrás de ambos lados con buena transferencia de peso." },
  ]},
  { label: "Girar 360 grados", instructions: "Dé una vuelta completa, haga una pausa, y luego gire en la dirección contraria.", options: [
    { label: "Necesita asistencia", description: "Necesita asistencia al girar." },
    { label: "Supervisión estrecha", description: "Necesita supervisión estrecha o indicaciones verbales." },
    { label: "Lento", description: "Puede girar 360° con seguridad pero lentamente." },
    { label: "Un lado, 4 segundos o menos", description: "Puede girar 360° con seguridad en 4 segundos o menos, solo en una dirección." },
    { label: "Ambos lados, 4 segundos o menos", description: "Puede girar 360° con seguridad en 4 segundos o menos, en ambas direcciones." },
  ]},
  { label: "Colocar el pie alternadamente en un escalón", instructions: "Coloque cada pie alternadamente en el escalón o taburete hasta que cada pie lo haya tocado cuatro veces.", options: [
    { label: "Incapaz", description: "Incapaz de intentarlo, o necesita ayuda para prevenir caídas." },
    { label: "Más de 2 pasos, asistencia mínima", description: "Puede completar más de 2 pasos, necesita asistencia mínima." },
    { label: "4 pasos, supervisado", description: "Puede completar 4 pasos sin asistencia pero con supervisión." },
    { label: "8 pasos, más de 20s", description: "Puede permanecer de pie de forma independiente y completar 8 pasos en más de 20 segundos." },
    { label: "8 pasos, 20s o menos", description: "Puede permanecer de pie de forma independiente y completar con seguridad 8 pasos en 20 segundos o menos." },
  ]},
  { label: "De pie con un pie delante", instructions: "Coloque un pie directamente delante del otro y permanezca de pie.", options: [
    { label: "Pierde el equilibrio", description: "Pierde el equilibrio al dar el paso o al permanecer de pie." },
    { label: "Necesita ayuda, 15 segundos", description: "Necesita ayuda para dar el paso pero puede mantener la posición 15 segundos." },
    { label: "Paso pequeño, 30 segundos", description: "Puede colocar el pie delante de forma independiente y mantener 30 segundos." },
    { label: "Paso adelante y al lado, 30 segundos", description: "Puede colocar el pie delante del otro de forma independiente y mantener 30 segundos." },
    { label: "Tándem, 30 segundos", description: "Puede colocar el pie directamente alineado con el otro de forma independiente y mantener 30 segundos." },
  ]},
  { label: "De pie sobre una pierna", instructions: "Permanezca de pie sobre una pierna el mayor tiempo posible sin sujetarse.", options: [
    { label: "Incapaz", description: "Incapaz de intentarlo, o necesita ayuda para prevenir caídas." },
    { label: "Menos de 3 segundos", description: "Intenta levantar la pierna, incapaz de mantenerla 3 segundos, pero permanece de pie de forma independiente." },
    { label: "3 segundos o más", description: "Puede levantar la pierna de forma independiente y mantener 3 segundos o más." },
    { label: "5 a 10 segundos", description: "Puede levantar la pierna de forma independiente y mantener de 5 a 10 segundos." },
    { label: "Más de 10 segundos", description: "Puede levantar la pierna de forma independiente y mantener más de 10 segundos." },
  ]},
];
const esInterpretation = [
  { label: "Riesgo alto de caídas", description: "Déficit grave de equilibrio, asociado a un riesgo alto de caídas; generalmente dependiente de silla de ruedas o de asistencia sustancial." },
  { label: "Riesgo medio de caídas", description: "Déficit moderado de equilibrio, asociado a un riesgo medio de caídas; generalmente deambula con asistencia." },
  { label: "Riesgo bajo de caídas", description: "Equilibrio mayoritariamente conservado, asociado a un riesgo bajo de caídas; generalmente deambula de forma independiente." },
];
const esCalculationExplanation =
  "La puntuación de la Escala de Berg es la suma del valor asignado (0 a 4) al nivel de desempeño alcanzado en cada una de las 14 tareas de equilibrio, por lo que el total va de 0 (déficit grave de equilibrio) a 56 (equilibrio intacto).";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Berg",
    description: "Avalia o equilíbrio estático e dinâmico em 14 tarefas funcionais, produzindo uma pontuação em 56 que reflete o risco de queda.",
    definition: translateDefinition(ptPtItems, ptPtInterpretation, ptPtCalculationExplanation),
  },
  {
    locale: "pt-br",
    name: "Escala de Berg",
    description: "Avalia o equilíbrio estático e dinâmico em 14 tarefas funcionais, gerando uma pontuação em 56 que reflete o risco de queda.",
    definition: translateDefinition(ptBrItems, ptBrInterpretation, ptBrCalculationExplanation),
  },
  {
    locale: "es",
    name: "Escala de Berg",
    description: "Evalúa el equilibrio estático y dinámico en 14 tareas funcionales, generando una puntuación sobre 56 que refleja el riesgo de caídas.",
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

console.log("Berg Balance Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
