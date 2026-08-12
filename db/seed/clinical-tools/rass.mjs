// Richmond Agitation-Sedation Scale (RASS) — third calculator in the
// "Consciousness & Cognition" category alongside S5Q and Rancho Los
// Amigos. Single-select ordinal, same structural pattern as mRS/
// Rancho, but unlike either of those, RASS is a target-zero scale:
// 0 ("alert and calm") is the best state, and deviation in either
// direction — sedation (-1 to -5) or agitation (+1 to +4) — is worse.
//
// Per an explicit decision with the user, this is authored with NO
// engine change: the 10 levels are discrete interpretation bands with
// hand-picked severities (0 = good, escalating toward both extremes),
// exactly like every other bands-based scale — bands are already
// orientation-agnostic (rendered in authored order, severity chosen
// per band). No descendingGood/target-zero flag is added.
//
// maxScore is deliberately left unset so the engine derives scoreMax
// from the item's own option values (see CalculatorRunner.tsx's
// `scoreMax = definition.maxScore ?? items.reduce(...)`), which
// correctly yields 4; scoreMin is always derived, never stored, and
// correctly yields -5.
//
// Known cosmetic wrinkle (accepted, not fixed, per the "no engine
// change" decision): the single-item "Score by item" bar computes
// width as value/max, which is not meaningful for a negative value —
// for sedation levels (-1 to -5) that bar renders empty/collapsed.
// The Result score, interpretation band, range bar, and calculation
// detail are all unaffected and render correctly regardless of sign.
//
// No dedicated sralab.org page was found for RASS (unlike mRS/Rancho/
// NIHSS) — source citation is given without a url, matching the
// established "never guess a URL" convention (see S5Q).
//
// Usage: node db/seed/clinical-tools/rass.mjs
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

// Ascending value order (-5 first, +4 last) — the range bar's segment
// colors and low/high text labels are positional (bands[0] renders at
// the left/scoreMin end, bands[last] at the right/scoreMax end), so
// bands must be authored ascending regardless of clinical reading
// order. Same convention mRS uses (0 first, 6 last).
const LEVELS_EN = [
  { value: -5, label: "Unarousable", description: "No response to voice or physical stimulation.", severity: "critical" },
  { value: -4, label: "Deep sedation", description: "No response to voice, but movement or eye opening to physical stimulation.", severity: "critical" },
  { value: -3, label: "Moderate sedation", description: "Movement or eye opening to voice, but no eye contact.", severity: "serious" },
  { value: -2, label: "Light sedation", description: "Briefly (less than 10 seconds) awakens with eye contact to voice.", severity: "serious" },
  { value: -1, label: "Drowsy", description: "Not fully alert, but has sustained (more than 10 seconds) awakening, with eye contact, to voice.", severity: "warning" },
  { value: 0, label: "Alert and calm", description: "Alert and calm.", severity: "good" },
  { value: 1, label: "Restless", description: "Anxious but movements not aggressive or vigorous.", severity: "warning" },
  { value: 2, label: "Agitated", description: "Frequent nonpurposeful movement, fights ventilator.", severity: "serious" },
  { value: 3, label: "Very agitated", description: "Pulls or removes tube(s) or catheter(s); aggressive.", severity: "serious" },
  { value: 4, label: "Combative", description: "Overtly combative, violent, immediate danger to staff.", severity: "critical" },
];

function buildDefinition(itemLabel, itemInstructions, levels, calculationExplanation) {
  return {
    items: [
      {
        id: "rass_level",
        label: itemLabel,
        instructions: itemInstructions,
        options: levels.map((l) => ({ value: l.value, label: l.label, description: l.description })),
      },
    ],
    scoring: { method: "sum" },
    interpretation: levels.map((l) => ({
      min: l.value,
      max: l.value,
      label: l.label,
      description: l.description,
      severity: l.severity,
    })),
    calculationExplanation,
    source: {
      citation: "Sessler CN, Gosnell MS, Grap MJ, et al. The Richmond Agitation-Sedation Scale: validity and reliability in adult intensive care unit patients. Am J Respir Crit Care Med. 2002;166(10):1338-1344.",
    },
  };
}

const calculationExplanationEn =
  "The RASS score is the single level — from -5 (unarousable) to +4 (combative) — that best matches the patient's current level of arousal, observed in order: first watch the patient, then, if not already alert, say their name and ask them to look at the speaker, and finally, if there is no response to voice, apply physical stimulation. 0 (alert and calm) is the target state; both agitation (positive scores) and sedation (negative scores) represent a deviation from it.";

