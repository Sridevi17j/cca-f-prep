"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { loadQuestions } from "@/lib/load-bank";
import { isChoiceId } from "@/lib/normalize";
import { applyQuery, parsePracticeSearchParams } from "@/lib/query";
import { fullStorageKey, type StoredSession } from "@/lib/session";
import type { ChoiceId, Question } from "@/lib/types";
import { ArrowIcon, HomeIcon } from "./icons";

const OLDER_EXAMS = [1, 2, 3, 4, 5, 6] as const;
import { RichText } from "./RichText";

export function PracticeExam() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  return <PracticeSession key={queryString} queryString={queryString} />;
}

function PracticeSession({ queryString }: { queryString: string }) {
  const router = useRouter();
  const parsed = useMemo(() => parsePracticeSearchParams(new URLSearchParams(queryString)), [queryString]);
  const needsDefaultExam = parsed.ok && parsed.query.bank === "older" && parsed.query.exam == null;

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<Record<string, ChoiceId>>({});
  const [index, setIndex] = useState(0);
  const [jumpValue, setJumpValue] = useState("");
  const [jumpInvalid, setJumpInvalid] = useState(false);

  useEffect(() => {
    if (!needsDefaultExam) return;
    router.replace("/practice?bank=older&exam=1");
  }, [needsDefaultExam, router]);

  useEffect(() => {
    if (!parsed.ok || needsDefaultExam) return;

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
  }, [parsed, needsDefaultExam]);

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
        <h1>That link doesn’t match a set.</h1>
        <p>{parsed.message}</p>
        <Link className="button" href="/">
          Back home
        </Link>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="notice">
        <h1>{loadError}</h1>
        <Link className="button" href="/">
          Back home
        </Link>
      </section>
    );
  }

  if (!questions || !ready || !current) {
    return <p className="notice">Getting the {parsed.query.kicker} questions…</p>;
  }

  const total = questions.length;
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const correctCount = questions.filter((question) => answers[question.id] === question.correct).length;
  const chosen = answers[current.id];
  const isOlder = parsed.query.bank === "older";
  const topicLabel = current.topic || (current.exam ? `Exam ${current.exam}` : parsed.query.title);
  const setLabel = isOlder ? "Older dump" : `${parsed.query.kicker} · ${topicLabel}`;

  function choose(choice: ChoiceId) {
    const questionId = current?.id;
    if (!questionId) return;
    setAnswers((previous) => {
      if (previous[questionId]) return previous;
      return { ...previous, [questionId]: choice };
    });
  }

  function jumpTo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Number(jumpValue);
    if (!Number.isInteger(next) || next < 1 || next > total) {
      setJumpInvalid(true);
      return;
    }
    setJumpInvalid(false);
    setJumpValue("");
    setIndex(next - 1);
  }

  return (
    <section className="practice">
      <div className={`practice-bar${isOlder ? " is-older" : ""}`}>
        <Link href="/" className="quiz-home">
          <HomeIcon />
          Home
        </Link>
        {isOlder ? (
          <nav className="exam-switch" aria-label="Switch exam">
            <span className="exam-switch-label">Exam</span>
            {OLDER_EXAMS.map((exam) => (
              <Link
                key={exam}
                href={`/practice?bank=older&exam=${exam}`}
                className={parsed.query.exam === exam ? "is-active" : ""}
                aria-current={parsed.query.exam === exam ? "page" : undefined}
                aria-label={`Exam ${exam}`}
              >
                <span className="exam-word">Exam </span>
                {exam}
              </Link>
            ))}
          </nav>
        ) : null}
        <p className="practice-label">{setLabel}</p>
        <p className="practice-position">
          {safeIndex + 1} / {total}
        </p>
      </div>
      <div className="practice-progress">
        <div
          className="bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answeredCount}
          aria-label="Questions answered"
        >
          <span style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
        <p className="practice-score">
          {answeredCount === 0 ? "0 answered" : `${answeredCount} answered · ${correctCount} right`}
        </p>
      </div>

      <h2 className="sr-only">
        Question {safeIndex + 1} of {total}
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
          <div className="feedback-head">
            <p className="feedback-verdict">
              <strong>{chosen === current.correct ? "Correct" : "Wrong"}</strong>
            </p>
            {chosen === current.correct ? null : (
              <p className="feedback-answer">The answer is {current.correct}.</p>
            )}
          </div>
          <div className="explanation">
            <p className="explanation-label">Explanation</p>
            <RichText text={current.explanation} />
          </div>
        </div>
      ) : (
        <p className="answer-hint">Choose the one that fits. A, B, C, and D work from the keyboard too.</p>
      )}

      <div className={`pager${chosen ? " is-ready" : ""}`}>
        <button type="button" onClick={() => setIndex(safeIndex - 1)} disabled={safeIndex === 0}>
          Previous
        </button>
        <form className="jump" onSubmit={jumpTo}>
          <label>
            <span className="sr-only">Go to question number</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={jumpValue}
              placeholder="Go to #"
              aria-invalid={jumpInvalid}
              aria-label={`Go to question, 1 to ${total}`}
              onChange={(event) => {
                setJumpValue(event.target.value.replace(/\D/g, "").slice(0, 3));
                setJumpInvalid(false);
              }}
            />
          </label>
          <button type="submit">Go</button>
        </form>
        <button
          type="button"
          className="pager-next"
          onClick={() => setIndex(Math.min(safeIndex + 1, total - 1))}
          disabled={safeIndex === total - 1}
        >
          Next
          {safeIndex === questions.length - 1 ? null : <ArrowIcon />}
        </button>
      </div>
    </section>
  );
}
