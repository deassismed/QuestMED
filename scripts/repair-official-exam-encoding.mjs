import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const questionBankPath = join(rootDir, "src", "data", "imports", "official-exam-question-bank.json");
const textFields = [
  "area",
  "Tema",
  "statement",
  "hint",
  "explanationTitle",
  "explanation",
  "imageAlt",
  "reviewNotes",
];

const manualReplacements = new Map(
  Object.entries({
    "?": "é",
    "N?o": "Não",
    "n?o": "não",
    "s?o": "são",
    "S?o": "São",
    "h?": "há",
    "H?": "Há",
    "j?": "já",
    "J?": "Já",
    "at?": "até",
    "At?": "Até",
    "al?m": "além",
    "Al?m": "Além",
    "tamb?m": "também",
    "Tamb?m": "Também",
    "?s": "às",
    "?rea": "área",
    "?reas": "áreas",
    "?gua": "água",
    "?lcool": "álcool",
    "?lcera": "úlcera",
    "?lceras": "úlceras",
    "?tero": "útero",
    "?bito": "óbito",
    "?rg?os": "órgãos",
    "?til": "útil",
    "?teis": "úteis",
    "?nica": "única",
    "?nico": "único",
    "?nion": "ânion",
    "?sseas": "ósseas",
    "Idea??o": "Ideação",
    "Obsess?es": "Obsessões",
    "Rea??es": "Reações",
    "Tromb?lise": "Trombólise",
    "ac?mulo": "acúmulo",
    "ader?ncia": "aderência",
    "aleat?ria": "aleatória",
    "aloca??o": "alocação",
    "amea?adora": "ameaçadora",
    "anticolin?rgico": "anticolinérgico",
    "antidiab?ticos": "antidiabéticos",
    "antim?lleriano": "antimülleriano",
    "asm?tica": "asmática",
    "assim?trico": "assimétrico",
    "atribu?da": "atribuída",
    "autom?tica": "automática",
    "auton?micos": "autonômicos",
    "az?lico": "azólico",
    "c?clica": "cíclica",
    "c?lula": "célula",
    "cen?rios": "cenários",
    "centr?peto": "centrípeto",
    "cirr?tico": "cirrótico",
    "cl?ssico": "clássico",
    "cl?ssicos": "clássicos",
    "colest?ticas": "colestáticas",
    "colest?tico": "colestático",
    "colin?rgica": "colinérgica",
    "colposc?pica": "colposcópica",
    "contradit?ria": "contraditória",
    "contraindica??es": "contraindicações",
    "convic??o": "convicção",
    "cristal?ide": "cristaloide",
    "dem?ncias": "demências",
    "derm?tomo": "dermátomo",
    "desesperan?a": "desesperança",
    "desfavor?vel": "desfavorável",
    "desobstru??o": "desobstrução",
    "desorganiza??o": "desorganização",
    "deteriora??o": "deterioração",
    "di?fise": "diáfise",
    "diab?ticas": "diabéticas",
    "diast?licas": "diastólicas",
    "dilata??es": "dilatações",
    "din?micas": "dinâmicas",
    "discord?ncia": "discordância",
    "dissemina??o": "disseminação",
    "dopamin?rgica": "dopaminérgica",
    "eletrocardiogr?ficas": "eletrocardiográficas",
    "epid?rmica": "epidérmica",
    "ex?gena": "exógena",
    "explos?es": "explosões",
    "exposi??es": "exposições",
    "far?ngea": "faríngea",
    "fibr?ticas": "fibróticas",
    "formula??o": "formulação",
    "fotocut?nea": "fotocutânea",
    "fotoprote??o": "fotoproteção",
    "geniturin?ria": "geniturinária",
    "hematol?gica": "hematológica",
    "hiperpigmenta??o": "hiperpigmentação",
    "hipnozo?tos": "hipnozoítos",
    "hipoperfus?o": "hipoperfusão",
    "iatrog?nicas": "iatrogênicas",
    "idea??o": "ideação",
    "improv?vel": "improvável",
    "imunossupress?o": "imunossupressão",
    "indica??es": "indicações",
    "inespec?fico": "inespecífico",
    "inflama??o": "inflamação",
    "inquieta??o": "inquietação",
    "insul?nica": "insulínica",
    "intermedi?ria": "intermediária",
    "intr?nsecos": "intrínsecos",
    "involunt?rios": "involuntários",
    "leptomen?ngea": "leptomeníngea",
    "linfocut?nea": "linfocutânea",
    "linfocut?neo": "linfocutâneo",
    "linfocut?neos": "linfocutâneos",
    "mam?fero": "mamífero",
    "medicaliza??o": "medicalização",
    "men?ngea": "meníngea",
    "microbiol?gica": "microbiológica",
    "migrat?rias": "migratórias",
    "neurocut?nea": "neurocutânea",
    "neurop?tico": "neuropático",
    "observ?vel": "observável",
    "oftalmol?gicas": "oftalmológicas",
    "org?nica": "orgânica",
    "ortop?dico": "ortopédico",
    "ortost?tica": "ortostática",
    "ovulat?ria": "ovulatória",
    "p?lipos": "pólipos",
    "pangenot?pico": "pangenotípico",
    "perif?ricas": "periféricas",
    "pin?amento": "pinçamento",
    "plasm?citos": "plasmócitos",
    "portossist?mica": "portossistêmica",
    "pres?dio": "presídio",
    "pres?dios": "presídios",
    "press?es": "pressões",
    "press?rica": "pressórica",
    "prop?e": "propõe",
    "propor??es": "proporções",
    "randomiza??o": "randomização",
    "reconstitui??o": "reconstituição",
    "refrat?rios": "refratários",
    "regress?o": "regressão",
    "reinfec??o": "reinfecção",
    "rem?dios": "remédios",
    "remov?veis": "removíveis",
    "s?ncope": "síncope",
    "s?ntese": "síntese",
    "sacrococc?gea": "sacrococcígea",
    "sacroile?te": "sacroileíte",
    "sil?ncio": "silêncio",
    "sist?licas": "sistólicas",
    "subependim?rios": "subependimários",
    "substitu?do": "substituído",
    "territ?rios": "territórios",
    "tireot?xicos": "tireotóxicos",
    "tocol?tico": "tocolítico",
    "tomogr?ficos": "tomográficos",
    "tranquiliza??o": "tranquilização",
    "traum?tico": "traumático",
    "trepon?micos": "treponêmicos",
    "tromb?lise": "trombólise",
    "tromb?tico": "trombótico",
    "varia??es": "variações",
    "vasodilata??o": "vasodilatação",
    "ventilat?ria": "ventilatória",
    "vital?cio": "vitalício",
  }),
);

