// Copie les fichiers de l'appli dans www/, le dossier embarqué par Capacitor dans l'appli Android
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = ROOT + "www";
const FILES = ["index.html", "css", "js"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
FILES.forEach(f => cpSync(ROOT + f, `${OUT}/${f}`, { recursive: true }));
console.log(`www/ prêt (${FILES.join(", ")})`);
