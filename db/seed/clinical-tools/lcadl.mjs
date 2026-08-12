// London Chest Activity of Daily Living Scale (LCADL) — fourth and
// final calculator in "Respiratory Rehabilitation". 15 items across 4
// domains (Self-care, Domestic, Physical, Leisure) via the `section`
// field (same pattern as WOMAC/Sunnybrook), sharing one simplified 0-4
// breathlessness-severity rubric. Sum-scored, max 60, descendingGood:
// true (0 = would do it without any breathlessness, 4 = would not do
// it because of breathlessness = worst).
//
// NOTE on fidelity: the official LCADL actually mixes a 0-5 scale per
// item ("would not do it for another reason" is its own non-severity
// option, separate from the 0-4 breathlessness ladder), which this
// engine's fixed point-value model can't represent cleanly. This
// calculator deliberately simplifies to a plain 0-4 breathlessness
// ladder only, noted explicitly below and in calculationExplanation so
// it is never mistaken for an exact reproduction of the published
// scoring. Item wording is this app's own reasonable reconstruction of
// the 15 published item topics, not independently verified against the
// primary source the way KOOS-12/HOOS-12 were.
//
// A real copyrighted instrument (Garrod et al., 2000) — proprietary:
// true, same convention as CAT/DASH/FIM.
//
// Usage: node db/seed/clinical-tools/lcadl.mjs
import { Pool } from "pg";
import { config } from "dotenv";
import { findOrCreate, upsertRelationship } from "../lib/toolkit.mjs";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categoryId = await findOrCreate(pool, "clinical_calculator_category", "slug", "respiratory-rehabilitation", {
  slug: "respiratory-rehabilitation",
  name: "Respiratory Rehabilitation",
  color: "cyan",
  position: 8,
});

const RUBRIC_EN = [
  { value: 0, label: "0 — No breathlessness", description: "I can do this without becoming breathless." },
  { value: 1, label: "1 — Mild breathlessness", description: "I become mildly breathless doing this." },
  { value: 2, label: "2 — Moderate breathlessness", description: "I become moderately breathless doing this." },
  { value: 3, label: "3 — Severe breathlessness", description: "I become severely breathless doing this." },
  { value: 4, label: "4 — Would not do it because of breathlessness", description: "I would not do this because it makes me too breathless." },
];

const SECTIONS_EN = { self_care: "Self-care", domestic: "Domestic", physical: "Physical", leisure: "Leisure" };

// [id, section, English label]
const ITEM_DEFS = [
  ["towel_dry", "self_care", "Toweling dry after a bath or shower"],
  ["dress_upper_body", "self_care", "Dressing your upper body"],
  ["dress_lower_body", "self_care", "Dressing your lower body, including shoes and socks"],
  ["brush_hair", "self_care", "Brushing or combing your hair"],
  ["make_bed", "domestic", "Making the bed"],
  ["change_linen", "domestic", "Changing the bed linen"],
  ["wash_windows", "domestic", "Washing windows or net curtains"],
  ["vacuum_sweep", "domestic", "Vacuuming or sweeping the floor"],
  ["hang_washing", "domestic", "Hanging out the washing"],
  ["ironing", "domestic", "Ironing"],
  ["walk_indoors", "physical", "Walking indoors"],
  ["climb_stairs", "physical", "Walking up a flight of stairs"],
  ["walk_in_cold", "leisure", "Walking in wind or cold weather"],
  ["going_out_socially", "leisure", "Going out socially, such as to church or the cinema"],
  ["talking_while_active", "leisure", "Talking while doing a physical activity"],
];

const definitionEn = {
  items: ITEM_DEFS.map(([id, section, label]) => ({ id, section: SECTIONS_EN[section], label, options: RUBRIC_EN })),
  scoring: { method: "sum" },
  maxScore: 60,
  descendingGood: true,
  calculationExplanation:
    "The LCADL score is the sum of the 15 items, each rated 0 (no breathlessness) to 4 (would not do it because of breathlessness), for a total out of 60. This calculator uses a simplified 0-4 breathlessness ladder for every item; the original scale also allows marking an item as \"would not do for another reason,\" which is not represented here.",
  source: {
    citation: "Garrod R, Bestall JC, Paul EA, Wedzicha JA, Jones PW. Development and validation of a standardized measure of activity of daily living in patients with severe COPD: the London Chest Activity of Daily Living scale (LCADL). Respir Med. 2000;94(6):589-596.",
  },
  proprietary: true,
};

