import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentVersion, stampHtml } from "../scripts/stamp.js";

test("index.html porte la version à jour du CSS et du JS (sinon : npm run stamp)", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html, stampHtml(html, currentVersion()), "lance npm run stamp avant de mettre en ligne");
});

test("le numéro est posé sur le CSS, app.js et chaque module importé", () => {
  const html = `<link rel="stylesheet" href="css/style.css">\n<script type="module" src="js/app.js"></script>`;
  const out = stampHtml(html, "abc", ["app.js", "i18n.js"]);
  assert.match(out, /href="css\/style\.css\?v=abc"/);
  assert.match(out, /src="js\/app\.js\?v=abc"/);
  assert.match(out, /"\.\/js\/i18n\.js": "\.\/js\/i18n\.js\?v=abc"/);
  assert.ok(out.indexOf("importmap") < out.indexOf('type="module"'));
  // Un second passage remplace l'ancien numéro au lieu d'en ajouter un
  assert.equal(stampHtml(out, "abc", ["app.js", "i18n.js"]), out);
  assert.match(stampHtml(out, "def", ["app.js", "i18n.js"]), /style\.css\?v=def"/);
});
