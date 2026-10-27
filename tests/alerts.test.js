import { test } from "node:test";
import assert from "node:assert/strict";
import { planAlerts } from "../js/alerts.js";

const at = (h, m) => (h * 60 + m) * 60;
const day = (d, h, m) => new Date(2026, 10, d, h, m);
const hhmm = d => `${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
const squat = { lift: "squat", times: [at(10, 15), at(10, 20), at(10, 30)] };

test("le jour J : une alerte 1 min avant chaque série et le 1er essai", () => {
  const plan = planAlerts([squat], day(14, 8, 0));
  assert.deepEqual(plan.map(a => [a.index, hhmm(a.at)]), [[0, "14 10:14"], [1, "14 10:19"], [2, "14 10:29"]]);
});

test("pendant l'échauffement, les alertes passées sont ignorées", () => {
  const plan = planAlerts([squat], day(14, 10, 16));
  assert.deepEqual(plan.map(a => [a.index, hhmm(a.at)]), [[1, "14 10:19"], [2, "14 10:29"]]);
});

test("la veille au soir, les alertes sont programmées pour le lendemain", () => {
  const plan = planAlerts([squat], day(13, 22, 0));
  assert.deepEqual(plan.map(a => hhmm(a.at)), ["14 10:14", "14 10:19", "14 10:29"]);
});

test("un mouvement déjà passé ne sonne pas le lendemain", () => {
  assert.deepEqual(planAlerts([squat], day(14, 11, 0)), []);
});

test("plusieurs mouvements triés par heure, horaires incomplets ignorés", () => {
  const bench = { lift: "bench", times: [at(12, 0), at(12, 5)] };
  const deadlift = { lift: "deadlift", times: [NaN, at(14, 0)] };
  const plan = planAlerts([bench, squat, deadlift], day(14, 8, 0));
  assert.deepEqual(plan.map(a => a.lift), ["squat", "squat", "squat", "bench", "bench"]);
});
