import type { Option, Question } from "../data/questions";

type PdfAnswer = {
  questionId: string;
  selectedOptionId: Option["id"] | null;
  correctOptionId: Option["id"];
  isCorrect: boolean;
  usedHint: boolean;
  expired: boolean;
  score: number;
};

type PdfSummary = {
  answered: number;
  correct: number;
  expired: number;
  incorrect: number;
  percent: number;
  totalScore: number;
};

type PdfQuestionResult = {
  order: number;
  question: Question;
  answer?: PdfAnswer;
};

type TextOptions = {
  bold?: boolean;
  color?: string;
  indent?: number;
  lineGap?: number;
  size?: number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 38;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  ink: "0.109 0.169 0.180",
  muted: "0.376 0.443 0.455",
  primary: "0.055 0.373 0.361",
  line: "0.839 0.898 0.886",
  danger: "0.788 0.294 0.294",
};

function normalizeForPdf(text: string) {
  return text
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
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

function toWinAnsiByte(char: string) {
  const code = char.charCodeAt(0);

  if (code <= 255) {
    return code;
  }

  return "?".charCodeAt(0);
}

function toPdfHex(text: string) {
  return Array.from(normalizeForPdf(text))
    .map((char) => toWinAnsiByte(char).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function estimateTextWidth(text: string, fontSize: number) {
  return normalizeForPdf(text).length * fontSize * 0.49;
}

function wrapText(text: string, fontSize: number, width: number) {
  const normalized = normalizeForPdf(text).replace(/\s+/g, " ").trim();
  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (estimateTextWidth(candidate, fontSize) <= width || !currentLine) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function formatScore(score: number) {
  return score.toFixed(1).replace(".", ",");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStatus(answer: PdfAnswer | undefined) {
  if (!answer || answer.expired) {
    return "Não respondida";
  }

  return answer.isCorrect ? "Correta" : "Incorreta";
}

class SimplePdf {
  private pages: string[] = [];
  private current = "";
  private y = MARGIN;

  constructor() {
    this.addPage();
  }

  addPage() {
    if (this.current) {
      this.pages.push(this.current);
    }

    this.current = "";
    this.y = MARGIN;
  }

  addText(text: string, options: TextOptions = {}) {
    const size = options.size ?? 9.5;
    const lineGap = options.lineGap ?? 3;
    const indent = options.indent ?? 0;
    const font = options.bold ? "F2" : "F1";
    const color = options.color ?? COLORS.ink;
    const availableWidth = CONTENT_WIDTH - indent;
    const lines = wrapText(text, size, availableWidth);

    lines.forEach((line) => {
      this.ensureSpace(size + lineGap + 2);
      const x = MARGIN + indent;
      const pdfY = PAGE_HEIGHT - this.y;

      this.current += `q ${color} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${pdfY.toFixed(2)} Td <${toPdfHex(line)}> Tj ET Q\n`;
      this.y += size + lineGap;
    });
  }

  moveDown(amount = 8) {
    this.y += amount;
  }

  divider() {
    this.ensureSpace(12);
    const y = PAGE_HEIGHT - this.y;
    const right = PAGE_WIDTH - MARGIN;

    this.current += `q ${COLORS.line} RG 0.7 w ${MARGIN.toFixed(2)} ${y.toFixed(2)} m ${right.toFixed(2)} ${y.toFixed(2)} l S Q\n`;
    this.y += 11;
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.addPage();
    }
  }

  toBlob() {
    if (this.current) {
      this.pages.push(this.current);
      this.current = "";
    }

    const objects: string[] = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      `<< /Type /Pages /Kids [${this.pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${this.pages.length} >>`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ];

    this.pages.forEach((content, index) => {
      const pageObjectId = 5 + index * 2;
      const contentObjectId = pageObjectId + 1;

      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      );
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);

    for (let index = 0; index < pdf.length; index += 1) {
      bytes[index] = pdf.charCodeAt(index) & 0xff;
    }

    return new Blob([bytes], { type: "application/pdf" });
  }
}

function addQuestion(pdf: SimplePdf, result: PdfQuestionResult) {
  const { answer, order, question } = result;
  const selectedOption = answer?.selectedOptionId ?? "Não respondeu";

  pdf.ensureSpace(180);
  pdf.addText(`${order}. ${question.area} - ${question.id}`, {
    bold: true,
    color: COLORS.primary,
    size: 11,
  });
  pdf.addText(question.statement, { size: 9.2, lineGap: 2.2 });
  pdf.moveDown(3);

  question.options.forEach((option) => {
    const markers: string[] = [];

    if (option.id === question.correctOptionId) {
      markers.push("gabarito");
    }

    if (option.id === answer?.selectedOptionId) {
      markers.push("resposta do aluno");
    }

    pdf.addText(`${option.id}) ${option.text}${markers.length ? ` (${markers.join(", ")})` : ""}`, {
      indent: 10,
      size: 8.7,
      lineGap: 1.8,
    });
  });

  pdf.moveDown(3);
  pdf.addText(`Status: ${getStatus(answer)} | Resposta do aluno: ${selectedOption} | Gabarito oficial: ${question.correctOptionId}`, {
    bold: true,
    size: 8.8,
  });
  pdf.addText(`Pontuação: ${formatScore(answer?.score ?? 0)} ponto | Dica usada: ${answer?.usedHint ? "Sim" : "Não"}`, {
    size: 8.8,
  });

  if (question.explanation) {
    pdf.addText(`Comentário: ${question.explanation}`, { size: 8.8, lineGap: 1.8 });
  }

  pdf.divider();
}

export function generateResultPdfBlob({
  answers,
  exportedAt,
  questions,
  summary,
  totalQuestions,
}: {
  answers: PdfAnswer[];
  exportedAt: Date;
  questions: Question[];
  summary: PdfSummary;
  totalQuestions: number;
}) {
  const pdf = new SimplePdf();
  const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));

  pdf.addText("QuestMED - Resultado do aluno", {
    bold: true,
    color: COLORS.primary,
    size: 18,
  });
  pdf.addText(`Gerado em ${formatDate(exportedAt)}`, { color: COLORS.muted, size: 9.5 });
  pdf.moveDown(8);
  pdf.addText(`Pontuação total: ${formatScore(summary.totalScore)} / ${totalQuestions}`, {
    bold: true,
    size: 11,
  });
  pdf.addText(
    `Desempenho: ${summary.percent}% | Acertos: ${summary.correct} | Erros: ${summary.incorrect} | Não respondidas: ${summary.expired} | Respondidas: ${summary.answered}`,
    { size: 9.5 },
  );
  pdf.divider();

  questions.slice(0, totalQuestions).forEach((question, index) => {
    addQuestion(pdf, {
      answer: answerByQuestionId.get(question.id),
      order: index + 1,
      question,
    });
  });

  return pdf.toBlob();
}
