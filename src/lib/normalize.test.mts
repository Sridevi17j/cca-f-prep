import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { normalizeLatest, normalizeOlder } from "./normalize.ts";
import { applyQuery, parsePracticeSearchParams } from "./query.ts";
import type { RawQuestion } from "./types.ts";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../data");
const latestRaw = JSON.parse(readFileSync(join(dataDir, "questions.latest.json"), "utf8")) as RawQuestion[];
const olderRaw = JSON.parse(readFileSync(join(dataDir, "questions.older.json"), "utf8")) as RawQuestion[];

test("latest bank stays a clean set of 134 questions", () => {
  const questions = normalizeLatest(latestRaw);
  assert.equal(questions.length, 134);
  assert.equal(new Set(questions.map((question) => question.id)).size, 134);

  const first = questions[0];
  assert.ok(first);
  assert.equal(first.id, "1");
  assert.equal(first.correct, "B");
  assert.equal(first.source, "latest");
  assert.match(first.question, /send_notification/);

  const topics = new Set(questions.map((question) => question.topic));
  assert.equal(topics.size, 5);

  for (const question of questions) {
    assert.equal(
      question.options.map((option) => option.id).join(""),
      "ABCD",
    );
    assert.equal(question.options.some((option) => option.id === question.correct), true);
    assert.equal(question.explanation.length > 0, true);
    assert.equal(question.question.includes("* **"), false);
  }
});

test("older exams repair merged choices and strips spoilers", () => {
  const questions = normalizeOlder(olderRaw);
  assert.equal(questions.length, 350);

  const streaming = questions.find((question) => question.id === "1-1");
  assert.ok(streaming);
  assert.equal(streaming.options.map((option) => option.id).join(""), "ABCD");
  assert.match(streaming.options[1]?.text ?? "", /^Use a 'Streaming Join'/);
  assert.equal(streaming.correct, "B");
  assert.equal(streaming.question.includes("* B)"), false);

  const spoiled = questions.find((question) => question.id === "1-7");
  assert.ok(spoiled);
  assert.equal(spoiled.question.includes("additional 'read' call"), false);
  assert.match(spoiled.options[0]?.text ?? "", /additional 'read' call/);

  const logged = questions.find((question) => question.id === "1-11");
  assert.ok(logged);
  assert.equal(logged.explanation.includes("CCAF Practice Exam Master Log"), false);
  assert.equal(logged.explanation.trimEnd().endsWith("---"), false);

  const exams = new Set(questions.map((question) => question.exam));
  assert.deepEqual([...exams].sort(), [1, 2, 3, 4, 5, 6]);

  for (const question of questions) {
    assert.equal(question.source, "older-dump");
    assert.equal(question.options.map((option) => option.id).join(""), "ABCD");
    assert.equal(question.options.some((option) => option.id === question.correct), true);
    assert.equal(question.options.every((option) => !option.text.includes("\n* ")), true);
    assert.equal(/\n\*\s+\*\*[A-D]\)/.test(question.question), false);
    assert.equal(question.explanation.includes("---"), false);
  }
});

test("practice query filters topics and exams", () => {
  const latest = normalizeLatest(latestRaw);
  const older = normalizeOlder(olderRaw);
  const topic = "Tool Design & MCP Integration";

  const allLatest = parsePracticeSearchParams(new URLSearchParams("bank=latest"));
  assert.equal(allLatest.ok, true);
  if (!allLatest.ok) return;
  assert.equal(applyQuery(latest, allLatest.query)?.length, 134);

  const oneTopic = parsePracticeSearchParams(new URLSearchParams(`bank=latest&topic=${encodeURIComponent(topic)}`));
  assert.equal(oneTopic.ok, true);
  if (!oneTopic.ok) return;
  const topicSet = applyQuery(latest, oneTopic.query);
  assert.ok(topicSet);
  assert.equal(topicSet.every((question) => question.topic === topic), true);
  assert.equal(topicSet.length > 0, true);

  const missingTopic = parsePracticeSearchParams(new URLSearchParams("bank=latest&topic=Not%20a%20topic"));
  assert.equal(missingTopic.ok, true);
  if (!missingTopic.ok) return;
  assert.equal(applyQuery(latest, missingTopic.query), null);

  const exam = parsePracticeSearchParams(new URLSearchParams("bank=older&exam=2"));
  assert.equal(exam.ok, true);
  if (!exam.ok) return;
  const examSet = applyQuery(older, exam.query);
  assert.ok(examSet);
  assert.equal(examSet.every((question) => question.exam === 2), true);
  assert.equal(parsePracticeSearchParams(new URLSearchParams("bank=nope")).ok, false);
  assert.equal(parsePracticeSearchParams(new URLSearchParams("bank=older&exam=9")).ok, false);
});
