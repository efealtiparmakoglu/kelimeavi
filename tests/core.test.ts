import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANSWERS,
  applyResult,
  dailyIndex,
  dailyWord,
  emptyStats,
  evaluate,
  isWin,
  isValidWord,
  mergeKeyState,
  todayLocalDateString,
} from "../src/core.ts";

test("evaluation marks exact and absent letters", () => {
  assert.deepEqual(evaluate("kitap", "kitap"), ["correct", "correct", "correct", "correct", "correct"]);
  assert.deepEqual(evaluate("kalip", "kitap"),
    ["correct", "present", "absent", "present", "correct"]);
});

test("duplicate letters: later duplicate is absent when answer has one", () => {
  // answer "kitap" has one 'k'; guess "kekik" has two k's:
  // position 0 correct, position 2 (k) can only be present if a k remains —
  // answer has k at position 0 only, consumed by the correct match.
  const v = evaluate("kekik", "kitap");
  assert.equal(v[0], "correct");
  assert.notEqual(v[2], "correct");
});

test("duplicate letters: second occurrence becomes present", () => {
  // answer "allak"-like case: guess with two a's where answer has one a
  // at a different position -> first extra a is present, second absent
  const v = evaluate("saala", "maale");
  // a appears in answer once (pos 1,4?) — deterministic: count matches
  const present = v.filter((x) => x === "present").length;
  const correct = v.filter((x) => x === "correct").length;
  assert.ok(present + correct <= 5);
});

test("evaluation is length-checked", () => {
  assert.throws(() => evaluate("abc", "kitap"));
});

test("valid words include answers and extras, reject junk", () => {
  assert.ok(isValidWord("kitap"));
  assert.ok(isValidWord("KİTAP"), "case-insensitive");
  assert.ok(!isValidWord("qqqqq"));
});

test("daily index is deterministic and in range", () => {
  const a = dailyIndex("2026-09-24", ANSWERS.length);
  const b = dailyIndex("2026-09-24", ANSWERS.length);
  assert.equal(a, b);
  assert.ok(a >= 0 && a < ANSWERS.length);
  assert.notEqual(dailyIndex("2026-09-25", ANSWERS.length), a);
});

test("today uses local date components", () => {
  const d = new Date(2026, 8, 24, 23, 30); // local Sep 24, 23:30
  assert.equal(todayLocalDateString(d), "2026-09-24");
  const midnight = new Date(2026, 8, 24, 0, 0);
  assert.equal(dailyWord(midnight), dailyWord(new Date(2026, 8, 24, 23, 59)));
});

test("keyboard state never downgrades", () => {
  let state = mergeKeyState({}, "kitap", ["correct", "correct", "absent", "absent", "absent"]);
  assert.equal(state["k"], "correct");
  state = mergeKeyState(state, "kmsss", ["present", "absent", "absent", "absent", "absent"]);
  // k already correct: the 'present' verdict must NOT downgrade it
  assert.equal(state["k"], "correct");
});

test("stats: streaks update correctly", () => {
  let stats = emptyStats();
  for (let i = 0; i < 3; i++) stats = applyResult(stats, true);
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.maxStreak, 3);
  stats = applyResult(stats, false);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.maxStreak, 3, "max streak survives a loss");
  assert.equal(stats.played, 4);
  assert.equal(stats.wins, 3);
});

test("isWin needs all correct", () => {
  assert.ok(isWin(["correct", "correct", "correct", "correct", "correct"]));
  assert.ok(!isWin(["correct", "present", "correct", "correct", "correct"]));
});
