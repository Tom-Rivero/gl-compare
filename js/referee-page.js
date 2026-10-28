// Écran Arbitrage : raison de chaque carton (lumière de couleur) quand un essai est refusé,
// d'après le règlement technique IPF (édition du 1er mars 2026, § 2.9)
import { $ } from "./util.js";
import { t } from "./i18n.js";

// Nombre de raisons par mouvement et par carton ; textes dans i18n sous ref.<mouvement>.<carton>.<n>
export const CARDS = ["red", "blue", "yellow"];
export const REASONS = {
  squat: { red: 1, blue: 2, yellow: 7 },
  bench: { red: 2, blue: 2, yellow: 6 },
  deadlift: { red: 2, blue: 2, yellow: 4 },
};

// Les mots clés sont entourés de ** dans les traductions et affichés en gras
export const bold = s => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export const reasonKeys = lift => CARDS.flatMap(card =>
  Array.from({ length: REASONS[lift][card] }, (_, i) => `ref.${lift}.${card}.${i + 1}`));

export function initReferee() {
  let lift = "squat";

  function render() {
    $("refTabs").querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.lift === lift));
    $("refCards").innerHTML = CARDS.map((card, n) => `
      <section class="card ref-card ref-${card}">
        <h2><span class="swatch" aria-hidden="true">${n + 1}</span>${t("ref.card." + card)}</h2>
        <ul>${Array.from({ length: REASONS[lift][card] }, (_, i) => `<li>${bold(t(`ref.${lift}.${card}.${i + 1}`))}</li>`).join("")}</ul>
      </section>`).join("");
  }

  $("refTabs").addEventListener("click", e => {
    const b = e.target.closest("[data-lift]");
    if (!b) return;
    lift = b.dataset.lift;
    render();
  });

  return { render };
}
