import { INCREMENTS, DEFAULT_INCREMENT, toKg, fromKg, weightClass, result, deadlifts, deadliftToBeat, rank } from "./calc.js";
import { LIFTS, defaultWarmup, initWarmup } from "./warmup-page.js";
import { initReferee } from "./referee-page.js";
import { $, num, esc, nf } from "./util.js";
import { t, setLang, translatePage } from "./i18n.js";
import { setTheme } from "./theme.js";
import { initAlerts } from "./alerts-native.js";

const STORE_KEY = "gl-compare-v3";
const OLD_STORE_KEY = "gl-compare-v2";
const COLORS = 8;
const FIELDS = ["bw", "st", "lo", "hi"];
const PAGES = { "#parametres": "settingsPage", "#echauffement": "warmupPage", "#arbitrage": "refereePage" };

const defaultState = () => ({
  settings: { sex: "M", equipment: "classic", unit: "kg", step: 2.5, mode: "gl", scenario: "min", lang: "auto", theme: "auto" },
  profiles: [0, 1, 2].map(color => ({ name: "", bw: "", st: "", lo: "240", hi: "270", color })),
  warmup: defaultWarmup(),
});

let state = load();
const alerts = initAlerts(state, save);
const warmup = initWarmup(state, () => {
  save();
  alerts.schedule();
});
const referee = initReferee();

// --- Formatage ---
const fmtGl = v => nf(v, 2, 2);
const fmtW = v => nf(v, 2);
const clsLabel = cls => `${cls.label.replace("-", "−")} kg`;
// Nom affiché quand le champ est vide (suit la langue choisie)
const defaultName = i => i ? t("competitor", { n: i }) : t("me");
const colorVars = color => `--c:var(--c${color});--c-soft:var(--c${color}-soft)`;

