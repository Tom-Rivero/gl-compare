import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTime, formatTime, schedule, nextIndex } from "../js/warmup.js";

test("lecture et affichage des heures", () => {
  assert.equal(parseTime("10:30"), 37800);
  assert.equal(parseTime("9:05"), 32700);
  assert.ok(Number.isNaN(parseTime("")));
  assert.ok(Number.isNaN(parseTime("25:00")));
  assert.equal(formatTime(37800), "10:30");
  assert.equal(formatTime(37800 - 90), "10:28:30");
  assert.equal(formatTime(-600), "23:50");
  assert.equal(formatTime(NaN), "–");
});

test("horaires calculés à rebours depuis le 1er essai", () => {
  const times = schedule(parseTime("10:30"), [3, 3, 4, 5]);
  assert.deepEqual(times.map(formatTime), ["10:15", "10:18", "10:21", "10:25"]);
});

test("repos arrondis à la minute", () => {
  assert.deepEqual(schedule(parseTime("10:30"), [2.4, 1.6]).map(formatTime), ["10:26", "10:28"]);
});

test("un repos manquant rend inconnues les séries précédentes", () => {
  const times = schedule(parseTime("10:30"), [3, NaN, 4]);
  assert.ok(Number.isNaN(times[0]) && Number.isNaN(times[1]));
  assert.equal(formatTime(times[2]), "10:26");
});

test("prochaine série", () => {
  const times = [100, 200, 300];
  assert.equal(nextIndex(times, 50), 0);
  assert.equal(nextIndex(times, 200), 1);
  assert.equal(nextIndex(times, 250), 2);
  assert.equal(nextIndex(times, 400), -1);
});
