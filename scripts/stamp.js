// Numéro de version des fichiers CSS et JS dans index.html (?v=…), calculé depuis leur contenu.
// GitHub Pages les laisse 10 min en cache : sans ce numéro, juste après une mise en ligne,
// le navigateur peut mélanger la nouvelle page et l'ancien CSS ou les anciens modules JS.
// La table d'import (importmap) applique le numéro aux modules importés par js/app.js.
// À lancer après chaque modification du CSS ou du JS : npm run stamp (vérifié par npm test).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const HTML = ROOT + "index.html";

export const modules = () => readdirSync(ROOT + "js").filter(f => f.endsWith(".js")).sort();

// Fins de ligne normalisées : même numéro sous Windows (CRLF) et sur GitHub (LF)
export function currentVersion() {
  const hash = createHash("sha256");
  ["css/style.css", ...modules().map(f => "js/" + f)].forEach(f => {
    hash.update(f);
    hash.update(readFileSync(ROOT + f, "utf8").replace(/\r\n/g, "\n"));
  });
  return hash.digest("hex").slice(0, 10);
}

export function stampHtml(html, version, files = modules()) {
  const map = JSON.stringify({ imports: Object.fromEntries(files.map(f => [`./js/${f}`, `./js/${f}?v=${version}`])) }, null, 2);
  const importmap = `<script type="importmap">\n${map}\n</script>`;
  html = html
    .replace(/href="css\/style\.css(\?v=\w+)?"/, `href="css/style.css?v=${version}"`)
    .replace(/src="js\/app\.js(\?v=\w+)?"/, `src="js/app.js?v=${version}"`);
  return /<script type="importmap">[\s\S]*?<\/script>/.test(html)
    ? html.replace(/<script type="importmap">[\s\S]*?<\/script>/, importmap)
    : html.replace(/<script type="module"/, `${importmap}\n<script type="module"`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const version = currentVersion();
  writeFileSync(HTML, stampHtml(readFileSync(HTML, "utf8"), version));
  console.log(`index.html : version ${version}`);
}