// --- Lecture des profils ---
// Renvoie null si le profil est incomplet
function parse(p, i) {
  const s = state.settings;
  const bw = num(p.bw), st = num(p.st), lo = num(p.lo), hi = num(p.hi);
  if (!(bw > 0) || !(st >= 0) || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return {
    i,
    name: p.name.trim() || defaultName(i),
    color: p.color,
    bw, st,
    lo: Math.min(lo, hi),
    hi: Math.max(lo, hi),
    dls: deadlifts(lo, hi, s.step),
    cls: weightClass(toKg(bw, s.unit), s.sex),
  };
}

// En mode total, on ne se compare qu'aux athlètes de la même catégorie
const comparable = (a, b) => state.settings.mode === "gl" || a.cls.label === b.cls.label;

// --- Rendu ---
function renderSettings() {
  const s = state.settings;
  ["sex", "equipment", "unit", "mode", "scenario", "lang", "theme"].forEach(id => $(id).value = s[id]);
  $("step").innerHTML = INCREMENTS[s.unit].map(v => `<option value="${v}">${nf(v)} ${s.unit}</option>`).join("");
  $("step").value = s.step;
}

function renderProfiles() {
  const u = state.settings.unit;
  $("profiles").innerHTML = state.profiles.map((p, i) => `
    <div class="profile" data-i="${i}" style="${colorVars(p.color)}">
      <div class="profile-head">
        <span class="dot"></span>
        <input class="name" data-f="name" value="${esc(p.name)}" placeholder="${esc(defaultName(i))}" aria-label="${esc(t("name.aria", { n: i + 1 }))}">
        <span class="badge" id="cls${i}"></span>
        ${i ? `<button class="remove" type="button" data-remove aria-label="${esc(t("remove.aria", { name: p.name.trim() || defaultName(i) }))}">×</button>` : ""}
      </div>
      <div class="fields">
        ${FIELDS.map(f => `<label>${t("f." + f)} (${u})
          <input data-f="${f}" type="number" inputmode="decimal" step="any" min="0" value="${esc(p[f])}">
        </label>`).join("")}
      </div>
    </div>`).join("");
}

function renderSummary() {
  const text = id => $(id).selectedOptions[0].textContent;
  $("summaryLine").textContent = [text("sex"), text("equipment"), t("summary.step", { v: text("step") }), text("mode")].join(" · ");
}

function renderResults() {
  renderSummary();
  const ps = state.profiles.map(parse).filter(Boolean);
  state.profiles.forEach((p, i) => {
    const pp = ps.find(x => x.i === i);
    $("cls" + i).textContent = pp ? clsLabel(pp.cls) : "";
  });
  renderHint();
  renderTable(ps);
  renderRanking(ps);
}

function renderHint() {
  $("hint").innerHTML = `${t("hint." + state.settings.mode)} ${t("hint.common", {
    dotOpp: `<span class="dot" style="--c:var(--muted)"></span>`,
    dotMe: `<span class="dot" style="--c:var(--c${state.profiles[0].color})"></span>`,
  })}`;
}

function cell(p, opps, dl) {
  if (dl == null) return `<td style="${colorVars(p.color)}"></td>`;
  const s = state.settings;
  const r = result(p.st + dl, p.bw, s);
  const needs = opps.map(o => {
    const n = deadliftToBeat(r, o, s);
    if (!Number.isFinite(n)) return "";
    let style = "", cls = "need";
    if (n > o.hi) style = `background:var(--c${p.color}-soft);color:var(--c${p.color})`;
    else if (n <= o.lo) style = `background:var(--c${o.color}-soft);color:var(--c${o.color})`;
    if (style) cls += " decided";
    return `<span class="${cls}" style="${style}" title="${esc(t("need.title", { name: o.name, v: fmtW(n), u: s.unit }))}"><span class="dot" style="${colorVars(o.color)}"></span>≥ ${fmtW(n)}</span>`;
  }).join("");
  const [main, sub] = s.mode === "gl"
    ? [fmtGl(r.gl), t("total", { v: fmtW(r.total) })]
    : [fmtW(r.total), `${fmtGl(r.gl)} GL`];
  return `<td style="${colorVars(p.color)}">
    <div class="dl">DL ${fmtW(dl)}</div>
    <div class="main">${main}</div>
    <div class="sub">${sub}</div>
    <div class="needs">${needs}</div>
  </td>`;
}

function renderTable(ps) {
  const s = state.settings;
  $("table").style.minWidth = `${Math.max(1, ps.length) * 108}px`;
  $("head").innerHTML = ps.map(p => `<th style="${colorVars(p.color)}">${esc(p.name)}${s.mode === "total" ? `<small>${clsLabel(p.cls)}</small>` : ""}</th>`).join("");
  if (!ps.length) {
    $("rows").innerHTML = `<tr><td class="empty">${t("empty")}</td></tr>`;
    return;
  }
  const me = ps[0].i === 0 ? ps[0] : null;
  const opponents = p => {
    if (!me) return [];
    if (p === me) return ps.filter(o => o !== me && comparable(me, o));
    return comparable(p, me) ? [me] : [];
  };
  const rows = Math.max(...ps.map(p => p.dls.length));
  let html = "";
  for (let r = 0; r < rows; r++) html += "<tr>" + ps.map(p => cell(p, opponents(p), p.dls[r])).join("") + "</tr>";
  $("rows").innerHTML = html;
}

function renderRanking(ps) {
  const s = state.settings;
  const me = ps[0]?.i === 0 ? ps[0] : null;
  const entries = ps.filter(p => p.dls.length).map(p => {
    const high = s.scenario === "max"
      || (s.scenario === "best" && p === me)
      || (s.scenario === "worst" && p !== me);
    const dl = high ? p.dls[p.dls.length - 1] : p.dls[0];
    return { ...p, dl, total: p.st + dl };
  });
  $("ranking").hidden = entries.length < 2;
  if (entries.length < 2) return;

  $("rankingBody").innerHTML = rank(entries, s).map(g => `
    ${g.cls ? `<h3>${clsLabel(g.cls)}</h3>` : ""}
    <ol>${g.rows.map(r => {
      const [main, sub] = s.mode === "gl"
        ? [fmtGl(r.gl), t("total", { v: fmtW(r.total) })]
        : [`${fmtW(r.total)} ${s.unit}`, `${fmtGl(r.gl)} GL`];
      return `<li class="${r.i === 0 ? "me" : ""}" style="${colorVars(r.color)}">
        <span class="place">${r.place}</span><span class="dot"></span>
        <span class="rname">${esc(r.name)}</span><span class="rval">${main}</span>
        <small>DL ${fmtW(r.dl)} · ${sub}</small>
      </li>`;
    }).join("")}</ol>`).join("");
}

// --- Actions ---
function changeUnit(unit) {
  const from = state.settings.unit;
  const convert = (v, decimals) => {
    const n = num(v);
    return Number.isFinite(n) ? String(+fromKg(toKg(n, from), unit).toFixed(decimals)) : v;
  };
  state.profiles.forEach(p => {
    p.bw = convert(p.bw, 2);
    ["st", "lo", "hi"].forEach(f => p[f] = convert(p[f], 1));
  });
  LIFTS.forEach(lift => {
    const l = state.warmup.lifts[lift];
    l.opener = convert(l.opener, 1);
    l.sets.forEach(set => set.load = convert(set.load, 1));
  });
  state.settings.unit = unit;
  state.settings.step = DEFAULT_INCREMENT[unit];
}

// Couleur la moins utilisée, pour distinguer les athlètes
function nextColor() {
  const used = Array(COLORS).fill(0);
  state.profiles.forEach(p => used[p.color % COLORS]++);
  return used.indexOf(Math.min(...used));
}

function addProfile() {
  const first = state.profiles[0];
  state.profiles.push({ name: "", bw: "", st: "", lo: first.lo, hi: first.hi, color: nextColor() });
  renderProfiles();
  renderResults();
  save();
  document.querySelector(`.profile[data-i="${state.profiles.length - 1}"] [data-f="bw"]`).focus();
}

// --- Stockage ---
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

function load() {
  const base = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved?.profiles?.length) {
      const settings = { ...base.settings, ...saved.settings };
      if (!INCREMENTS[settings.unit]?.includes(settings.step)) Object.assign(settings, base.settings);
      const warmup = { ...base.warmup, ...saved.warmup };
      warmup.lifts = { ...base.warmup.lifts, ...saved.warmup?.lifts };
      // Les anciens noms par défaut (« Moi », « Concurrent n ») laissent place au nom traduit
      const profiles = saved.profiles.map((p, i) => p.name === (i ? `Concurrent ${i}` : "Moi") ? { ...p, name: "" } : p);
      return { settings, profiles, warmup };
    }
    // Reprise des données de la version précédente (3 profils A, B, C)
    const old = JSON.parse(localStorage.getItem(OLD_STORE_KEY));
    if (old) {
      base.profiles = ["A", "B", "C"].map((s, color) => ({
        name: old["name" + s] || "",
        bw: old["bw" + s] ?? "",
        st: old["st" + s] ?? "",
        lo: old["dlMin" + s] ?? "",
        hi: old["dlMax" + s] ?? "",
        color,
      }));
    }
  } catch (e) {}
  return base;
}

