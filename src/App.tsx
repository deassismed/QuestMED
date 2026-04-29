import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Lightbulb,
  Lock,
  Play,
  RotateCcw,
  Scissors,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { dailyQuestions, type Option, type Question } from "./data/questions";

const QUESTION_LIMIT = 10;
const QUESTION_SECONDS = 95;

type FlowStep = "question" | "videoModal" | "finished";

type AnswerRecord = {
  questionId: string;
  area: Question["area"];
  selectedOptionId: Option["id"] | null;
  correctOptionId: Option["id"];
  isCorrect: boolean;
  usedHint: boolean;
  expired: boolean;
  score: number;
  videoOpened: boolean;
};

type SessionState = {
  currentIndex: number;
  selectedOptionId: Option["id"] | null;
  eliminatedOptionIds: Option["id"][];
  isConfirmed: boolean;
  isExpired: boolean;
  usedHint: boolean;
  showHintModal: boolean;
  showStats: boolean;
  showVideoPrompt: boolean;
  flowStep: FlowStep;
  timeLeft: number;
  answers: AnswerRecord[];
  printWarning: string | null;
};

const initialSession: SessionState = {
  currentIndex: 0,
  selectedOptionId: null,
  eliminatedOptionIds: [],
  isConfirmed: false,
  isExpired: false,
  usedHint: false,
  showHintModal: false,
  showStats: false,
  showVideoPrompt: false,
  flowStep: "question",
  timeLeft: QUESTION_SECONDS,
  answers: [],
  printWarning: null,
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

function getYoutubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
}

function createAnswerRecord(
  question: Question,
  selectedOptionId: Option["id"] | null,
  usedHint: boolean,
  expired: boolean,
  videoOpened = false,
): AnswerRecord {
  const isCorrect = selectedOptionId === question.correctOptionId && !expired;

  return {
    questionId: question.id,
    area: question.area,
    selectedOptionId,
    correctOptionId: question.correctOptionId,
    isCorrect,
    usedHint,
    expired,
    score: isCorrect ? (usedHint ? 0.5 : 1) : 0,
    videoOpened,
  };
}

function upsertAnswer(answers: AnswerRecord[], record: AnswerRecord) {
  const existingIndex = answers.findIndex((answer) => answer.questionId === record.questionId);

  if (existingIndex === -1) {
    return [...answers, record];
  }

  return answers.map((answer, index) => (index === existingIndex ? record : answer));
}

