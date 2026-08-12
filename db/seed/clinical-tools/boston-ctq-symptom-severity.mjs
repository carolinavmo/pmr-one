// Boston Carpal Tunnel Questionnaire (BCTQ) — Symptom Severity Scale.
// Fourth calculator in "Upper Limb Function", fourth to exercise
// formula scoring (the shared "mean" formula, registered alongside
// the Functional Status Scale in calculator-scoring.ts).
//
// The BCTQ is officially two separate scales — Symptom Severity (11
// items) and Functional Status (8 items) — conventionally reported
// and interpreted separately, not combined into one BCTQ score. Kept
// as two calculators here for the same reason, mirroring how this app
// already treats closely-related-but-distinct instruments (Katz ADL/
// Lawton-Brody, FIM/FIM+FAM) as separate entries rather than forcing
// them into one.
//
// Each item is rated 1 (mildest/no difficulty) to 5 (most severe),
// asking about the past 2 weeks. Score is the plain mean of the 11
// items — stays on the 1-5 scale, unlike DASH/SPADI/PRWE's 0-100
// transforms. descendingGood: true (1 = best on every item).
//
// Free to use, no licensing fees or copyright restrictions (Levine et
// al. 1993); no proprietary flag needed. No dedicated sralab.org page
// was found — source is given without a url.
//
// Usage: node db/seed/clinical-tools/boston-ctq-symptom-severity.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "upper-limb-function", {
  slug: "upper-limb-function",
  name: "Upper Limb Function",
  color: "rose",
  position: 4,
});

// ---------- Definition (English source) ----------

const SEVERITY_EN = [
  { value: 1, label: "None or mild" },
  { value: 2, label: "Mild" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Severe" },
  { value: 5, label: "Very severe" },
];
const FREQUENCY_EN = [
  { value: 1, label: "Never" },
  { value: 2, label: "Once" },
  { value: 3, label: "2-3 times" },
  { value: 4, label: "4-5 times" },
  { value: 5, label: "More than 5 times" },
];
const DAYTIME_FREQUENCY_EN = [
  { value: 1, label: "Never" },
  { value: 2, label: "Once or twice a day" },
  { value: 3, label: "3-5 times a day" },
  { value: 4, label: "More than 5 times a day" },
  { value: 5, label: "Constantly" },
];
const DURATION_EN = [
  { value: 1, label: "None" },
  { value: 2, label: "Less than 10 minutes" },
  { value: 3, label: "10 to 60 minutes" },
  { value: 4, label: "More than 60 minutes" },
  { value: 5, label: "Constantly, all the time" },
];
const YES_NO_SEVERITY_EN = [
  { value: 1, label: "No" },
  { value: 2, label: "Mild" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Severe" },
  { value: 5, label: "Very severe" },
];

const ITEMS_EN = [
  { id: "night_pain_severity", label: "Severity of pain in your hand or wrist at night, over the past 2 weeks", rubric: "severity" },
  { id: "night_pain_frequency", label: "How many times did hand or wrist pain wake you during a typical night, over the past 2 weeks", rubric: "frequency" },
  { id: "day_pain_typical", label: "Typical pain in your hand or wrist during the daytime, over the past 2 weeks", rubric: "severity" },
  { id: "day_pain_frequency", label: "How often you have hand or wrist pain during the daytime, over the past 2 weeks", rubric: "daytime_frequency" },
  { id: "day_pain_duration", label: "How long an average episode of daytime pain lasts, over the past 2 weeks", rubric: "duration" },
  { id: "numbness", label: "Numbness (loss of sensation) in your hand, over the past 2 weeks", rubric: "yes_no_severity" },
  { id: "weakness", label: "Weakness in your hand or wrist, over the past 2 weeks", rubric: "yes_no_severity" },
  { id: "tingling", label: "Tingling sensation in your hand, over the past 2 weeks", rubric: "yes_no_severity" },
  { id: "night_numbness_severity", label: "Severity of numbness or tingling at night, over the past 2 weeks", rubric: "severity" },
  { id: "night_numbness_frequency", label: "How many times did hand numbness or tingling wake you during a typical night, over the past 2 weeks", rubric: "frequency" },
  { id: "grasping_difficulty", label: "Difficulty with grasping and using small objects such as keys or pens, over the past 2 weeks", rubric: "yes_no_severity" },
];

function buildDefinition(items, rubrics, calculationExplanation, resultNote) {
  return {
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      options: rubrics[item.rubric],
    })),
    scoring: { method: "formula", formula: "mean" },
    minScore: 1,
    maxScore: 5,
    descendingGood: true,
    calculationExplanation,
    resultNote,
    source: {
      citation: "Levine DW, Simmons BP, Koris MJ, et al. A self-administered questionnaire for the assessment of severity of symptoms and functional status in carpal tunnel syndrome. J Bone Joint Surg Am. 1993;75(11):1585-1592.",
    },
  };
}

