// NIH Stroke Scale (NIHSS) — same "Independence" category as mRS,
// which it sits alongside clinically (both rate stroke severity/
// disability, not a checklist of ADLs). Second descendingGood scale
// after mRS (0 = no stroke symptoms, higher = more severe).
//
// Unlike FIM/MRC-SS, NIHSS's 15 items each have their own distinct
// option set (2-5 levels, wording specific to that exam finding) —
// no shared rubric to combine combinatorially, so items are authored
// individually, closer to the Barthel/Katz pattern. Each item is
// given its own `section` matching its official NIHSS item number
// (e.g. "5. Motor arm" shared by 5a/5b) so the calculation detail
// calls out exactly which numbered exam item a score belongs to —
// the level of specificity the calculation-detail feature was built
// for (see CalculatorRunner.tsx's itemGroups).
//
// Usage: node db/seed/clinical-tools/nihss.mjs
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

const ITEMS_EN = [
  {
    id: "1a_loc",
    section: "1a. Level of consciousness",
    label: "Level of consciousness",
    instructions: "Rate the patient's level of arousal even if full assessment is limited by factors such as an endotracheal tube, language barrier, or orotracheal trauma/bandages.",
    options: [
      { value: 0, label: "Alert", description: "Alert; keenly responsive." },
      { value: 1, label: "Not alert, arousable by minor stimulation", description: "Not alert, but arousable by minor stimulation to obey, answer, or respond." },
      { value: 2, label: "Not alert, requires repeated stimulation", description: "Not alert, requires repeated stimulation to attend, or is obtunded and requires strong or painful stimulation to make movements (not stereotyped)." },
      { value: 3, label: "Reflex responses only, or unresponsive", description: "Responds only with reflex motor or autonomic effects, or is totally unresponsive, flaccid, and areflexic." },
    ],
  },
  {
    id: "1b_loc_questions",
    section: "1b. LOC questions",
    label: "LOC questions",
    instructions: "Ask the patient the month and their age. The answer must be correct — there is no partial credit for being close.",
    options: [
      { value: 0, label: "Answers both correctly", description: "Answers both questions correctly." },
      { value: 1, label: "Answers one correctly", description: "Answers one question correctly." },
      { value: 2, label: "Answers neither correctly", description: "Answers neither question correctly." },
    ],
  },
  {
    id: "1c_loc_commands",
    section: "1c. LOC commands",
    label: "LOC commands",
    instructions: "Ask the patient to open and close their eyes, then to grip and release their non-paretic hand.",
    options: [
      { value: 0, label: "Performs both tasks correctly", description: "Performs both tasks correctly." },
      { value: 1, label: "Performs one task correctly", description: "Performs one task correctly." },
      { value: 2, label: "Performs neither task correctly", description: "Performs neither task correctly." },
    ],
  },
  {
    id: "2_gaze",
    section: "2. Best gaze",
    label: "Best gaze",
    instructions: "Test only horizontal eye movements. Score a gaze palsy that is overcome by voluntary or reflexive activity.",
    options: [
      { value: 0, label: "Normal", description: "Normal horizontal eye movements." },
      { value: 1, label: "Partial gaze palsy", description: "Gaze is abnormal in one or both eyes, but forced deviation or total gaze paresis is not present." },
      { value: 2, label: "Forced deviation or total gaze paresis", description: "Forced deviation, or total gaze paresis, that is not overcome by the oculocephalic maneuver." },
    ],
  },
  {
    id: "3_visual_fields",
    section: "3. Visual fields",
    label: "Visual fields",
    instructions: "Test the upper and lower quadrants by confrontation, using finger counting or visual threat as appropriate.",
    options: [
      { value: 0, label: "No visual loss", description: "No visual field loss." },
      { value: 1, label: "Partial hemianopia", description: "Partial hemianopia." },
      { value: 2, label: "Complete hemianopia", description: "Complete hemianopia." },
      { value: 3, label: "Bilateral hemianopia", description: "Bilateral hemianopia, including cortical blindness." },
    ],
  },
  {
    id: "4_facial_palsy",
    section: "4. Facial palsy",
    label: "Facial palsy",
    instructions: "Ask, or use pantomime to encourage, the patient to show their teeth or raise their eyebrows and close their eyes.",
    options: [
      { value: 0, label: "Normal symmetrical movement", description: "Normal symmetrical facial movement." },
      { value: 1, label: "Minor paralysis", description: "Minor paralysis — flattened nasolabial fold, or asymmetry on smiling." },
      { value: 2, label: "Partial paralysis", description: "Partial paralysis — total or near-total paralysis of the lower face." },
      { value: 3, label: "Complete paralysis of one or both sides", description: "Complete paralysis of one or both sides, with absence of facial movement in the upper and lower face." },
    ],
  },
  {
    id: "5a_motor_arm_left",
    section: "5. Motor arm",
    label: "Motor arm — left",
    instructions: "With the palm down, hold the arm at 90° (sitting) or 45° (supine) for 10 seconds. Score drift for the left arm.",
    options: [
      { value: 0, label: "No drift", description: "No drift; the limb holds the position for the full 10 seconds." },
      { value: 1, label: "Drift", description: "Drift; the limb holds the position but drifts down before the full 10 seconds, without hitting the bed or other support." },
      { value: 2, label: "Some effort against gravity", description: "The limb cannot reach or maintain the position, drifts down to the bed, but has some effort against gravity." },
      { value: 3, label: "No effort against gravity", description: "No effort against gravity; the limb falls." },
      { value: 4, label: "No movement", description: "No movement at all." },
    ],
  },
  {
    id: "5b_motor_arm_right",
    section: "5. Motor arm",
    label: "Motor arm — right",
    instructions: "With the palm down, hold the arm at 90° (sitting) or 45° (supine) for 10 seconds. Score drift for the right arm.",
    options: [
      { value: 0, label: "No drift", description: "No drift; the limb holds the position for the full 10 seconds." },
      { value: 1, label: "Drift", description: "Drift; the limb holds the position but drifts down before the full 10 seconds, without hitting the bed or other support." },
      { value: 2, label: "Some effort against gravity", description: "The limb cannot reach or maintain the position, drifts down to the bed, but has some effort against gravity." },
      { value: 3, label: "No effort against gravity", description: "No effort against gravity; the limb falls." },
      { value: 4, label: "No movement", description: "No movement at all." },
    ],
  },
  {
    id: "6a_motor_leg_left",
    section: "6. Motor leg",
    label: "Motor leg — left",
    instructions: "Supine, raise the leg to 30° and hold for 5 seconds. Score drift for the left leg.",
    options: [
      { value: 0, label: "No drift", description: "No drift; the leg holds the 30° position for the full 5 seconds." },
      { value: 1, label: "Drift", description: "Drift; the leg drifts down by the end of the 5-second period, without hitting the bed." },
      { value: 2, label: "Some effort against gravity", description: "The leg falls to the bed by 5 seconds, but has some effort against gravity." },
      { value: 3, label: "No effort against gravity", description: "The leg falls to the bed immediately, with no effort against gravity." },
      { value: 4, label: "No movement", description: "No movement at all." },
    ],
  },
  {
    id: "6b_motor_leg_right",
    section: "6. Motor leg",
    label: "Motor leg — right",
    instructions: "Supine, raise the leg to 30° and hold for 5 seconds. Score drift for the right leg.",
    options: [
      { value: 0, label: "No drift", description: "No drift; the leg holds the 30° position for the full 5 seconds." },
      { value: 1, label: "Drift", description: "Drift; the leg drifts down by the end of the 5-second period, without hitting the bed." },
      { value: 2, label: "Some effort against gravity", description: "The leg falls to the bed by 5 seconds, but has some effort against gravity." },
      { value: 3, label: "No effort against gravity", description: "The leg falls to the bed immediately, with no effort against gravity." },
      { value: 4, label: "No movement", description: "No movement at all." },
    ],
  },
  {
    id: "7_limb_ataxia",
    section: "7. Limb ataxia",
    label: "Limb ataxia",
    instructions: "Test with eyes open, using finger-nose-finger and heel-shin testing on both sides.",
    options: [
      { value: 0, label: "Absent", description: "Absent." },
      { value: 1, label: "Present in one limb", description: "Ataxia is present in one limb." },
      { value: 2, label: "Present in two limbs", description: "Ataxia is present in two limbs." },
    ],
  },
  {
    id: "8_sensory",
    section: "8. Sensory",
    label: "Sensory",
    instructions: "Test sensation to pinprick in the face, arm, trunk, and leg, comparing side to side.",
    options: [
      { value: 0, label: "Normal", description: "Normal; no sensory loss." },
      { value: 1, label: "Mild-to-moderate sensory loss", description: "The patient feels pinprick as less sharp or dull on the affected side, or there is loss of superficial pain with pinprick but the patient is aware of being touched." },
      { value: 2, label: "Severe to total sensory loss", description: "The patient is not aware of being touched in the face, arm, and leg." },
    ],
  },
  {
    id: "9_language",
    section: "9. Best language",
    label: "Best language",
    instructions: "Ask the patient to describe a picture, name items, and read sentences.",
    options: [
      { value: 0, label: "No aphasia", description: "No aphasia; normal." },
      { value: 1, label: "Mild-to-moderate aphasia", description: "Some obvious loss of fluency or facility of comprehension, without significant limitation on ideas expressed or form of expression." },
      { value: 2, label: "Severe aphasia", description: "All communication is through fragmentary expression; great need for inference, questioning, and guessing by the listener." },
      { value: 3, label: "Mute, global aphasia", description: "No usable speech or auditory comprehension." },
    ],
  },
  {
    id: "10_dysarthria",
    section: "10. Dysarthria",
    label: "Dysarthria",
    instructions: "Ask the patient to read or repeat words from a standard list.",
    options: [
      { value: 0, label: "Normal", description: "Normal articulation." },
      { value: 1, label: "Mild-to-moderate dysarthria", description: "The patient slurs at least some words and can be understood with some difficulty." },
      { value: 2, label: "Severe dysarthria", description: "The patient's speech is so slurred as to be unintelligible, or the patient is mute or anarthric." },
    ],
  },
  {
    id: "11_extinction_inattention",
    section: "11. Extinction and inattention",
    label: "Extinction and inattention",
    instructions: "Use information from prior testing to identify neglect, or test double simultaneous stimulation.",
    options: [
      { value: 0, label: "No abnormality", description: "No abnormality." },
      { value: 1, label: "Inattention or extinction to one modality", description: "Visual, tactile, auditory, spatial, or personal inattention, or extinction to bilateral simultaneous stimulation in one sensory modality." },
      { value: 2, label: "Profound hemi-inattention or extinction to more than one modality", description: "Profound hemi-inattention, or extinction to more than one modality; does not recognize own hand, or orients to only one side of space." },
    ],
  },
];

