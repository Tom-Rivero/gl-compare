// Écran Checklist : ce qu'il ne faut pas oublier dans le sac le jour de la compétition
import { CATEGORIES, categoryItems, progress, newCustomItem, uncheckAll } from "./checklist.js";
import { $, esc } from "./util.js";
import { t } from "./i18n.js";

export const itemLabel = i => i.custom ? i.label : t("cl.item." + i.id);

export function initChecklist(state, save) {
  const list = () => state.checklist;
  const find = el => list().items.find(i => i.id === el.closest("[data-id]").dataset.id);

  function render() {
    $("clCats").innerHTML = Object.keys(CATEGORIES).map(cat => {
      const items = categoryItems(list(), cat);
      const { done, total } = progress(items);
      const open = !list().collapsed.includes(cat);
      return `
      <section class="card cl-cat${total && done === total ? " complete" : ""}" data-cat="${cat}">
        <button class="cl-head" type="button" data-fold aria-expanded="${open}" aria-controls="cl-${cat}">
          <h2>${t("cl.cat." + cat)}</h2>
          <span class="cl-count">${done}/${total}</span>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>
        </button>
        <div class="cl-body" id="cl-${cat}"${open ? "" : " hidden"}>
          <ul>${items.map(item).join("")}</ul>
          <form class="cl-add" data-add>
            <input type="text" enterkeyhint="done" placeholder="${esc(t("cl.add"))}" aria-label="${esc(t("cl.add.aria", { cat: t("cl.cat." + cat) }))}">
            <button type="submit" aria-label="${esc(t("cl.add"))}">+</button>
          </form>
        </div>
      </section>`;
    }).join("");
    $("clReset").disabled = !list().items.some(i => i.on && i.done);
  }

  const item = i => {
    const name = esc(itemLabel(i));
    return `
      <li class="cl-item${i.done ? " done" : ""}${i.on ? "" : " off"}" data-id="${esc(i.id)}">
        <label class="cl-check">
          <input type="checkbox" data-done${i.done ? " checked" : ""}${i.on ? "" : " disabled"}>
          <span>${name}</span>
        </label>
        ${i.custom ? `<button class="remove" type="button" data-remove aria-label="${esc(t("cl.remove.aria", { name: itemLabel(i) }))}">×</button>` : ""}
        <label class="toggle cl-on"><input type="checkbox" data-on${i.on ? " checked" : ""} aria-label="${esc(t("cl.on.aria", { name: itemLabel(i) }))}"></label>
      </li>`;
  };

  const update = () => {
    render();
    save();
  };

  $("clCats").addEventListener("change", e => {
    if (e.target.matches("[data-done]")) find(e.target).done = e.target.checked;
    else if (e.target.matches("[data-on]")) find(e.target).on = e.target.checked;
    else return;
    update();
  });
  $("clCats").addEventListener("click", e => {
    if (e.target.closest("[data-remove]")) {
      const i = find(e.target);
      list().items.splice(list().items.indexOf(i), 1);
      return update();
    }
    const fold = e.target.closest("[data-fold]");
    if (!fold) return;
    const cat = fold.closest("[data-cat]").dataset.cat;
    const c = list().collapsed;
    if (c.includes(cat)) c.splice(c.indexOf(cat), 1);
    else c.push(cat);
    update();
  });
  $("clCats").addEventListener("submit", e => {
    e.preventDefault();
    const input = e.target.querySelector("input");
    if (!input.value.trim()) return;
    const cat = e.target.closest("[data-cat]").dataset.cat;
    list().items.push(newCustomItem(cat, input.value));
    update();
    // On reste dans le champ pour enchaîner les ajouts
    document.querySelector(`[data-cat="${cat}"] [data-add] input`).focus();
  });
  $("clReset").addEventListener("click", () => {
    uncheckAll(list());
    update();
  });

  return { render };
}