const calculationExplanationEn =
  "The Symptom Severity Scale score is the mean of the 11 items, each rated from 1 (mildest) to 5 (most severe), asking about pain, numbness, tingling, and weakness in the hand or wrist over the past 2 weeks. The result stays on the same 1 to 5 scale as the individual items — it is not converted to a 0-100 score. All 11 items must be answered. This is one of the two BCTQ subscales; the Functional Status Scale is scored and reported separately.";

const resultNoteEn = {
  label: "A higher score corresponds to more severe symptoms.",
  description: "Score and interpretation should always be contextualized clinically.",
  lowLabel: "Milder symptoms",
  highLabel: "More severe symptoms",
};

const RUBRICS_EN = {
  severity: SEVERITY_EN,
  frequency: FREQUENCY_EN,
  daytime_frequency: DAYTIME_FREQUENCY_EN,
  duration: DURATION_EN,
  yes_no_severity: YES_NO_SEVERITY_EN,
};

const definitionEn = buildDefinition(ITEMS_EN, RUBRICS_EN, calculationExplanationEn, resultNoteEn);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Boston Carpal Tunnel Questionnaire — Symptom Severity Scale",
  abbreviation: "BCTQ-SSS",
  description: "Measures the severity of carpal tunnel symptoms — pain, numbness, tingling, and weakness — across 11 items, producing a mean score from 1 to 5.",
  population: "Adults with suspected or confirmed carpal tunnel syndrome",
  estimated_minutes_min: 3,
  estimated_minutes_max: 5,
  definition: JSON.stringify(definition),
  status: "published",
  position: 3,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "boston-ctq-symptom-severity", {
  slug: "boston-ctq-symptom-severity",
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
    "Boston Carpal Tunnel Questionnaire — Symptom Severity Scale",
    "BCTQ-SSS",
    "Measures the severity of carpal tunnel symptoms — pain, numbness, tingling, and weakness — across 11 items, producing a mean score from 1 to 5.",
    "Adults with suspected or confirmed carpal tunnel syndrome",
    3,
    5,
    JSON.stringify(definitionEn),
    "published",
    3,
  ]
);

// ---------- Translations ----------

function translateDefinition(items, rubrics, calculationExplanation, resultNote) {
  return buildDefinition(items, rubrics, calculationExplanation, resultNote);
}

