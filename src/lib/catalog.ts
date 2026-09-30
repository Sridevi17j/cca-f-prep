import olderRaw from "@/data/questions.older.json";
import latestRaw from "@/data/questions.latest.json";
import { normalizeLatest, normalizeOlder } from "./normalize";
import { OLDER_REPO } from "./query";
import type { Catalog, Question, RawQuestion } from "./types";

const TOPIC_ORDER = [
  "Agentic Architecture & Orchestration",
  "Tool Design & MCP Integration",
  "Context Management & Reliability",
  "Prompt Engineering & Structured Output",
  "Claude Code Configuration & Workflows",
];

let latestCache: Question[] | null = null;
let olderCache: Question[] | null = null;

export function getLatestQuestions(): Question[] {
  latestCache ??= normalizeLatest(latestRaw as RawQuestion[]);
  return latestCache;
}

export function getOlderQuestions(): Question[] {
  olderCache ??= normalizeOlder(olderRaw as RawQuestion[]);
  return olderCache;
}

export function getCatalog(): Catalog {
  const latest = getLatestQuestions();
  const older = getOlderQuestions();
  const topicCounts = new Map<string, number>();

  for (const question of latest) {
    topicCounts.set(question.topic, (topicCounts.get(question.topic) ?? 0) + 1);
  }

  const orderedNames = [
    ...TOPIC_ORDER.filter((topic) => topicCounts.has(topic)),
    ...[...topicCounts.keys()].filter((topic) => !TOPIC_ORDER.includes(topic)),
  ];

  const examCounts = new Map<number, number>();
  for (const question of older) {
    if (typeof question.exam !== "number") continue;
    examCounts.set(question.exam, (examCounts.get(question.exam) ?? 0) + 1);
  }

  return {
    latestCount: latest.length,
    topics: orderedNames.map((name) => ({ name, count: topicCounts.get(name) ?? 0 })),
    olderCount: older.length,
    exams: [...examCounts.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([exam, count]) => ({ exam, count })),
    olderRepo: OLDER_REPO,
  };
}