const definitionEn = buildDefinition(
  "Level of arousal",
  "Select the single level that best reflects the patient's current level of arousal or agitation.",
  LEVELS_EN,
  calculationExplanationEn
);

const calculatorFields = (definition) => ({
  category_id: categoryId,
  name: "Richmond Agitation-Sedation Scale",
  abbreviation: "RASS",
  description: "Rates a patient's level of sedation or agitation on a single -5 to +4 scale, used in the ICU to titrate sedation toward a calm, alert target state.",
  population: "Critically ill adults, particularly those receiving sedation in the ICU",
  estimated_minutes_min: 1,
  estimated_minutes_max: 2,
  definition: JSON.stringify(definition),
  status: "published",
  position: 2,
});

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "rass", {
  slug: "rass",
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
    "Richmond Agitation-Sedation Scale",
    "RASS",
    "Rates a patient's level of sedation or agitation on a single -5 to +4 scale, used in the ICU to titrate sedation toward a calm, alert target state.",
    "Critically ill adults, particularly those receiving sedation in the ICU",
    1,
    2,
    JSON.stringify(definitionEn),
    "published",
    2,
  ]
);

// ---------- Translations ----------

function translateDefinition(itemLabel, itemInstructions, levels, calculationExplanation) {
  return buildDefinition(itemLabel, itemInstructions, levels, calculationExplanation);
}

const LEVELS_PT_PT = [
  { value: -5, label: "Não despertável", description: "Sem resposta à voz ou à estimulação física.", severity: "critical" },
  { value: -4, label: "Sedação profunda", description: "Sem resposta à voz, mas com movimento ou abertura ocular à estimulação física.", severity: "critical" },
  { value: -3, label: "Sedação moderada", description: "Movimento ou abertura ocular à voz, mas sem contacto visual.", severity: "serious" },
  { value: -2, label: "Sedação ligeira", description: "Desperta brevemente (menos de 10 segundos) com contacto visual à voz.", severity: "serious" },
  { value: -1, label: "Sonolento", description: "Não totalmente alerta, mas desperta de forma sustentada (mais de 10 segundos), com contacto visual, à voz.", severity: "warning" },
  { value: 0, label: "Alerta e calmo", description: "Alerta e calmo.", severity: "good" },
  { value: 1, label: "Inquieto", description: "Ansioso mas os movimentos não são agressivos nem vigorosos.", severity: "warning" },
  { value: 2, label: "Agitado", description: "Movimento não intencional frequente, luta contra o ventilador.", severity: "serious" },
  { value: 3, label: "Muito agitado", description: "Puxa ou remove tubo(s) ou cateter(es); agressivo.", severity: "serious" },
  { value: 4, label: "Combativo", description: "Manifestamente combativo, violento, perigo imediato para a equipa.", severity: "critical" },
];
const calculationExplanationPtPt =
  "A pontuação da RASS corresponde ao nível único — de -5 (não despertável) a +4 (combativo) — que melhor descreve o nível atual de alerta do doente, observado pela seguinte ordem: primeiro observe o doente, depois, se não estiver já alerta, diga o seu nome e peça-lhe para olhar para quem fala e, por fim, se não houver resposta à voz, aplique estimulação física. O 0 (alerta e calmo) é o estado-alvo; tanto a agitação (pontuações positivas) como a sedação (pontuações negativas) representam um desvio em relação a esse estado.";

const LEVELS_PT_BR = [
  { value: -5, label: "Não desperta", description: "Sem resposta à voz ou à estimulação física.", severity: "critical" },
  { value: -4, label: "Sedação profunda", description: "Sem resposta à voz, mas com movimento ou abertura ocular à estimulação física.", severity: "critical" },
  { value: -3, label: "Sedação moderada", description: "Movimento ou abertura ocular à voz, mas sem contato visual.", severity: "serious" },
  { value: -2, label: "Sedação leve", description: "Desperta brevemente (menos de 10 segundos) com contato visual à voz.", severity: "serious" },
  { value: -1, label: "Sonolento", description: "Não totalmente alerta, mas desperta de forma sustentada (mais de 10 segundos), com contato visual, à voz.", severity: "warning" },
  { value: 0, label: "Alerta e calmo", description: "Alerta e calmo.", severity: "good" },
  { value: 1, label: "Inquieto", description: "Ansioso mas os movimentos não são agressivos nem vigorosos.", severity: "warning" },
  { value: 2, label: "Agitado", description: "Movimento não intencional frequente, briga com o ventilador.", severity: "serious" },
  { value: 3, label: "Muito agitado", description: "Puxa ou remove tubo(s) ou cateter(es); agressivo.", severity: "serious" },
  { value: 4, label: "Combativo", description: "Manifestamente combativo, violento, perigo imediato para a equipe.", severity: "critical" },
];
const calculationExplanationPtBr =
  "A pontuação da RASS corresponde ao nível único — de -5 (não desperta) a +4 (combativo) — que melhor descreve o nível atual de alerta do paciente, observado na seguinte ordem: primeiro observe o paciente, depois, se ainda não estiver alerta, diga o seu nome e peça que olhe para quem fala e, por fim, se não houver resposta à voz, aplique estimulação física. O 0 (alerta e calmo) é o estado-alvo; tanto a agitação (pontuações positivas) quanto a sedação (pontuações negativas) representam um desvio em relação a esse estado.";

