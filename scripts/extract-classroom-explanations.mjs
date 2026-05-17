import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultHtmlDir = "C:/Users/PC/Downloads/html_questoes_23_arquivos";
const htmlDir = process.argv[2] ? resolve(process.argv[2]) : defaultHtmlDir;
const questionBankPath = join(rootDir, "src", "data", "question-bank.json");
const outputPath = join(rootDir, "src", "data", "classroom-explanations.ts");

const manualQuestionIdsByFile = {
  "arquivo_05_asma_leve_gina_2025_primeira_versao.html": "dispneia.quest29.HRPP.2026",
  "arquivo_06_lombalgia_aguda_risco_cronificacao.html": "dor-lombar.quest31.FMUSP.2026",
  "arquivo_07_migranea_aura_tronco_cerebral.html": "cefaleia.5",
  "arquivo_08_neuralgia_trigemeo_investigacao_rm.html": "cefaleia.1",
  "arquivo_09_uretrite_nao_gonococica_chlamydia.html": "disuria.quest23.UnP.2026",
  "arquivo_10_hemicrania_paroxistica_indometacina.html": "cefaleia.15",
  "arquivo_11_calculo_renal_13mm_polo_inferior.html": "disuria.quest29.UnP.2026",
  "arquivo_12_nevralgia_trigemeo_diagnostico.html": "cefaleia.quest42.SUS-BA.2023",
  "arquivo_13_legionelose_pneumonia_atipica.html": "dispneia.quest13.SCMSP.2024",
  "arquivo_14_asma_leve_gina_2025_segunda_versao.html": "dispneia.quest29.HRPP.2026",
  "arquivo_15_bacteriuria_assintomatica_gestacao.html": "disuria.quest21.SCM-SP.2025",
  "arquivo_16_calculo_renal_assintomatico_12mm.html": "disuria.quest09.UnP.2026",
  "arquivo_17_pielonefrite_aguda_gestacao.html": "disuria.quest20.HOS-SP.2021",
  "arquivo_18_lombalgia_mecanica_sem_imagem_inicial.html": "dor-lombar.quest19.REVALIDA.2025",
  "arquivo_19_lombalgia_inespecifica_75_90_melhoram.html": "dor-lombar.quest25.UERJ.2025",
  "arquivo_20_lombalgia_aps_bandeiras_amarelas.html": "dor-lombar.quest32.AMP.2024",
  "arquivo_21_dor_costas_historia_ocupacional_recreacional.html": "dor-lombar.quest35.UFPR.2021",
  "arquivo_22_lombalgia_aps_indicacao_clinica_nao_administrativa.html": "dor-lombar.quest26.AMRIGS.2017",
  "arquivo_23_cistite_recorrente_pos_coital.html": "disuria.quest20.UnP.2026",
};

function decodeHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/Ã¡/g, "á")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã£/g, "ã")
    .replace(/Ã©/g, "é")
    .replace(/Ãª/g, "ê")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ãº/g, "ú")
    .replace(/Ã§/g, "ç")
    .replace(/Ã/g, "Á")
    .replace(/Ã€/g, "À")
    .replace(/Ã‚/g, "Â")
    .replace(/Ãƒ/g, "Ã")
    .replace(/Ã‰/g, "É")
    .replace(/ÃŠ/g, "Ê")
    .replace(/Ã/g, "Í")
    .replace(/Ã“/g, "Ó")
    .replace(/Ã”/g, "Ô")
    .replace(/Ã•/g, "Õ")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã‡/g, "Ç")
    .replace(/Âª/g, "ª")
    .replace(/Âº/g, "º")
    .replace(/Â°C/g, "°C")
    .replace(/Â/g, "")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€˜/g, "‘")
    .replace(/â€™/g, "’")
    .replace(/â‰¥/g, "≥")
    .replace(/â‰¤/g, "≤")
    .replace(/â†’/g, "→")
    .replace(/âµ/g, "⁵")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirst(html, pattern) {
  return decodeHtml(html.match(pattern)?.[1] ?? "");
}

function extractExplanation(html, questionId, sourceFile) {
  const tags = Array.from(html.matchAll(/<span class="tag">([\s\S]*?)<\/span>/g)).map((match) =>
    decodeHtml(match[1]),
  );
  const sections = Array.from(html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)).map((match) => ({
    title: extractFirst(match[1], /<h2>([\s\S]*?)<\/h2>/),
    body: extractFirst(match[1], /<p>([\s\S]*?)<\/p>/),
  }));

  return {
    questionId,
    sourceFile,
    tags,
    title: extractFirst(html, /<h1>([\s\S]*?)<\/h1>/),
    subtitle: extractFirst(html, /<p class="subtitle">([\s\S]*?)<\/p>/),
    sections,
    keyMessage: extractFirst(html, /<section class="key">[\s\S]*?<p>([\s\S]*?)<\/p>/),
  };
}

function resolveQuestionId(fileName, knownQuestionIds) {
  const directId = basename(fileName, ".html");

  if (knownQuestionIds.has(directId)) {
    return directId;
  }

  return manualQuestionIdsByFile[fileName];
}

function toSource(explanations, duplicateNotes) {
  const payload = Object.fromEntries(explanations.map((explanation) => [explanation.questionId, explanation]));

  return `export type ClassroomExplanationSection = {
  title: string;
  body: string;
};

export type ClassroomExplanation = {
  questionId: string;
  sourceFile: string;
  tags: string[];
  title: string;
  subtitle: string;
  sections: ClassroomExplanationSection[];
  keyMessage: string;
};

// Generated by scripts/extract-classroom-explanations.mjs from the HTML files in html_questoes_23_arquivos.
// Duplicate source notes: ${duplicateNotes.length > 0 ? duplicateNotes.join("; ") : "none"}.
export const classroomExplanationsByQuestionId: Record<string, ClassroomExplanation> = ${JSON.stringify(payload, null, 2)};
`;
}

if (!existsSync(htmlDir)) {
  throw new Error(`Diretorio de HTMLs nao encontrado: ${htmlDir}`);
}

const questionBank = JSON.parse(await readFile(questionBankPath, "utf8"));
const knownQuestionIds = new Set(questionBank.map((question) => question.id));
const fileNames = (await readdir(htmlDir)).filter((fileName) => fileName.endsWith(".html")).sort();
const explanationsById = new Map();
const duplicateNotes = [];

for (const fileName of fileNames) {
  const questionId = resolveQuestionId(fileName, knownQuestionIds);

  if (!questionId) {
    throw new Error(`Nao foi possivel mapear o arquivo ${fileName} para uma questao.`);
  }

  if (!knownQuestionIds.has(questionId)) {
    throw new Error(`O arquivo ${fileName} foi mapeado para um ID inexistente: ${questionId}`);
  }

  const html = await readFile(join(htmlDir, fileName), "utf8");
  const explanation = extractExplanation(html, questionId, fileName);

  if (explanationsById.has(questionId)) {
    duplicateNotes.push(`${questionId}: ${explanationsById.get(questionId).sourceFile} -> ${fileName}`);
  }

  explanationsById.set(questionId, explanation);
}

const explanations = Array.from(explanationsById.values()).sort((left, right) =>
  left.questionId.localeCompare(right.questionId),
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, toSource(explanations, duplicateNotes), "utf8");

console.log(`Arquivos HTML lidos: ${fileNames.length}`);
console.log(`Explicacoes unicas geradas: ${explanations.length}`);
if (duplicateNotes.length > 0) {
  console.log(`Duplicidades resolvidas: ${duplicateNotes.join("; ")}`);
}
console.log(`Arquivo gerado: ${outputPath}`);
