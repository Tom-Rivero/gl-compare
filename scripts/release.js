// Construit l'AAB signé à envoyer sur la Play Console (après npm run build et cap sync, voir npm run release)
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ANDROID = ROOT + "android";
const AAB = ANDROID + "/app/build/outputs/bundle/release/app-release.aab";
// Java fourni avec Android Studio et SDK à son emplacement par défaut, si rien d'autre n'est défini
const STUDIO_JBR = "C:/Program Files/Android/Android Studio/jbr";
const DEFAULT_SDK = (process.env.LOCALAPPDATA || "") + "/Android/Sdk";

if (!existsSync(ANDROID + "/keystore.properties")) {
  console.error("android/keystore.properties manquant : copie keystore.properties.example et remplis-le avec ta clé.");
  process.exit(1);
}

const env = { ...process.env };
if (!env.JAVA_HOME && existsSync(STUDIO_JBR)) env.JAVA_HOME = STUDIO_JBR;
if (!env.ANDROID_HOME && !existsSync(ANDROID + "/local.properties") && existsSync(DEFAULT_SDK)) env.ANDROID_HOME = DEFAULT_SDK;

const windows = process.platform === "win32";
const { status } = spawnSync(windows ? ".\\gradlew.bat bundleRelease" : "./gradlew bundleRelease", { cwd: ANDROID, env, stdio: "inherit", shell: true });
if (status !== 0) process.exit(status ?? 1);
console.log(`AAB signé prêt : ${AAB}`);
