// Rancho Los Amigos Scale, Levels of Cognitive Functioning — second
// calculator in the new "Consciousness & Cognition" category (created
// alongside S5Q, see s5q.mjs). Same "single-select ordinal" structural
// pattern as Modified Rankin Scale (modified-rankin-scale.mjs): one
// item, pick exactly one of 8 levels, the result *is* that level's
// value — `scoring: {method:"sum"}` over one item works unchanged.
//
// Unlike mRS, this scale is ascending-good (level I = worst/no
// response, level VIII = best/purposeful-appropriate), so
// descendingGood is left unset (defaults to ascending in the engine).
//
// Usage: node db/seed/clinical-tools/rancho-los-amigos.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "consciousness-cognition", {
  slug: "consciousness-cognition",
  name: "Consciousness & Cognition",
  color: "indigo",
  position: 3,
});

// ---------- Definition (English source) ----------

// Same 8 levels used for both the item's answer options and the
// interpretation bands — matching the mRS precedent.
const LEVELS_EN = [
  { value: 1, label: "No response — total assistance", description: "Complete absence of observable response to visual, auditory, tactile, or noxious stimuli." },
  { value: 2, label: "Generalized response — total assistance", description: "Reacts inconsistently and non-purposefully to stimuli in a non-specific manner; responses are limited to physiological changes, gross body movements, and/or vocalization." },
  { value: 3, label: "Localized response — total assistance", description: "Reacts specifically but inconsistently to stimuli, such as turning toward a sound or focusing on an object; may follow simple commands inconsistently." },
  { value: 4, label: "Confused, agitated — maximal assistance", description: "Heightened state of activity with severely decreased ability to process information; behavior is bizarre and non-purposeful relative to the immediate environment, and may include aggression." },
  { value: 5, label: "Confused, inappropriate, non-agitated — maximal assistance", description: "Appears alert and responds to simple commands fairly consistently, but with increased task complexity, responses become non-purposeful, random, or fragmented; attention to the environment is inconsistent." },
  { value: 6, label: "Confused, appropriate — moderate assistance", description: "Shows goal-directed behavior but depends on external cues for direction; follows simple instructions consistently and shows carry-over for relearned tasks, though memory for ongoing activity remains inconsistent." },
  { value: 7, label: "Automatic, appropriate — minimal assistance for daily living", description: "Appears appropriate and oriented within the hospital and home setting; carries out daily routines automatically with minimal to absent confusion, though recall of activities is shallow." },
  { value: 8, label: "Purposeful, appropriate — stand-by assistance", description: "Alert and oriented, able to recall and integrate past and recent events, and aware of and responsive to the environment; may still require stand-by assistance for abstract reasoning in unusual or stressful situations." },
];
const SEVERITIES = ["critical", "critical", "serious", "serious", "warning", "warning", "good", "good"];

function buildDefinition(itemLabel, itemInstructions, levels, calculationExplanation) {
  return {
    items: [
      {
        id: "rancho_level",
        label: itemLabel,
        instructions: itemInstructions,
        options: levels.map((l) => ({ value: l.value, label: l.label, description: l.description })),
      },
    ],
    scoring: { method: "sum" },
    maxScore: 8,
    interpretation: levels.map((l, i) => ({
      min: l.value,
      max: l.value,
      label: l.label,
      description: l.description,
      severity: SEVERITIES[i],
    })),
    calculationExplanation,
    source: {
      citation: "Hagen C, Malkmus D, Durham P. Levels of Cognitive Functioning. Rehabilitation Services, Rancho Los Amigos Hospital, Downey, CA. 1972 (rev. 1997).",
      url: "https://www.sralab.org/rehabilitation-measures/rancho-levels-cognitive-functioning-3rd-edition-1998",
    },
  };
}

const calculationExplanationEn =
  "The Rancho Los Amigos score is the single level — from I (no response) to VIII (purposeful, appropriate) — that best matches the patient's current cognitive and behavioral functioning. Like the modified Rankin Scale, it is one global clinical judgment rather than a sum of multiple item scores, based on the patient's responsiveness, orientation, and the level of assistance required.";

