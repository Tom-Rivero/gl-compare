// Échauffement : heures de passage calculées à rebours depuis l'heure du 1er essai.
// Le repos d'une série est le temps entre cette série et la suivante
// (ou le 1er essai pour la dernière série). Les heures sont en secondes depuis minuit.

const DAY = 24 * 3600;
const pad = n => String(n).padStart(2, "0");

// "10:30" → secondes depuis minuit (NaN si invalide)
export function parseTime(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(v || "");
  return m && +m[1] < 24 && +m[2] < 60 ? (+m[1] * 60 + +m[2]) * 60 : NaN;
}

// Secondes → "HH:MM" (ou "HH:MM:SS" si les secondes ne sont pas nulles)
export function formatTime(sec) {
  if (!Number.isFinite(sec)) return "–";
  const s = ((Math.round(sec) % DAY) + DAY) % DAY;
  const ss = s % 60;
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}${ss ? ":" + pad(ss) : ""}`;
}

// Heure de chaque série. rests = repos après chaque série, en minutes entières (arrondies sinon).
// Un repos manquant rend inconnues les heures des séries qui le précèdent (NaN).
export function schedule(start, rests) {
  const out = new Array(rests.length);
  let t = start;
  for (let i = rests.length - 1; i >= 0; i--) {
    t -= rests[i] >= 0 ? Math.round(rests[i]) * 60 : NaN;
    out[i] = t;
  }
  return out;
}

// Index de la prochaine échéance (première heure pas encore passée), -1 si tout est passé
export function nextIndex(times, now) {
  return times.findIndex(t => t >= now);
}
