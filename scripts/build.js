// Copie les fichiers de l'appli dans www/, le dossier embarqué par Capacitor dans l'appli Android,
// et le son des alertes dans les ressources Android (res/raw), d'où les notifications le lisent
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = ROOT + "www";
const RAW = ROOT + "android/app/src/main/res/raw";
const FILES = ["index.html", "css", "js"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
FILES.forEach(f => cpSync(ROOT + f, `${OUT}/${f}`, { recursive: true }));
rmSync(RAW, { recursive: true, force: true });
cpSync(ROOT + "sounds", RAW, { recursive: true });
console.log(`www/ prêt (${FILES.join(", ")}), son des alertes copié dans res/raw`);
