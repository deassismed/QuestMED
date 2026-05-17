import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const questionBankPath = join(rootDir, "src", "data", "question-bank.json");
const questionModulePath = join(rootDir, "src", "data", "questions.ts");

export async function syncQuestionModule() {
  const rawQuestionBank = await readFile(questionBankPath, "utf8");
  const questionBank = JSON.parse(rawQuestionBank);

  if (!Array.isArray(questionBank)) {
    throw new Error("question-bank.json precisa conter um array de questoes.");
  }

  const source = `import questionBankData from "./question-bank.json";

export type Area = string;
export type Tema = string;

export type Option = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

export type Question = {
  id: string;
  area: Area;
  Tema: Tema;
  statement: string;
  attachments?: QuestionAttachment[];
  options: Option[];
  correctOptionId: Option["id"];
  hint: string;
  statistics: Record<Option["id"], number>;
  explanationTitle: string;
  explanation?: string;
  videoId?: string;
  imageUrl?: string;
  imageAlt?: string;
};

export type QuestionAttachment = {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
};

const DAILY_QUESTION_LIMIT = 10;

function shuffleQuestions<T>(questions: T[]) {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function pickBalancedDailyQuestions(questions: Question[]) {
  const themes = Array.from(new Set(questions.map((question) => question.Tema)));
  const buckets = new Map<Tema, Question[]>(
    themes.map((theme) => [theme, shuffleQuestions(questions.filter((question) => question.Tema === theme))]),
  );
  const themeOrder = shuffleQuestions(themes);
  const selected: Question[] = [];
  let round = 0;

  while (selected.length < DAILY_QUESTION_LIMIT) {
    const theme = themeOrder[round % themeOrder.length];
    const bucket = buckets.get(theme);
    const question = bucket?.shift();

    if (question) {
      selected.push(question);
    }

    round += 1;

    if (round > questions.length + themeOrder.length) {
      break;
    }
  }

  return selected;
}

export const questionBank = questionBankData as unknown as Question[];
export const dailyQuestions: Question[] = pickBalancedDailyQuestions(questionBank);
`;

  await writeFile(questionModulePath, source, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await syncQuestionModule();
}