const SEVERITY_PT_PT = [
  { value: 1, label: "Nenhuma ou ligeira" },
  { value: 2, label: "Ligeira" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Muito grave" },
];
const FREQUENCY_PT_PT = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Uma vez" },
  { value: 3, label: "2 a 3 vezes" },
  { value: 4, label: "4 a 5 vezes" },
  { value: 5, label: "Mais de 5 vezes" },
];
const DAYTIME_FREQUENCY_PT_PT = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Uma ou duas vezes por dia" },
  { value: 3, label: "3 a 5 vezes por dia" },
  { value: 4, label: "Mais de 5 vezes por dia" },
  { value: 5, label: "Constantemente" },
];
const DURATION_PT_PT = [
  { value: 1, label: "Nenhuma" },
  { value: 2, label: "Menos de 10 minutos" },
  { value: 3, label: "10 a 60 minutos" },
  { value: 4, label: "Mais de 60 minutos" },
  { value: 5, label: "Constantemente, o tempo todo" },
];
const YES_NO_SEVERITY_PT_PT = [
  { value: 1, label: "Não" },
  { value: 2, label: "Ligeira" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Muito grave" },
];
const ITEMS_PT_PT = [
  { label: "Intensidade da dor na mão ou pulso durante a noite, nas últimas 2 semanas" },
  { label: "Quantas vezes a dor na mão ou pulso o(a) acordou durante uma noite típica, nas últimas 2 semanas" },
  { label: "Dor típica na mão ou pulso durante o dia, nas últimas 2 semanas" },
  { label: "Com que frequência tem dor na mão ou pulso durante o dia, nas últimas 2 semanas" },
  { label: "Quanto tempo dura, em média, um episódio de dor diurna, nas últimas 2 semanas" },
  { label: "Adormecimento (perda de sensibilidade) na mão, nas últimas 2 semanas" },
  { label: "Fraqueza na mão ou pulso, nas últimas 2 semanas" },
  { label: "Sensação de formigueiro na mão, nas últimas 2 semanas" },
  { label: "Intensidade do adormecimento ou formigueiro durante a noite, nas últimas 2 semanas" },
  { label: "Quantas vezes o adormecimento ou formigueiro na mão o(a) acordou durante uma noite típica, nas últimas 2 semanas" },
  { label: "Dificuldade em agarrar e usar objetos pequenos, como chaves ou canetas, nas últimas 2 semanas" },
];
const calculationExplanationPtPt =
  "A pontuação da Escala de Gravidade dos Sintomas é a média dos 11 itens, cada um classificado de 1 (mais leve) a 5 (mais grave), sobre dor, adormecimento, formigueiro e fraqueza na mão ou pulso nas últimas 2 semanas. O resultado mantém-se na mesma escala de 1 a 5 dos itens individuais — não é convertido numa pontuação de 0 a 100. Todos os 11 itens têm de ser respondidos. Esta é uma das duas subescalas do BCTQ; a Escala de Estado Funcional é pontuada e reportada separadamente.";
const resultNotePtPt = {
  label: "Uma pontuação mais elevada corresponde a sintomas mais graves.",
  description: "Pontuação e interpretação devem ser sempre contextualizadas clinicamente.",
  lowLabel: "Sintomas mais ligeiros",
  highLabel: "Sintomas mais graves",
};

const SEVERITY_PT_BR = [
  { value: 1, label: "Nenhuma ou leve" },
  { value: 2, label: "Leve" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Muito grave" },
];
const FREQUENCY_PT_BR = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Uma vez" },
  { value: 3, label: "2 a 3 vezes" },
  { value: 4, label: "4 a 5 vezes" },
  { value: 5, label: "Mais de 5 vezes" },
];
const DAYTIME_FREQUENCY_PT_BR = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Uma ou duas vezes por dia" },
  { value: 3, label: "3 a 5 vezes por dia" },
  { value: 4, label: "Mais de 5 vezes por dia" },
  { value: 5, label: "Constantemente" },
];
const DURATION_PT_BR = [
  { value: 1, label: "Nenhuma" },
  { value: 2, label: "Menos de 10 minutos" },
  { value: 3, label: "10 a 60 minutos" },
  { value: 4, label: "Mais de 60 minutos" },
  { value: 5, label: "Constantemente, o tempo todo" },
];
const YES_NO_SEVERITY_PT_BR = [
  { value: 1, label: "Não" },
  { value: 2, label: "Leve" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Muito grave" },
];
const ITEMS_PT_BR = [
  { label: "Intensidade da dor na mão ou punho durante a noite, nas últimas 2 semanas" },
  { label: "Quantas vezes a dor na mão ou punho te acordou durante uma noite típica, nas últimas 2 semanas" },
  { label: "Dor típica na mão ou punho durante o dia, nas últimas 2 semanas" },
  { label: "Com que frequência você tem dor na mão ou punho durante o dia, nas últimas 2 semanas" },
  { label: "Quanto tempo dura, em média, um episódio de dor diurna, nas últimas 2 semanas" },
  { label: "Dormência (perda de sensibilidade) na mão, nas últimas 2 semanas" },
  { label: "Fraqueza na mão ou punho, nas últimas 2 semanas" },
  { label: "Sensação de formigamento na mão, nas últimas 2 semanas" },
  { label: "Intensidade da dormência ou formigamento durante a noite, nas últimas 2 semanas" },
  { label: "Quantas vezes a dormência ou formigamento na mão te acordou durante uma noite típica, nas últimas 2 semanas" },
  { label: "Dificuldade em segurar e usar objetos pequenos, como chaves ou canetas, nas últimas 2 semanas" },
];
const calculationExplanationPtBr =
  "A pontuação da Escala de Gravidade dos Sintomas é a média dos 11 itens, cada um classificado de 1 (mais leve) a 5 (mais grave), sobre dor, dormência, formigamento e fraqueza na mão ou punho nas últimas 2 semanas. O resultado permanece na mesma escala de 1 a 5 dos itens individuais — não é convertido em uma pontuação de 0 a 100. Todos os 11 itens precisam ser respondidos. Esta é uma das duas subescalas do BCTQ; a Escala de Status Funcional é pontuada e reportada separadamente.";
const resultNotePtBr = {
  label: "Uma pontuação mais alta corresponde a sintomas mais graves.",
  description: "A pontuação e a interpretação devem sempre ser contextualizadas clinicamente.",
  lowLabel: "Sintomas mais leves",
  highLabel: "Sintomas mais graves",
};

const SEVERITY_ES = [
  { value: 1, label: "Ninguna o leve" },
  { value: 2, label: "Leve" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Muy grave" },
];
const FREQUENCY_ES = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Una vez" },
  { value: 3, label: "2 a 3 veces" },
  { value: 4, label: "4 a 5 veces" },
  { value: 5, label: "Más de 5 veces" },
];
const DAYTIME_FREQUENCY_ES = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Una o dos veces al día" },
  { value: 3, label: "3 a 5 veces al día" },
  { value: 4, label: "Más de 5 veces al día" },
  { value: 5, label: "Constantemente" },
];
const DURATION_ES = [
  { value: 1, label: "Ninguna" },
  { value: 2, label: "Menos de 10 minutos" },
  { value: 3, label: "10 a 60 minutos" },
  { value: 4, label: "Más de 60 minutos" },
  { value: 5, label: "Constantemente, todo el tiempo" },
];
const YES_NO_SEVERITY_ES = [
  { value: 1, label: "No" },
  { value: 2, label: "Leve" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Grave" },
  { value: 5, label: "Muy grave" },
];
const ITEMS_ES = [
  { label: "Intensidad del dolor en la mano o muñeca por la noche, en las últimas 2 semanas" },
  { label: "Cuántas veces el dolor en la mano o muñeca le despertó durante una noche típica, en las últimas 2 semanas" },
  { label: "Dolor típico en la mano o muñeca durante el día, en las últimas 2 semanas" },
  { label: "Con qué frecuencia tiene dolor en la mano o muñeca durante el día, en las últimas 2 semanas" },
  { label: "Cuánto dura, en promedio, un episodio de dolor diurno, en las últimas 2 semanas" },
  { label: "Entumecimiento (pérdida de sensibilidad) en la mano, en las últimas 2 semanas" },
  { label: "Debilidad en la mano o muñeca, en las últimas 2 semanas" },
  { label: "Sensación de hormigueo en la mano, en las últimas 2 semanas" },
  { label: "Intensidad del entumecimiento u hormigueo durante la noche, en las últimas 2 semanas" },
  { label: "Cuántas veces el entumecimiento u hormigueo en la mano le despertó durante una noche típica, en las últimas 2 semanas" },
  { label: "Dificultad para agarrar y usar objetos pequeños, como llaves o bolígrafos, en las últimas 2 semanas" },
];
const calculationExplanationEs =
  "La puntuación de la Escala de Gravedad de los Síntomas es la media de los 11 ítems, cada uno calificado de 1 (más leve) a 5 (más grave), sobre dolor, entumecimiento, hormigueo y debilidad en la mano o muñeca en las últimas 2 semanas. El resultado se mantiene en la misma escala de 1 a 5 que los ítems individuales — no se convierte en una puntuación de 0 a 100. Los 11 ítems deben responderse. Esta es una de las dos subescalas del BCTQ; la Escala de Estado Funcional se puntúa y reporta por separado.";
const resultNoteEs = {
  label: "Una puntuación más alta corresponde a síntomas más graves.",
  description: "La puntuación y la interpretación deben contextualizarse siempre clínicamente.",
  lowLabel: "Síntomas más leves",
  highLabel: "Síntomas más graves",
};

function mergeItems(sourceItems, translatedItems) {
  return sourceItems.map((item, i) => ({ ...item, ...translatedItems[i] }));
}

const translations = [
  {
    locale: "pt-pt",
    name: "Questionário de Boston para o Túnel Cárpico — Escala de Gravidade dos Sintomas",
    description: "Mede a gravidade dos sintomas do túnel cárpico em 11 itens, produzindo uma pontuação média de 1 a 5.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_PT),
      { severity: SEVERITY_PT_PT, frequency: FREQUENCY_PT_PT, daytime_frequency: DAYTIME_FREQUENCY_PT_PT, duration: DURATION_PT_PT, yes_no_severity: YES_NO_SEVERITY_PT_PT },
      calculationExplanationPtPt,
      resultNotePtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Questionário de Boston para Túnel do Carpo — Escala de Gravidade dos Sintomas",
    description: "Mede a gravidade dos sintomas da síndrome do túnel do carpo em 11 itens, gerando uma pontuação média de 1 a 5.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_PT_BR),
      { severity: SEVERITY_PT_BR, frequency: FREQUENCY_PT_BR, daytime_frequency: DAYTIME_FREQUENCY_PT_BR, duration: DURATION_PT_BR, yes_no_severity: YES_NO_SEVERITY_PT_BR },
      calculationExplanationPtBr,
      resultNotePtBr
    ),
  },
  {
    locale: "es",
    name: "Cuestionario de Boston para el Túnel Carpiano — Escala de Gravedad de los Síntomas",
    description: "Mide la gravedad de los síntomas del túnel carpiano en 11 ítems, generando una puntuación media de 1 a 5.",
    definition: translateDefinition(
      mergeItems(ITEMS_EN, ITEMS_ES),
      { severity: SEVERITY_ES, frequency: FREQUENCY_ES, daytime_frequency: DAYTIME_FREQUENCY_ES, duration: DURATION_ES, yes_no_severity: YES_NO_SEVERITY_ES },
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

console.log("Boston CTQ Symptom Severity Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
