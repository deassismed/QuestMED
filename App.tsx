import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
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
const DRAG_START_THRESHOLD = 46;
const DRAG_COMMIT_RATIO = 0.42;
const DRAG_COMMIT_MIN_DISTANCE = 132;
const DRAG_COMMIT_VELOCITY = 1.15;
const DRAG_TRANSITION_MS = 240;

const questionCount = Math.min(QUESTION_LIMIT, dailyQuestions.length);

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

type QuestionRuntimeState = {
  selectedOptionId: Option["id"] | null;
  eliminatedOptionIds: Option["id"][];
  isConfirmed: boolean;
  isExpired: boolean;
  usedHint: boolean;
  showHintModal: boolean;
  showStats: boolean;
  showVideoPrompt: boolean;
  timeLeft: number;
};

type SessionState = {
  currentIndex: number;
  questionStates: QuestionRuntimeState[];
  flowStep: FlowStep;
  answers: AnswerRecord[];
  printWarning: string | null;
};

type DragState = {
  isDragging: boolean;
  neighborIndex: number | null;
  offset: number;
  transition: boolean;
};

type GestureStart = {
  x: number;
  y: number;
  time: number;
};

const idleDrag: DragState = {
  isDragging: false,
  neighborIndex: null,
  offset: 0,
  transition: false,
};

function createQuestionState(): QuestionRuntimeState {
  return {
    selectedOptionId: null,
    eliminatedOptionIds: [],
    isConfirmed: false,
    isExpired: false,
    usedHint: false,
    showHintModal: false,
    showStats: false,
    showVideoPrompt: false,
    timeLeft: QUESTION_SECONDS,
  };
}

function createInitialSession(): SessionState {
  return {
    currentIndex: 0,
    questionStates: Array.from({ length: questionCount }, createQuestionState),
    flowStep: "question",
    answers: [],
    printWarning: null,
  };
}

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

function replaceQuestionState(
  states: QuestionRuntimeState[],
  index: number,
  updater: (state: QuestionRuntimeState) => QuestionRuntimeState,
) {
  return states.map((state, stateIndex) => (stateIndex === index ? updater(state) : state));
}

