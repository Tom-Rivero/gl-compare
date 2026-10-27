// Alertes d'échauffement : à quelle date précise prévenir avant chaque série et avant le 1er essai.
// Les heures saisies n'ont pas de date : chaque mouvement est placé à sa prochaine occurrence
// (aujourd'hui si le 1er essai n'est pas encore passé, demain sinon), et seules les alertes
// des HORIZON prochaines secondes sont gardées, pour qu'un mouvement déjà passé ne sonne pas le lendemain.

export const LEAD = 60;
export const HORIZON = 18 * 3600;
const DAY = 24 * 3600;

// lifts = [{ lift, times }] où times = heures des séries puis du 1er essai (secondes depuis minuit).
// Renvoie [{ lift, index, at }] triés, index = position dans times (le dernier = 1er essai).
export function planAlerts(lifts, now) {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const nowSec = (now - midnight) / 1000;
  const out = [];
  lifts.forEach(({ lift, times }) => {
    if (!times.length || !times.every(Number.isFinite)) return;
    const day = times[times.length - 1] >= nowSec ? 0 : DAY;
    times.forEach((t, index) => {
      const at = day + t - LEAD;
      if (at > nowSec && at - nowSec <= HORIZON) out.push({ lift, index, at: new Date(midnight.getTime() + at * 1000) });
    });
  });
  return out.sort((a, b) => a.at - b.at);
}
