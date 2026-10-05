"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { loadQuestions } from "@/lib/load-bank";
import {
  clearAllSessions,
  clearSession,
  readStoredAnswers,
  scoreAnswers,
  subscribeSessions,
} from "@/lib/session";
import type { Catalog, Question } from "@/lib/types";

function readSessionSnapshot(): string {
  return JSON.stringify(readStoredAnswers());
}

type ProgressRow = {
  storageKey: string;
  label: string;
  href: string;
  total: number;
  answered: number;
  correct: number;
  scored: boolean;
};

export function HomeExperience({ catalog }: { catalog: Catalog }) {
  const sessionSnapshot = useSyncExternalStore(subscribeSessions, readSessionSnapshot, () => "[]");
  const stored = JSON.parse(sessionSnapshot) as ReturnType<typeof readStoredAnswers>;
  const [latestQuestions, setLatestQuestions] = useState<Question[] | null>(null);
  const [olderQuestions, setOlderQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadQuestions("latest").then((questions) => {
      if (!cancelled) setLatestQuestions(questions);
    });
    loadQuestions("older").then((questions) => {
      if (!cancelled) setOlderQuestions(questions);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const answersByKey = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    for (const row of stored) map.set(row.storageKey, row.answers);
    return map;
  }, [stored]);

  const rows = useMemo(() => {
    const next: ProgressRow[] = [
      {
        storageKey: "latest",
        label: "Latest",
        href: "/practice?bank=latest",
        total: catalog.latestCount,
        ...tally(latestQuestions, answersByKey.get("latest")),
      },
    ];

    for (const exam of catalog.exams) {
      const questions = olderQuestions?.filter((question) => question.exam === exam.exam) ?? null;
      next.push({
        storageKey: `older:${exam.exam}`,
        label: `Exam ${exam.exam}`,
        href: `/practice?bank=older&exam=${exam.exam}`,
        total: exam.count,
        ...tally(questions, answersByKey.get(`older:${exam.exam}`)),
      });
    }

    return next;
  }, [answersByKey, catalog.exams, catalog.latestCount, latestQuestions, olderQuestions]);

  const latestRow = rows[0];
  const examRows = rows.slice(1);
  const hasProgress = rows.some((row) => row.answered > 0) || stored.some((row) => Object.keys(row.answers).length > 0);

  function resetAll() {
    if (!window.confirm("Clear all saved answers and progress?")) return;
    clearAllSessions();
  }

  function resetOne(row: ProgressRow) {
    if (!window.confirm(`Clear progress for ${row.label}?`)) return;
    clearSession(row.storageKey);
  }

  return (
    <section className="home">
      <div className="hero">
        <h1>CCA-F practice</h1>
        <p>Answer one question at a time, then see why that choice was right or wrong.</p>
        <div className="hero-actions">
          <Link className="button" href="/practice?bank=latest" onMouseEnter={() => void loadQuestions("latest")}>
            Start Latest
            <span className="button-count">{catalog.latestCount}</span>
          </Link>
          <Link className="button button-secondary" href="/practice?bank=older&exam=1">
            Older dump
            <span className="button-count">{catalog.olderCount}</span>
          </Link>
        </div>

        <section className="progress" aria-label="Progress by set">
          <div className="progress-head">
            <h2>Progress</h2>
            <button type="button" className="quiet-button" onClick={resetAll} disabled={!hasProgress}>
              Reset all
            </button>
          </div>
          <ul className="progress-list">
            {latestRow ? <ProgressItem row={latestRow} onReset={resetOne} /> : null}
            {examRows.length > 0 ? <li className="progress-group">Older dump</li> : null}
            {examRows.map((row) => (
              <ProgressItem key={row.storageKey} row={row} onReset={resetOne} />
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

function ProgressItem({ row, onReset }: { row: ProgressRow; onReset: (row: ProgressRow) => void }) {
  return (
    <li>
      <div className="progress-row">
        <div className="progress-copy">
          <p className="progress-name">{row.label}</p>
          <p className="progress-meta">
            {row.answered} / {row.total}
            {row.scored && row.answered > 0 ? ` · ${row.correct} right` : ""}
          </p>
          <span className="progress-track" aria-hidden="true">
            <span style={{ width: `${row.total === 0 ? 0 : (row.answered / row.total) * 100}%` }} />
          </span>
        </div>
        <div className="progress-actions">
          <Link href={row.href}>
            {row.answered > 0 ? "Continue" : "Start"}
            <span className="sr-only"> {row.label}</span>
          </Link>
          {row.answered > 0 ? (
            <button type="button" className="quiet-button" onClick={() => onReset(row)}>
              Reset
              <span className="sr-only"> {row.label}</span>
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function tally(
  questions: readonly Question[] | null,
  answers: Record<string, string> | undefined,
): { answered: number; correct: number; scored: boolean } {
  const saved = answers ?? {};
  if (!questions) {
    return { answered: Object.keys(saved).length, correct: 0, scored: false };
  }
  return { ...scoreAnswers(questions, saved), scored: true };
}
