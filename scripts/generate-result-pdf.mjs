import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const questionBankPath = path.join(rootDir, "src", "data", "question-bank.json");
const statusLabels = {
  correct: "Correta",
  incorrect: "Incorreta",
  unanswered: "Nao respondida",
};

function usage() {
  console.error("Uso: npm run pdf:result -- caminho/do/resultado.json [saida.pdf]");
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`Nao foi possivel ler ${label}: ${error.message}`);
  }
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u2080/g, "0")
    .replace(/\u2081/g, "1")
    .replace(/\u2082/g, "2")
    .replace(/\u2083/g, "3")
    .replace(/\u2084/g, "4")
    .replace(/\u2085/g, "5")
    .replace(/\u2086/g, "6")
    .replace(/\u2087/g, "7")
    .replace(/\u2088/g, "8")
    .replace(/\u2089/g, "9")
    .replace(/\u03b2/g, "beta")
    .replace(/\u00a0/g, " ");
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data nao informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatScore(value) {
  return Number(value ?? 0).toFixed(1).replace(".", ",");
}

function outputPathFor(inputPath) {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.pdf`);
}

function validateResult(result) {
  if (!result || typeof result !== "object") {
    throw new Error("O resultado exportado precisa ser um objeto JSON.");
  }

  if (!Array.isArray(result.answers) || result.answers.length === 0) {
    throw new Error("O resultado exportado nao contem respostas.");
  }

  if (!result.summary || typeof result.summary !== "object") {
    throw new Error("O resultado exportado nao contem resumo.");
  }
}

function ensureSpace(doc, height) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function addKeyValue(doc, key, value) {
  doc.font("Helvetica-Bold").text(`${key}: `, { continued: true });
  doc.font("Helvetica").text(sanitizeText(value));
}

function addDivider(doc) {
  const y = doc.y + 6;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor("#d6e5e2")
    .lineWidth(0.7)
    .stroke();
  doc.moveDown(0.9);
  doc.strokeColor("#000");
}

function addOption(doc, option, answer) {
  const markers = [];

  if (option.id === answer.correctOptionId) {
    markers.push("gabarito");
  }

  if (option.id === answer.selectedOptionId) {
    markers.push("marcada");
  }

  const suffix = markers.length > 0 ? ` (${markers.join(", ")})` : "";
  doc
    .font("Helvetica")
    .fontSize(8.8)
    .text(`${option.id}) ${sanitizeText(option.text)}${suffix}`, {
      indent: 10,
      lineGap: 1.5,
    });
}

function addQuestion(doc, item, question) {
  ensureSpace(doc, 160);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#0e5f5c")
    .text(`${item.order}. ${sanitizeText(question.area)} - ${sanitizeText(question.id)}`);

  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor("#1c2b2e")
    .text(sanitizeText(question.statement), { lineGap: 1.8 });

  doc.moveDown(0.25);
  question.options.forEach((option) => addOption(doc, option, item));

  doc.moveDown(0.3);
  const selected = item.selectedOptionId ?? "Nao respondeu";
  const stats = question.options
    .map((option) => `${option.id}: ${question.statistics?.[option.id] ?? 0}%`)
    .join(" | ");

  doc.fontSize(8.8);
  addKeyValue(doc, "Status", statusLabels[item.status] ?? item.status);
  addKeyValue(doc, "Resposta do aluno", selected);
  addKeyValue(doc, "Resposta correta", item.correctOptionId);
  addKeyValue(doc, "Pontuacao", `${formatScore(item.score)} ponto`);
  addKeyValue(doc, "Dica usada", item.usedHint ? "Sim" : "Nao");
  addKeyValue(doc, "Estatisticas", stats);

  if (question.explanation) {
    doc
      .font("Helvetica-Bold")
      .text("Comentario: ", { continued: true });
    doc
      .font("Helvetica")
      .text(sanitizeText(question.explanation), { lineGap: 1.5 });
  }

  addDivider(doc);
}

function createPdf(result, questionsById, outputPath) {
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 36,
      right: 38,
      bottom: 36,
      left: 38,
    },
    info: {
      Title: "QuestMED - Resultado do aluno",
      Author: "QuestMED",
    },
  });
  const stream = fs.createWriteStream(outputPath);

  doc.pipe(stream);

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0e5f5c")
    .text("QuestMED - Resultado do aluno");

  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#607174")
    .text(`Exportado em ${formatDate(result.exportedAt)}`);

  doc.moveDown(0.8);
  doc.fontSize(10).fillColor("#1c2b2e");
  addKeyValue(doc, "Pontuacao total", `${formatScore(result.summary.totalScore)} / ${result.totalQuestions ?? result.answers.length}`);
  addKeyValue(doc, "Desempenho", `${result.summary.percent ?? 0}%`);
  addKeyValue(
    doc,
    "Resumo",
    `${result.summary.correct ?? 0} acertos | ${result.summary.incorrect ?? 0} erros | ${result.summary.unanswered ?? 0} nao respondidas | ${result.summary.answered ?? 0} respondidas | ${result.summary.hintsUsed ?? 0} dicas usadas`,
  );
  addDivider(doc);

  result.answers.forEach((answer) => {
    const question = questionsById.get(answer.questionId);

    if (!question) {
      ensureSpace(doc, 64);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#c94b4b")
        .text(`${answer.order}. Questao nao encontrada: ${sanitizeText(answer.questionId)}`);
      addDivider(doc);
      return;
    }

    addQuestion(doc, answer, question);
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;

  if (!inputPath) {
    usage();
    process.exitCode = 1;
    return;
  }

  const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : outputPathFor(inputPath);
  const result = readJson(inputPath, "resultado exportado");
  const questionBank = readJson(questionBankPath, "banco de questoes");

  validateResult(result);

  const questionsById = new Map(questionBank.map((question) => [question.id, question]));
  await createPdf(result, questionsById, outputPath);
  console.log(`PDF gerado em: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
