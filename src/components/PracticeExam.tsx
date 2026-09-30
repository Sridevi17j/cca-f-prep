"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadQuestions } from "@/lib/load-bank";
import { applyQuery, parsePracticeSearchParams } from "@/lib/query";
import { fullStorageKey, type StoredSession } from "@/lib/session";
import type { ChoiceId, Question } from "@/lib/types";
import { isChoiceId } from "@/lib/normalize";
import { ArrowIcon } from "./icons";
import { RichText } from "./RichText";

type View = "question" | "summary";

function groupKey(question: Question): string {
  if (question.topic) return question.topic;
  if (question.exam) return `Exam ${question.exam}`;
  return "Set";
}

export function PracticeExam() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  return <PracticeSession key={queryString} queryString={queryString} />;
}

function PracticeSession({ queryString }: { queryString: string }) {
  const parsed = useMemo(() => parsePracticeSearchParams(new URLSearchParams(queryString)), [queryString]);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<Record<string, ChoiceId>>({});
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("question");
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parsed.ok) return;

    let cancelled = false;

    loadQuestions(parsed.query.bank)
      .then((all) => {
        if (cancelled) return;
        const subset = applyQuery(all, parsed.query);
        if (!subset) {
          setLoadError(
            parsed.query.bank === "latest"
              ? "That topic is not in the Latest bank."
              : "That exam is not in the Older dump.",
          );
          setQuestions([]);
          setReady(true);
          return;
        }

        const allowed = new Set(subset.map((question) => question.id));
        let nextAnswers: Record<string, ChoiceId> = {};
        let nextIndex = 0;

        try {
          const raw = window.localStorage.getItem(fullStorageKey(parsed.query.storageKey));
          if (raw) {
            const saved = JSON.parse(raw) as Partial<StoredSession>;
            if (saved.answers) {
              for (const [id, value] of Object.entries(saved.answers)) {
                if (allowed.has(id) && isChoiceId(value)) nextAnswers[id] = value;
              }
            }
            if (typeof saved.index === "number" && saved.index >= 0 && saved.index < subset.length) {
              nextIndex = saved.index;
            }
          }
        } catch {
          nextAnswers = {};
          nextIndex = 0;
        }

        setAnswers(nextAnswers);
        setIndex(nextIndex);
        setQuestions(subset);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError("The question bank did not load. Refresh and try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [parsed]);

  useEffect(() => {
    if (!parsed.ok || !ready || !questions) return;
    const payload: StoredSession = { index, answers, updatedAt: Date.now() };
    window.localStorage.setItem(fullStorageKey(parsed.query.storageKey), JSON.stringify(payload));
  }, [answers, index, parsed, questions, ready]);

  const working = useMemo(() => {
    if (!questions) return [];
    if (!onlyWrong) return questions;
    return questions.filter((question) => {
      const choice = answers[question.id];
      return choice !== undefined && choice !== question.correct;
    });
  }, [answers, onlyWrong, questions]);

  const safeIndex = Math.min(index, Math.max(working.length - 1, 0));
  const current = working[safeIndex];

  useEffect(() => {
    if (view !== "question" || !current) return;
    headingRef.current?.focus();
  }, [current, view]);

  useEffect(() => {
    if (view !== "question" || !current) return;
    const questionId = current.id;

    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (safeIndex < working.length - 1) setIndex(safeIndex + 1);
        else setView("summary");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (safeIndex > 0) setIndex(safeIndex - 1);
      } else if (!jumpOpen) {
        const map: Record<string, ChoiceId> = { a: "A", b: "B", c: "C", d: "D", "1": "A", "2": "B", "3": "C", "4": "D" };
        const choice = map[event.key.toLowerCase()];
        if (!choice) return;
        event.preventDefault();
        setAnswers((previous) => {
          if (previous[questionId]) return previous;
          return { ...previous, [questionId]: choice };
        });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, jumpOpen, safeIndex, view, working.length]);

  if (!parsed.ok) {
    return (
      <section className="page-shell practice-message">
        <p className="eyebrow">Practice</p>
        <h1>That link does not match a bank.</h1>
        <p>{parsed.message}</p>
        <Link className="button button-dark" href="/#banks">
          Choose a bank
          <ArrowIcon />
        </Link>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="page-shell practice-message">
        <p className="eyebrow">{parsed.query.kicker}</p>
        <h1>{loadError}</h1>
        <Link className="button button-dark" href="/#banks">
          Choose a bank
          <ArrowIcon />
        </Link>
      </section>
    );
  }

  if (!questions || !ready) {
    return <p className="page-shell loading-copy">Opening {parsed.query.kicker}…</p>;
  }

  const sessionKey = parsed.query.storageKey;
  const answeredIds = questions.filter((question) => answers[question.id]);
  const correctCount = answeredIds.filter((question) => answers[question.id] === question.correct).length;
  const wrongCount = answeredIds.length - correctCount;
  const openCount = questions.length - answeredIds.length;
  const score = answeredIds.length === 0 ? 0 : Math.round((correctCount / answeredIds.length) * 100);

  const breakdown = new Map<string, { total: number; correct: number; answered: number }>();
  for (const question of questions) {
    const key = groupKey(question);
    const row = breakdown.get(key) ?? { total: 0, correct: 0, answered: 0 };
    row.total += 1;
    if (answers[question.id]) {
      row.answered += 1;
      if (answers[question.id] === question.correct) row.correct += 1;
    }
    breakdown.set(key, row);
  }

  function choose(choice: ChoiceId) {
    if (!current) return;
    const questionId = current.id;
    setAnswers((previous) => {
      if (previous[questionId]) return previous;
      return { ...previous, [questionId]: choice };
    });
  }

  function clearSession() {
    setAnswers({});
    setIndex(0);
    setOnlyWrong(false);
    setView("question");
    setJumpOpen(false);
    setConfirmClear(false);
    window.localStorage.removeItem(fullStorageKey(sessionKey));
  }

  return (
    <section className="practice page-shell">
      <div className="practice-top">
        <div>
          <p className="eyebrow">
            {parsed.query.kicker}
            {parsed.query.repoHref ? (
              <>
                {" "}
                ·{" "}
                <a href={parsed.query.repoHref} target="_blank" rel="noreferrer">
                  source
                </a>
              </>
            ) : null}
          </p>
          <h1>{parsed.query.title}</h1>
        </div>
        <div className="score-card">
          <p>
            <strong>{answeredIds.length}</strong>
            <span>answered of {questions.length}</span>
          </p>
          <p>
            <strong>{answeredIds.length === 0 ? "–" : `${score}%`}</strong>
            <span>{correctCount} correct so far</span>
          </p>
          <div
            className="bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answeredIds.length}
            aria-label="Questions answered"
          >
            <span style={{ width: `${questions.length === 0 ? 0 : (answeredIds.length / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="practice-tools">
        <Link href="/#banks">All banks</Link>
        <button type="button" onClick={() => setView(view === "summary" ? "question" : "summary")}>
          {view === "summary" ? "Back to questions" : "Summary"}
        </button>
        <button type="button" onClick={() => setOnlyWrong((value) => !value)} disabled={wrongCount === 0 && !onlyWrong}>
          {onlyWrong ? "Show full set" : `Review wrong${wrongCount ? ` · ${wrongCount}` : ""}`}
        </button>
        {confirmClear ? (
          <span className="clear-confirm">
            Clear this session?
            <button type="button" onClick={clearSession}>
              Clear
            </button>
            <button type="button" onClick={() => setConfirmClear(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} disabled={answeredIds.length === 0}>
            Start over
          </button>
        )}
      </div>

      {view === "summary" ? (
        <div className="summary">
          <p className="eyebrow">Score so far</p>
          <p className="summary-score">{answeredIds.length === 0 ? "–" : `${score}%`}</p>
          <p className="summary-detail">
            {correctCount} correct · {wrongCount} wrong · {openCount} still open
          </p>
          <ul className="breakdown">
            {[...breakdown.entries()].map(([label, row]) => (
              <li key={label}>
                <span>{label}</span>
                <strong>
                  {row.correct}/{row.answered || 0}
                  <small> correct of answered · {row.total} in set</small>
                </strong>
              </li>
            ))}
          </ul>
          <div className="hero-actions">
            <button type="button" className="button button-dark" onClick={() => setView("question")}>
              {openCount === 0 ? "Review the set" : "Keep going"}
              <ArrowIcon />
            </button>
            {wrongCount > 0 ? (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setOnlyWrong(true);
                  setIndex(0);
                  setView("question");
                }}
              >
                Review wrong
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === "question" && current ? (
        <article className="question-card" aria-live="polite">
          <p className="question-kicker">
            <span>
              Question {safeIndex + 1} of {working.length}
              {onlyWrong ? " · wrong answers" : ""}
            </span>
            <span>{current.topic || (current.exam ? `Exam ${current.exam}` : parsed.query.kicker)}</span>
          </p>
          <h2 className="sr-only">Question {safeIndex + 1} of {working.length}</h2>
          <div className="stem" tabIndex={-1} ref={headingRef}>
            <RichText text={current.question} />
          </div>
          <div className="options">
            {current.options.map((option) => {
              const chosen = answers[current.id];
              const locked = Boolean(chosen);
              const isChosen = chosen === option.id;
              const isCorrect = option.id === current.correct;
              const state = locked && isCorrect ? "is-correct" : locked && isChosen ? "is-wrong" : "";
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`option ${state}`}
                  onClick={() => choose(option.id)}
                  disabled={locked}
                  aria-pressed={isChosen}
                >
                  <span className="option-letter">{option.id}</span>
                  <span className="option-text">
                    <RichText text={option.text} variant="inline" />
                  </span>
                </button>
              );
            })}
          </div>

          {answers[current.id] ? (
            <div className={`feedback ${answers[current.id] === current.correct ? "is-correct" : "is-wrong"}`} role="status">
              <p className="feedback-title">
                {answers[current.id] === current.correct ? "Correct" : "Wrong"}
                {answers[current.id] !== current.correct ? (
                  <span>Correct answer is {current.correct}</span>
                ) : (
                  <span>Choice {current.correct}</span>
                )}
              </p>
              <div className="explanation">
                <p className="eyebrow">Explanation</p>
                <RichText text={current.explanation} />
              </div>
            </div>
          ) : (
            <p className="answer-hint">Select one answer. A, B, C, D or 1–4 work from the keyboard.</p>
          )}
        </article>
      ) : null}

      {view === "question" && !current ? (
        <div className="summary">
          <h2>Nothing in this review.</h2>
          <p>Wrong answers show up here after you miss one.</p>
          <button type="button" className="button button-dark" onClick={() => setOnlyWrong(false)}>
            Show full set
          </button>
        </div>
      ) : null}

      {view === "question" && working.length > 0 ? (
        <>
          {jumpOpen ? (
            <div className="jump-grid" role="list" aria-label="Jump to a question">
              {working.map((question, questionIndex) => {
                const choice = answers[question.id];
                const state = choice ? (choice === question.correct ? "is-correct" : "is-wrong") : "";
                return (
                  <button
                    key={question.id}
                    type="button"
                    className={`${state}${questionIndex === safeIndex ? " is-current" : ""}`}
                    onClick={() => {
                      setIndex(questionIndex);
                      setJumpOpen(false);
                    }}
                    aria-current={questionIndex === safeIndex ? "true" : undefined}
                  >
                    {questionIndex + 1}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="pager">
            <button type="button" onClick={() => setIndex(safeIndex - 1)} disabled={safeIndex === 0}>
              Previous
            </button>
            <button type="button" aria-expanded={jumpOpen} onClick={() => setJumpOpen((open) => !open)}>
              Jump
            </button>
            <button
              type="button"
              className="pager-next"
              onClick={() => {
                if (safeIndex < working.length - 1) setIndex(safeIndex + 1);
                else setView("summary");
              }}
            >
              {safeIndex < working.length - 1 ? "Next" : "Summary"}
              <ArrowIcon />
            </button>
          </div>
        </>
      ) : null}

      {openCount === 0 && view === "question" ? (
        <p className="finished-note">Every question in this set has an answer. The summary has the full score.</p>
      ) : null}
    </section>
  );
}
