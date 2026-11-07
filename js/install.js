// Ajout de l'appli web à l'écran d'accueil du téléphone : fenêtre d'explication à la première visite
// (une seule fois), puis rappel dans les Paramètres. Sur Android (Chrome, Edge, Samsung Internet), le
// navigateur peut proposer l'installation en un geste : on garde son événement pour le bouton « Installer ».
// iOS ne le permet pas : on explique la manipulation (Partager → Sur l'écran d'accueil).
// Rien ne s'affiche sur ordinateur, dans l'appli Android (Capacitor) ou quand l'appli est déjà installée.
import { $, esc } from "./util.js";
import { t } from "./i18n.js";

const SEEN_KEY = "meet-day-install-seen";
const SHARE_ICON = `<svg class="inline-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2"/></svg>`;
const MENU_ICON = `<svg class="inline-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

// "ios", "android", ou null quand il n'y a rien à proposer
export function installPlatform({ ua = "", touchPoints = 0, standalone = false, native = false } = {}) {
  if (native || standalone) return null;
  // L'iPad se présente comme un Mac depuis iPadOS 13 : on le reconnaît à son écran tactile
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

const read = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
const write = (key, v) => { try { localStorage.setItem(key, v); } catch (e) {} };

export function initInstall() {
  const platform = installPlatform({
    ua: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints,
    standalone: matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
    native: !!globalThis.Capacitor?.isNativePlatform?.(),
  });
  const dialog = $("installDialog");
  let deferred = null; // événement beforeinstallprompt gardé pour le bouton « Installer »

  function render() {
    $("installCard").hidden = !platform;
    if (!platform) return;
    $("installBtn").hidden = !deferred;
    // Avec le bouton, les étapes manuelles ne servent plus
    $("installManual").hidden = !!deferred;
    const steps = platform === "ios" ? ["in.ios1", "in.ios2", "in.ios3"] : ["in.and1", "in.and2", "in.and3"];
    $("installSteps").innerHTML = steps
      .map(k => `<li>${esc(t(k)).replace("{share}", SHARE_ICON).replace("{menu}", MENU_ICON)}</li>`).join("");
  }

  async function install() {
    if (!deferred) return open();
    const prompt = deferred;
    deferred = null; // un événement ne sert qu'une fois
    dialog.close();
    prompt.prompt();
    await prompt.userChoice.catch(() => {});
    render();
  }

  function open() {
    render();
    if (!dialog.open) dialog.showModal();
  }

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); // pas de bandeau du navigateur : c'est notre fenêtre ou le rappel qui proposent
    deferred = e;
    render();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    if (dialog.open) dialog.close();
    $("installCard").hidden = true;
  });

  $("installBtn").addEventListener("click", install);
  $("installOpen").addEventListener("click", install);
  $("installClose").addEventListener("click", () => dialog.close());
  // Toucher le fond grisé ferme la fenêtre
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });

  render();
  // Première visite sur téléphone : on explique une fois, jamais plus ensuite
  if (platform && !read(SEEN_KEY)) {
    write(SEEN_KEY, "1");
    open();
  }
  return { render };
}
