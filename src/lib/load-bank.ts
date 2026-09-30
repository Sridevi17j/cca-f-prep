import { normalizeLatest, normalizeOlder } from "./normalize";
import type { BankId, Question, RawQuestion } from "./types";

const cache: Partial<Record<BankId, Question[]>> = {};

export async function loadQuestions(bank: BankId): Promise<Question[]> {
  const cached = cache[bank];
  if (cached) return cached;

  if (bank === "latest") {
    const data = (await import("@/data/questions.latest.json")).default as RawQuestion[];
    const questions = normalizeLatest(data);
    cache.latest = questions;
    return questions;
  }

  const data = (await import("@/data/questions.older.json")).default as RawQuestion[];
  const questions = normalizeOlder(data);
  cache.older = questions;
  return questions;
}

export function prefetchBank(bank: BankId): void {
  if (bank === "latest") {
    void import("@/data/questions.latest.json");
    return;
  }
  void import("@/data/questions.older.json");
}
