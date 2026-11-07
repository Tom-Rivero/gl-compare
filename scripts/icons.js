// Rend le logo (assets/logo.webp) et le fond SVG de assets/ en PNG : sources de capacitor-assets (icônes
// classiques et écran de démarrage Android), calques de l'icône adaptative, et visuels de la fiche Play Store
// dans assets/store/
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ASSETS = ROOT + "assets/";
const RES = ROOT + "android/app/src/main/res/";
const LOGO = ASSETS + "logo.webp";
// Taille en px d'un calque d'icône adaptative (108 dp) par densité
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const svg = name => ASSETS + name + ".svg";
const png = (input, size) => sharp(input, { density: 72 * size / 1024 }).resize(size, size).png();

// Logo recadré sur sa partie opaque, et rayon du cercle centré qui contient tout son dessin
const logo = await sharp(LOGO).trim().png().toBuffer();
const { data, info } = await sharp(logo).raw().toBuffer({ resolveWithObject: true });
let logoRadius = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 16) continue;
    logoRadius = Math.max(logoRadius, Math.hypot(x - info.width / 2, y - info.height / 2));
  }
}

// Calque de premier plan : le logo centré, tenu dans la zone sûre (cercle de rayon 33 dp sur 108) avec une marge
const foreground = async size => {
  const scale = size * 31 / 108 / logoRadius;
  const input = await sharp(logo).resize(Math.round(info.width * scale), Math.round(info.height * scale)).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input }]).png();
};

mkdirSync(ASSETS + "store", { recursive: true });

await (await foreground(1024)).toFile(ASSETS + "icon-foreground.png");
await png(svg("icon-background"), 1024).toFile(ASSETS + "icon-background.png");

// Icône complète (anciens Android et Play Store) : fond + logo, sans transparence
const fg1024 = await (await foreground(1024)).toBuffer();
await png(svg("icon-background"), 1024).composite([{ input: fg1024 }]).toFile(ASSETS + "icon-only.png");
// Le Store affiche l'icône en plein cadre : on garde la partie visible d'une icône adaptative (72 dp sur 108)
await sharp(ASSETS + "icon-only.png").extract({ left: 171, top: 171, width: 682, height: 682 }).resize(512, 512).removeAlpha().toFile(ASSETS + "store/icon-512.png");

// Écran de démarrage : le logo au centre du fond de l'icône, identique en thème sombre
const SPLASH = 2732;
const splashFg = await (await foreground(1400)).toBuffer();
const splash = png(svg("icon-background"), SPLASH).composite([{ input: splashFg }]);
await splash.clone().toFile(ASSETS + "splash.png");
await splash.clone().toFile(ASSETS + "splash-dark.png");

// Image de présentation : le logo à gauche du texte, sans son « MEET DAY » puisque le nom est écrit à côté
// (logo-sans-texte.png = logo.webp dont on a effacé les lettres, gris foncé alors que le contour est noir pur)
const featureLogo = await sharp(ASSETS + "logo-sans-texte.png").trim().resize({ height: 420 }).toBuffer();
await sharp(svg("feature-graphic"), { density: 72 })
  .composite([{ input: featureLogo, left: 120, top: 40 }])
  .flatten().png().toFile(ASSETS + "store/feature-graphic.png");
console.log("PNG prêts dans assets/ et assets/store/");

// Logo affiché dans l'en-tête des pages de l'appli (et favicon)
mkdirSync(ROOT + "img", { recursive: true });
await sharp(logo).resize({ height: 128 }).png({ palette: true }).toFile(ROOT + "img/logo.png");
console.log("Logo de l'appli prêt dans img/");

// Icônes de l'appli web ajoutée à l'écran d'accueil (manifest.webmanifest et apple-touch-icon d'index.html).
// - iOS (apple-touch-icon) : fond blanc plein cadre, partie visible de l'icône adaptative comme pour le Store
// - « maskable » (icône de l'écran d'accueil Android, que le téléphone découpe en cercle) : logo sur le fond
//   beige de l'appli. Chrome la reprend aussi au centre de l'écran de lancement : sur la même couleur
//   (background_color du manifest), son fond ne se voit pas. Chrome en fait une icône adaptative Android : logo
//   à la même taille que sur l'icône de l'appli native (cercle de 31 dp sur 108)
// - « any » : logo seul sur fond transparent, pour les navigateurs qui ne découpent pas les icônes
const APP_BG = "#f5f2ed"; // = --bg de css/style.css et background_color de manifest.webmanifest
const visible = () => sharp(ASSETS + "icon-only.png").extract({ left: 171, top: 171, width: 682, height: 682 });
await visible().resize(180, 180).flatten({ background: "#fff" }).png().toFile(ROOT + "img/apple-touch-icon.png");
{
  const size = 512, scale = size * 31 / 108 / logoRadius;
  const input = await sharp(logo).resize(Math.round(info.width * scale), Math.round(info.height * scale)).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: APP_BG } })
    .composite([{ input }]).flatten({ background: APP_BG }).png().toFile(ROOT + "img/icon-maskable-512.png");
}
for (const size of [192, 512]) {
  const inner = Math.round(size * .86);
  const input = await sharp(logo).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input }]).png().toFile(ROOT + `img/icon-${size}.png`);
}
console.log("Icônes de l'appli web prêtes dans img/");

const { status } = spawnSync("npx capacitor-assets generate --android", { cwd: ROOT, stdio: "inherit", shell: true });
if (status !== 0) process.exit(status ?? 1);

// capacitor-assets fait des calques adaptatifs trop petits (48 dp) avec une marge de 16,7 % : le logo
// tient déjà dans la zone sûre, on les remplace par des calques pleine taille sans marge
for (const [dpi, size] of Object.entries(ADAPTIVE)) {
  await (await foreground(size)).toFile(`${RES}mipmap-${dpi}/ic_launcher_foreground.png`);
  await png(svg("icon-background"), size).toFile(`${RES}mipmap-${dpi}/ic_launcher_background.png`);
}
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
for (const name of ["ic_launcher", "ic_launcher_round"]) writeFileSync(`${RES}mipmap-anydpi-v26/${name}.xml`, adaptive);
console.log("Icône adaptative Android mise à jour");