const definitionEn = buildDefinition(
  "Level of cognitive functioning",
  "Select the single level that best reflects the patient's current cognitive and behavioral functioning, considering responsiveness, orientation, and the level of assistance required.",
  LEVELS_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Rancho Los Amigos Scale",
  abbreviation: "RLAS",
  description: "Rates a patient's level of cognitive and behavioral recovery after brain injury on a single I–VIII scale, from no response to purposeful and appropriate function.",
  population: "Adults and children recovering from traumatic or acquired brain injury, particularly during post-acute and inpatient rehabilitation",
  estimated_minutes_min: 2,
  estimated_minutes_max: 5,
  definition: JSON.stringify(definition),
  status: "published",
  position: 1,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "rancho-los-amigos", {
  slug: "rancho-los-amigos",
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
    "Rancho Los Amigos Scale",
    "RLAS",
    "Rates a patient's level of cognitive and behavioral recovery after brain injury on a single I–VIII scale, from no response to purposeful and appropriate function.",
    "Adults and children recovering from traumatic or acquired brain injury, particularly during post-acute and inpatient rehabilitation",
    2,
    5,
    JSON.stringify(definitionEn),
    "published",
    1,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemLabel, itemInstructions, levels, calculationExplanation) {
  return buildDefinition(itemLabel, itemInstructions, levels, calculationExplanation);
}

const LEVELS_PT_PT = [
  { value: 1, label: "Sem resposta — assistência total", description: "Ausência completa de resposta observável a estímulos visuais, auditivos, táteis ou nocivos." },
  { value: 2, label: "Resposta generalizada — assistência total", description: "Reage de forma inconsistente e não intencional aos estímulos, de modo inespecífico; as respostas limitam-se a alterações fisiológicas, movimentos corporais grosseiros e/ou vocalização." },
  { value: 3, label: "Resposta localizada — assistência total", description: "Reage de forma específica mas inconsistente aos estímulos, como virar-se para um som ou focar um objeto; pode seguir comandos simples de forma inconsistente." },
  { value: 4, label: "Confuso, agitado — assistência máxima", description: "Estado de atividade aumentada com capacidade gravemente diminuída de processar informação; o comportamento é bizarro e não intencional em relação ao ambiente imediato, podendo incluir agressividade." },
  { value: 5, label: "Confuso, inadequado, não agitado — assistência máxima", description: "Parece alerta e responde a comandos simples com relativa consistência, mas perante maior complexidade as respostas tornam-se não intencionais, aleatórias ou fragmentadas; a atenção ao ambiente é inconsistente." },
  { value: 6, label: "Confuso, adequado — assistência moderada", description: "Mostra comportamento orientado para objetivos, mas depende de indicações externas; segue instruções simples de forma consistente e demonstra retenção em tarefas reaprendidas, embora a memória para a atividade em curso permaneça inconsistente." },
  { value: 7, label: "Automático, adequado — assistência mínima nas atividades diárias", description: "Parece adequado e orientado no ambiente hospitalar e doméstico; realiza rotinas diárias de forma automática, com confusão mínima a ausente, embora a recordação das atividades seja superficial." },
  { value: 8, label: "Intencional, adequado — supervisão à distância", description: "Alerta e orientado, capaz de recordar e integrar acontecimentos passados e recentes, e atento e responsivo ao ambiente; pode ainda necessitar de supervisão à distância para raciocínio abstrato em situações invulgares ou de maior stress." },
];
const calculationExplanationPtPt =
  "A pontuação da Escala de Rancho Los Amigos corresponde ao nível único — de I (sem resposta) a VIII (intencional, adequado) — que melhor descreve o funcionamento cognitivo e comportamental atual do doente. Tal como a Escala de Rankin modificada, trata-se de um único julgamento clínico global, e não da soma de vários itens, baseado na capacidade de resposta, na orientação e no nível de assistência necessário.";

const LEVELS_PT_BR = [
  { value: 1, label: "Sem resposta — assistência total", description: "Ausência completa de resposta observável a estímulos visuais, auditivos, táteis ou nocivos." },
  { value: 2, label: "Resposta generalizada — assistência total", description: "Reage de forma inconsistente e não intencional aos estímulos, de modo inespecífico; as respostas limitam-se a alterações fisiológicas, movimentos corporais grosseiros e/ou vocalização." },
  { value: 3, label: "Resposta localizada — assistência total", description: "Reage de forma específica mas inconsistente aos estímulos, como virar-se para um som ou focar um objeto; pode seguir comandos simples de forma inconsistente." },
  { value: 4, label: "Confuso, agitado — assistência máxima", description: "Estado de atividade aumentada com capacidade gravemente diminuída de processar informação; o comportamento é bizarro e não intencional em relação ao ambiente imediato, podendo incluir agressividade." },
  { value: 5, label: "Confuso, inadequado, não agitado — assistência máxima", description: "Parece alerta e responde a comandos simples com relativa consistência, mas diante de maior complexidade as respostas tornam-se não intencionais, aleatórias ou fragmentadas; a atenção ao ambiente é inconsistente." },
  { value: 6, label: "Confuso, adequado — assistência moderada", description: "Mostra comportamento orientado a objetivos, mas depende de pistas externas; segue instruções simples de forma consistente e demonstra retenção em tarefas reaprendidas, embora a memória para a atividade em curso permaneça inconsistente." },
  { value: 7, label: "Automático, adequado — assistência mínima nas atividades diárias", description: "Parece adequado e orientado no ambiente hospitalar e domiciliar; realiza rotinas diárias de forma automática, com confusão mínima a ausente, embora a lembrança das atividades seja superficial." },
  { value: 8, label: "Intencional, adequado — supervisão à distância", description: "Alerta e orientado, capaz de lembrar e integrar acontecimentos passados e recentes, e atento e responsivo ao ambiente; ainda pode necessitar de supervisão à distância para raciocínio abstrato em situações incomuns ou de maior estresse." },
];
const calculationExplanationPtBr =
  "A pontuação da Escala de Rancho Los Amigos corresponde ao nível único — de I (sem resposta) a VIII (intencional, adequado) — que melhor descreve o funcionamento cognitivo e comportamental atual do paciente. Assim como a Escala de Rankin modificada, trata-se de um único julgamento clínico global, e não da soma de vários itens, baseado na capacidade de resposta, na orientação e no nível de assistência necessário.";

const LEVELS_ES = [
  { value: 1, label: "Sin respuesta — asistencia total", description: "Ausencia completa de respuesta observable a estímulos visuales, auditivos, táctiles o nocivos." },
  { value: 2, label: "Respuesta generalizada — asistencia total", description: "Reacciona de forma inconsistente y no intencional a los estímulos, de manera inespecífica; las respuestas se limitan a cambios fisiológicos, movimientos corporales groseros y/o vocalización." },
  { value: 3, label: "Respuesta localizada — asistencia total", description: "Reacciona de forma específica pero inconsistente a los estímulos, como girarse hacia un sonido o enfocar un objeto; puede seguir órdenes simples de forma inconsistente." },
  { value: 4, label: "Confuso, agitado — asistencia máxima", description: "Estado de actividad aumentada con capacidad gravemente disminuida para procesar información; el comportamiento es extraño y no intencional en relación con el entorno inmediato, y puede incluir agresividad." },
  { value: 5, label: "Confuso, inadecuado, no agitado — asistencia máxima", description: "Parece alerta y responde a órdenes simples con relativa consistencia, pero ante mayor complejidad las respuestas se vuelven no intencionales, aleatorias o fragmentadas; la atención al entorno es inconsistente." },
  { value: 6, label: "Confuso, adecuado — asistencia moderada", description: "Muestra un comportamiento orientado a objetivos, pero depende de indicaciones externas; sigue instrucciones simples de forma consistente y muestra retención en tareas reaprendidas, aunque la memoria para la actividad en curso sigue siendo inconsistente." },
  { value: 7, label: "Automático, adecuado — asistencia mínima en actividades diarias", description: "Parece adecuado y orientado en el entorno hospitalario y doméstico; realiza rutinas diarias de forma automática, con confusión mínima a ausente, aunque el recuerdo de las actividades es superficial." },
  { value: 8, label: "Intencional, adecuado — supervisión a distancia", description: "Alerta y orientado, capaz de recordar e integrar acontecimientos pasados y recientes, y atento y receptivo al entorno; puede seguir necesitando supervisión a distancia para el razonamiento abstracto en situaciones inusuales o de mayor estrés." },
];
const calculationExplanationEs =
  "La puntuación de la Escala de Rancho Los Amigos corresponde al nivel único — de I (sin respuesta) a VIII (intencional, adecuado) — que mejor describe el funcionamiento cognitivo y conductual actual del paciente. Al igual que la Escala de Rankin modificada, es un único juicio clínico global, y no la suma de varios ítems, basado en la capacidad de respuesta, la orientación y el nivel de asistencia necesario.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Rancho Los Amigos",
    description: "Classifica o nível de recuperação cognitiva e comportamental de um doente após lesão cerebral numa única escala de I a VIII, desde ausência de resposta até funcionamento intencional e adequado.",
    definition: translateDefinition(
      "Nível de funcionamento cognitivo",
      "Selecione o nível único que melhor reflete o funcionamento cognitivo e comportamental atual do doente, considerando a capacidade de resposta, a orientação e o nível de assistência necessário.",
      LEVELS_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Rancho Los Amigos",
    description: "Classifica o nível de recuperação cognitiva e comportamental de um paciente após lesão cerebral em uma única escala de I a VIII, desde ausência de resposta até funcionamento intencional e adequado.",
    definition: translateDefinition(
      "Nível de funcionamento cognitivo",
      "Selecione o nível único que melhor reflete o funcionamento cognitivo e comportamental atual do paciente, considerando a capacidade de resposta, a orientação e o nível de assistência necessário.",
      LEVELS_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Rancho Los Amigos",
    description: "Clasifica el nivel de recuperación cognitiva y conductual de un paciente tras una lesión cerebral en una única escala de I a VIII, desde ausencia de respuesta hasta funcionamiento intencional y adecuado.",
    definition: translateDefinition(
      "Nivel de funcionamiento cognitivo",
      "Seleccione el nivel único que mejor refleje el funcionamiento cognitivo y conductual actual del paciente, considerando la capacidad de respuesta, la orientación y el nivel de asistencia necesario.",
      LEVELS_ES,
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

console.log("Rancho Los Amigos Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
