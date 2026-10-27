import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANGS, dictionaries, detectLang, setLang, t } from "../js/i18n.js";

test("les trois langues ont exactement les mêmes clés", () => {
  const ref = Object.keys(dictionaries.fr).sort();
  for (const l of LANGS) assert.deepEqual(Object.keys(dictionaries[l]).sort(), ref, l);
});

test("les paramètres {x} sont les mêmes dans chaque traduction", () => {
  const params = s => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const [key, fr] of Object.entries(dictionaries.fr)) {
    for (const l of LANGS) assert.equal(params(dictionaries[l][key]), params(fr), `${l} ${key}`);
  }
});

test("toutes les clés utilisées dans la page existent", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(m => m[1]);
  assert.ok(keys.length > 20);
  for (const k of keys) assert.ok(k in dictionaries.fr, k);
});

test("détection de la langue du téléphone", () => {
  assert.equal(detectLang(["es-ES", "en"]), "es");
  assert.equal(detectLang(["de-DE", "fr-CA"]), "fr");
  assert.equal(detectLang(["de-DE"]), "en");
  assert.equal(detectLang([]), "en");
});

test("traduction avec paramètres", () => {
  setLang("en");
  assert.equal(t("competitor", { n: 2 }), "Competitor 2");
  setLang("es");
  assert.equal(t("wu.in", { n: 4 }), "en 4 min");
  setLang("fr");
  assert.equal(t("me"), "Moi");
});
