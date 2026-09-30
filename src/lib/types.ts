export type BankId = "latest" | "older";

export type ChoiceId = "A" | "B" | "C" | "D";

export type Choice = {
  id: ChoiceId;
  text: string;
};

export type Question = {
  id: string;
  topic: string;
  question: string;
  options: Choice[];
  correct: ChoiceId;
  explanation: string;
  source: "latest" | "older-dump";
  exam?: number;
};

export type RawQuestion = {
  id: number | string;
  topic?: string;
  question: string;
  options: readonly { id: string; text: string }[];
  correct: string;
  explanation: string;
  source?: string;
  exam?: number;
};

export type TopicCount = {
  name: string;
  count: number;
};

export type ExamCount = {
  exam: number;
  count: number;
};

export type Catalog = {
  latestCount: number;
  topics: TopicCount[];
  olderCount: number;
  exams: ExamCount[];
  olderRepo: string;
};

export type PracticeQuery = {
  bank: BankId;
  topic: string | null;
  exam: number | null;
  storageKey: string;
  kicker: string;
  title: string;
  repoHref?: string;
};