const LEVELS_ES = [
  { value: -5, label: "No despertable", description: "Sin respuesta a la voz ni a la estimulación física.", severity: "critical" },
  { value: -4, label: "Sedación profunda", description: "Sin respuesta a la voz, pero con movimiento o apertura ocular a la estimulación física.", severity: "critical" },
  { value: -3, label: "Sedación moderada", description: "Movimiento o apertura ocular a la voz, pero sin contacto visual.", severity: "serious" },
  { value: -2, label: "Sedación leve", description: "Despierta brevemente (menos de 10 segundos) con contacto visual a la voz.", severity: "serious" },
  { value: -1, label: "Somnoliento", description: "No totalmente alerta, pero despierta de forma sostenida (más de 10 segundos), con contacto visual, a la voz.", severity: "warning" },
  { value: 0, label: "Alerta y tranquilo", description: "Alerta y tranquilo.", severity: "good" },
  { value: 1, label: "Inquieto", description: "Ansioso pero los movimientos no son agresivos ni vigorosos.", severity: "warning" },
  { value: 2, label: "Agitado", description: "Movimiento no intencionado frecuente, lucha contra el ventilador.", severity: "serious" },
  { value: 3, label: "Muy agitado", description: "Se arranca o retira tubo(s) o catéter(es); agresivo.", severity: "serious" },
  { value: 4, label: "Combativo", description: "Manifiestamente combativo, violento, peligro inmediato para el personal.", severity: "critical" },
];
const calculationExplanationEs =
  "La puntuación de la RASS corresponde al nivel único — de -5 (no despertable) a +4 (combativo) — que mejor describe el nivel actual de alerta del paciente, observado en el siguiente orden: primero observe al paciente, después, si no está ya alerta, diga su nombre y pídale que mire a quien habla y, por último, si no hay respuesta a la voz, aplique estimulación física. El 0 (alerta y tranquilo) es el estado objetivo; tanto la agitación (puntuaciones positivas) como la sedación (puntuaciones negativas) representan una desviación respecto a él.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Agitação-Sedação de Richmond",
    description: "Classifica o nível de sedação ou agitação de um doente numa única escala de -5 a +4, usada na UCI para titular a sedação em direção a um estado-alvo calmo e alerta.",
    definition: translateDefinition(
      "Nível de alerta",
      "Selecione o nível único que melhor reflete o nível atual de alerta ou agitação do doente.",
      LEVELS_PT_PT,
      calculationExplanationPtPt
    ),
  },
  {
    locale: "pt-br",
    name: "Escala de Agitação-Sedação de Richmond",
    description: "Classifica o nível de sedação ou agitação de um paciente em uma única escala de -5 a +4, usada na UTI para titular a sedação em direção a um estado-alvo calmo e alerta.",
    definition: translateDefinition(
      "Nível de alerta",
      "Selecione o nível único que melhor reflete o nível atual de alerta ou agitação do paciente.",
      LEVELS_PT_BR,
      calculationExplanationPtBr
    ),
  },
  {
    locale: "es",
    name: "Escala de Agitación-Sedación de Richmond",
    description: "Clasifica el nivel de sedación o agitación de un paciente en una única escala de -5 a +4, utilizada en la UCI para titular la sedación hacia un estado objetivo tranquilo y alerta.",
    definition: translateDefinition(
      "Nivel de alerta",
      "Seleccione el nivel único que mejor refleje el nivel actual de alerta o agitación del paciente.",
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

console.log("Richmond Agitation-Sedation Scale seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