function buildDefinition(items, interpretationBands, calculationExplanation) {
  return {
    items,
    scoring: { method: "sum" },
    maxScore: 42,
    descendingGood: true,
    interpretation: interpretationBands,
    calculationExplanation,
    source: {
      citation: "Brott T, Adams HP Jr, Olinger CP, Marler JR, Barsan WG, Biller J, et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke. 1989;20(7):864-870.",
      url: "https://www.sralab.org/rehabilitation-measures/national-institutes-health-stroke-scale",
    },
  };
}

const INTERPRETATION_EN = [
  { min: 0, max: 0, label: "No stroke symptoms", description: "No stroke symptoms detected on this examination.", severity: "good" },
  { min: 1, max: 4, label: "Minor stroke", description: "Minor neurological deficit.", severity: "warning" },
  { min: 5, max: 15, label: "Moderate stroke", description: "Moderate neurological deficit.", severity: "serious" },
  { min: 16, max: 20, label: "Moderate to severe stroke", description: "Moderate to severe neurological deficit.", severity: "serious" },
  { min: 21, max: 42, label: "Severe stroke", description: "Severe neurological deficit.", severity: "critical" },
];

const calculationExplanationEn =
  "The NIHSS score is the sum of the 15 individually scored exam items — level of consciousness, LOC questions and commands, gaze, visual fields, facial palsy, arm and leg motor function on each side, limb ataxia, sensory loss, language, dysarthria, and extinction/inattention — out of a maximum of 42. A higher score reflects a more severe neurological deficit; a score of 0 indicates no stroke symptoms on this examination.";

