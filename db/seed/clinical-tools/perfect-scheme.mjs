// PERFECT Scheme (Laycock & Jerwood, 2001) — sixth and final
// calculator in "Pelvic Floor Rehabilitation". Captures the 4
// measurable components of pelvic floor muscle assessment via digital
// palpation: Power (0-5, Modified Oxford Scale), Endurance (seconds
// held, up to 10), Repetitions (near-maximal contractions repeated, up
// to 10), and Fast contractions (quick 1-second contractions, up to
// 10). The 5th letter, ECT ("Every Contraction Timed"), is a testing-
// protocol rule — equal rest between contractions — not a score, so
// it isn't represented as an item here.
//
// IMPORTANT: the original PERFECT paper does NOT define a single
// combined/total score — it is explicitly a profile-based measure,
// reported as separate component values (e.g. "Power 3, Endurance 6s,
// Repetitions 4, Fast 3"), not summed into one interpretable number.
// This calculator still sums the 4 components (max 35) so the app's
// single-score engine can render it, but calculationExplanation and
// resultNote both state plainly that this composite is a non-standard
// tracking aid, not a validated PERFECT total — the same "clearly
// caveated, non-fabricated" approach used for Tardieu's partial scope.
//
// A classic, freely-reproduced academic assessment protocol (Laycock &
// Jerwood, 2001) — no proprietary flag is set.
//
// Usage: node db/seed/clinical-tools/perfect-scheme.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "pelvic-floor-rehabilitation", {
  slug: "pelvic-floor-rehabilitation",
  name: "Pelvic Floor Rehabilitation",
  color: "pink",
  position: 9,
});

const POWER_EN = [
  { value: 0, label: "0", description: "No contraction." },
  { value: 1, label: "1", description: "Flicker." },
  { value: 2, label: "2", description: "Weak, without lift." },
  { value: 3, label: "3", description: "Moderate, with some lift or squeeze." },
  { value: 4, label: "4", description: "Good, with lift and some resistance." },
  { value: 5, label: "5", description: "Strong, with firm lift and squeeze against resistance." },
];
const countOptions = (max, suffix = "") =>
  Array.from({ length: max + 1 }, (_, value) => ({ value, label: `${value}${suffix}` }));

const definitionEn = {
  items: [
    { id: "power", label: "Power (Modified Oxford Scale)", instructions: "Strength of the maximal voluntary contraction felt on digital palpation.", options: POWER_EN },
    { id: "endurance", label: "Endurance", instructions: "Seconds the maximal contraction can be sustained, capped at 10.", options: countOptions(10, " s"), numericScale: true },
    { id: "repetitions", label: "Repetitions", instructions: "Number of near-maximal contractions the patient can repeat at the endurance-matched hold time, up to 10.", options: countOptions(10), numericScale: true },
    { id: "fast", label: "Fast contractions", instructions: "Number of quick (about 1-second) maximal contractions performed after a recovery period, up to 10.", options: countOptions(10), numericScale: true },
  ],
  scoring: { method: "sum" },
  maxScore: 35,
  resultNote: {
    label: "The original PERFECT scheme does not define a single combined total.",
    description: "The composite score shown here (out of 35) is provided only as a rough, non-standard tracking aid across sessions. Standard clinical practice records each component separately — for example \"Power 3, Endurance 6s, Repetitions 4, Fast 3\" — per the Every Contraction Timed (ECT) protocol, which also specifies equal rest between contractions and isn't itself a score.",
    lowLabel: "Lower composite",
    highLabel: "Higher composite",
  },
  calculationExplanation:
    "This composite sums the 4 measurable PERFECT components — Power (0-5), Endurance (0-10 seconds), Repetitions (0-10), and Fast contractions (0-10) — for a non-standard total out of 35. The published PERFECT scheme itself has no combined score; it is a profile of these 4 values recorded individually, per Laycock & Jerwood (2001).",
  source: {
    citation: "Laycock J, Jerwood D. Pelvic floor muscle assessment: the PERFECT scheme. Physiotherapy. 2001;87(12):631-642.",
  },
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "perfect-scheme", {
  slug: "perfect-scheme",
  category_id: categoryId,
  name: "PERFECT Scheme",
  abbreviation: "PERFECT",
  description: "Records pelvic floor muscle Power, Endurance, Repetitions, and Fast contractions from digital palpation as a component profile.",
  population: "Adults undergoing pelvic floor muscle assessment",
  estimated_minutes_min: 3,
  estimated_minutes_max: 5,
  definition: JSON.stringify(definitionEn),
  status: "published",
  position: 5,
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
    "PERFECT Scheme",
    "PERFECT",
    "Records pelvic floor muscle Power, Endurance, Repetitions, and Fast contractions from digital palpation as a component profile.",
    "Adults undergoing pelvic floor muscle assessment",
    3,
    5,
    JSON.stringify(definitionEn),
    "published",
    5,
  ]
);