// --- Événements ---
["sex", "equipment", "mode", "scenario"].forEach(id => $(id).addEventListener("change", e => {
  state.settings[id] = e.target.value;
  renderResults();
  save();
}));
$("step").addEventListener("change", e => {
  state.settings.step = parseFloat(e.target.value);
  renderResults();
  save();
});
$("theme").addEventListener("change", e => {
  state.settings.theme = e.target.value;
  setTheme(state.settings.theme);
  save();
});
$("lang").addEventListener("change", e => {
  state.settings.lang = e.target.value;
  setLang(state.settings.lang);
  translatePage();
  renderSettings();
  renderProfiles();
  renderResults();
  warmup.render();
  referee.render();
  save();
  alerts.schedule();
});
$("unit").addEventListener("change", e => {
  changeUnit(e.target.value);
  renderSettings();
  renderProfiles();
  renderResults();
  warmup.render();
  save();
  alerts.schedule();
});
$("profiles").addEventListener("input", e => {
  const f = e.target.dataset.f;
  if (!f) return;
  state.profiles[+e.target.closest(".profile").dataset.i][f] = e.target.value;
  renderResults();
  save();
});
$("profiles").addEventListener("click", e => {
  if (!e.target.closest("[data-remove]")) return;
  state.profiles.splice(+e.target.closest(".profile").dataset.i, 1);
  renderProfiles();
  renderResults();
  save();
});
$("add").addEventListener("click", addProfile);

// --- Navigation : chaque écran secondaire a son ancre (#parametres, #echauffement, #arbitrage),
// le bouton retour du téléphone le referme ---
let openedFromHome = false;
function route() {
  const page = PAGES[location.hash] || "home";
  ["home", ...Object.values(PAGES)].forEach(id => $(id).hidden = id !== page);
  if (page === "warmupPage") warmup.render();
  if (page === "refereePage") referee.render();
  alerts.setScreenOn(page === "warmupPage");
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => {
  openedFromHome = location.hash in PAGES;
  route();
});
document.querySelectorAll(".back").forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  if (openedFromHome) return history.back();
  history.replaceState(null, "", location.pathname);
  route();
}));

setTheme(state.settings.theme);
setLang(state.settings.lang);
translatePage();
route();
renderSettings();
renderProfiles();
renderResults();
alerts.schedule();
