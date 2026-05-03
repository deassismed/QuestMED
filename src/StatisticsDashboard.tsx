import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, BarChart3, CalendarDays, Filter, RefreshCw } from "lucide-react";
import type { Area, Tema } from "./data/questions";
import {
  fetchAggregatedQuestionStats,
  questionStatsConfigured,
  type AggregatedQuestionStats,
} from "./utils/statistics";

type LoadState = "loading" | "ready" | "not-configured" | "error";

type Summary = {
  totalQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  expiredQuestions: number;
  averageScore: number;
  correctPercent: number;
};

type GroupedStats = {
  label: string;
  summary: Summary;
};

const emptySummary: Summary = {
  totalQuestions: 0,
  correctQuestions: 0,
  incorrectQuestions: 0,
  expiredQuestions: 0,
  averageScore: 0,
  correctPercent: 0,
};

function getHomeHref() {
  return `${window.location.pathname.replace(/\/estatisticas\/?$/, "/")}${window.location.search}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function formatDecimal(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function summarize(rows: AggregatedQuestionStats[]): Summary {
  const totals = rows.reduce(
    (summary, row) => ({
      totalQuestions: summary.totalQuestions + row.totalQuestions,
      correctQuestions: summary.correctQuestions + row.correctQuestions,
      incorrectQuestions: summary.incorrectQuestions + row.incorrectQuestions,
      expiredQuestions: summary.expiredQuestions + row.expiredQuestions,
      averageScore: summary.averageScore + row.averageScore * row.totalQuestions,
      correctPercent: 0,
    }),
    emptySummary,
  );

  if (totals.totalQuestions === 0) {
    return emptySummary;
  }

  return {
    ...totals,
    averageScore: totals.averageScore / totals.totalQuestions,
    correctPercent: (totals.correctQuestions / totals.totalQuestions) * 100,
  };
}

function groupBy(rows: AggregatedQuestionStats[], key: (row: AggregatedQuestionStats) => string) {
  const groups = new Map<string, AggregatedQuestionStats[]>();

  rows.forEach((row) => {
    const label = key(row);
    groups.set(label, [...(groups.get(label) ?? []), row]);
  });

  return Array.from(groups.entries())
    .map<GroupedStats>(([label, groupRows]) => ({
      label,
      summary: summarize(groupRows),
    }))
    .sort((a, b) => b.summary.totalQuestions - a.summary.totalQuestions);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stats-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatsTable({ rows, title }: { rows: GroupedStats[]; title: string }) {
  return (
    <section className="stats-panel">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="stats-empty-line">Nenhum dado neste recorte.</p>
      ) : (
        <div className="stats-table-wrap">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Recorte</th>
                <th>Respostas</th>
                <th>Acerto</th>
                <th>Media</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.summary.totalQuestions}</td>
                  <td>{formatDecimal(row.summary.correctPercent)}%</td>
                  <td>{formatDecimal(row.summary.averageScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function StatisticsDashboard() {
  const [rows, setRows] = useState<AggregatedQuestionStats[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(() =>
    questionStatsConfigured() ? "loading" : "not-configured",
  );
  const [selectedDay, setSelectedDay] = useState("all");
  const [selectedTema, setSelectedTema] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");

  async function loadStats() {
    if (!questionStatsConfigured()) {
      setLoadState("not-configured");
      setRows([]);
      return;
    }

    setLoadState("loading");

    try {
      const nextRows = await fetchAggregatedQuestionStats();
      setRows(nextRows);
      setLoadState("ready");
    } catch {
      setRows([]);
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const days = useMemo(() => Array.from(new Set(rows.map((row) => row.localDay))).sort().reverse(), [rows]);
  const temas = useMemo(() => Array.from(new Set(rows.map((row) => row.tema))).sort(), [rows]);
  const areas = useMemo(() => Array.from(new Set(rows.map((row) => row.area))).sort(), [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesDay = selectedDay === "all" || row.localDay === selectedDay;
        const matchesTema = selectedTema === "all" || row.tema === selectedTema;
        const matchesArea = selectedArea === "all" || row.area === selectedArea;

        return matchesDay && matchesTema && matchesArea;
      }),
    [rows, selectedArea, selectedDay, selectedTema],
  );

  const summary = useMemo(() => summarize(filteredRows), [filteredRows]);
  const byDay = useMemo(() => groupBy(filteredRows, (row) => formatDate(row.localDay)), [filteredRows]);
  const byTema = useMemo(() => groupBy(filteredRows, (row) => row.tema), [filteredRows]);
  const byArea = useMemo(() => groupBy(filteredRows, (row) => row.area), [filteredRows]);
  const isReady = loadState === "ready";
  const hasRows = filteredRows.length > 0;

  return (
    <main className="stats-app-shell">
      <section className="stats-dashboard" aria-label="Estatisticas QuestMED">
        <header className="stats-header">
          <a className="stats-back-link" href={getHomeHref()} aria-label="Voltar ao QuestMED">
            <ArrowLeft size={18} aria-hidden="true" />
            QuestMED
          </a>
          <div className="stats-title-row">
            <span className="stats-title-icon">
              <BarChart3 size={28} aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">Estatisticas globais</p>
              <h1>Respostas</h1>
            </div>
          </div>
          <button className="stats-refresh-button" onClick={loadStats} type="button">
            <RefreshCw size={17} aria-hidden="true" />
            Atualizar
          </button>
        </header>

        {loadState === "not-configured" && (
          <section className="stats-state-card">
            <AlertCircle size={24} aria-hidden="true" />
            <div>
              <h2>Supabase nao configurado</h2>
              <p>Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes do build para carregar o painel.</p>
            </div>
          </section>
        )}

        {loadState === "error" && (
          <section className="stats-state-card danger">
            <AlertCircle size={24} aria-hidden="true" />
            <div>
              <h2>Nao foi possivel carregar</h2>
              <p>Confira a view publica no Supabase e tente atualizar novamente.</p>
            </div>
          </section>
        )}

        {loadState === "loading" && (
          <section className="stats-state-card">
            <RefreshCw className="stats-loading-icon" size={24} aria-hidden="true" />
            <div>
              <h2>Carregando estatisticas</h2>
              <p>Buscando os dados agregados das respostas.</p>
            </div>
          </section>
        )}

        {isReady && (
          <>
            <section className="stats-filter-panel" aria-label="Filtros">
              <div className="stats-filter-title">
                <Filter size={18} aria-hidden="true" />
                <strong>Filtros</strong>
              </div>
              <label>
                <span>Dia</span>
                <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
                  <option value="all">Todos os dias</option>
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {formatDate(day)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Tema</span>
                <select value={selectedTema} onChange={(event) => setSelectedTema(event.target.value as Tema | "all")}>
                  <option value="all">Todos os temas</option>
                  {temas.map((tema) => (
                    <option key={tema} value={tema}>
                      {tema}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Area</span>
                <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value as Area | "all")}>
                  <option value="all">Todas as areas</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {rows.length === 0 && (
              <section className="stats-state-card">
                <CalendarDays size={24} aria-hidden="true" />
                <div>
                  <h2>Sem respostas registradas</h2>
                  <p>Assim que novas respostas forem enviadas, os agregados aparecem aqui.</p>
                </div>
              </section>
            )}

            {rows.length > 0 && !hasRows && (
              <section className="stats-state-card">
                <CalendarDays size={24} aria-hidden="true" />
                <div>
                  <h2>Nenhum dado neste filtro</h2>
                  <p>Ajuste dia, tema ou area para ver outro recorte.</p>
                </div>
              </section>
            )}

            {hasRows && (
              <>
                <section className="stats-card-grid" aria-label="Resumo">
                  <StatCard label="Respostas" value={String(summary.totalQuestions)} />
                  <StatCard label="Acertos" value={String(summary.correctQuestions)} />
                  <StatCard label="Erros" value={String(summary.incorrectQuestions)} />
                  <StatCard label="Nao respondidas" value={String(summary.expiredQuestions)} />
                  <StatCard label="Percentual" value={`${formatDecimal(summary.correctPercent)}%`} />
                  <StatCard label="Media" value={formatDecimal(summary.averageScore)} />
                </section>

                <div className="stats-panel-grid">
                  <StatsTable rows={byDay} title="Por dia" />
                  <StatsTable rows={byTema} title="Por tema" />
                  <StatsTable rows={byArea} title="Por area" />
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
