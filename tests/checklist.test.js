import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, defaultChecklist, mergeChecklist, categoryItems, progress, newCustomItem, uncheckAll } from "../js/checklist.js";
import { LANGS, dictionaries } from "../js/i18n.js";

test("chaque catégorie et chaque élément par défaut est traduit", () => {
  for (const l of LANGS) for (const [cat, ids] of Object.entries(CATEGORIES)) {
    assert.ok(dictionaries[l]["cl.cat." + cat], `${l} ${cat}`);
    for (const id of ids) assert.ok(dictionaries[l]["cl.item." + id], `${l} ${id}`);
  }
});

test("par défaut, tout est utile et rien n'est coché", () => {
  const list = defaultChecklist();
  assert.equal(list.items.length, Object.values(CATEGORIES).flat().length);
  assert.ok(list.items.every(i => i.on && !i.done));
});

test("les éléments inutiles passent en bas de leur catégorie", () => {
  const list = defaultChecklist();
  list.items.find(i => i.id === "singlet").on = false;
  list.items.push(newCustomItem("outfit", "  Bonnet  "));
  const ids = categoryItems(list, "outfit").map(i => i.label ?? i.id);
  assert.deepEqual(ids.slice(-2), ["Bonnet", "singlet"]);
  assert.equal(ids[0], "tshirt");
});

test("progression : seuls les éléments utiles comptent", () => {
  const items = [{ on: true, done: true }, { on: true, done: false }, { on: false, done: true }];
  assert.deepEqual(progress(items), { done: 1, total: 2 });
});

test("tout décocher garde les réglages et les éléments perso", () => {
  const list = defaultChecklist();
  list.items.push(newCustomItem("misc", "Lunettes"));
  list.items.forEach(i => i.done = true);
  list.items[0].on = false;
  uncheckAll(list);
  assert.ok(list.items.every(i => !i.done));
  assert.equal(list.items[0].on, false);
  assert.equal(list.items.at(-1).label, "Lunettes");
});

test("reprise d'une checklist enregistrée", () => {
  assert.deepEqual(mergeChecklist(undefined), defaultChecklist());
  const custom = newCustomItem("gear", "Sangles");
  const merged = mergeChecklist({
    collapsed: ["food", "inconnue"],
    items: [{ id: "belt", cat: "gear", on: false, done: true }, { id: "retiré", cat: "gear", on: true, done: false }, custom],
  });
  assert.deepEqual(merged.collapsed, ["food"]);
  assert.equal(merged.items.length, defaultChecklist().items.length + 1);
  assert.deepEqual(merged.items.find(i => i.id === "belt"), { id: "belt", cat: "gear", on: false, done: true });
  assert.ok(!merged.items.some(i => i.id === "retiré"));
  assert.equal(merged.items.at(-1), custom);
});

test("deux éléments perso n'ont jamais le même identifiant", () => {
  const ids = new Set(Array.from({ length: 50 }, () => newCustomItem("misc", "x").id));
  assert.equal(ids.size, 50);
});