const calculatorId = await findOrCreate(pool, "clinical_calculator", "slug", "lcadl", {
  slug: "lcadl",
  category_id: categoryId,
  name: "London Chest Activity of Daily Living Scale",
  abbreviation: "LCADL",
  description: "Measures breathlessness during 15 everyday activities across self-care, domestic, physical, and leisure domains, producing a score out of 60.",
  population: "Adults with severe COPD",
  estimated_minutes_min: 3,
  estimated_minutes_max: 5,
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
    "London Chest Activity of Daily Living Scale",
    "LCADL",
    "Measures breathlessness during 15 everyday activities across self-care, domestic, physical, and leisure domains, producing a score out of 60.",
    "Adults with severe COPD",
    3,
    5,
    JSON.stringify(definitionEn),
    "published",
    3,
  ]
);

// ---------- Translations ----------

function buildTranslated(itemLabels, sectionLabels, rubric, calculationExplanation) {
  return {
    items: ITEM_DEFS.map(([id, section], i) => ({ id, section: sectionLabels[section], label: itemLabels[i], options: rubric })),
    scoring: definitionEn.scoring,
    maxScore: definitionEn.maxScore,
    descendingGood: true,
    calculationExplanation,
    source: definitionEn.source,
    proprietary: true,
  };
}

const SECTIONS_PT_PT = { self_care: "Autocuidado", domestic: "Doméstico", physical: "Físico", leisure: "Lazer" };
const RUBRIC_PT_PT = [
  { value: 0, label: "0 — Sem falta de ar", description: "Consigo fazer isto sem ficar com falta de ar." },
  { value: 1, label: "1 — Falta de ar ligeira", description: "Fico com falta de ar ligeira ao fazer isto." },
  { value: 2, label: "2 — Falta de ar moderada", description: "Fico com falta de ar moderada ao fazer isto." },
  { value: 3, label: "3 — Falta de ar intensa", description: "Fico com falta de ar intensa ao fazer isto." },
  { value: 4, label: "4 — Não faria por causa da falta de ar", description: "Não faria isto porque me deixa com demasiada falta de ar." },
];
const ITEMS_PT_PT = [
  "Secar-se com a toalha depois do banho",
  "Vestir a parte superior do corpo",
  "Vestir a parte inferior do corpo, incluindo sapatos e meias",
  "Escovar ou pentear o cabelo",
  "Fazer a cama",
  "Mudar a roupa de cama",
  "Lavar janelas ou cortinados",
  "Aspirar ou varrer o chão",
  "Estender a roupa",
  "Passar a ferro",
  "Andar dentro de casa",
  "Subir um lanço de escadas",
  "Andar com vento ou frio",
  "Sair socialmente, como à igreja ou ao cinema",
  "Falar enquanto faz uma atividade física",
];
const calculationExplanationPtPt =
  "A pontuação LCADL é a soma dos 15 itens, cada um pontuado de 0 (sem falta de ar) a 4 (não faria por causa da falta de ar), para um total em 60. Esta calculadora usa uma escala simplificada de falta de ar de 0 a 4 para todos os itens; a escala original também permite marcar um item como \"não faria por outro motivo\", o que não está representado aqui.";

