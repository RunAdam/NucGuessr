// Rend public/favicon.svg en PNG : public/favicon-32.png (32 × 32) et public/apple-touch-icon.png (180 × 180),
// plus une planche de contrôle design/captures/identite.png (wordmark et favicon à plusieurs tailles).
// Même prérequis que capturer.mjs : PW_DIR=<dossier où playwright-core est installé> node design/outils/icones.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.join(process.env.PW_DIR ?? '.', 'package.json'));
const { chromium } = require('playwright-core');
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');
const favicon = lire('public/favicon.svg');
const wordmark = lire('src/assets/wordmark.svg');

const navigateur = await chromium.launch({ channel: 'msedge', headless: true });
async function rendre(html, largeur, hauteur, sortie) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:#0a0e13}svg{display:block}</style>${html}`);
  await page.screenshot({ path: path.join(racine, sortie) });
  await page.close();
  console.log(sortie);
}
const taille = (svg, w, h) => svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
await rendre(taille(favicon, 32, 32), 32, 32, 'public/favicon-32.png');
// Icône iOS : la case sur fond plein, avec une marge (iOS arrondit les coins lui-même).
await rendre(`<div style="width:180px;height:180px;display:grid;place-items:center">${taille(favicon, 132, 132)}</div>`, 180, 180, 'public/apple-touch-icon.png');
await rendre(`<div style="padding:24px;display:flex;flex-direction:column;gap:24px;color:#a3afbc;font:12px monospace">
  ${taille(wordmark, 'auto', 32)}
  ${taille(wordmark, 'auto', 20)}
  <div style="display:flex;gap:24px;align-items:end">${[16, 32, 64, 128].map(s => taille(favicon, s, s)).join('')}
  <div style="background:#f2f2f2;padding:8px;display:flex;gap:12px;align-items:end">${[16, 32].map(s => taille(favicon, s, s)).join('')}</div></div>
</div>`, 520, 260, 'design/captures/identite.png');
await navigateur.close();
