import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";
import { createServer as createViteServer } from "vite";
import { syncQuestionModule } from "./sync-question-module.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const questionBankPath = join(rootDir, "src", "data", "question-bank.json");
const importedQuestionBankPath = join(rootDir, "src", "data", "imports", "official-exam-question-bank.json");
const port = Number(process.env.PORT ?? process.env.QUESTMED_EDITOR_PORT ?? 5173);
const host = process.env.HOST ?? "127.0.0.1";
const password = process.env.QUESTMED_EDITOR_PASSWORD;
const sessions = new Set();
const optionIds = ["A", "B", "C", "D"];
const jsonDecoder = new TextDecoder("utf-8", { fatal: true });

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bodyLength = 0;

    req.on("data", (chunk) => {
      chunks.push(chunk);
      bodyLength += chunk.length;

      if (bodyLength > 1_000_000) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        const body = chunks.length > 0 ? jsonDecoder.decode(Buffer.concat(chunks)) : "";
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido ou fora de UTF-8."));
      }
    });
    req.on("error", reject);
  });
}

async function readQuestionBank() {
  return readQuestionBankFile(questionBankPath);
}

async function readImportedQuestionBank() {
  return readQuestionBankFile(importedQuestionBankPath);
}

async function readQuestionBankFile(filePath) {
  const rawQuestionBank = await readFile(filePath, "utf8");
  const questionBank = JSON.parse(rawQuestionBank);

  if (!Array.isArray(questionBank)) {
    throw new Error("Banco de questoes invalido.");
  }

  return questionBank;
}

