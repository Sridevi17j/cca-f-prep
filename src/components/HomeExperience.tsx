"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { prefetchBank } from "@/lib/load-bank";
import { practiceHref } from "@/lib/query";
import { readSavedSessions, type SavedSession } from "@/lib/session";
import type { BankId, Catalog } from "@/lib/types";
import { ArrowIcon } from "./icons";

function subscribeToSessions(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("focus", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

function readSessionSnapshot(): string {
  return JSON.stringify(readSavedSessions());
}

export function HomeExperience({ catalog }: { catalog: Catalog }) {
  const [bank, setBank] = useState<BankId>("latest");
  const [topic, setTopic] = useState("all");
  const [exam, setExam] = useState("all");
  const sessionSnapshot = useSyncExternalStore(subscribeToSessions, readSessionSnapshot, () => "[]");
  const sessions = JSON.parse(sessionSnapshot) as SavedSession[];

  const href = practiceHref(bank, topic, exam);
  const count =
    bank === "latest"
      ? topic === "all"
        ? catalog.latestCount
        : (catalog.topics.find((item) => item.name === topic)?.count ?? catalog.latestCount)
      : exam === "all"
        ? catalog.olderCount
        : (catalog.exams.find((item) => String(item.exam) === exam)?.count ?? catalog.olderCount);

  return (
    <section className="banks" id="banks">
      <div className="section-heading">
        <p className="eyebrow">What we are drilling</p>
        <h2>Pick a bank.</h2>
      </div>

      <fieldset className="bank-fieldset">
        <legend className="sr-only">Question bank</legend>
        <div className="bank-grid">
          <label className={`bank-card bank-latest${bank === "latest" ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="bank"
              value="latest"
              checked={bank === "latest"}
              onChange={() => {
                setBank("latest");
                prefetchBank("latest");
              }}
            />
            <span className="product-meta">
              <span>01 · Default</span>
              <span className="status">
                <i />
                Latest
              </span>
            </span>
            <span className="bank-title">Latest</span>
            <span className="bank-label">{catalog.latestCount} questions · {catalog.topics.length} topics</span>
            <span className="bank-copy">
              The current CCA-F set for this cohort. This is the bank to use for present prep.
            </span>
          </label>

          <label className={`bank-card bank-older${bank === "older" ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="bank"
              value="older"
              checked={bank === "older"}
              onChange={() => {
                setBank("older");
                prefetchBank("older");
              }}
            />
            <span className="product-meta">
              <span>02 · Archive</span>
              <span>Older dump</span>
            </span>
            <span className="bank-title">Older dump</span>
            <span className="bank-label">GitHub cca-prep · {catalog.olderCount} questions</span>
            <span className="bank-copy">
              Six earlier practice exams from the public cca-prep repository. Kept separate from Latest so the two
              sets stay easy to tell apart.
            </span>
          </label>
        </div>
      </fieldset>
      {bank === "older" ? (
        <p className="bank-source">
          Older dump source:{" "}
          <a href={catalog.olderRepo} target="_blank" rel="noreferrer">
            github.com/devgotomarket/cca-prep
          </a>
        </p>
      ) : null}

      {bank === "latest" ? (
        <fieldset className="scope-fieldset">
          <legend>Topic</legend>
          <div className="chips" role="radiogroup" aria-label="Latest topics">
            <label className="chip">
              <input type="radio" name="topic" value="all" checked={topic === "all"} onChange={() => setTopic("all")} />
              All topics
              <small>{catalog.latestCount}</small>
            </label>
            {catalog.topics.map((item) => (
              <label className="chip" key={item.name}>
                <input
                  type="radio"
                  name="topic"
                  value={item.name}
                  checked={topic === item.name}
                  onChange={() => setTopic(item.name)}
                />
                {item.name}
                <small>{item.count}</small>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <fieldset className="scope-fieldset">
          <legend>Exam</legend>
          <div className="chips" role="radiogroup" aria-label="Older dump exams">
            <label className="chip">
              <input type="radio" name="exam" value="all" checked={exam === "all"} onChange={() => setExam("all")} />
              All six exams
              <small>{catalog.olderCount}</small>
            </label>
            {catalog.exams.map((item) => (
              <label className="chip" key={item.exam}>
                <input
                  type="radio"
                  name="exam"
                  value={String(item.exam)}
                  checked={exam === String(item.exam)}
                  onChange={() => setExam(String(item.exam))}
                />
                Exam {item.exam}
                <small>{item.count}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="start-row">
        <Link className="button button-dark" href={href} onMouseEnter={() => prefetchBank(bank)}>
          Start practice · {count}
          <ArrowIcon />
        </Link>
        <p>Your choice locks in, then the correct letter and the explanation open on the same screen.</p>
      </div>

      {sessions.length > 0 ? (
        <div className="resume">
          <p className="eyebrow">Continue in this browser</p>
          <ul>
            {sessions.slice(0, 4).map((session) => (
              <li key={session.storageKey}>
                <Link href={session.href}>
                  <span>{session.label}</span>
                  <small>{session.answered} answered</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