// ---------- Translations ----------

function buildTranslated(itemLabels, itemInstructions, power, resultNote, calculationExplanation) {
  return {
    items: [
      { id: "power", label: itemLabels[0], instructions: itemInstructions[0], options: power },
      { id: "endurance", label: itemLabels[1], instructions: itemInstructions[1], options: countOptions(10, " s"), numericScale: true },
      { id: "repetitions", label: itemLabels[2], instructions: itemInstructions[2], options: countOptions(10), numericScale: true },
      { id: "fast", label: itemLabels[3], instructions: itemInstructions[3], options: countOptions(10), numericScale: true },
    ],
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    resultNote,
    calculationExplanation,
    source: definitionEn.source,
  };
}

const POWER_PT_PT = [
  { value: 0, label: "0", description: "Sem contração." },
  { value: 1, label: "1", description: "Vestígio." },
  { value: 2, label: "2", description: "Fraca, sem elevação." },
  { value: 3, label: "3", description: "Moderada, com alguma elevação ou aperto." },
  { value: 4, label: "4", description: "Boa, com elevação e alguma resistência." },
  { value: 5, label: "5", description: "Forte, com elevação e aperto firmes contra resistência." },
];
const itemsPtPt = ["Força (Escala de Oxford Modificada)", "Resistência", "Repetições", "Contrações rápidas"];
const instructionsPtPt = [
  "Força da contração voluntária máxima sentida na palpação digital.",
  "Segundos durante os quais a contração máxima pode ser mantida, com um limite de 10.",
  "Número de contrações quase máximas que o doente consegue repetir com o mesmo tempo de manutenção da resistência, até 10.",
  "Número de contrações máximas rápidas (cerca de 1 segundo) realizadas após um período de recuperação, até 10.",
];
const resultNotePtPt = {
  label: "O esquema PERFECT original não define um total combinado único.",
  description: "A pontuação composta apresentada aqui (em 35) é fornecida apenas como um auxílio aproximado e não padronizado para acompanhamento entre sessões. A prática clínica padrão regista cada componente separadamente — por exemplo \"Força 3, Resistência 6s, Repetições 4, Rápidas 3\" — segundo o protocolo Every Contraction Timed (ECT), que também especifica um descanso igual entre contrações e não é, em si, uma pontuação.",
  lowLabel: "Composto mais baixo",
  highLabel: "Composto mais alto",
};
const calculationExplanationPtPt =
  "Este composto soma os 4 componentes mensuráveis do PERFECT — Força (0-5), Resistência (0-10 segundos), Repetições (0-10) e Contrações rápidas (0-10) — para um total não padronizado em 35. O esquema PERFECT publicado não tem, em si, uma pontuação combinada; trata-se de um perfil destes 4 valores registados individualmente, segundo Laycock e Jerwood (2001).";

