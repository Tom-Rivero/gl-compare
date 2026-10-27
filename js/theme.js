// Thème clair / sombre. "auto" suit le réglage du téléphone, y compris quand il change
// (passage automatique en sombre le soir, par exemple).

const systemDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
let pref = "auto";

function apply() {
  const theme = pref === "auto" ? (systemDark?.matches ? "dark" : "light") : pref;
  document.documentElement.dataset.theme = theme;
  const color = theme === "dark" ? "#111418" : "#f4f5f7";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  // Barre d'état Android assortie au thème (appli Capacitor uniquement ; ignoré si non pris en charge)
  const statusBar = globalThis.Capacitor?.Plugins?.StatusBar;
  statusBar?.setStyle({ style: theme === "dark" ? "DARK" : "LIGHT" }).catch(() => {});
  statusBar?.setBackgroundColor({ color }).catch(() => {});
}

// p = "auto", "light" ou "dark"
export function setTheme(p) {
  pref = p;
  apply();
}

systemDark?.addEventListener("change", () => { if (pref === "auto") apply(); });
