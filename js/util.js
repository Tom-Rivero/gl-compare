import { locale } from "./i18n.js";

export const $ = id => document.getElementById(id);

// Nombre saisi (virgule ou point), NaN si vide ou invalide
export const num = v => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const nf = (v, max = 2, min = 0) => Number.isFinite(v)
  ? v.toLocaleString(locale(), { minimumFractionDigits: min, maximumFractionDigits: max })
  : "–";
