// Alertes dans l'appli Android (Capacitor) : notification 1 min avant chaque série d'échauffement
// et avant le 1er essai, écran maintenu allumé sur l'écran Échauffement.
// Sur le site web, Capacitor est absent et tout reste inactif.
import { planAlerts } from "./alerts.js";
import { LIFTS, liftTimes } from "./warmup-page.js";
import { formatTime } from "./warmup.js";
import { $, num, nf } from "./util.js";
import { t } from "./i18n.js";

const plugins = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.Plugins : null;
const DEBOUNCE_MS = 800;
// Sur Android, le son est fixé par le canal de notification (son sounds/whistle.mp3, copié dans res/raw).
// Le téléphone décide seul : sifflet en mode sonnerie, vibration seule en mode vibreur.
// Changer de son demande un nouvel identifiant de canal ; les anciens canaux sont supprimés.
const CHANNEL = "warmup-whistle";

export function initAlerts(state, save) {
  const LN = plugins?.LocalNotifications;
  if (!LN) return { schedule() {}, setScreenOn() {} };
  $("alertsCard").hidden = false;
  let timer;
  let queue = Promise.resolve();

  const status = (text, fix) => {
    $("alertsStatus").textContent = text;
    $("alertsFix").hidden = !fix;
    $("alertsFix").textContent = fix || "";
  };

  function notification(a, exact) {
    const l = state.warmup.lifts[a.lift];
    const opener = a.index === l.sets.length;
    const load = num(opener ? l.opener : l.sets[a.index].load);
    let body = Number.isFinite(load) ? `${nf(load)} ${state.settings.unit}` : "";
    if (body && !opener) body += ` × ${l.sets[a.index].reps}`;
    return {
      id: LIFTS.indexOf(a.lift) * 100 + a.index + 1,
      title: `${t("lift." + a.lift)} · ${opener ? t("al.openerIn") : t("al.setIn", { n: a.index + 1 })}`,
      body,
      channelId: CHANNEL,
      schedule: { at: a.at, allowWhileIdle: true },
      // Sans l'autorisation « alarmes exactes », le module ouvrirait les réglages de lui-même :
      // on programme alors en inexact et on propose le bouton d'autorisation
      isExactNotification: exact,
    };
  }

  // Remplace toutes les notifications programmées par celles des horaires actuels
  async function sync() {
    $("alertsOn").checked = state.warmup.alerts;
    const pending = (await LN.getPending()).notifications;
    if (pending.length) await LN.cancel({ notifications: pending.map(n => ({ id: n.id })) });
    if (!state.warmup.alerts) return status(t("al.off"));

    const plan = planAlerts(LIFTS.map(lift => ({ lift, times: liftTimes(state.warmup.lifts[lift]) })), new Date());
    if (!plan.length) return status(t("al.none"));
    let perm = await LN.checkPermissions();
    if (perm.display !== "granted" && perm.display !== "denied") perm = await LN.requestPermissions();
    if (perm.display !== "granted") return status(t("al.denied"));

    const { channels } = await LN.listChannels();
    await Promise.all(channels.filter(c => c.id.startsWith("warmup") && c.id !== CHANNEL).map(c => LN.deleteChannel({ id: c.id })));
    await LN.createChannel({ id: CHANNEL, name: t("nav.warmup"), importance: 5, vibration: true, visibility: 1, sound: "whistle.mp3" });
    const exact = (await LN.checkExactNotificationSetting()).exact_alarm === "granted";
    await LN.schedule({ notifications: plan.map(a => notification(a, exact)) });
    const next = plan[0].at;
    const count = t("al.count", { n: plan.length, t: formatTime(next.getHours() * 3600 + next.getMinutes() * 60) });
    status(exact ? count : `${count} ${t("al.exact")}`, exact ? null : t("al.exactBtn"));
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(sync).catch(e => status(String(e?.message || e)));
    }, DEBOUNCE_MS);
  }

  $("alertsOn").addEventListener("change", e => {
    state.warmup.alerts = e.target.checked;
    save();
    schedule();
  });
  $("alertsFix").addEventListener("click", () => LN.changeExactNotificationSetting().finally(schedule));
  // Toucher une alerte ouvre l'écran Échauffement
  LN.addListener("localNotificationActionPerformed", () => {
    if (location.hash !== "#echauffement") location.hash = "echauffement";
  });
  // Au retour dans l'appli (réglages du téléphone, lendemain…), on recalcule
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

  return {
    schedule,
    setScreenOn: on => plugins.KeepAwake?.[on ? "keepAwake" : "allowSleep"]().catch(() => {}),
  };
}