function isAuthorized(req) {
  const authorization = req.headers.authorization ?? "";
  const [scheme, token] = authorization.split(" ");

  return scheme === "Bearer" && Boolean(token) && sessions.has(token);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasSuspiciousReplacementQuestionMark(value) {
  return /(^|[\s([{"'/:;-])\?[A-Za-zÀ-ÿ]|[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]|\?\?/.test(value);
}

function validateEncodingSafety(value, label, errors) {
  if (typeof value !== "string") {
    return;
  }

  if (value.includes("\uFFFD") || hasSuspiciousReplacementQuestionMark(value)) {
    errors.push(`${label} contem provavel caractere especial corrompido. Corrija os acentos antes de salvar.`);
  }
}

function normalizeImageAttachments(candidate) {
  if (!Array.isArray(candidate.attachments)) {
    return [];
  }

  return candidate.attachments
    .filter((attachment) => attachment?.type === "image" && normalizeText(attachment.src))
    .map((attachment) => ({
      type: "image",
      src: attachment.src.trim(),
      alt: normalizeText(attachment.alt),
      ...(normalizeText(attachment.caption) ? { caption: attachment.caption.trim() } : {}),
    }));
}

function validateImageAttachments(candidate, errors) {
  if (candidate.attachments !== undefined && !Array.isArray(candidate.attachments)) {
    errors.push("Anexos devem ser uma lista.");
    return;
  }

  normalizeImageAttachments(candidate).forEach((attachment, index) => {
    if (!attachment.alt) {
      errors.push(`Descricao da imagem ${index + 1} obrigatoria.`);
    }

    validateEncodingSafety(attachment.src, `Caminho da imagem ${index + 1}`, errors);
    validateEncodingSafety(attachment.alt, `Descricao da imagem ${index + 1}`, errors);
    validateEncodingSafety(attachment.caption, `Legenda da imagem ${index + 1}`, errors);
  });
}

function validateQuestion(candidate, original) {
  const errors = [];

  if (!candidate || typeof candidate !== "object") {
    return ["Questao invalida."];
  }

  if (candidate.id !== original.id) {
    errors.push("O ID da questao nao pode ser alterado.");
  }

  if (candidate.area !== original.area) {
    errors.push("A area da questao nao pode ser alterada neste editor.");
  }

  if (candidate.Tema !== original.Tema) {
    errors.push("O tema da questao nao pode ser alterado neste editor.");
  }

  if (!normalizeText(candidate.statement)) {
    errors.push("Enunciado obrigatorio.");
  }

  if (!normalizeText(candidate.hint)) {
    errors.push("Dica obrigatoria.");
  }

  if (!normalizeText(candidate.explanation)) {
    errors.push("Justificativa obrigatoria.");
  }

  validateEncodingSafety(candidate.statement, "Enunciado", errors);
  validateEncodingSafety(candidate.hint, "Dica", errors);
  validateEncodingSafety(candidate.explanation, "Justificativa", errors);
  validateImageAttachments(candidate, errors);

  if (!optionIds.includes(candidate.correctOptionId)) {
    errors.push("Gabarito deve ser A, B, C ou D.");
  }

  if (!Array.isArray(candidate.options) || candidate.options.length !== optionIds.length) {
    errors.push("A questao precisa ter exatamente quatro alternativas.");
  } else {
    for (const optionId of optionIds) {
      const option = candidate.options.find((item) => item?.id === optionId);

      if (!option || !normalizeText(option.text)) {
        errors.push(`Alternativa ${optionId} obrigatoria.`);
      } else {
        validateEncodingSafety(option.text, `Alternativa ${optionId}`, errors);
      }
    }
  }

  return errors;
}

function validateImportedQuestion(candidate, original) {
  const errors = [];

  if (!candidate || typeof candidate !== "object") {
    return ["Questao invalida."];
  }

  if (candidate.id !== original.id) {
    errors.push("O ID da questao nao pode ser alterado.");
  }

  if (!normalizeText(candidate.area)) {
    errors.push("Area obrigatoria.");
  }

  if (!normalizeText(candidate.Tema)) {
    errors.push("Tema obrigatorio.");
  }

  if (!normalizeText(candidate.statement)) {
    errors.push("Enunciado obrigatorio.");
  }

  validateEncodingSafety(candidate.area, "Area", errors);
  validateEncodingSafety(candidate.Tema, "Tema", errors);
  validateEncodingSafety(candidate.statement, "Enunciado", errors);
  validateEncodingSafety(candidate.hint, "Dica", errors);
  validateEncodingSafety(candidate.explanationTitle, "Titulo da justificativa", errors);
  validateEncodingSafety(candidate.explanation, "Justificativa", errors);
  validateEncodingSafety(candidate.imageAlt, "Descricao da imagem", errors);
  validateEncodingSafety(candidate.reviewNotes, "Anotacoes de revisao", errors);

  if (!optionIds.includes(candidate.correctOptionId)) {
    errors.push("Gabarito deve ser A, B, C ou D.");
  }

  if (!Array.isArray(candidate.options) || candidate.options.length !== optionIds.length) {
    errors.push("A questao precisa ter exatamente quatro alternativas.");
  } else {
    for (const optionId of optionIds) {
      const option = candidate.options.find((item) => item?.id === optionId);

      if (!option || !normalizeText(option.text)) {
        errors.push(`Alternativa ${optionId} obrigatoria.`);
      } else {
        validateEncodingSafety(option.text, `Alternativa ${optionId}`, errors);
      }
    }
  }

  if (
    candidate.validationStatus &&
    !["pending", "needs-review", "validated"].includes(candidate.validationStatus)
  ) {
    errors.push("Status de validacao invalido.");
  }

  return errors;
}

function toSavedQuestion(candidate, original) {
  const attachments = normalizeImageAttachments(candidate);

  return {
    ...original,
    statement: candidate.statement.trim(),
    ...(attachments.length > 0 ? { attachments } : { attachments: undefined }),
    options: optionIds.map((optionId) => ({
      id: optionId,
      text: candidate.options.find((option) => option.id === optionId).text.trim(),
    })),
    correctOptionId: candidate.correctOptionId,
    hint: candidate.hint.trim(),
    explanation: candidate.explanation.trim(),
  };
}

function optionalTrim(value) {
  return typeof value === "string" ? value.trim() : undefined;
}

function toSavedImportedQuestion(candidate, original) {
  return {
    ...original,
    area: candidate.area.trim(),
    Tema: candidate.Tema.trim(),
    statement: candidate.statement.trim(),
    options: optionIds.map((optionId) => ({
      id: optionId,
      text: candidate.options.find((option) => option.id === optionId).text.trim(),
    })),
    correctOptionId: candidate.correctOptionId,
    hint: optionalTrim(candidate.hint) ?? "",
    explanationTitle: optionalTrim(candidate.explanationTitle) ?? "",
    explanation: optionalTrim(candidate.explanation) ?? "",
    imageUrl: optionalTrim(candidate.imageUrl) ?? "",
    imageAlt: optionalTrim(candidate.imageAlt) ?? "",
    reviewNotes: optionalTrim(candidate.reviewNotes) ?? "",
    validationStatus: candidate.validationStatus ?? "pending",
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

  if (req.method === "POST" && url.pathname === "/api/login") {
    if (!password) {
      sendJson(res, 503, { error: "Configure QUESTMED_EDITOR_PASSWORD antes de abrir o editor." });
      return true;
    }

    const body = await readBody(req);

    if (body.password !== password) {
      sendJson(res, 401, { error: "Senha invalida." });
      return true;
    }

    const token = randomUUID();
    sessions.add(token);
    sendJson(res, 200, { token });
    return true;
  }

  if (!url.pathname.startsWith("/api/")) {
    return false;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Acesso nao autorizado." });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/questions") {
    const questions = await readQuestionBank();
    sendJson(res, 200, { questions });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/imported-questions") {
    const questions = await readImportedQuestionBank();
    sendJson(res, 200, { questions });
    return true;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/questions/")) {
    const questionId = decodeURIComponent(url.pathname.replace("/api/questions/", ""));
    const questions = await readQuestionBank();
    const questionIndex = questions.findIndex((question) => question.id === questionId);

    if (questionIndex === -1) {
      sendJson(res, 404, { error: "Questao nao encontrada." });
      return true;
    }

    const body = await readBody(req);
    const candidate = body.question;
    const errors = validateQuestion(candidate, questions[questionIndex]);

    if (errors.length > 0) {
      sendJson(res, 400, { error: "Revise os campos obrigatorios.", errors });
      return true;
    }

    const nextQuestions = questions.map((question, index) =>
      index === questionIndex ? toSavedQuestion(candidate, question) : question,
    );

    await writeFile(questionBankPath, `${JSON.stringify(nextQuestions, null, 2)}\n`, "utf8");
    await syncQuestionModule();
    sendJson(res, 200, { question: nextQuestions[questionIndex] });
    return true;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/imported-questions/")) {
    const questionId = decodeURIComponent(url.pathname.replace("/api/imported-questions/", ""));
    const questions = await readImportedQuestionBank();
    const questionIndex = questions.findIndex((question) => question.id === questionId);

    if (questionIndex === -1) {
      sendJson(res, 404, { error: "Questao importada nao encontrada." });
      return true;
    }

    const body = await readBody(req);
    const candidate = body.question;
    const errors = validateImportedQuestion(candidate, questions[questionIndex]);

    if (errors.length > 0) {
      sendJson(res, 400, { error: "Revise os campos obrigatorios.", errors });
      return true;
    }

    const nextQuestions = questions.map((question, index) =>
      index === questionIndex ? toSavedImportedQuestion(candidate, question) : question,
    );

    await writeFile(importedQuestionBankPath, `${JSON.stringify(nextQuestions, null, 2)}\n`, "utf8");
    sendJson(res, 200, { question: nextQuestions[questionIndex] });
    return true;
  }

  sendJson(res, 404, { error: "Endpoint nao encontrado." });
  return true;
}

await syncQuestionModule();

const vite = await createViteServer({
  appType: "spa",
  root: rootDir,
  server: {
    host,
    middlewareMode: true,
  },
});

const server = createServer(async (req, res) => {
  try {
    const handled = await handleApi(req, res);

    if (handled) {
      return;
    }

    vite.middlewares(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Erro inesperado." });
  }
});

server.listen(port, host, () => {
  console.log(`QuestMED editor em http://${host}:${port}/editar-questoes`);
  console.log(`QuestMED validador em http://${host}:${port}/validar-questoes`);
});
