import { test } from "node:test";
import assert from "node:assert/strict";
import { glPoints, weightClass, result, isAhead, deadlifts, deadliftToBeat, rank, toKg, fromKg } from "../js/calc.js";

const settings = (over = {}) => ({ sex: "M", equipment: "classic", unit: "kg", step: 2.5, mode: "gl", ...over });
const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

test("points GL : valeurs de référence des 4 formules", () => {
  close(glPoints(800, 93, "M", "classic"), 104.66);
  close(glPoints(500, 63, "F", "classic"), 109.39);
  close(glPoints(1000, 120, "M", "equipped"), 96.65);
  close(glPoints(600, 72, "F", "equipped"), 100.98);
});

test("catégories de poids IPF, bornes incluses", () => {
  assert.equal(weightClass(83, "M").label, "-83");
  assert.equal(weightClass(83.01, "M").label, "-93");
  assert.equal(weightClass(120.5, "M").label, "120+");
  assert.equal(weightClass(47, "F").label, "-47");
  assert.equal(weightClass(84.5, "F").label, "84+");
  assert.ok(weightClass(50, "M").index < weightClass(130, "M").index);
});

test("conversion kg ↔ lb", () => {
  close(toKg(220.462, "lb"), 100);
  close(fromKg(100, "lb"), 220.462);
  assert.equal(toKg(100, "kg"), 100);
});

test("le GL ne dépend pas de l'unité de saisie", () => {
  const kg = result(600, 83, settings());
  const lb = result(fromKg(600, "lb"), fromKg(83, "lb"), settings({ unit: "lb" }));
  close(kg.gl, lb.gl, 1e-6);
});

test("barres de deadlift alignées sur l'incrément", () => {
  assert.deepEqual(deadlifts(241, 247.5, 2.5), [242.5, 245, 247.5]);
  assert.deepEqual(deadlifts(250.2, 251.5, 0.5), [250.5, 251, 251.5]);
  assert.deepEqual(deadlifts(270, 265, 2.5), [265, 267.5, 270]);
  assert.deepEqual(deadlifts(241, 242, 2.5), []);
});

test("total : à total égal, le plus léger passe devant", () => {
  assert.ok(isAhead({ total: 600, bw: 82 }, { total: 600, bw: 82.5 }, "total"));
  assert.ok(!isAhead({ total: 600, bw: 82.5 }, { total: 600, bw: 82 }, "total"));
  assert.ok(!isAhead({ total: 600, bw: 82 }, { total: 600, bw: 82 }, "total"));
});

for (const mode of ["gl", "total"]) {
  for (const step of [0.5, 1, 2.5, 5]) {
    test(`deadlift pour passer devant : plus petite barre valide (${mode}, pas de ${step})`, () => {
      const s = settings({ mode, step });
      for (const [myBw, oppBw] of [[82, 82.6], [82.6, 82], [80, 80], [74, 92]]) {
        const target = result(350 + 260, myBw, s);
        const opp = { st: 345, bw: oppBw };
        const dl = deadliftToBeat(target, opp, s);
        assert.ok(Math.abs(dl / step - Math.round(dl / step)) < 1e-9, "multiple de l'incrément");
        assert.ok(isAhead(result(opp.st + dl, opp.bw, s), target, mode), "passe devant");
        assert.ok(!isAhead(result(opp.st + dl - step, opp.bw, s), target, mode), "une barre de moins ne suffit pas");
      }
    });
  }
}

test("total : barre exacte quand l'adversaire est plus léger, une barre de plus sinon", () => {
  const s = settings({ mode: "total" });
  const target = result(600, 82.5, s);
  assert.equal(deadliftToBeat(target, { st: 350, bw: 82 }, s), 250);
  assert.equal(deadliftToBeat(target, { st: 350, bw: 83 }, s), 252.5);
});

test("classement GL avec ex aequo", () => {
  const rows = rank([
    { name: "a", total: 600, bw: 83 },
    { name: "b", total: 650, bw: 83 },
    { name: "c", total: 600, bw: 83 },
  ], settings())[0].rows;
  assert.deepEqual(rows.map(r => [r.name, r.place]), [["b", 1], ["a", 2], ["c", 2]]);
});

test("classement au total : regroupé par catégorie, départage au poids", () => {
  const groups = rank([
    { name: "lourd", total: 700, bw: 92 },
    { name: "a", total: 600, bw: 82.9 },
    { name: "b", total: 600, bw: 81 },
    { name: "c", total: 580, bw: 80 },
  ], settings({ mode: "total" }));
  assert.deepEqual(groups.map(g => g.cls.label), ["-83", "-93"]);
  assert.deepEqual(groups[0].rows.map(r => [r.name, r.place]), [["b", 1], ["a", 2], ["c", 3]]);
});
