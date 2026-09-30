"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadQuestions } from "@/lib/load-bank";
import { isChoiceId } from "@/lib/normalize";
import { applyQuery, parsePracticeSearchParams } from "@/lib/query";
import { fullStorageKey, type StoredSession } from "@/lib/session";
import type { ChoiceId, Question } from "@/lib/types";
import { ArrowIcon } from "./icons";
import { RichText } from "./RichText";

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

  const safeIndex = Math.min(index, Math.max((questions?.length ?? 1) - 1, 0));
  const current = questions?.[safeIndex];

  useEffect(() => {
    if (!current) return;
    const questionId = current.id;

    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) => Math.min(value + 1, (questions?.length ?? 1) - 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => Math.max(value - 1, 0));
      } else {
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
  }, [current, questions?.length]);

  if (!parsed.ok) {
    return (
      <section className="notice">
        <h1>Unknown bank.</h1>
        <p>{parsed.message}</p>
        <Link className="button" href="/">
          Back
        </Link>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="notice">
        <h1>{loadError}</h1>
        <Link className="button" href="/">
          Back
        </Link>
      </section>
    );
  }

  if (!questions || !ready || !current) {
    return <p className="notice">Opening {parsed.query.kicker}…</p>;
  }

  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const correctCount = questions.filter((question) => answers[question.id] === question.correct).length;
  const score = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);
  const chosen = answers[current.id];
  const topicLabel = current.topic || (current.exam ? `Exam ${current.exam}` : parsed.query.title);

  function choose(choice: ChoiceId) {
    const questionId = current?.id;
    if (!questionId) return;
    setAnswers((previous) => {
      if (previous[questionId]) return previous;
      return { ...previous, [questionId]: choice };
    });
  }

  return (
    <section className="practice">
      <div className="practice-bar">
        <p className="practice-label">
          {parsed.query.kicker} · {topicLabel}
        </p>
        <div
          className="bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
          aria-label="Questions answered"
        >
          <span style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
        <p className="practice-score">
          {answeredCount}/{questions.length}
          {answeredCount > 0 ? ` · ${score}%` : ""}
        </p>
      </div>

      <h2 className="sr-only">
        Question {safeIndex + 1} of {questions.length}
      </h2>
      <div className="stem">
        <RichText text={current.question} />
      </div>

      <div className="options">
        {current.options.map((option) => {
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

      {chosen ? (
        <div className={`feedback ${chosen === current.correct ? "is-correct" : "is-wrong"}`} role="status">
          <p className="feedback-title">
            {chosen === current.correct ? "Correct" : "Wrong"}
            <span>{chosen === current.correct ? `Choice ${current.correct}` : `Correct answer is ${current.correct}`}</span>
          </p>
          <RichText text={current.explanation} />
        </div>
      ) : (
        <p className="answer-hint">Pick one. A–D also work.</p>
      )}

      <div className="pager">
        <button type="button" onClick={() => setIndex(safeIndex - 1)} disabled={safeIndex === 0}>
          Previous
        </button>
        <select
          aria-label="Jump to question"
          value={safeIndex}
          onChange={(event) => setIndex(Number(event.target.value))}
        >
          {questions.map((question, questionIndex) => (
            <option key={question.id} value={questionIndex}>
              {questionIndex + 1} / {questions.length}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="pager-next"
          onClick={() => setIndex(Math.min(safeIndex + 1, questions.length - 1))}
          disabled={safeIndex === questions.length - 1}
        >
          Next
          <ArrowIcon />
        </button>
      </div>
    </section>
  );
}
