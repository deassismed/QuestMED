import type { Area, Tema } from "../data/questions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STATS_ENDPOINT = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1/daily_question_stats` : "";

export type AggregatedQuestionStats = {
  localDay: string;
  area: Area;
  tema: Tema;
  totalQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  expiredQuestions: number;
  correctPercent: number;
  averageScore: number;
};

type StatsRow = {
  local_day: string;
  area: Area;
  tema: Tema;
  total_questions: number;
  correct_questions: number;
  incorrect_questions: number;
  expired_questions: number;
  correct_percent: number | string | null;
  average_score: number | string | null;
};

export function questionStatsConfigured() {
  return Boolean(STATS_ENDPOINT && SUPABASE_ANON_KEY);
}

function toNumber(value: number | string | null) {
  if (value === null) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

function normalizeRow(row: StatsRow): AggregatedQuestionStats {
  return {
    localDay: row.local_day,
    area: row.area,
    tema: row.tema,
    totalQuestions: row.total_questions,
    correctQuestions: row.correct_questions,
    incorrectQuestions: row.incorrect_questions,
    expiredQuestions: row.expired_questions,
    correctPercent: toNumber(row.correct_percent),
    averageScore: toNumber(row.average_score),
  };
}

export async function fetchAggregatedQuestionStats() {
  if (!questionStatsConfigured()) {
    return [];
  }

  const params = new URLSearchParams({
    select:
      "local_day,area,tema,total_questions,correct_questions,incorrect_questions,expired_questions,correct_percent,average_score",
    order: "local_day.desc",
  });

  const response = await window.fetch(`${STATS_ENDPOINT}?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase stats request failed with status ${response.status}`);
  }

  const rows = (await response.json()) as StatsRow[];

  return rows.map(normalizeRow);
}