const itemsPtBr = ["Força (Escala de Oxford Modificada)", "Resistência", "Repetições", "Contrações rápidas"];
const instructionsPtBr = [
  "Força da contração voluntária máxima sentida na palpação digital.",
  "Segundos durante os quais a contração máxima pode ser mantida, com um limite de 10.",
  "Número de contrações quase máximas que o paciente consegue repetir com o mesmo tempo de manutenção da resistência, até 10.",
  "Número de contrações máximas rápidas (cerca de 1 segundo) realizadas após um período de recuperação, até 10.",
];
const resultNotePtBr = {
  label: "O esquema PERFECT original não define um total combinado único.",
  description: "A pontuação composta apresentada aqui (em 35) é fornecida apenas como um auxílio aproximado e não padronizado para acompanhamento entre sessões. A prática clínica padrão registra cada componente separadamente — por exemplo \"Força 3, Resistência 6s, Repetições 4, Rápidas 3\" — segundo o protocolo Every Contraction Timed (ECT), que também especifica um descanso igual entre contrações e não é, em si, uma pontuação.",
  lowLabel: "Composto mais baixo",
  highLabel: "Composto mais alto",
};
const calculationExplanationPtBr =
  "Este composto soma os 4 componentes mensuráveis do PERFECT — Força (0-5), Resistência (0-10 segundos), Repetições (0-10) e Contrações rápidas (0-10) — para um total não padronizado em 35. O esquema PERFECT publicado não tem, em si, uma pontuação combinada; trata-se de um perfil desses 4 valores registrados individualmente, segundo Laycock e Jerwood (2001).";

const POWER_ES = [
  { value: 0, label: "0", description: "Sin contracción." },
  { value: 1, label: "1", description: "Vestigio." },
  { value: 2, label: "2", description: "Débil, sin elevación." },
  { value: 3, label: "3", description: "Moderada, con cierta elevación o apriete." },
  { value: 4, label: "4", description: "Buena, con elevación y cierta resistencia." },
  { value: 5, label: "5", description: "Fuerte, con elevación y apriete firmes contra resistencia." },
];
const itemsEs = ["Fuerza (Escala de Oxford Modificada)", "Resistencia", "Repeticiones", "Contracciones rápidas"];
const instructionsEs = [
  "Fuerza de la contracción voluntaria máxima percibida en la palpación digital.",
  "Segundos durante los cuales se puede mantener la contracción máxima, con un límite de 10.",
  "Número de contracciones casi máximas que el paciente puede repetir con el mismo tiempo de mantenimiento, hasta 10.",
  "Número de contracciones máximas rápidas (aproximadamente 1 segundo) realizadas después de un período de recuperación, hasta 10.",
];
const resultNoteEs = {
  label: "El esquema PERFECT original no define un total combinado único.",
  description: "La puntuación compuesta mostrada aquí (sobre 35) se ofrece solo como una ayuda aproximada y no estandarizada para el seguimiento entre sesiones. La práctica clínica estándar registra cada componente por separado — por ejemplo \"Fuerza 3, Resistencia 6s, Repeticiones 4, Rápidas 3\" — según el protocolo Every Contraction Timed (ECT), que también especifica un descanso igual entre contracciones y no es, en sí mismo, una puntuación.",
  lowLabel: "Compuesto más bajo",
  highLabel: "Compuesto más alto",
};
const calculationExplanationEs =
  "Este compuesto suma los 4 componentes medibles del PERFECT — Fuerza (0-5), Resistencia (0-10 segundos), Repeticiones (0-10) y Contracciones rápidas (0-10) — para un total no estandarizado sobre 35. El esquema PERFECT publicado no tiene, en sí mismo, una puntuación combinada; se trata de un perfil de estos 4 valores registrados individualmente, según Laycock y Jerwood (2001).";

const translations = [
  {
    locale: "pt-pt",
    name: "Esquema PERFECT",
    description: "Regista a Força, Resistência, Repetições e Contrações rápidas do pavimento pélvico a partir da palpação digital, como um perfil de componentes.",
    definition: buildTranslated(itemsPtPt, instructionsPtPt, POWER_PT_PT, resultNotePtPt, calculationExplanationPtPt),
  },
  {
    locale: "pt-br",
    name: "Esquema PERFECT",
    description: "Registra a Força, Resistência, Repetições e Contrações rápidas do assoalho pélvico a partir da palpação digital, como um perfil de componentes.",
    definition: buildTranslated(itemsPtBr, instructionsPtBr, POWER_PT_PT, resultNotePtBr, calculationExplanationPtBr),
  },
  {
    locale: "es",
    name: "Esquema PERFECT",
    description: "Registra la Fuerza, Resistencia, Repeticiones y Contracciones rápidas del suelo pélvico a partir de la palpación digital, como un perfil de componentes.",
    definition: buildTranslated(itemsEs, instructionsEs, POWER_ES, resultNoteEs, calculationExplanationEs),
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

console.log("PERFECT Scheme seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