const definitionEn = buildDefinition(ITEMS_EN, INTERPRETATION_EN, calculationExplanationEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "NIH Stroke Scale",
  abbreviation: "NIHSS",
  description: "Grades the severity of neurological deficit after acute stroke across 15 exam items, producing a score out of 42 used for prognosis and to guide the intensity of post-acute care.",
  population: "Adults with acute or recent stroke",
  estimated_minutes_min: 5,
  estimated_minutes_max: 10,
  definition: JSON.stringify(definition),
  status: "published",
  position: 5,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "nihss", {
  slug: "nihss",
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
    "NIH Stroke Scale",
    "NIHSS",
    "Grades the severity of neurological deficit after acute stroke across 15 exam items, producing a score out of 42 used for prognosis and to guide the intensity of post-acute care.",
    "Adults with acute or recent stroke",
    5,
    10,
    JSON.stringify(definitionEn),
    "published",
    5,
  ]
);

// ---------- Translations ----------

function translateItems(sourceItems, translatedText) {
  return sourceItems.map((item, i) => ({
    ...item,
    section: translatedText[i].section,
    label: translatedText[i].label,
    instructions: translatedText[i].instructions,
    options: item.options.map((option, j) => ({
      ...option,
      label: translatedText[i].options[j].label,
      description: translatedText[i].options[j].description,
    })),
  }));
}

// --- pt-pt ---

