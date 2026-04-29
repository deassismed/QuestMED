import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Lightbulb,
  Scissors,
  Sparkles,
} from "lucide-react";
import { dailyQuestions, type Option, type Question } from "./data/questions";

const QUESTION_LIMIT = 10;
const QUESTION_SECONDS = 95;

type SessionState = {
  currentIndex: number;
  selectedOptionId: Option["id"] | null;
  eliminatedOptionIds: Option["id"][];
  isConfirmed: boolean;
  showHint: boolean;
  showStats: boolean;
  timeLeft: number;
};

const initialSession: SessionState = {
  currentIndex: 0,
  selectedOptionId: null,
  eliminatedOptionIds: [],
  isConfirmed: false,
  showHint: false,
  showStats: false,
  timeLeft: QUESTION_SECONDS,
};

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function getEliminatedOptions(question: Question) {
  return question.options
    .filter((option) => option.id !== question.correctOptionId)
    .sort((a, b) => question.statistics[a.id] - question.statistics[b.id])
    .slice(0, 2)
    .map((option) => option.id);
}

export default function App() {
  const [session, setSession] = useState<SessionState>(initialSession);

  const question = dailyQuestions[session.currentIndex];
  const dailyProgress = session.currentIndex + 1;

  useEffect(() => {
    if (session.isConfirmed || session.timeLeft === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSession((current) => ({
        ...current,
        timeLeft: Math.max(current.timeLeft - 1, 0),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session.isConfirmed, session.timeLeft]);

  const answerStatus = useMemo(() => {
    if (!session.isConfirmed || !session.selectedOptionId) {
      return null;
    }

    return session.selectedOptionId === question.correctOptionId ? "correct" : "incorrect";
  }, [question.correctOptionId, session.isConfirmed, session.selectedOptionId]);

  function resetForQuestion(nextIndex: number) {
    setSession({
      ...initialSession,
      currentIndex: nextIndex,
    });
  }

  function selectOption(optionId: Option["id"]) {
    if (session.isConfirmed || session.eliminatedOptionIds.includes(optionId)) {
      return;
    }

    setSession((current) => ({
      ...current,
      selectedOptionId: optionId,
    }));
  }

  function confirmAnswer() {
    if (!session.selectedOptionId) {
      return;
    }

    setSession((current) => ({
      ...current,
      isConfirmed: true,
      showStats: true,
    }));
  }

  function eliminateOptions() {
    if (session.eliminatedOptionIds.length > 0 || session.isConfirmed) {
      return;
    }

    setSession((current) => ({
      ...current,
      eliminatedOptionIds: getEliminatedOptions(question),
    }));
  }

  function skipQuestion() {
    const nextIndex = (session.currentIndex + 1) % dailyQuestions.length;
    resetForQuestion(nextIndex);
  }

  const canConfirm = Boolean(session.selectedOptionId) && !session.isConfirmed;

  return (
    <main className="app-shell">
      <section className="phone-stage" aria-label="QuestMED">
        <header className="topbar">
          <div>
            <p className="eyebrow">QuestMED</p>
            <h1>Questão</h1>
          </div>
          <div className="timer-card" aria-label="Cronômetro regressivo">
            <Clock3 size={18} aria-hidden="true" />
            <span>{formatTimer(session.timeLeft)}</span>
          </div>
        </header>

        <div className="meta-row">
          <span className="id-pill">{question.id}</span>
          <span className="area-pill">{question.area}</span>
          <span className="progress-pill">{dailyProgress}/{QUESTION_LIMIT} hoje</span>
        </div>

        <article className="question-card">
          <p>{question.statement}</p>
        </article>

        <section className="options-list" aria-label="Alternativas">
          {question.options.map((option) => {
            const isSelected = session.selectedOptionId === option.id;
            const isEliminated = session.eliminatedOptionIds.includes(option.id);
            const isCorrect = session.isConfirmed && option.id === question.correctOptionId;
            const isWrongSelection = session.isConfirmed && isSelected && !isCorrect;

            return (
              <button
                className={[
                  "option-button",
                  isSelected ? "selected" : "",
                  isEliminated ? "eliminated" : "",
                  isCorrect ? "correct" : "",
                  isWrongSelection ? "incorrect" : "",
                ].join(" ")}
                disabled={isEliminated}
                key={option.id}
                onClick={() => selectOption(option.id)}
                type="button"
              >
                <span className="option-letter">{option.id}</span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </section>

        <section className="feedback-zone" aria-live="polite">
          {session.showHint && (
            <div className="insight-card">
              <Lightbulb size={18} aria-hidden="true" />
              <p>{question.hint}</p>
            </div>
          )}

          {answerStatus && (
            <div className={`result-card ${answerStatus}`}>
              <Sparkles size={18} aria-hidden="true" />
              <p>
                {answerStatus === "correct"
                  ? "Resposta correta. Boa leitura dos dados clínicos."
                  : `Resposta incorreta. A alternativa ${question.correctOptionId} é a mais adequada.`}
              </p>
            </div>
          )}

          {session.showStats && (
            <div className="stats-card">
              {question.options.map((option) => (
                <div className="stat-row" key={option.id}>
                  <span>{option.id}</span>
                  <div className="stat-track">
                    <div style={{ width: `${question.statistics[option.id]}%` }} />
                  </div>
                  <strong>{question.statistics[option.id]}%</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <nav className="action-dock" aria-label="Ferramentas da questão">
          <button
            aria-label="Mostrar estatísticas da questão"
            className={session.showStats ? "active" : ""}
            onClick={() => setSession((current) => ({ ...current, showStats: !current.showStats }))}
            type="button"
          >
            <BarChart3 size={23} aria-hidden="true" />
          </button>
          <button
            aria-label="Eliminar duas alternativas"
            className={session.eliminatedOptionIds.length > 0 ? "active" : ""}
            onClick={eliminateOptions}
            type="button"
          >
            <Scissors size={23} aria-hidden="true" />
          </button>
          <button
            aria-label="Mostrar dica"
            className={session.showHint ? "active" : ""}
            onClick={() => setSession((current) => ({ ...current, showHint: !current.showHint }))}
            type="button"
          >
            <Lightbulb size={23} aria-hidden="true" />
          </button>
          <button aria-label="Pular questão" onClick={skipQuestion} type="button">
            <ChevronRight size={27} aria-hidden="true" />
          </button>
          <button
            aria-label="Confirmar resposta"
            className={canConfirm ? "confirm-ready" : ""}
            disabled={!canConfirm}
            onClick={confirmAnswer}
            type="button"
          >
            <Check size={25} aria-hidden="true" />
          </button>
        </nav>
      </section>
    </main>
  );
}
