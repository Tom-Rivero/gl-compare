// Moteur de calcul : points IPF GL, catégories de poids, conversions et classements.
// Fonctions pures, testables sans navigateur (voir tests/calc.test.js).
// Les charges sont exprimées dans l'unité choisie (kg ou lb) et converties en kg pour le GL.

// IPF GL points (2020) : GL = Total × 100 / (A − B·e^(−C·PdC)), en kg
export const GL_COEFS = {
  M: {
    classic:  { A: 1199.72839, B: 1025.18162, C: 0.00921 },
    equipped: { A: 1236.25115, B: 1449.21864, C: 0.01644 },
  },
  F: {
    classic:  { A: 610.32796, B: 1045.59282, C: 0.03048 },
    equipped: { A: 758.63878, B: 949.31382, C: 0.02435 },
  },
};

// Catégories IPF open : limite haute en kg, la dernière limite sert aussi pour la catégorie « + »
export const WEIGHT_CLASSES = {
  M: [59, 66, 74, 83, 93, 105, 120],
  F: [47, 52, 57, 63, 69, 76, 84],
};

export const INCREMENTS = { kg: [0.5, 1, 2.5, 5], lb: [1, 2.5, 5, 10] };
export const DEFAULT_INCREMENT = { kg: 2.5, lb: 5 };

const LB_IN_KG = 0.45359237;
const EPS = 1e-9;
const MAX_ROWS = 200;

export const toKg = (v, unit) => unit === "lb" ? v * LB_IN_KG : v;
export const fromKg = (v, unit) => unit === "lb" ? v / LB_IN_KG : v;

export function glPoints(totalKg, bwKg, sex, equipment) {
  const k = GL_COEFS[sex][equipment];
  const d = k.A - k.B * Math.exp(-k.C * bwKg);
  return d > 0 ? totalKg * 100 / d : NaN;
}

// Catégorie d'un poids de corps en kg : { label: "-83" | "120+", index } (index = ordre d'affichage)
export function weightClass(bwKg, sex) {
  const limits = WEIGHT_CLASSES[sex];
  const index = limits.findIndex(l => bwKg <= l + EPS);
  if (index >= 0) return { label: `-${limits[index]}`, index };
  return { label: `${limits[limits.length - 1]}+`, index: limits.length };
}

// Résultat d'un athlète pour un total donné. s = réglages { sex, equipment, unit, step, mode }
export function result(total, bw, s) {
  return { total, bw, gl: glPoints(toKg(total, s.unit), toKg(bw, s.unit), s.sex, s.equipment) };
}

// a est-il classé devant b ? Mode GL : points strictement supérieurs.
// Mode total : total supérieur, ou total égal et athlète plus léger (règle IPF).
export function isAhead(a, b, mode) {
  if (mode === "gl") return a.gl > b.gl + EPS;
  if (a.total > b.total + EPS) return true;
  return Math.abs(a.total - b.total) <= EPS && a.bw < b.bw - EPS;
}

const alignUp = (v, step) => Math.ceil(v / step - EPS) * step;

// Barres de deadlift entre lo et hi, alignées sur l'incrément
export function deadlifts(lo, hi, step) {
  if (lo > hi) [lo, hi] = [hi, lo];
  const start = alignUp(lo, step);
  const out = [];
  for (let i = 0; start + i * step <= hi + EPS && i < MAX_ROWS; i++) out.push(start + i * step);
  return out;
}

// Plus petit deadlift (multiple de l'incrément) qui place opp ({ st, bw }) devant target (un result)
export function deadliftToBeat(target, opp, s) {
  let guess;
  if (s.mode === "gl") {
    const perUnit = result(1, opp.bw, s).gl; // le GL est proportionnel au total
    if (!(perUnit > 0) || !Number.isFinite(target.gl)) return NaN;
    guess = target.gl / perUnit - opp.st;
  } else {
    if (!Number.isFinite(target.total)) return NaN;
    guess = target.total - opp.st;
  }
  const ahead = dl => isAhead(result(opp.st + dl, opp.bw, s), target, s.mode);
  let dl = Math.max(0, alignUp(guess, s.step));
  while (!ahead(dl)) dl += s.step;
  while (dl - s.step >= -EPS && ahead(dl - s.step)) dl -= s.step;
  return dl;
}

// Classement. entries = [{ total, bw, ... }] ; renvoie des groupes [{ cls, rows }] triés,
// chaque ligne recevant ses points GL et sa place (ex aequo = même place).
export function rank(entries, s) {
  const rows = entries.map(e => ({ ...e, ...result(e.total, e.bw, s) }));
  const cmp = (a, b) => isAhead(a, b, s.mode) ? -1 : isAhead(b, a, s.mode) ? 1 : 0;
  const place = list => list.sort(cmp).map((r, i, all) => {
    r.place = i && cmp(all[i - 1], r) === 0 ? all[i - 1].place : i + 1;
    return r;
  });
  if (s.mode === "gl") return [{ cls: null, rows: place(rows) }];

  const groups = new Map();
  rows.forEach(r => {
    const cls = weightClass(toKg(r.bw, s.unit), s.sex);
    if (!groups.has(cls.label)) groups.set(cls.label, { cls, rows: [] });
    groups.get(cls.label).rows.push(r);
  });
  return [...groups.values()]
    .sort((a, b) => a.cls.index - b.cls.index)
    .map(g => ({ cls: g.cls, rows: place(g.rows) }));
}