function ActionButton({
  active,
  ariaLabel,
  children,
  disabled,
  onClick,
  tooltip,
  variant,
}: {
  active?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
  variant?: "confirm";
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={[
        "dock-button",
        active ? "active" : "",
        variant === "confirm" && !disabled ? "confirm-ready" : "",
      ].join(" ")}
      data-tooltip={tooltip}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default function App() {
  const [session, setSession] = useState<SessionState>(initialSession);
  const feedbackRef = useRef<HTMLElement | null>(null);

  const question = dailyQuestions[session.currentIndex];
  const dailyProgress = Math.min(session.currentIndex + 1, QUESTION_LIMIT);
  const currentAnswer = session.answers.find((answer) => answer.questionId === question.id);
  const questionLocked = session.isConfirmed || session.isExpired || session.flowStep !== "question";

  useEffect(() => {
    if (questionLocked || session.timeLeft === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSession((current) => {
        if (current.timeLeft <= 1) {
          const timeoutRecord = createAnswerRecord(question, null, current.usedHint, true);

          return {
            ...current,
            timeLeft: 0,
            isExpired: true,
            showStats: true,
            answers: upsertAnswer(current.answers, timeoutRecord),
          };
        }

        return {
          ...current,
          timeLeft: current.timeLeft - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [question, questionLocked, session.timeLeft]);

  useEffect(() => {
    function warn(message: string) {
      setSession((current) => ({ ...current, printWarning: message }));
      window.setTimeout(() => {
        setSession((current) => ({ ...current, printWarning: null }));
      }, 2600);
    }

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const blockedShortcut =
        key === "printscreen" ||
        ((event.ctrlKey || event.metaKey) && ["p", "s"].includes(key));

      if (!blockedShortcut) {
        return;
      }

      event.preventDefault();
      warn("Capturas e salvamentos rápidos foram desativados nesta tela.");
    }

    function handleContextMenu(event: MouseEvent) {
      event.preventDefault();
      warn("Menu de contexto bloqueado durante a resolução.");
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (!session.isConfirmed && !session.isExpired) {
      return;
    }

    feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [session.isConfirmed, session.isExpired]);

  const answerStatus = useMemo(() => {
    if (session.isExpired) {
      return "expired";
    }

    if (!session.isConfirmed || !session.selectedOptionId) {
      return null;
    }

    return session.selectedOptionId === question.correctOptionId ? "correct" : "incorrect";
  }, [question.correctOptionId, session.isConfirmed, session.isExpired, session.selectedOptionId]);

  const summary = useMemo(() => {
    const answered = session.answers.filter((answer) => !answer.expired);
    const correct = session.answers.filter((answer) => answer.isCorrect);
    const expired = session.answers.filter((answer) => answer.expired);
    const totalScore = session.answers.reduce((total, answer) => total + answer.score, 0);
    const percent = Math.round((totalScore / QUESTION_LIMIT) * 100);

    return {
      answered: answered.length,
      correct: correct.length,
      expired: expired.length,
      incorrect: session.answers.length - correct.length - expired.length,
      percent,
      totalScore,
    };
  }, [session.answers]);

  function resetQuestion(nextIndex: number, answers = session.answers) {
    setSession((current) => ({
      ...initialSession,
      answers,
      currentIndex: nextIndex,
      printWarning: current.printWarning,
    }));
  }

  function selectOption(optionId: Option["id"]) {
    if (questionLocked || session.eliminatedOptionIds.includes(optionId)) {
      return;
    }

    setSession((current) => ({
      ...current,
      selectedOptionId: optionId,
    }));
  }

  function confirmAnswer() {
    if (!session.selectedOptionId || questionLocked) {
      return;
    }

    const record = createAnswerRecord(question, session.selectedOptionId, session.usedHint, false);

    setSession((current) => ({
      ...current,
      answers: upsertAnswer(current.answers, record),
      isConfirmed: true,
      showStats: true,
      showVideoPrompt: true,
    }));
  }

  function eliminateOptions() {
    if (session.eliminatedOptionIds.length > 0 || questionLocked) {
      return;
    }

    setSession((current) => ({
      ...current,
      eliminatedOptionIds: getEliminatedOptions(question),
    }));
  }

  function openHint() {
    if (questionLocked) {
      return;
    }

    setSession((current) => ({
      ...current,
      showHintModal: true,
      usedHint: true,
    }));
  }

  function closeHint() {
    setSession((current) => ({
      ...current,
      showHintModal: false,
    }));
  }

  function openVideo() {
    if (!question.videoId) {
      return;
    }

    const updatedAnswers = session.answers.map((answer) =>
      answer.questionId === question.id ? { ...answer, videoOpened: true } : answer,
    );

    setSession((current) => ({
      ...current,
      answers: updatedAnswers,
      flowStep: "videoModal",
      showVideoPrompt: false,
    }));
  }

  function closeVideo() {
    setSession((current) => ({
      ...current,
      flowStep: "question",
    }));
  }

  function goNext() {
    const nextIndex = session.currentIndex + 1;

    if (nextIndex >= QUESTION_LIMIT || nextIndex >= dailyQuestions.length) {
      setSession((current) => ({
        ...current,
        flowStep: "finished",
        showHintModal: false,
        showVideoPrompt: false,
      }));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    resetQuestion(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restartSession() {
    setSession(initialSession);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const canConfirm = Boolean(session.selectedOptionId) && !questionLocked;
  const canGoNext = session.isConfirmed || session.isExpired;
  const videoAvailable = Boolean(question.videoId);

  if (session.flowStep === "finished") {
    return (
      <main className="app-shell secure-surface">
        <section className="phone-stage finished-stage" aria-label="Resultado QuestMED">
          {session.printWarning && <SecurityToast message={session.printWarning} />}
          <div className="finish-hero">
            <span className="finish-icon">
              <Sparkles size={30} aria-hidden="true" />
            </span>
            <p className="eyebrow">QuestMED</p>
            <h1>Resultado</h1>
            <p>Você concluiu as 10 questões de hoje.</p>
          </div>

          <section className="summary-grid" aria-label="Estatísticas finais">
            <div>
              <strong>{summary.correct}</strong>
              <span>Acertos</span>
            </div>
            <div>
              <strong>{summary.incorrect}</strong>
              <span>Erros</span>
            </div>
            <div>
              <strong>{summary.expired}</strong>
              <span>Não respondidas</span>
            </div>
            <div>
              <strong>{summary.percent}%</strong>
              <span>Desempenho</span>
            </div>
          </section>

          <section className="score-card">
            <p>Pontuação total</p>
            <strong>{summary.totalScore.toFixed(1).replace(".", ",")} / {QUESTION_LIMIT}</strong>
            <span>{summary.answered} questões respondidas. Dicas usadas reduzem a questão para metade da pontuação.</span>
          </section>

          <button className="primary-wide-button" onClick={restartSession} type="button">
            <RotateCcw size={19} aria-hidden="true" />
            Reiniciar simulação
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell secure-surface">
      <section className="phone-stage" aria-label="QuestMED">
        {session.printWarning && <SecurityToast message={session.printWarning} />}

        <header className="topbar">
          <div>
            <p className="eyebrow">QuestMED</p>
            <h1>Questão</h1>
          </div>
          <div className={`timer-card ${session.isExpired ? "expired" : ""}`} aria-label="Cronômetro regressivo">
            <Clock3 size={18} aria-hidden="true" />
            <span>{formatTimer(session.timeLeft)}</span>
          </div>
        </header>

        <div className="meta-row">
          <span className="id-pill">{question.id}</span>
          <span className="area-pill">{question.area}</span>
          <span className="progress-pill">{dailyProgress}/{QUESTION_LIMIT} hoje</span>
          {session.usedHint && <span className="hint-penalty-pill">Dica: 50%</span>}
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
                  questionLocked ? "locked" : "",
                ].join(" ")}
                disabled={isEliminated || questionLocked}
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

        <section className="feedback-zone" aria-live="polite" ref={feedbackRef}>
          {answerStatus === "expired" && (
            <div className="result-card expired">
              <Lock size={18} aria-hidden="true" />
              <p>
                <strong className="status-word neutral">TEMPO ENCERRADO</strong>. A questão foi bloqueada e registrada
                como não respondida.
              </p>
            </div>
          )}

          {answerStatus === "correct" && (
            <div className="result-card correct">
              <Sparkles size={18} aria-hidden="true" />
              <p>
                Resposta <strong className="status-word correct">CORRETA</strong>. Boa leitura dos dados clínicos.
              </p>
            </div>
          )}

          {answerStatus === "incorrect" && (
            <div className="result-card incorrect">
              <Sparkles size={18} aria-hidden="true" />
              <p>
                Resposta <strong className="status-word incorrect">INCORRETA</strong>. A alternativa{" "}
                {question.correctOptionId} é a mais adequada.
              </p>
            </div>
          )}

          {currentAnswer && (
            <div className="score-mini-card">
              <span>Pontuação nesta questão</span>
              <strong>{currentAnswer.score.toFixed(1).replace(".", ",")} ponto</strong>
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

          {session.showVideoPrompt && (
            <div className="video-prompt-card">
              <div>
                <span>Vídeo curto</span>
                <strong>{question.explanationTitle}</strong>
              </div>
              <div className="prompt-actions">
                <button disabled={!videoAvailable} onClick={openVideo} type="button">
                  <Play size={16} aria-hidden="true" />
                  Ver vídeo
                </button>
                <button onClick={() => setSession((current) => ({ ...current, showVideoPrompt: false }))} type="button">
                  Agora não
                </button>
              </div>
            </div>
          )}
        </section>

        {session.showHintModal && (
          <div className="modal-backdrop hint-backdrop" onClick={closeHint} role="presentation">
            <section className="hint-modal" aria-modal="true" role="dialog">
              <Lightbulb size={24} aria-hidden="true" />
              <p className="eyebrow">Dica da questão</p>
              <h2>Atenção à pista clínica</h2>
              <p>{question.hint}</p>
              <span>Esta questão agora vale metade da pontuação. Toque para voltar.</span>
            </section>
          </div>
        )}

        {session.flowStep === "videoModal" && question.videoId && (
          <div className="modal-backdrop video-backdrop" role="presentation">
            <section className="video-modal" aria-label="Vídeo explicativo" aria-modal="true" role="dialog">
              <button className="close-modal-button" onClick={closeVideo} type="button" aria-label="Fechar vídeo">
                <X size={20} aria-hidden="true" />
              </button>
              <div className="video-frame-wrap">
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  src={getYoutubeEmbedUrl(question.videoId)}
                  title={question.explanationTitle}
                />
              </div>
              <button className="primary-wide-button" onClick={goNext} type="button">
                Próxima questão
              </button>
            </section>
          </div>
        )}

        <nav className="action-dock" aria-label="Ferramentas da questão">
          <ActionButton
            active={session.showStats}
            ariaLabel="Mostrar estatísticas da questão"
            disabled={session.flowStep !== "question"}
            onClick={() => setSession((current) => ({ ...current, showStats: !current.showStats }))}
            tooltip="Mostra o percentual de alunos que marcou cada alternativa."
          >
            <BarChart3 size={23} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            active={session.eliminatedOptionIds.length > 0}
            ariaLabel="Eliminar duas alternativas"
            disabled={questionLocked || session.eliminatedOptionIds.length > 0}
            onClick={eliminateOptions}
            tooltip="Elimina duas alternativas incorretas."
          >
            <Scissors size={23} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            active={session.usedHint}
            ariaLabel="Mostrar dica"
            disabled={questionLocked}
            onClick={openHint}
            tooltip="Abre uma dica. Se usada, a questão passa a valer metade."
          >
            <Lightbulb size={23} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            ariaLabel="Avançar para próxima questão"
            disabled={!canGoNext}
            onClick={goNext}
            tooltip="Avança depois de confirmar a resposta ou quando o tempo acabar."
          >
            <ChevronRight size={27} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            ariaLabel="Confirmar resposta"
            disabled={!canConfirm}
            onClick={confirmAnswer}
            tooltip="Confirma a alternativa selecionada."
            variant="confirm"
          >
            <Check size={25} aria-hidden="true" />
          </ActionButton>
        </nav>
      </section>
    </main>
  );
}

function SecurityToast({ message }: { message: string }) {
  return (
    <div className="security-toast" role="status">
      <ShieldAlert size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
