import type { Choice, ChoiceId, Question, RawQuestion } from "./types";

const CHOICES: readonly ChoiceId[] = ["A", "B", "C", "D"];

/**
 * The older exams file stores some correct choices inside the previous option
 * (`\n* B) ...`) and sometimes repeats the correct choice at the end of the
 * stem (`* **A) ...**`). Repair both so the practice UI can show four real
 * choices without spoiling the answer.
 */
const EMBEDDED_CHOICE = /\n\*\s*([A-D])\)\s*/;
const STEM_SPOILER = /\n+\*\s+\*\*[A-D]\)\s*[\s\S]*?\*\*\s*$/u;

function asChoice(id: string, questionId: string): ChoiceId {
  if (id === "A" || id === "B" || id === "C" || id === "D") return id;
  throw new Error(`Question ${questionId} has an unexpected choice id "${id}".`);
}

function expandOptions(questionId: string, options: RawQuestion["options"]): Choice[] {
  const expanded: Choice[] = [];

  for (const option of options) {
    const parts = option.text.split(EMBEDDED_CHOICE);
    expanded.push({ id: asChoice(option.id, questionId), text: parts[0]?.trim() ?? "" });

    for (let index = 1; index < parts.length; index += 2) {
      const letter = parts[index] ?? "";
      const text = parts[index + 1] ?? "";
      expanded.push({ id: asChoice(letter, questionId), text: text.trim() });
    }
  }

  expanded.sort((left, right) => left.id.localeCompare(right.id));
  return expanded;
}

function cleanStem(text: string): string {
  return text.replace(STEM_SPOILER, "").trim();
}

function cleanExplanation(text: string): string {
  return text
    .replace(/\n+# CCAF Practice Exam Master Log:[\s\S]*$/u, "")
    .replace(/\n+---\s*$/u, "")
    .trim();
}

function finalize(raw: RawQuestion, source: Question["source"], repairStem: boolean): Question {
  const id = String(raw.id);
  const options = expandOptions(id, raw.options);
  const letters = options.map((option) => option.id).join("");

  if (letters !== "ABCD") {
    throw new Error(`Question ${id} resolved to choices "${letters}" instead of ABCD.`);
  }

  if (options.some((option) => option.text.length === 0)) {
    throw new Error(`Question ${id} has an empty choice.`);
  }

  const correct = asChoice(raw.correct, id);
  const explanation = cleanExplanation(raw.explanation);

  if (!explanation) {
    throw new Error(`Question ${id} is missing an explanation.`);
  }

  const question: Question = {
    id,
    topic: raw.topic?.trim() ?? "",
    question: repairStem ? cleanStem(raw.question) : raw.question.trim(),
    options,
    correct,
    explanation,
    source,
  };

  if (typeof raw.exam === "number") question.exam = raw.exam;
  return question;
}

export function normalizeLatest(raw: readonly RawQuestion[]): Question[] {
  return raw.map((question) => finalize(question, "latest", false));
}

export function normalizeOlder(raw: readonly RawQuestion[]): Question[] {
  return raw.map((question) => finalize(question, "older-dump", true));
}

export function isChoiceId(value: string): value is ChoiceId {
  return (CHOICES as readonly string[]).includes(value);
}
