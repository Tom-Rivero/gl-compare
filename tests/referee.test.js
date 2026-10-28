import { test } from "node:test";
import assert from "node:assert/strict";
import { CARDS, REASONS, reasonKeys, bold } from "../js/referee-page.js";
import { LANGS, dictionaries } from "../js/i18n.js";
import { LIFTS } from "../js/warmup-page.js";

test("chaque mouvement a au moins une raison par carton", () => {
  assert.deepEqual(Object.keys(REASONS), LIFTS);
  for (const lift of LIFTS) for (const card of CARDS) assert.ok(REASONS[lift][card] >= 1, `${lift} ${card}`);
});

test("toutes les raisons affichées sont traduites", () => {
  for (const lift of LIFTS) for (const k of reasonKeys(lift)) assert.ok(k in dictionaries.fr, k);
});

test("aucune raison traduite n'est oubliée à l'affichage", () => {
  const shown = new Set(LIFTS.flatMap(reasonKeys));
  const keys = Object.keys(dictionaries.fr).filter(k => /^ref\.(squat|bench|deadlift)\./.test(k));
  assert.deepEqual(keys.filter(k => !shown.has(k)), []);
});

test("chaque raison a ses mots clés en gras, dans chaque langue", () => {
  for (const l of LANGS) for (const k of LIFTS.flatMap(reasonKeys)) {
    const html = bold(dictionaries[l][k]);
    assert.match(html, /<strong>[^<]+<\/strong>/, `${l} ${k}`);
    assert.ok(!html.includes("**"), `${l} ${k}`);
  }
});