const TEXT_PT_PT = [
  {
    section: "1a. Nível de consciência",
    label: "Nível de consciência",
    instructions: "Classifique o nível de alerta do doente, mesmo que a avaliação completa seja limitada por fatores como um tubo endotraqueal, barreira linguística ou trauma/pensos orotraqueais.",
    options: [
      { label: "Alerta", description: "Alerta; reativo de forma pronta." },
      { label: "Não alerta, despertável com estimulação mínima", description: "Não alerta, mas despertável com estimulação mínima para obedecer, responder ou reagir." },
      { label: "Não alerta, requer estimulação repetida", description: "Não alerta, requer estimulação repetida para atender, ou está obnubilado e requer estimulação intensa/dolorosa para produzir movimentos (não estereotipados)." },
      { label: "Apenas respostas reflexas, ou não responsivo", description: "Responde apenas com efeitos motores reflexos ou autonómicos, ou está totalmente não responsivo, flácido e arreflético." },
    ],
  },
  {
    section: "1b. Perguntas de LOC",
    label: "Perguntas de LOC",
    instructions: "Pergunte ao doente o mês e a sua idade. A resposta tem de estar correta — não há crédito parcial por estar próxima.",
    options: [
      { label: "Responde corretamente a ambas", description: "Responde corretamente a ambas as perguntas." },
      { label: "Responde corretamente a uma", description: "Responde corretamente a uma pergunta." },
      { label: "Não responde corretamente a nenhuma", description: "Não responde corretamente a nenhuma pergunta." },
    ],
  },
  {
    section: "1c. Comandos de LOC",
    label: "Comandos de LOC",
    instructions: "Peça ao doente para abrir e fechar os olhos e, depois, para apertar e largar a mão não parética.",
    options: [
      { label: "Executa corretamente ambas as tarefas", description: "Executa corretamente ambas as tarefas." },
      { label: "Executa corretamente uma tarefa", description: "Executa corretamente uma tarefa." },
      { label: "Não executa corretamente nenhuma tarefa", description: "Não executa corretamente nenhuma tarefa." },
    ],
  },
  {
    section: "2. Melhor olhar conjugado",
    label: "Melhor olhar conjugado",
    instructions: "Teste apenas os movimentos oculares horizontais. Pontue uma paresia do olhar que seja ultrapassada por atividade voluntária ou reflexa.",
    options: [
      { label: "Normal", description: "Movimentos oculares horizontais normais." },
      { label: "Paresia parcial do olhar", description: "O olhar está anormal num ou em ambos os olhos, mas não há desvio forçado ou paresia total do olhar." },
      { label: "Desvio forçado ou paresia total do olhar", description: "Desvio forçado, ou paresia total do olhar, não ultrapassada pela manobra oculocefálica." },
    ],
  },
  {
    section: "3. Campos visuais",
    label: "Campos visuais",
    instructions: "Teste os quadrantes superior e inferior por confrontação, usando contagem de dedos ou ameaça visual conforme apropriado.",
    options: [
      { label: "Sem perda visual", description: "Sem perda de campo visual." },
      { label: "Hemianopsia parcial", description: "Hemianopsia parcial." },
      { label: "Hemianopsia completa", description: "Hemianopsia completa." },
      { label: "Hemianopsia bilateral", description: "Hemianopsia bilateral, incluindo cegueira cortical." },
    ],
  },
  {
    section: "4. Paralisia facial",
    label: "Paralisia facial",
    instructions: "Peça, ou use pantomima para encorajar, o doente a mostrar os dentes ou a levantar as sobrancelhas e fechar os olhos.",
    options: [
      { label: "Movimento simétrico normal", description: "Movimento facial simétrico normal." },
      { label: "Paralisia minor", description: "Paralisia minor — sulco nasolabial apagado, ou assimetria ao sorrir." },
      { label: "Paralisia parcial", description: "Paralisia parcial — paralisia total ou quase total da face inferior." },
      { label: "Paralisia completa de um ou ambos os lados", description: "Paralisia completa de um ou ambos os lados, com ausência de movimento facial na face superior e inferior." },
    ],
  },
  {
    section: "5. Braço motor",
    label: "Braço motor — esquerdo",
    instructions: "Com a palma para baixo, mantenha o braço a 90° (sentado) ou 45° (deitado) durante 10 segundos. Pontue a queda do braço esquerdo.",
    options: [
      { label: "Sem queda", description: "Sem queda; o membro mantém a posição durante os 10 segundos completos." },
      { label: "Queda", description: "Queda; o membro mantém a posição mas cai antes dos 10 segundos completos, sem tocar na cama ou noutro apoio." },
      { label: "Algum esforço contra a gravidade", description: "O membro não consegue atingir ou manter a posição, cai até à cama, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "Sem esforço contra a gravidade; o membro cai." },
      { label: "Sem movimento", description: "Sem qualquer movimento." },
    ],
  },
  {
    section: "5. Braço motor",
    label: "Braço motor — direito",
    instructions: "Com a palma para baixo, mantenha o braço a 90° (sentado) ou 45° (deitado) durante 10 segundos. Pontue a queda do braço direito.",
    options: [
      { label: "Sem queda", description: "Sem queda; o membro mantém a posição durante os 10 segundos completos." },
      { label: "Queda", description: "Queda; o membro mantém a posição mas cai antes dos 10 segundos completos, sem tocar na cama ou noutro apoio." },
      { label: "Algum esforço contra a gravidade", description: "O membro não consegue atingir ou manter a posição, cai até à cama, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "Sem esforço contra a gravidade; o membro cai." },
      { label: "Sem movimento", description: "Sem qualquer movimento." },
    ],
  },
  {
    section: "6. Perna motora",
    label: "Perna motora — esquerda",
    instructions: "Deitado, eleve a perna a 30° e mantenha durante 5 segundos. Pontue a queda da perna esquerda.",
    options: [
      { label: "Sem queda", description: "Sem queda; a perna mantém a posição a 30° durante os 5 segundos completos." },
      { label: "Queda", description: "Queda; a perna cai antes do final dos 5 segundos, sem tocar na cama." },
      { label: "Algum esforço contra a gravidade", description: "A perna cai até à cama antes dos 5 segundos, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "A perna cai imediatamente até à cama, sem esforço contra a gravidade." },
      { label: "Sem movimento", description: "Sem qualquer movimento." },
    ],
  },
  {
    section: "6. Perna motora",
    label: "Perna motora — direita",
    instructions: "Deitado, eleve a perna a 30° e mantenha durante 5 segundos. Pontue a queda da perna direita.",
    options: [
      { label: "Sem queda", description: "Sem queda; a perna mantém a posição a 30° durante os 5 segundos completos." },
      { label: "Queda", description: "Queda; a perna cai antes do final dos 5 segundos, sem tocar na cama." },
      { label: "Algum esforço contra a gravidade", description: "A perna cai até à cama antes dos 5 segundos, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "A perna cai imediatamente até à cama, sem esforço contra a gravidade." },
      { label: "Sem movimento", description: "Sem qualquer movimento." },
    ],
  },
  {
    section: "7. Ataxia dos membros",
    label: "Ataxia dos membros",
    instructions: "Teste com os olhos abertos, usando as provas dedo-nariz-dedo e calcanhar-joelho-canela em ambos os lados.",
    options: [
      { label: "Ausente", description: "Ausente." },
      { label: "Presente num membro", description: "Ataxia presente num membro." },
      { label: "Presente em dois membros", description: "Ataxia presente em dois membros." },
    ],
  },
  {
    section: "8. Sensibilidade",
    label: "Sensibilidade",
    instructions: "Teste a sensibilidade à picada de agulha na face, braço, tronco e perna, comparando os dois lados.",
    options: [
      { label: "Normal", description: "Normal; sem perda de sensibilidade." },
      { label: "Perda de sensibilidade ligeira a moderada", description: "O doente sente a picada como menos aguda ou embotada no lado afetado, ou há perda de dor superficial à picada mas o doente tem noção de ser tocado." },
      { label: "Perda de sensibilidade grave a total", description: "O doente não tem noção de ser tocado na face, braço e perna." },
    ],
  },
  {
    section: "9. Melhor linguagem",
    label: "Melhor linguagem",
    instructions: "Peça ao doente para descrever uma imagem, nomear objetos e ler frases.",
    options: [
      { label: "Sem afasia", description: "Sem afasia; normal." },
      { label: "Afasia ligeira a moderada", description: "Alguma perda evidente de fluência ou de facilidade de compreensão, sem limitação significativa das ideias expressas ou da forma de expressão." },
      { label: "Afasia grave", description: "Toda a comunicação é feita através de expressão fragmentada; grande necessidade de inferência, questionamento e adivinhação por parte do ouvinte." },
      { label: "Mudo, afasia global", description: "Sem discurso utilizável nem compreensão auditiva." },
    ],
  },
  {
    section: "10. Disartria",
    label: "Disartria",
    instructions: "Peça ao doente para ler ou repetir palavras de uma lista padronizada.",
    options: [
      { label: "Normal", description: "Articulação normal." },
      { label: "Disartria ligeira a moderada", description: "O doente arrasta pelo menos algumas palavras e consegue ser compreendido com alguma dificuldade." },
      { label: "Disartria grave", description: "A fala do doente está tão arrastada que é ininteligível, ou o doente está mudo ou anártrico." },
    ],
  },
  {
    section: "11. Extinção e inatenção",
    label: "Extinção e inatenção",
    instructions: "Utilize informação da avaliação prévia para identificar negligência, ou teste a estimulação dupla simultânea.",
    options: [
      { label: "Sem alteração", description: "Sem alteração." },
      { label: "Inatenção ou extinção numa modalidade", description: "Inatenção visual, tátil, auditiva, espacial ou pessoal, ou extinção à estimulação bilateral simultânea numa modalidade sensorial." },
      { label: "Hemi-inatenção profunda ou extinção em mais de uma modalidade", description: "Hemi-inatenção profunda, ou extinção em mais de uma modalidade; não reconhece a própria mão, ou orienta-se apenas para um lado do espaço." },
    ],
  },
];

const INTERPRETATION_PT_PT = [
  { label: "Sem sintomas de AVC", description: "Sem sintomas de AVC detetados nesta avaliação." },
  { label: "AVC minor", description: "Défice neurológico minor." },
  { label: "AVC moderado", description: "Défice neurológico moderado." },
  { label: "AVC moderado a grave", description: "Défice neurológico moderado a grave." },
  { label: "AVC grave", description: "Défice neurológico grave." },
];

const calculationExplanationPtPt =
  "A pontuação da NIHSS é a soma dos 15 itens de exame pontuados individualmente — nível de consciência, perguntas e comandos de LOC, olhar conjugado, campos visuais, paralisia facial, função motora do braço e da perna em cada lado, ataxia dos membros, perda de sensibilidade, linguagem, disartria e extinção/inatenção — num máximo de 42. Uma pontuação mais elevada reflete um défice neurológico mais grave; uma pontuação de 0 indica ausência de sintomas de AVC nesta avaliação.";

// --- pt-br ---

const TEXT_PT_BR = [
  {
    section: "1a. Nível de consciência",
    label: "Nível de consciência",
    instructions: "Classifique o nível de alerta do paciente, mesmo que a avaliação completa seja limitada por fatores como tubo endotraqueal, barreira linguística ou trauma/curativos orotraqueais.",
    options: [
      { label: "Alerta", description: "Alerta; reativo de forma pronta." },
      { label: "Não alerta, despertável com estimulação mínima", description: "Não alerta, mas despertável com estimulação mínima para obedecer, responder ou reagir." },
      { label: "Não alerta, requer estimulação repetida", description: "Não alerta, requer estimulação repetida para atender, ou está obnubilado e requer estimulação intensa/dolorosa para produzir movimentos (não estereotipados)." },
      { label: "Apenas respostas reflexas, ou não responsivo", description: "Responde apenas com efeitos motores reflexos ou autonômicos, ou está totalmente não responsivo, flácido e arreflexo." },
    ],
  },
  {
    section: "1b. Perguntas de LOC",
    label: "Perguntas de LOC",
    instructions: "Pergunte ao paciente o mês e a sua idade. A resposta precisa estar correta — não há crédito parcial por estar próxima.",
    options: [
      { label: "Responde corretamente a ambas", description: "Responde corretamente a ambas as perguntas." },
      { label: "Responde corretamente a uma", description: "Responde corretamente a uma pergunta." },
      { label: "Não responde corretamente a nenhuma", description: "Não responde corretamente a nenhuma pergunta." },
    ],
  },
  {
    section: "1c. Comandos de LOC",
    label: "Comandos de LOC",
    instructions: "Peça ao paciente para abrir e fechar os olhos e, depois, para apertar e soltar a mão não parética.",
    options: [
      { label: "Executa corretamente ambas as tarefas", description: "Executa corretamente ambas as tarefas." },
      { label: "Executa corretamente uma tarefa", description: "Executa corretamente uma tarefa." },
      { label: "Não executa corretamente nenhuma tarefa", description: "Não executa corretamente nenhuma tarefa." },
    ],
  },
  {
    section: "2. Melhor olhar conjugado",
    label: "Melhor olhar conjugado",
    instructions: "Teste apenas os movimentos oculares horizontais. Pontue uma paresia do olhar que seja superada por atividade voluntária ou reflexa.",
    options: [
      { label: "Normal", description: "Movimentos oculares horizontais normais." },
      { label: "Paresia parcial do olhar", description: "O olhar está anormal em um ou ambos os olhos, mas não há desvio forçado ou paresia total do olhar." },
      { label: "Desvio forçado ou paresia total do olhar", description: "Desvio forçado, ou paresia total do olhar, não superada pela manobra oculocefálica." },
    ],
  },
  {
    section: "3. Campos visuais",
    label: "Campos visuais",
    instructions: "Teste os quadrantes superior e inferior por confrontação, usando contagem de dedos ou ameaça visual conforme apropriado.",
    options: [
      { label: "Sem perda visual", description: "Sem perda de campo visual." },
      { label: "Hemianopsia parcial", description: "Hemianopsia parcial." },
      { label: "Hemianopsia completa", description: "Hemianopsia completa." },
      { label: "Hemianopsia bilateral", description: "Hemianopsia bilateral, incluindo cegueira cortical." },
    ],
  },
  {
    section: "4. Paralisia facial",
    label: "Paralisia facial",
    instructions: "Peça, ou use pantomima para incentivar, o paciente a mostrar os dentes ou levantar as sobrancelhas e fechar os olhos.",
    options: [
      { label: "Movimento simétrico normal", description: "Movimento facial simétrico normal." },
      { label: "Paralisia leve", description: "Paralisia leve — sulco nasolabial apagado, ou assimetria ao sorrir." },
      { label: "Paralisia parcial", description: "Paralisia parcial — paralisia total ou quase total da face inferior." },
      { label: "Paralisia completa de um ou ambos os lados", description: "Paralisia completa de um ou ambos os lados, com ausência de movimento facial na face superior e inferior." },
    ],
  },
  {
    section: "5. Braço motor",
    label: "Braço motor — esquerdo",
    instructions: "Com a palma para baixo, mantenha o braço a 90° (sentado) ou 45° (deitado) por 10 segundos. Pontue a queda do braço esquerdo.",
    options: [
      { label: "Sem queda", description: "Sem queda; o membro mantém a posição pelos 10 segundos completos." },
      { label: "Queda", description: "Queda; o membro mantém a posição mas cai antes dos 10 segundos completos, sem tocar a cama ou outro apoio." },
      { label: "Algum esforço contra a gravidade", description: "O membro não consegue atingir ou manter a posição, cai até a cama, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "Sem esforço contra a gravidade; o membro cai." },
      { label: "Sem movimento", description: "Sem nenhum movimento." },
    ],
  },
  {
    section: "5. Braço motor",
    label: "Braço motor — direito",
    instructions: "Com a palma para baixo, mantenha o braço a 90° (sentado) ou 45° (deitado) por 10 segundos. Pontue a queda do braço direito.",
    options: [
      { label: "Sem queda", description: "Sem queda; o membro mantém a posição pelos 10 segundos completos." },
      { label: "Queda", description: "Queda; o membro mantém a posição mas cai antes dos 10 segundos completos, sem tocar a cama ou outro apoio." },
      { label: "Algum esforço contra a gravidade", description: "O membro não consegue atingir ou manter a posição, cai até a cama, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "Sem esforço contra a gravidade; o membro cai." },
      { label: "Sem movimento", description: "Sem nenhum movimento." },
    ],
  },
  {
    section: "6. Perna motora",
    label: "Perna motora — esquerda",
    instructions: "Deitado, eleve a perna a 30° e mantenha por 5 segundos. Pontue a queda da perna esquerda.",
    options: [
      { label: "Sem queda", description: "Sem queda; a perna mantém a posição a 30° pelos 5 segundos completos." },
      { label: "Queda", description: "Queda; a perna cai antes do final dos 5 segundos, sem tocar a cama." },
      { label: "Algum esforço contra a gravidade", description: "A perna cai até a cama antes dos 5 segundos, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "A perna cai imediatamente até a cama, sem esforço contra a gravidade." },
      { label: "Sem movimento", description: "Sem nenhum movimento." },
    ],
  },
  {
    section: "6. Perna motora",
    label: "Perna motora — direita",
    instructions: "Deitado, eleve a perna a 30° e mantenha por 5 segundos. Pontue a queda da perna direita.",
    options: [
      { label: "Sem queda", description: "Sem queda; a perna mantém a posição a 30° pelos 5 segundos completos." },
      { label: "Queda", description: "Queda; a perna cai antes do final dos 5 segundos, sem tocar a cama." },
      { label: "Algum esforço contra a gravidade", description: "A perna cai até a cama antes dos 5 segundos, mas apresenta algum esforço contra a gravidade." },
      { label: "Sem esforço contra a gravidade", description: "A perna cai imediatamente até a cama, sem esforço contra a gravidade." },
      { label: "Sem movimento", description: "Sem nenhum movimento." },
    ],
  },
  {
    section: "7. Ataxia dos membros",
    label: "Ataxia dos membros",
    instructions: "Teste com os olhos abertos, usando as provas dedo-nariz-dedo e calcanhar-joelho-canela nos dois lados.",
    options: [
      { label: "Ausente", description: "Ausente." },
      { label: "Presente em um membro", description: "Ataxia presente em um membro." },
      { label: "Presente em dois membros", description: "Ataxia presente em dois membros." },
    ],
  },
  {
    section: "8. Sensibilidade",
    label: "Sensibilidade",
    instructions: "Teste a sensibilidade à picada de agulha na face, braço, tronco e perna, comparando os dois lados.",
    options: [
      { label: "Normal", description: "Normal; sem perda de sensibilidade." },
      { label: "Perda de sensibilidade leve a moderada", description: "O paciente sente a picada como menos aguda ou embotada no lado afetado, ou há perda de dor superficial à picada mas o paciente tem noção de ser tocado." },
      { label: "Perda de sensibilidade grave a total", description: "O paciente não tem noção de ser tocado na face, braço e perna." },
    ],
  },
  {
    section: "9. Melhor linguagem",
    label: "Melhor linguagem",
    instructions: "Peça ao paciente para descrever uma imagem, nomear objetos e ler frases.",
    options: [
      { label: "Sem afasia", description: "Sem afasia; normal." },
      { label: "Afasia leve a moderada", description: "Alguma perda evidente de fluência ou de facilidade de compreensão, sem limitação significativa das ideias expressas ou da forma de expressão." },
      { label: "Afasia grave", description: "Toda a comunicação é feita por meio de expressão fragmentada; grande necessidade de inferência, questionamento e adivinhação por parte do ouvinte." },
      { label: "Mudo, afasia global", description: "Sem fala utilizável nem compreensão auditiva." },
    ],
  },
  {
    section: "10. Disartria",
    label: "Disartria",
    instructions: "Peça ao paciente para ler ou repetir palavras de uma lista padronizada.",
    options: [
      { label: "Normal", description: "Articulação normal." },
      { label: "Disartria leve a moderada", description: "O paciente arrasta pelo menos algumas palavras e consegue ser compreendido com alguma dificuldade." },
      { label: "Disartria grave", description: "A fala do paciente está tão arrastada que é ininteligível, ou o paciente está mudo ou anártrico." },
    ],
  },
  {
    section: "11. Extinção e inatenção",
    label: "Extinção e inatenção",
    instructions: "Utilize informação da avaliação anterior para identificar negligência, ou teste a estimulação dupla simultânea.",
    options: [
      { label: "Sem alteração", description: "Sem alteração." },
      { label: "Inatenção ou extinção em uma modalidade", description: "Inatenção visual, tátil, auditiva, espacial ou pessoal, ou extinção à estimulação bilateral simultânea em uma modalidade sensorial." },
      { label: "Hemi-inatenção profunda ou extinção em mais de uma modalidade", description: "Hemi-inatenção profunda, ou extinção em mais de uma modalidade; não reconhece a própria mão, ou se orienta apenas para um lado do espaço." },
    ],
  },
];

const INTERPRETATION_PT_BR = [
  { label: "Sem sintomas de AVC", description: "Sem sintomas de AVC detectados nesta avaliação." },
  { label: "AVC leve", description: "Déficit neurológico leve." },
  { label: "AVC moderado", description: "Déficit neurológico moderado." },
  { label: "AVC moderado a grave", description: "Déficit neurológico moderado a grave." },
  { label: "AVC grave", description: "Déficit neurológico grave." },
];

const calculationExplanationPtBr =
  "A pontuação da NIHSS é a soma dos 15 itens de exame pontuados individualmente — nível de consciência, perguntas e comandos de LOC, olhar conjugado, campos visuais, paralisia facial, função motora do braço e da perna em cada lado, ataxia dos membros, perda de sensibilidade, linguagem, disartria e extinção/inatenção — em um máximo de 42. Uma pontuação mais alta reflete um déficit neurológico mais grave; uma pontuação de 0 indica ausência de sintomas de AVC nesta avaliação.";

// --- es ---

const TEXT_ES = [
  {
    section: "1a. Nivel de conciencia",
    label: "Nivel de conciencia",
    instructions: "Califique el nivel de alerta del paciente, aunque la evaluación completa esté limitada por factores como un tubo endotraqueal, barrera idiomática o traumatismo/vendajes orotraqueales.",
    options: [
      { label: "Alerta", description: "Alerta; reactivo de forma pronta." },
      { label: "No alerta, despertable con estimulación mínima", description: "No alerta, pero despertable con estimulación mínima para obedecer, responder o reaccionar." },
      { label: "No alerta, requiere estimulación repetida", description: "No alerta, requiere estimulación repetida para atender, o está obnubilado y requiere estimulación intensa/dolorosa para producir movimientos (no estereotipados)." },
      { label: "Solo respuestas reflejas, o no responde", description: "Responde solo con efectos motores reflejos o autonómicos, o está totalmente sin respuesta, flácido y arrefléxico." },
    ],
  },
  {
    section: "1b. Preguntas de LOC",
    label: "Preguntas de LOC",
    instructions: "Pregunte al paciente el mes y su edad. La respuesta debe ser correcta — no hay crédito parcial por estar cerca.",
    options: [
      { label: "Responde correctamente ambas", description: "Responde correctamente ambas preguntas." },
      { label: "Responde correctamente una", description: "Responde correctamente una pregunta." },
      { label: "No responde correctamente ninguna", description: "No responde correctamente ninguna pregunta." },
    ],
  },
  {
    section: "1c. Órdenes de LOC",
    label: "Órdenes de LOC",
    instructions: "Pida al paciente que abra y cierre los ojos y, después, que apriete y suelte la mano no parética.",
    options: [
      { label: "Ejecuta correctamente ambas tareas", description: "Ejecuta correctamente ambas tareas." },
      { label: "Ejecuta correctamente una tarea", description: "Ejecuta correctamente una tarea." },
      { label: "No ejecuta correctamente ninguna tarea", description: "No ejecuta correctamente ninguna tarea." },
    ],
  },
  {
    section: "2. Mejor mirada conjugada",
    label: "Mejor mirada conjugada",
    instructions: "Evalúe solo los movimientos oculares horizontales. Puntúe una paresia de la mirada que se supere con actividad voluntaria o refleja.",
    options: [
      { label: "Normal", description: "Movimientos oculares horizontales normales." },
      { label: "Paresia parcial de la mirada", description: "La mirada es anormal en uno o ambos ojos, pero no hay desviación forzada ni paresia total de la mirada." },
      { label: "Desviación forzada o paresia total de la mirada", description: "Desviación forzada, o paresia total de la mirada, no superada por la maniobra oculocefálica." },
    ],
  },
  {
    section: "3. Campos visuales",
    label: "Campos visuales",
    instructions: "Evalúe los cuadrantes superior e inferior por confrontación, usando conteo de dedos o amenaza visual según corresponda.",
    options: [
      { label: "Sin pérdida visual", description: "Sin pérdida de campo visual." },
      { label: "Hemianopsia parcial", description: "Hemianopsia parcial." },
      { label: "Hemianopsia completa", description: "Hemianopsia completa." },
      { label: "Hemianopsia bilateral", description: "Hemianopsia bilateral, incluyendo ceguera cortical." },
    ],
  },
  {
    section: "4. Parálisis facial",
    label: "Parálisis facial",
    instructions: "Pida, o use pantomima para animar, al paciente a mostrar los dientes o levantar las cejas y cerrar los ojos.",
    options: [
      { label: "Movimiento simétrico normal", description: "Movimiento facial simétrico normal." },
      { label: "Parálisis leve", description: "Parálisis leve — surco nasolabial aplanado, o asimetría al sonreír." },
      { label: "Parálisis parcial", description: "Parálisis parcial — parálisis total o casi total de la cara inferior." },
      { label: "Parálisis completa de uno o ambos lados", description: "Parálisis completa de uno o ambos lados, con ausencia de movimiento facial en la cara superior e inferior." },
    ],
  },
  {
    section: "5. Brazo motor",
    label: "Brazo motor — izquierdo",
    instructions: "Con la palma hacia abajo, mantenga el brazo a 90° (sentado) o 45° (en decúbito) durante 10 segundos. Puntúe la caída del brazo izquierdo.",
    options: [
      { label: "Sin caída", description: "Sin caída; el miembro mantiene la posición durante los 10 segundos completos." },
      { label: "Caída", description: "Caída; el miembro mantiene la posición pero cae antes de los 10 segundos completos, sin tocar la cama u otro apoyo." },
      { label: "Algo de esfuerzo contra la gravedad", description: "El miembro no puede alcanzar o mantener la posición, cae hasta la cama, pero presenta algo de esfuerzo contra la gravedad." },
      { label: "Sin esfuerzo contra la gravedad", description: "Sin esfuerzo contra la gravedad; el miembro cae." },
      { label: "Sin movimiento", description: "Sin ningún movimiento." },
    ],
  },
  {
    section: "5. Brazo motor",
    label: "Brazo motor — derecho",
    instructions: "Con la palma hacia abajo, mantenga el brazo a 90° (sentado) o 45° (en decúbito) durante 10 segundos. Puntúe la caída del brazo derecho.",
    options: [
      { label: "Sin caída", description: "Sin caída; el miembro mantiene la posición durante los 10 segundos completos." },
      { label: "Caída", description: "Caída; el miembro mantiene la posición pero cae antes de los 10 segundos completos, sin tocar la cama u otro apoyo." },
      { label: "Algo de esfuerzo contra la gravedad", description: "El miembro no puede alcanzar o mantener la posición, cae hasta la cama, pero presenta algo de esfuerzo contra la gravedad." },
      { label: "Sin esfuerzo contra la gravedad", description: "Sin esfuerzo contra la gravedad; el miembro cae." },
      { label: "Sin movimiento", description: "Sin ningún movimiento." },
    ],
  },
  {
    section: "6. Pierna motora",
    label: "Pierna motora — izquierda",
    instructions: "En decúbito, eleve la pierna a 30° y mantenga durante 5 segundos. Puntúe la caída de la pierna izquierda.",
    options: [
      { label: "Sin caída", description: "Sin caída; la pierna mantiene la posición a 30° durante los 5 segundos completos." },
      { label: "Caída", description: "Caída; la pierna cae antes de finalizar los 5 segundos, sin tocar la cama." },
      { label: "Algo de esfuerzo contra la gravedad", description: "La pierna cae hasta la cama antes de los 5 segundos, pero presenta algo de esfuerzo contra la gravedad." },
      { label: "Sin esfuerzo contra la gravedad", description: "La pierna cae inmediatamente hasta la cama, sin esfuerzo contra la gravedad." },
      { label: "Sin movimiento", description: "Sin ningún movimiento." },
    ],
  },
  {
    section: "6. Pierna motora",
    label: "Pierna motora — derecha",
    instructions: "En decúbito, eleve la pierna a 30° y mantenga durante 5 segundos. Puntúe la caída de la pierna derecha.",
    options: [
      { label: "Sin caída", description: "Sin caída; la pierna mantiene la posición a 30° durante los 5 segundos completos." },
      { label: "Caída", description: "Caída; la pierna cae antes de finalizar los 5 segundos, sin tocar la cama." },
      { label: "Algo de esfuerzo contra la gravedad", description: "La pierna cae hasta la cama antes de los 5 segundos, pero presenta algo de esfuerzo contra la gravedad." },
      { label: "Sin esfuerzo contra la gravedad", description: "La pierna cae inmediatamente hasta la cama, sin esfuerzo contra la gravedad." },
      { label: "Sin movimiento", description: "Sin ningún movimiento." },
    ],
  },
  {
    section: "7. Ataxia de miembros",
    label: "Ataxia de miembros",
    instructions: "Evalúe con los ojos abiertos, usando las pruebas dedo-nariz-dedo y talón-rodilla-espinilla en ambos lados.",
    options: [
      { label: "Ausente", description: "Ausente." },
      { label: "Presente en un miembro", description: "Ataxia presente en un miembro." },
      { label: "Presente en dos miembros", description: "Ataxia presente en dos miembros." },
    ],
  },
  {
    section: "8. Sensibilidad",
    label: "Sensibilidad",
    instructions: "Evalúe la sensibilidad al pinchazo en la cara, brazo, tronco y pierna, comparando ambos lados.",
    options: [
      { label: "Normal", description: "Normal; sin pérdida de sensibilidad." },
      { label: "Pérdida de sensibilidad leve a moderada", description: "El paciente siente el pinchazo menos agudo o embotado en el lado afectado, o hay pérdida de dolor superficial al pinchazo pero el paciente es consciente de ser tocado." },
      { label: "Pérdida de sensibilidad grave a total", description: "El paciente no es consciente de ser tocado en la cara, el brazo y la pierna." },
    ],
  },
  {
    section: "9. Mejor lenguaje",
    label: "Mejor lenguaje",
    instructions: "Pida al paciente que describa una imagen, nombre objetos y lea frases.",
    options: [
      { label: "Sin afasia", description: "Sin afasia; normal." },
      { label: "Afasia leve a moderada", description: "Alguna pérdida evidente de fluidez o de facilidad de comprensión, sin limitación significativa de las ideas expresadas o de la forma de expresión." },
      { label: "Afasia grave", description: "Toda la comunicación se realiza mediante expresión fragmentaria; gran necesidad de inferencia, preguntas y adivinación por parte del oyente." },
      { label: "Mudo, afasia global", description: "Sin habla utilizable ni comprensión auditiva." },
    ],
  },
  {
    section: "10. Disartria",
    label: "Disartria",
    instructions: "Pida al paciente que lea o repita palabras de una lista estandarizada.",
    options: [
      { label: "Normal", description: "Articulación normal." },
      { label: "Disartria leve a moderada", description: "El paciente arrastra al menos algunas palabras y puede ser comprendido con cierta dificultad." },
      { label: "Disartria grave", description: "El habla del paciente está tan arrastrada que es ininteligible, o el paciente está mudo o anártrico." },
    ],
  },
  {
    section: "11. Extinción e inatención",
    label: "Extinción e inatención",
    instructions: "Utilice información de la evaluación previa para identificar negligencia, o evalúe la estimulación doble simultánea.",
    options: [
      { label: "Sin alteración", description: "Sin alteración." },
      { label: "Inatención o extinción en una modalidad", description: "Inatención visual, táctil, auditiva, espacial o personal, o extinción a la estimulación bilateral simultánea en una modalidad sensorial." },
      { label: "Hemi-inatención profunda o extinción en más de una modalidad", description: "Hemi-inatención profunda, o extinción en más de una modalidad; no reconoce su propia mano, o se orienta solo hacia un lado del espacio." },
    ],
  },
];

const INTERPRETATION_ES = [
  { label: "Sin síntomas de ictus", description: "Sin síntomas de ictus detectados en esta evaluación." },
  { label: "Ictus leve", description: "Déficit neurológico leve." },
  { label: "Ictus moderado", description: "Déficit neurológico moderado." },
  { label: "Ictus moderado a grave", description: "Déficit neurológico moderado a grave." },
  { label: "Ictus grave", description: "Déficit neurológico grave." },
];

const calculationExplanationEs =
  "La puntuación de la NIHSS es la suma de los 15 ítems de exploración puntuados individualmente — nivel de conciencia, preguntas y órdenes de LOC, mirada conjugada, campos visuales, parálisis facial, función motora del brazo y la pierna en cada lado, ataxia de miembros, pérdida de sensibilidad, lenguaje, disartria y extinción/inatención — sobre un máximo de 42. Una puntuación más alta refleja un déficit neurológico más grave; una puntuación de 0 indica ausencia de síntomas de ictus en esta evaluación.";

function mergeInterpretation(sourceBands, translatedBands) {
  return sourceBands.map((band, i) => ({
    ...band,
    label: translatedBands[i].label,
    description: translatedBands[i].description,
  }));
}

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de AVC do NIH",
    description: "Classifica a gravidade do défice neurológico após um AVC agudo em 15 itens de exame, produzindo uma pontuação em 42 usada para prognóstico e para orientar a intensidade dos cuidados pós-agudos.",
    definition: buildDefinition(
      translateItems(ITEMS_EN, TEXT_PT_PT),
      mergeInterpretation(INTERPRETATION_EN, INTERPRETATION_PT_PT),
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de AVC do NIH",
    description: "Classifica a gravidade do déficit neurológico após um AVC agudo em 15 itens de exame, produzindo uma pontuação em 42 usada para prognóstico e para orientar a intensidade dos cuidados pós-agudos.",
    definition: buildDefinition(
      translateItems(ITEMS_EN, TEXT_PT_BR),
      mergeInterpretation(INTERPRETATION_EN, INTERPRETATION_PT_BR),
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Ictus del NIH",
    description: "Clasifica la gravedad del déficit neurológico tras un ictus agudo en 15 ítems de exploración, generando una puntuación sobre 42 utilizada para el pronóstico y para orientar la intensidad de los cuidados posagudos.",
    definition: buildDefinition(
      translateItems(ITEMS_EN, TEXT_ES),
      mergeInterpretation(INTERPRETATION_EN, INTERPRETATION_ES),
      calculationExplanationEs
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

console.log("NIH Stroke Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
