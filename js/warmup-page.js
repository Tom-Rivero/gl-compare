// Écran Échauffement : séries de chauffe par mouvement et heure de passage de chacune
import { parseTime, formatTime, schedule, nextIndex } from "./warmup.js";
import { $, num, esc, nf } from "./util.js";
import { t } from "./i18n.js";

export const LIFTS = ["squat", "bench", "deadlift"];
const REFRESH_MS = 15000;
// Mise en avant de la prochaine série seulement autour du passage (de 2 h avant la 1re série à 10 min après le 1er essai)
const LIVE_BEFORE = 2 * 3600;
const LIVE_AFTER = 10 * 60;

const newSet = () => ({ load: "", reps: "1", rest: "5" });

export const defaultWarmup = () => ({
  lift: "squat",
  lifts: Object.fromEntries(LIFTS.map(l => [l, { start: "", opener: "", sets: [newSet()] }])),
});

const secondsNow = () => {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
};

export function initWarmup(state, save) {
  const current = () => state.warmup.lifts[state.warmup.lift];

  function render() {
    const l = current();
    $("liftTabs").querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.lift === state.warmup.lift));
    document.querySelectorAll("#warmupPage .unit").forEach(el => el.textContent = state.settings.unit);
    $("wuStart").value = l.start;
    $("wuOpener").value = l.opener;
    $("wuSets").innerHTML = l.sets.map((set, i) => `
      <div class="wu-row" data-i="${i}">
        <span class="n">${i + 1}</span>
        <input data-f="load" type="number" inputmode="decimal" step="any" min="0" value="${esc(set.load)}" aria-label="${esc(t("wu.load.aria", { n: i + 1 }))}">
        <input data-f="reps" type="number" inputmode="numeric" step="1" min="1" value="${esc(set.reps)}" aria-label="${esc(t("wu.reps.aria", { n: i + 1 }))}">
        <input data-f="rest" type="number" inputmode="numeric" step="1" min="0" value="${esc(set.rest)}" aria-label="${esc(t("wu.rest.aria", { n: i + 1 }))}">
        <span class="time"></span>
        <button class="remove" type="button" data-remove aria-label="${esc(t("wu.remove.aria", { n: i + 1 }))}">×</button>
      </div>`).join("");
    updateTimes();
  }

  function updateTimes() {
    const l = current();
    const start = parseTime(l.start);
    const times = [...schedule(start, l.sets.map(s => num(s.rest))), start];
    const now = secondsNow();
    const live = times.every(Number.isFinite) && now >= times[0] - LIVE_BEFORE && now <= start + LIVE_AFTER;
    const next = live ? nextIndex(times, now) : -1;
    const timeHtml = i => formatTime(times[i])
      + (i === next ? `<small>${t("wu.in", { n: Math.ceil((times[i] - now) / 60) })}</small>` : "");
    const mark = (row, i) => {
      row.classList.toggle("past", live && times[i] < now);
      row.classList.toggle("next", i === next);
    };

    [...$("wuSets").children].forEach((row, i) => {
      row.querySelector(".time").innerHTML = timeHtml(i);
      mark(row, i);
    });
    const o = l.sets.length;
    const opener = num(l.opener);
    $("wuOpenerRow").innerHTML = `<span class="n">▸</span>
      <span class="label">${t("wu.opener")}${Number.isFinite(opener) ? ` · ${nf(opener)} ${state.settings.unit}` : ""}</span>
      <span class="time">${timeHtml(o)}</span><span></span>`;
    mark($("wuOpenerRow"), o);

    $("wuBegin").innerHTML = !Number.isFinite(start)
      ? t("wu.needStart")
      : Number.isFinite(times[0])
        ? t("wu.begin", { t: `<strong>${formatTime(times[0])}</strong>` })
        : t("wu.needRest");
  }

  $("liftTabs").addEventListener("click", e => {
    const b = e.target.closest("[data-lift]");
    if (!b) return;
    state.warmup.lift = b.dataset.lift;
    render();
    save();
  });
  $("wuStart").addEventListener("input", e => {
    current().start = e.target.value;
    updateTimes();
    save();
  });
  $("wuOpener").addEventListener("input", e => {
    current().opener = e.target.value;
    updateTimes();
    save();
  });
  $("wuSets").addEventListener("input", e => {
    const f = e.target.dataset.f;
    if (!f) return;
    current().sets[+e.target.closest(".wu-row").dataset.i][f] = e.target.value;
    updateTimes();
    save();
  });
  $("wuSets").addEventListener("click", e => {
    if (!e.target.closest("[data-remove]")) return;
    current().sets.splice(+e.target.closest(".wu-row").dataset.i, 1);
    render();
    save();
  });
  $("wuAdd").addEventListener("click", () => {
    current().sets.push(newSet());
    render();
    save();
    $("wuSets").lastElementChild.querySelector('[data-f="load"]').focus();
  });
  setInterval(() => { if (!$("warmupPage").hidden) updateTimes(); }, REFRESH_MS);

  return { render };
}