function stripAccents(value) {
  return value.normalize("NFD").replace(/\p{Mark}/gu, "");
}

function hasAccent(value) {
  return stripAccents(value) !== value;
}

function toComparable(value) {
  return stripAccents(value).toLowerCase();
}

function textValues(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const values = [];
  for (const field of textFields) {
    if (typeof value[field] === "string") {
      values.push(value[field]);
    }
  }
  for (const option of value.options ?? []) {
    if (typeof option.text === "string") {
      values.push(option.text);
    }
  }
  return values;
}

function buildVocabulary(questions) {
  const vocabulary = { byComparable: new Map(), byLength: new Map() };

  for (const question of questions) {
    for (const value of textValues(question)) {
      for (const [word] of value.matchAll(/\p{L}+/gu)) {
        if (!hasAccent(word)) {
          continue;
        }

        const key = toComparable(word);
        const current = vocabulary.byComparable.get(key) ?? new Map();
        current.set(word, (current.get(word) ?? 0) + 1);
        vocabulary.byComparable.set(key, current);

        const sameLength = vocabulary.byLength.get(word.length) ?? new Map();
        sameLength.set(word, (sameLength.get(word) ?? 0) + 1);
        vocabulary.byLength.set(word.length, sameLength);
      }
    }
  }

  return vocabulary;
}

function corruptTokenToComparable(token) {
  return toComparable(token.replace(/\?/g, ""));
}

function tokenMatches(candidate, token) {
  if (candidate.length !== token.length) {
    return false;
  }

  for (let index = 0; index < token.length; index += 1) {
    if (token[index] === "?") {
      continue;
    }

    if (toComparable(candidate[index]) !== toComparable(token[index])) {
      return false;
    }
  }

  return true;
}

function preserveCapitalization(original, replacement) {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (original[0] === original[0]?.toUpperCase()) {
    return `${replacement[0].toUpperCase()}${replacement.slice(1)}`;
  }

  return replacement;
}

function findReplacement(token, vocabulary) {
  const manual = manualReplacements.get(token);
  if (manual) {
    return manual;
  }

  const normalized = corruptTokenToComparable(token);
  const choices = [
    ...((vocabulary.byComparable.get(normalized) ?? new Map()).entries()),
    ...((vocabulary.byLength.get(token.length) ?? new Map()).entries()),
  ];
  const matches = choices
    .filter(([candidate]) => tokenMatches(candidate, token))
    .sort((left, right) => right[1] - left[1]);

  return matches[0]?.[0] ? preserveCapitalization(token, matches[0][0].toLowerCase()) : null;
}

function repairText(value, vocabulary, stats) {
  if (!value.includes("?")) {
    return value;
  }

  return value.replace(/[\p{L}?]*\?[\p{L}?]*/gu, (token, offset, fullText) => {
    if (token.endsWith("?") && !token.slice(0, -1).includes("?")) {
      return token;
    }

    if (token === "?") {
      const previous = fullText[offset - 1] ?? "";
      const next = fullText[offset + 1] ?? "";
      if (!/\s/.test(previous) || !/\s/.test(next)) {
        return token;
      }
    }

    const replacement = findReplacement(token, vocabulary);
    if (!replacement) {
      stats.unresolved.add(token);
      return token;
    }

    stats.replacements += 1;
    return replacement;
  });
}

function repairQuestion(question, vocabulary, stats) {
  let changed = false;
  const nextQuestion = { ...question };

  for (const field of textFields) {
    if (typeof nextQuestion[field] !== "string") {
      continue;
    }

    const repaired = repairText(nextQuestion[field], vocabulary, stats);
    if (repaired !== nextQuestion[field]) {
      nextQuestion[field] = repaired;
      changed = true;
    }
  }

  nextQuestion.options = (nextQuestion.options ?? []).map((option) => {
    if (typeof option.text !== "string") {
      return option;
    }

    const repaired = repairText(option.text, vocabulary, stats);
    if (repaired === option.text) {
      return option;
    }

    changed = true;
    return { ...option, text: repaired };
  });

  if (changed) {
    stats.questions += 1;
  }

  return nextQuestion;
}

const questions = JSON.parse(await readFile(questionBankPath, "utf8"));
const vocabulary = buildVocabulary(questions);
const stats = { questions: 0, replacements: 0, unresolved: new Set() };
const repairedQuestions = questions.map((question) => repairQuestion(question, vocabulary, stats));

await writeFile(questionBankPath, `${JSON.stringify(repairedQuestions, null, 2)}\n`, "utf8");

console.log(`Repaired ${stats.replacements} token(s) in ${stats.questions} question(s).`);
if (stats.unresolved.size > 0) {
  console.log(`Unresolved token(s): ${[...stats.unresolved].sort().join(", ")}`);
}