const SECTIONS_PT_BR = { self_care: "Autocuidado", domestic: "Doméstico", physical: "Físico", leisure: "Lazer" };
const RUBRIC_PT_BR = [
  { value: 0, label: "0 — Sem falta de ar", description: "Consigo fazer isso sem ficar com falta de ar." },
  { value: 1, label: "1 — Falta de ar leve", description: "Fico com falta de ar leve ao fazer isso." },
  { value: 2, label: "2 — Falta de ar moderada", description: "Fico com falta de ar moderada ao fazer isso." },
  { value: 3, label: "3 — Falta de ar intensa", description: "Fico com falta de ar intensa ao fazer isso." },
  { value: 4, label: "4 — Não faria por causa da falta de ar", description: "Não faria isso porque me deixa com falta de ar demais." },
];
const ITEMS_PT_BR = [
  "Se secar com a toalha depois do banho",
  "Vestir a parte de cima do corpo",
  "Vestir a parte de baixo do corpo, incluindo sapatos e meias",
  "Escovar ou pentear o cabelo",
  "Fazer a cama",
  "Trocar a roupa de cama",
  "Lavar janelas ou cortinas",
  "Aspirar ou varrer o chão",
  "Estender a roupa",
  "Passar roupa",
  "Andar dentro de casa",
  "Subir um lance de escada",
  "Andar com vento ou frio",
  "Sair socialmente, como para a igreja ou o cinema",
  "Falar enquanto faz uma atividade física",
];
const calculationExplanationPtBr =
  "A pontuação LCADL é a soma dos 15 itens, cada um pontuado de 0 (sem falta de ar) a 4 (não faria por causa da falta de ar), para um total em 60. Esta calculadora usa uma escala simplificada de falta de ar de 0 a 4 para todos os itens; a escala original também permite marcar um item como \"não faria por outro motivo\", o que não está representado aqui.";

const SECTIONS_ES = { self_care: "Autocuidado", domestic: "Doméstico", physical: "Físico", leisure: "Ocio" };
const RUBRIC_ES = [
  { value: 0, label: "0 — Sin falta de aire", description: "Puedo hacer esto sin quedarme sin aire." },
  { value: 1, label: "1 — Falta de aire leve", description: "Me quedo levemente sin aire al hacer esto." },
  { value: 2, label: "2 — Falta de aire moderada", description: "Me quedo moderadamente sin aire al hacer esto." },
  { value: 3, label: "3 — Falta de aire intensa", description: "Me quedo intensamente sin aire al hacer esto." },
  { value: 4, label: "4 — No lo haría por la falta de aire", description: "No haría esto porque me deja demasiado sin aire." },
];
const ITEMS_ES = [
  "Secarse con la toalla después del baño",
  "Vestir la parte superior del cuerpo",
  "Vestir la parte inferior del cuerpo, incluyendo zapatos y calcetines",
  "Cepillarse o peinarse el cabello",
  "Hacer la cama",
  "Cambiar la ropa de cama",
  "Lavar ventanas o cortinas",
  "Aspirar o barrer el suelo",
  "Tender la ropa",
  "Planchar",
  "Caminar dentro de casa",
  "Subir un tramo de escaleras",
  "Caminar con viento o frío",
  "Salir socialmente, como a la iglesia o al cine",
  "Hablar mientras realiza una actividad física",
];
const calculationExplanationEs =
  "La puntuación LCADL es la suma de los 15 ítems, cada uno puntuado de 0 (sin falta de aire) a 4 (no lo haría por la falta de aire), para un total sobre 60. Esta calculadora usa una escala simplificada de falta de aire de 0 a 4 para todos los ítems; la escala original también permite marcar un ítem como \"no lo haría por otro motivo\", lo cual no está representado aquí.";

const translations = [
  {
    locale: "pt-pt",
    name: "Escala de Atividades de Vida Diária de London Chest",
    description: "Mede a falta de ar em 15 atividades do dia a dia nos domínios autocuidado, doméstico, físico e lazer, produzindo uma pontuação em 60.",
    definition: buildTranslated(ITEMS_PT_PT, SECTIONS_PT_PT, RUBRIC_PT_PT, calculationExplanationPtPt),
  },
  {
    locale: "pt-br",
    name: "Escala de Atividades de Vida Diária de London Chest",
    description: "Mede a falta de ar em 15 atividades do dia a dia nos domínios autocuidado, doméstico, físico e lazer, gerando uma pontuação em 60.",
    definition: buildTranslated(ITEMS_PT_BR, SECTIONS_PT_BR, RUBRIC_PT_BR, calculationExplanationPtBr),
  },
  {
    locale: "es",
    name: "Escala de Actividades de la Vida Diaria de London Chest",
    description: "Mide la falta de aire en 15 actividades cotidianas en los dominios autocuidado, doméstico, físico y ocio, generando una puntuación sobre 60.",
    definition: buildTranslated(ITEMS_ES, SECTIONS_ES, RUBRIC_ES, calculationExplanationEs),
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

console.log("LCADL seeded.");
console.log({ categoryId, calculatorId });

await pool.end();
