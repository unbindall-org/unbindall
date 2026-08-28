/**
 * Rendert die PNG-Icons aus derselben Bildmarke, die `src/components/logo.tsx`
 * exportiert. Der Pfad wird aus der Komponente gelesen, nicht kopiert — damit
 * kann die Marke nicht zwischen SVG und PNG auseinanderlaufen.
 *
 *   node scripts/render-icons.mjs
 *
 * Erzeugt:
 *   src/app/apple-icon.png        180×180, Kachel auf dunklem Grund
 *   src/app/opengraph-image.png   1200×630, Kachel im bestehenden Layout ersetzt
 *   src/app/twitter-image.png     Kopie des OG-Bilds
 *
 * Der OG-Lauf legt die neue Kachel deckend über die alte, die pixelgleich an
 * derselben Stelle saß. Der Schritt ist idempotent und lässt Typografie und
 * Hintergrund des bestehenden Bilds unangetastet.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const source = readFileSync(resolve(root, "src/components/logo.tsx"), "utf8");
const mark = source.match(/export const MARK =\s*"([^"]+)"/)?.[1];
if (!mark) throw new Error("MARK nicht in src/components/logo.tsx gefunden");

const INK = "#1d1a17";
const PAPER = "#f7f5f2";

/** Tuschefläche des Zugs inklusive runder Enden, im 35×38-Zeichenraster. */
const ART = { w: 34.6, h: 37.21 };

/** Marke mittig in eine quadratische Kachel, auf 72 % ihrer Kantenlänge. */
function placed(x, y, size, color) {
  const h = size * 0.72;
  const s = h / ART.h;
  const tx = x + (size - ART.w * s) / 2;
  const ty = y + (size - h) / 2;
  return `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})">
    <path d="${mark}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
  </g>`;
}

function tile(x, y, size, radius) {
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${PAPER}"/>`;
}

const appleIcon = `<!doctype html>
<meta charset="utf-8">
<style>html,body{margin:0;width:180px;height:180px;background:${INK}}svg{display:block}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  ${tile(37, 37, 106, 31)}
  ${placed(37, 37, 106, INK)}
</svg>`;

// Chromium verweigert file://-Unterressourcen auf einer per setContent
// gesetzten Seite — die Basis muss deshalb eingebettet werden.
const base = resolve(root, "src/app/opengraph-image.png");
const baseData = readFileSync(base).toString("base64");
const ogImage = `<!doctype html>
<meta charset="utf-8">
<style>html,body{margin:0;width:1200px;height:630px;background:${INK};overflow:hidden}
img,svg{position:absolute;top:0;left:0;display:block}</style>
<img id="base" src="data:image/png;base64,${baseData}" width="1200" height="630">
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${tile(99, 125, 78, 23)}
  ${placed(99, 125, 78, INK)}
</svg>`;

const browser = await chromium.launch();

async function shoot(html, width, height, out) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });

  // Lieber abbrechen als ein halb gerendertes Bild über das bestehende schreiben.
  const broken = await page.evaluate((w) => {
    const img = document.getElementById("base");
    return img ? img.naturalWidth !== w : false;
  }, width);
  if (broken) throw new Error(`Basisbild für ${out} nicht geladen — nichts geschrieben`);

  writeFileSync(out, await page.screenshot({ type: "png" }));
  await page.close();
  console.log(`  ${out.replace(`${root}/`, "")}  ${width}×${height}`);
}

await shoot(appleIcon, 180, 180, resolve(root, "src/app/apple-icon.png"));
await shoot(ogImage, 1200, 630, resolve(root, "src/app/opengraph-image.png"));
copyFileSync(resolve(root, "src/app/opengraph-image.png"), resolve(root, "src/app/twitter-image.png"));
console.log("  src/app/twitter-image.png  1200×630");

await browser.close();
