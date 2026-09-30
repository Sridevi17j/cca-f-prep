"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { prefetchBank } from "@/lib/load-bank";
import { readSavedSessions, type SavedSession } from "@/lib/session";
import type { Catalog } from "@/lib/types";

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
  const sessionSnapshot = useSyncExternalStore(subscribeToSessions, readSessionSnapshot, () => "[]");
  const sessions = JSON.parse(sessionSnapshot) as SavedSession[];
  const resume = sessions[0];

  return (
    <section className="home">
      <div className="hero">
        <h1>CCA-F practice</h1>
        <p>Answer one question at a time, then see why that choice was right or wrong.</p>
        <div className="hero-actions">
          <Link className="button" href="/practice?bank=latest" onMouseEnter={() => prefetchBank("latest")}>
            Start Latest
            <span className="button-count">{catalog.latestCount}</span>
          </Link>
          <Link
            className="button button-secondary"
            href="/practice?bank=older"
            onMouseEnter={() => prefetchBank("older")}
          >
            Older dump
            <span className="button-count">{catalog.olderCount}</span>
          </Link>
        </div>
        {resume ? (
          <Link className="resume" href={resume.href}>
            Continue {resume.label} · {resume.answered} answered
          </Link>
        ) : null}
      </div>
    </section>
  );
}
