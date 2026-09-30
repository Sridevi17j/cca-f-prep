import type { BankId, PracticeQuery, Question } from "./types";

export const OLDER_REPO = "https://github.com/devgotomarket/cca-prep";

export function parsePracticeSearchParams(
  params: URLSearchParams,
): { ok: true; query: PracticeQuery } | { ok: false; message: string } {
  const bankRaw = params.get("bank");

  if (bankRaw && bankRaw !== "latest" && bankRaw !== "older") {
    return { ok: false, message: "That question bank isn’t available." };
  }

  const bank: BankId = bankRaw === "older" ? "older" : "latest";

  if (bank === "latest") {
    const topic = params.get("topic");
    return {
      ok: true,
      query: {
        bank,
        topic: topic && topic.length > 0 ? topic : null,
        exam: null,
        storageKey: topic ? `latest:${encodeURIComponent(topic)}` : "latest",
        kicker: "Latest",
        title: topic && topic.length > 0 ? topic : "All topics",
      },
    };
  }

  const examRaw = params.get("exam");
  let exam: number | null = null;

  if (examRaw && examRaw !== "all") {
    if (!/^[1-6]$/.test(examRaw)) {
      return { ok: false, message: "Older dump exams are numbered 1 through 6." };
    }
    exam = Number(examRaw);
  }

  return {
    ok: true,
    query: {
      bank,
      topic: null,
      exam,
      storageKey: exam ? `older:${exam}` : "older",
      kicker: "Older dump · GitHub cca-prep",
      title: exam ? `Exam ${exam}` : "All six exams",
      repoHref: OLDER_REPO,
    },
  };
}

export function applyQuery(questions: readonly Question[], query: PracticeQuery): Question[] | null {
  if (query.bank === "latest") {
    if (!query.topic) return [...questions];
    const subset = questions.filter((question) => question.topic === query.topic);
    return subset.length > 0 ? subset : null;
  }

  if (!query.exam) return [...questions];
  const subset = questions.filter((question) => question.exam === query.exam);
  return subset.length > 0 ? subset : null;
}

export function practiceHref(bank: BankId, topic: string, exam: string): string {
  const params = new URLSearchParams();
  params.set("bank", bank);
  if (bank === "latest" && topic !== "all") params.set("topic", topic);
  if (bank === "older" && exam !== "all") params.set("exam", exam);
  return `/practice?${params.toString()}`;
}
