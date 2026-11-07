import { test } from "node:test";
import assert from "node:assert/strict";
import { installPlatform } from "../js/install.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

test("l'ajout à l'écran d'accueil est proposé sur téléphone et tablette", () => {
  assert.equal(installPlatform({ ua: IPHONE, touchPoints: 5 }), "ios");
  assert.equal(installPlatform({ ua: IPAD, touchPoints: 5 }), "ios");
  assert.equal(installPlatform({ ua: ANDROID, touchPoints: 5 }), "android");
});

test("rien n'est proposé sur ordinateur, dans l'appli Android ou une fois installée", () => {
  assert.equal(installPlatform({ ua: WINDOWS }), null);
  assert.equal(installPlatform({ ua: IPAD, touchPoints: 0 }), null); // vrai Mac
  assert.equal(installPlatform({ ua: ANDROID, native: true }), null);
  assert.equal(installPlatform({ ua: IPHONE, standalone: true }), null);
});
