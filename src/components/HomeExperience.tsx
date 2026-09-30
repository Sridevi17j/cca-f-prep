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
  const resume = sessions[0];

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
    <section className="home">
      <h1>
        CCA-F <em>practice</em>
      </h1>

      <div className="bank-row">
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
          <span className="bank-name">Latest</span>
          <span className="bank-meta">{catalog.latestCount} questions</span>
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
          <span className="bank-name">Older dump</span>
          <span className="bank-meta">{catalog.olderCount} · GitHub cca-prep</span>
        </label>
      </div>

      {bank === "latest" ? (
        <label className="scope">
          Topic
          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="all">All topics</option>
            {catalog.topics.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} · {item.count}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="scope">
          Exam
          <select value={exam} onChange={(event) => setExam(event.target.value)}>
            <option value="all">All six exams</option>
            {catalog.exams.map((item) => (
              <option key={item.exam} value={String(item.exam)}>
                Exam {item.exam} · {item.count}
              </option>
            ))}
          </select>
        </label>
      )}

      <Link className="button" href={href} onMouseEnter={() => prefetchBank(bank)}>
        Start · {count}
        <ArrowIcon />
      </Link>

      {resume ? (
        <Link className="resume" href={resume.href}>
          Resume {resume.label} · {resume.answered} answered
        </Link>
      ) : null}
    </section>
  );
}
