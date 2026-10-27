// Thème clair / sombre. "auto" suit le réglage du téléphone, y compris quand il change
// (passage automatique en sombre le soir, par exemple).

const systemDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
let pref = "auto";

function apply() {
  const theme = pref === "auto" ? (systemDark?.matches ? "dark" : "light") : pref;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111418" : "#f4f5f7");
}

// p = "auto", "light" ou "dark"
export function setTheme(p) {
  pref = p;
  apply();
}

systemDark?.addEventListener("change", () => { if (pref === "auto") apply(); });
