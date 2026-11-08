// Thème clair / sombre. "auto" suit le réglage du téléphone, y compris quand il change
// (passage automatique en sombre le soir, par exemple).

const systemDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
let pref = "auto";

function apply() {
  const theme = pref === "auto" ? (systemDark?.matches ? "dark" : "light") : pref;
  document.documentElement.dataset.theme = theme;
  const color = theme === "dark" ? "#121316" : "#f5f2ed";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  // Barres système Android assorties au thème (appli Capacitor uniquement ; ignoré si non pris en charge).
  // Depuis Android 15, la couleur des barres ne se règle plus : on colore le fond de la fenêtre, visible
  // derrière elles, et on choisit des icônes claires (DARK) ou foncées (LIGHT) pour les deux barres.
  const plugins = globalThis.Capacitor?.Plugins;
  plugins?.SystemBars?.setStyle({ style: theme === "dark" ? "DARK" : "LIGHT" }).catch(() => {});
  plugins?.WindowBackground?.setColor({ color }).catch(() => {});
}

// p = "auto", "light" ou "dark"
export function setTheme(p) {
  pref = p;
  apply();
}

systemDark?.addEventListener("change", () => { if (pref === "auto") apply(); });
