// Checklist du sac de compétition : éléments par défaut (textes dans i18n sous cl.item.<id>)
// et éléments ajoutés par l'athlète (texte libre)

export const CATEGORIES = {
  admin: ["id", "pen"],
  outfit: ["singlet", "tshirt", "underwear", "socks", "squatShoes", "dlShoes", "change"],
  gear: ["belt", "sleeves", "wrists", "chalk", "talc", "bands", "roller"],
  food: ["water", "meal", "snacks", "caffeine"],
  misc: ["headphones", "charger"],
};

const defaultItem = (cat, id) => ({ id, cat, on: true, done: false });

export const defaultChecklist = () => ({
  collapsed: [],
  items: Object.entries(CATEGORIES).flatMap(([cat, ids]) => ids.map(id => defaultItem(cat, id))),
});

// Reprise d'une checklist enregistrée : les éléments par défaut ajoutés depuis apparaissent,
// ceux retirés de l'appli disparaissent, les éléments perso sont gardés
export function mergeChecklist(saved) {
  const base = defaultChecklist();
  if (!Array.isArray(saved?.items)) return base;
  const known = new Map(saved.items.filter(i => !i.custom).map(i => [i.id, i]));
  const items = base.items.map(i => ({ ...i, ...known.get(i.id) }));
  const custom = saved.items.filter(i => i.custom && CATEGORIES[i.cat] && String(i.label).trim());
  return {
    collapsed: (saved.collapsed || []).filter(c => CATEGORIES[c]),
    items: [...items, ...custom],
  };
}

// Éléments d'une catégorie, ceux dont on n'a pas besoin (off) à la fin
export const categoryItems = (list, cat) => {
  const items = list.items.filter(i => i.cat === cat);
  return [...items.filter(i => i.on), ...items.filter(i => !i.on)];
};

// Cochés / à prendre (seuls les éléments utiles comptent)
export function progress(items) {
  const on = items.filter(i => i.on);
  return { done: on.filter(i => i.done).length, total: on.length };
}

export const newCustomItem = (cat, label) => ({
  id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  cat, label: label.trim(), custom: true, on: true, done: false,
});

export const uncheckAll = list => list.items.forEach(i => i.done = false);