function FloatingToolButton({
  active,
  ariaLabel,
  children,
  disabled,
  onClick,
  tooltip,
}: {
  active?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={["floating-tool-button", active ? "active" : ""].join(" ")}
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
  const [session, setSession] = useState<SessionState>(() => createInitialSession());
  const [drag, setDrag] = useState<DragState>(idleDrag);
  const activeScrollRef = useRef<HTMLDivElement | null>(null);
  const feedbackRef = useRef<HTMLElement | null>(null);
  const gestureStartRef = useRef<GestureStart | null>(null);
  const dragRef = useRef<DragState>(idleDrag);
  const swipeHandledRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const question = dailyQuestions[session.currentIndex];
  const questionState = session.questionStates[session.currentIndex] ?? createQuestionState();
  const questionLocked =
    questionState.isConfirmed || questionState.isExpired || session.flowStep !== "question";

  function setDragState(nextDrag: DragState) {
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      activeScrollRef.current?.scrollTo({ top: 0 });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [session.currentIndex]);

  useEffect(() => {
    if (questionLocked || questionState.timeLeft === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSession((current) => {
        if (current.flowStep !== "question" || current.currentIndex !== session.currentIndex) {
          return current;
        }

        const activeQuestion = dailyQuestions[current.currentIndex];
        const activeQuestionState = current.questionStates[current.currentIndex];

        if (!activeQuestionState || activeQuestionState.isConfirmed || activeQuestionState.isExpired) {
          return current;
        }

        if (activeQuestionState.timeLeft <= 1) {
          const timeoutRecord = createAnswerRecord(
            activeQuestion,
            null,
            activeQuestionState.usedHint,
            true,
          );

          return {
            ...current,
            answers: upsertAnswer(current.answers, timeoutRecord),
            questionStates: replaceQuestionState(current.questionStates, current.currentIndex, (state) => ({
              ...state,
              timeLeft: 0,
              isExpired: true,
              showStats: true,
            })),
          };
        }

        return {
          ...current,
          questionStates: replaceQuestionState(current.questionStates, current.currentIndex, (state) => ({
            ...state,
            timeLeft: state.timeLeft - 1,
          })),
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [questionLocked, questionState.timeLeft, session.currentIndex]);

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
      warn("Capturas e salvamentos rapidos foram desativados nesta tela.");
    }

    function handleContextMenu(event: MouseEvent) {
      event.preventDefault();
      warn("Menu de contexto bloqueado durante a resolucao.");
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (!questionState.isConfirmed && !questionState.isExpired) {
      return;
    }

    feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [questionState.isConfirmed, questionState.isExpired]);

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

  function getAnswerStatus(targetQuestion: Question, targetState: QuestionRuntimeState) {
    if (targetState.isExpired) {
      return "expired";
    }

    if (!targetState.isConfirmed || !targetState.selectedOptionId) {
      return null;
    }

    return targetState.selectedOptionId === targetQuestion.correctOptionId ? "correct" : "incorrect";
  }

  function updateActiveQuestion(updater: (state: QuestionRuntimeState) => QuestionRuntimeState) {
    setSession((current) => ({
      ...current,
      questionStates: replaceQuestionState(current.questionStates, current.currentIndex, updater),
    }));
  }

  function navigateToQuestion(nextIndex: number) {
    const cappedIndex = Math.max(0, Math.min(nextIndex, questionCount - 1));

    if (cappedIndex === session.currentIndex) {
      return;
    }

    setSession((current) => ({
      ...current,
      currentIndex: cappedIndex,
      flowStep: "question",
      questionStates: replaceQuestionState(current.questionStates, current.currentIndex, (state) => ({
        ...state,
        showHintModal: false,
      })),
    }));
  }

  function goNext() {
    const nextIndex = session.currentIndex + 1;

    if (nextIndex >= questionCount) {
      setSession((current) => ({
        ...current,
        flowStep: "finished",
        questionStates: replaceQuestionState(current.questionStates, current.currentIndex, (state) => ({
          ...state,
          showHintModal: false,
          showVideoPrompt: false,
        })),
      }));
      return;
    }

    navigateToQuestion(nextIndex);
  }

  function goPrevious() {
    if (session.currentIndex === 0) {
      return;
    }

    navigateToQuestion(session.currentIndex - 1);
  }

  function shouldIgnoreSwipeTarget(target: EventTarget | null) {
    return (
      target instanceof HTMLElement &&
      Boolean(
        target.closest(
          ".floating-tool-button, .floating-confirm-button, .video-prompt-card button, .close-modal-button, iframe, a",
        ),
      )
    );
  }

  function getScrollInfo(target: EventTarget | null) {
    const targetElement = target instanceof HTMLElement ? target : null;
    const scrollElement =
      (targetElement?.closest(".question-page-scroll") as HTMLDivElement | null) ?? activeScrollRef.current;

    if (!scrollElement) {
      return { atBottom: true, atTop: true };
    }

    const atTop = scrollElement.scrollTop <= 2;
    const atBottom =
      scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 2;

    return { atBottom, atTop };
  }

  function getNeighborIndex(deltaY: number, target: EventTarget | null) {
    const { atBottom, atTop } = getScrollInfo(target);

    if (deltaY < 0 && atBottom && session.currentIndex < questionCount - 1) {
      return session.currentIndex + 1;
    }

    if (deltaY > 0 && atTop && session.currentIndex > 0) {
      return session.currentIndex - 1;
    }

    return null;
  }

  function clampDragOffset(offset: number) {
    const viewportHeight = activeScrollRef.current?.clientHeight ?? window.innerHeight;
    const maxOffset = viewportHeight * 0.96;

    return Math.max(-maxOffset, Math.min(maxOffset, offset));
  }

  function startGesture(x: number, y: number, target: EventTarget | null) {
    if (session.flowStep !== "question" || questionState.showHintModal || shouldIgnoreSwipeTarget(target)) {
      gestureStartRef.current = null;
      return;
    }

    gestureStartRef.current = { x, y, time: performance.now() };
  }

  function moveGesture(x: number, y: number, target: EventTarget | null, preventDefault: () => void) {
    const gestureStart = gestureStartRef.current;

    if (!gestureStart || session.flowStep !== "question" || questionState.showHintModal) {
      return;
    }

    const deltaX = x - gestureStart.x;
    const deltaY = y - gestureStart.y;

    if (Math.abs(deltaY) < DRAG_START_THRESHOLD || Math.abs(deltaY) < Math.abs(deltaX) * 1.25) {
      return;
    }

    const neighborIndex = dragRef.current.neighborIndex ?? getNeighborIndex(deltaY, target);

    if (neighborIndex === null) {
      return;
    }

    preventDefault();
    setDragState({
      isDragging: true,
      neighborIndex,
      offset: clampDragOffset(deltaY),
      transition: false,
    });
  }

  function endGesture(x: number, y: number) {
    const gestureStart = gestureStartRef.current;
    const currentDrag = dragRef.current;

    gestureStartRef.current = null;

    if (!gestureStart || !currentDrag.isDragging || currentDrag.neighborIndex === null) {
      setDragState(idleDrag);
      return;
    }

    const viewportHeight = activeScrollRef.current?.clientHeight ?? window.innerHeight;
    const elapsed = Math.max(performance.now() - gestureStart.time, 1);
    const velocity = (y - gestureStart.y) / elapsed;
    const dragDistance = Math.abs(currentDrag.offset);
    const shouldCommit =
      dragDistance > viewportHeight * DRAG_COMMIT_RATIO ||
      (dragDistance > DRAG_COMMIT_MIN_DISTANCE && Math.abs(velocity) > DRAG_COMMIT_VELOCITY);

    swipeHandledRef.current = true;
    window.setTimeout(() => {
      swipeHandledRef.current = false;
    }, 140);

    if (!shouldCommit) {
      setDragState({
        ...currentDrag,
        offset: 0,
        transition: true,
      });

      transitionTimeoutRef.current = window.setTimeout(() => {
        setDragState(idleDrag);
      }, DRAG_TRANSITION_MS);
      return;
    }

    const exitOffset = currentDrag.neighborIndex > session.currentIndex ? -viewportHeight : viewportHeight;

    setDragState({
      ...currentDrag,
      offset: exitOffset,
      transition: true,
    });

    transitionTimeoutRef.current = window.setTimeout(() => {
      navigateToQuestion(currentDrag.neighborIndex as number);
      setDragState(idleDrag);
    }, DRAG_TRANSITION_MS);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    startGesture(event.clientX, event.clientY, event.target);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    moveGesture(event.clientX, event.clientY, event.target, () => event.preventDefault());
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    endGesture(event.clientX, event.clientY);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    startGesture(touch.clientX, touch.clientY, event.target);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    moveGesture(touch.clientX, touch.clientY, event.target, () => event.preventDefault());
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    endGesture(touch.clientX, touch.clientY);
  }

  function selectOption(optionId: Option["id"]) {
    if (swipeHandledRef.current || questionLocked || questionState.eliminatedOptionIds.includes(optionId)) {
      return;
    }

    updateActiveQuestion((state) => ({
      ...state,
      selectedOptionId: optionId,
    }));
  }

  function confirmAnswer() {
    if (!questionState.selectedOptionId || questionLocked) {
      return;
    }

    const record = createAnswerRecord(
      question,
      questionState.selectedOptionId,
      questionState.usedHint,
      false,
    );

    setSession((current) => ({
      ...current,
      answers: upsertAnswer(current.answers, record),
      questionStates: replaceQuestionState(current.questionStates, current.currentIndex, (state) => ({
        ...state,
        isConfirmed: true,
        showStats: true,
        showVideoPrompt: true,
      })),
    }));
  }

  function eliminateOptions() {
    if (questionState.eliminatedOptionIds.length > 0 || questionLocked) {
      return;
    }

    updateActiveQuestion((state) => ({
      ...state,
      eliminatedOptionIds: getEliminatedOptions(question),
    }));
  }

  function openHint() {
    if (questionLocked) {
      return;
    }

    updateActiveQuestion((state) => ({
      ...state,
      showHintModal: true,
      usedHint: true,
    }));
  }

  function closeHint() {
    updateActiveQuestion((state) => ({
      ...state,
      showHintModal: false,
    }));
  }

  function openVideo() {
    if (!question.videoId) {
      return;
    }

    setSession((current) => ({
      ...current,
      answers: current.answers.map((answer) =>
        answer.questionId === question.id ? { ...answer, videoOpened: true } : answer,
      ),
      flowStep: "videoModal",
      questionStates: replaceQuestionState(current.questionStates, current.currentIndex, (state) => ({
        ...state,
        showVideoPrompt: false,
      })),
    }));
  }

  function closeVideo() {
    setSession((current) => ({
      ...current,
      flowStep: "question",
    }));
  }

  function restartSession() {
    setDragState(idleDrag);
    setSession(createInitialSession());
  }

  function renderQuestionPage(index: number, position: "active" | "neighbor") {
    const targetQuestion = dailyQuestions[index];
    const targetState = session.questionStates[index] ?? createQuestionState();
    const targetAnswer = session.answers.find((answer) => answer.questionId === targetQuestion.id);
    const targetStatus = getAnswerStatus(targetQuestion, targetState);
    const targetProgress = Math.min(index + 1, QUESTION_LIMIT);
    const isActive = position === "active";
    const targetLocked =
      targetState.isConfirmed || targetState.isExpired || session.flowStep !== "question" || !isActive;

    return (
      <article
        aria-hidden={!isActive}
        className={["feed-page", isActive ? "active" : "neighbor"].join(" ")}
        key={`${targetQuestion.id}-${position}`}
      >
        <header className="topbar">
          <div>
            <p className="eyebrow">QuestMED</p>
            <h1>Questao</h1>
          </div>
          <div className="floating-tools" aria-label="Ferramentas da questao">
            <FloatingToolButton
              active={targetState.usedHint}
              ariaLabel="Mostrar dica"
              disabled={targetLocked}
              onClick={openHint}
              tooltip="Abre uma dica. Se usada, a questao passa a valer metade."
            >
              <Lightbulb size={21} aria-hidden="true" />
            </FloatingToolButton>
            <FloatingToolButton
              active={targetState.eliminatedOptionIds.length > 0}
              ariaLabel="Eliminar duas alternativas"
              disabled={targetLocked || targetState.eliminatedOptionIds.length > 0}
              onClick={eliminateOptions}
              tooltip="Elimina duas alternativas incorretas."
            >
              <Scissors size={21} aria-hidden="true" />
            </FloatingToolButton>
            <div className={`timer-card ${targetState.isExpired ? "expired" : ""}`} aria-label="Cronometro regressivo">
              <Clock3 size={18} aria-hidden="true" />
              <span>{formatTimer(targetState.timeLeft)}</span>
            </div>
          </div>
        </header>

        <div className="question-page-scroll" ref={isActive ? activeScrollRef : undefined}>
          <div className="meta-row">
            <span className="id-pill">{targetQuestion.id}</span>
            <span className="area-pill">{targetQuestion.area}</span>
            <span className="progress-pill">{targetProgress}/{QUESTION_LIMIT} hoje</span>
            {targetState.usedHint && <span className="hint-penalty-pill">Dica: 50%</span>}
          </div>

          <section className="question-card">
            <p>{targetQuestion.statement}</p>
          </section>

          <section className="options-list" aria-label="Alternativas">
            {targetQuestion.options.map((option) => {
              const isSelected = targetState.selectedOptionId === option.id;
              const isEliminated = targetState.eliminatedOptionIds.includes(option.id);
              const isCorrect = targetState.isConfirmed && option.id === targetQuestion.correctOptionId;
              const isWrongSelection = targetState.isConfirmed && isSelected && !isCorrect;

              return (
                <button
                  className={[
                    "option-button",
                    isSelected ? "selected" : "",
                    isEliminated ? "eliminated" : "",
                    isCorrect ? "correct" : "",
                    isWrongSelection ? "incorrect" : "",
                    targetLocked ? "locked" : "",
                  ].join(" ")}
                  disabled={isEliminated || targetLocked}
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

          <section className="feedback-zone" aria-live="polite" ref={isActive ? feedbackRef : undefined}>
            {targetStatus === "expired" && (
              <div className="result-card expired">
                <Lock size={18} aria-hidden="true" />
                <p>
                  <strong className="result-badge neutral">TEMPO ENCERRADO</strong>
                  <span>A questao foi bloqueada e registrada como nao respondida.</span>
                </p>
              </div>
            )}

            {targetStatus === "correct" && (
              <div className="result-card correct">
                <Sparkles size={18} aria-hidden="true" />
                <p>
                  <strong className="result-badge correct">CORRETA</strong>
                  <span>Boa leitura dos dados clinicos.</span>
                </p>
              </div>
            )}

            {targetStatus === "incorrect" && (
              <div className="result-card incorrect">
                <Sparkles size={18} aria-hidden="true" />
                <p>
                  <strong className="result-badge incorrect">INCORRETA</strong>
                  <span>A alternativa {targetQuestion.correctOptionId} e a mais adequada.</span>
                </p>
              </div>
            )}

            {targetAnswer && (
              <div className="score-mini-card">
                <span>Pontuacao nesta questao</span>
                <strong>{targetAnswer.score.toFixed(1).replace(".", ",")} ponto</strong>
              </div>
            )}

            {targetState.showStats && (
              <div className="stats-card">
                {targetQuestion.options.map((option) => (
                  <div className="stat-row" key={option.id}>
                    <span>{option.id}</span>
                    <div className="stat-track">
                      <div style={{ width: `${targetQuestion.statistics[option.id]}%` }} />
                    </div>
                    <strong>{targetQuestion.statistics[option.id]}%</strong>
                  </div>
                ))}
              </div>
            )}

            {targetState.showVideoPrompt && (
              <div className="video-prompt-card">
                <strong>{targetQuestion.explanationTitle}</strong>
                <button disabled={!targetQuestion.videoId || !isActive} onClick={openVideo} type="button">
                  <Play size={16} aria-hidden="true" />
                  Ver video curto
                </button>
              </div>
            )}

            {(targetState.isConfirmed || targetState.isExpired) && targetQuestion.explanation && (
              <div className="explanation-card">
                <p>
                  <strong>Justificativa:</strong> {targetQuestion.explanation}
                </p>
              </div>
            )}
          </section>
        </div>
      </article>
    );
  }

  const canConfirm = Boolean(questionState.selectedOptionId) && !questionLocked;
  const showConfirmButton = canConfirm && session.flowStep === "question";
  const feedHeight = activeScrollRef.current?.clientHeight ?? 1;
  const neighborOffset = drag.neighborIndex === null ? 0 : drag.neighborIndex > session.currentIndex ? feedHeight : -feedHeight;
  const feedStyle = {
    transform: `translate3d(0, ${drag.offset}px, 0)`,
    transition: drag.transition ? `transform ${DRAG_TRANSITION_MS}ms cubic-bezier(0.18, 0.82, 0.22, 1)` : "none",
  };
  const stageClassName = ["phone-stage", drag.isDragging || drag.transition ? "is-feed-moving" : ""].join(" ");

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
            <p>Voce concluiu as 10 questoes de hoje.</p>
          </div>

          <section className="summary-grid" aria-label="Estatisticas finais">
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
              <span>Nao respondidas</span>
            </div>
            <div>
              <strong>{summary.percent}%</strong>
              <span>Desempenho</span>
            </div>
          </section>

          <section className="score-card">
            <p>Pontuacao total</p>
            <strong>{summary.totalScore.toFixed(1).replace(".", ",")} / {QUESTION_LIMIT}</strong>
            <span>{summary.answered} questoes respondidas. Dicas usadas reduzem a questao para metade da pontuacao.</span>
          </section>

          <button className="primary-wide-button" onClick={restartSession} type="button">
            <RotateCcw size={19} aria-hidden="true" />
            Reiniciar simulacao
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell secure-surface">
      <section
        className={stageClassName}
        aria-label="QuestMED"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragState(idleDrag)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        {session.printWarning && <SecurityToast message={session.printWarning} />}

        <section className="question-feed" aria-label="Questoes">
          <div className="question-feed-track" style={feedStyle}>
            {drag.neighborIndex !== null && (
              <div className="feed-page-slot" style={{ transform: `translate3d(0, ${neighborOffset}px, 0)` }}>
                {renderQuestionPage(drag.neighborIndex, "neighbor")}
              </div>
            )}
            <div className="feed-page-slot">{renderQuestionPage(session.currentIndex, "active")}</div>
          </div>
        </section>

        {questionState.showHintModal && (
          <div className="modal-backdrop hint-backdrop" onClick={closeHint} role="presentation">
            <section className="hint-modal" aria-modal="true" role="dialog">
              <header className="hint-modal-header">
                <Lightbulb size={28} aria-hidden="true" />
                <h2>Dica</h2>
              </header>
              <p>{question.hint}</p>
            </section>
          </div>
        )}

        {session.flowStep === "videoModal" && question.videoId && (
          <div className="modal-backdrop video-backdrop" role="presentation">
            <section className="video-modal" aria-label="Video explicativo" aria-modal="true" role="dialog">
              <button className="close-modal-button" onClick={closeVideo} type="button" aria-label="Fechar video">
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
                Proxima questao
              </button>
            </section>
          </div>
        )}

        {showConfirmButton && (
          <button
            className="floating-confirm-button"
            disabled={!canConfirm}
            onClick={confirmAnswer}
            type="button"
          >
            <Check size={20} aria-hidden="true" />
            Confirmar alternativa
          </button>
        )}
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
