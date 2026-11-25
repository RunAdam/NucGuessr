// Captures des prototypes et des pages de test de design/ (Playwright + Microsoft Edge installé).
//
// playwright-core n'est PAS une dépendance du dépôt : l'installer dans un dossier temporaire
// (`npm i playwright-core@1.49.1`) et passer ce dossier dans PW_DIR.
//
//   PW_DIR=/chemin/temp node design/outils/capturer.mjs            -> toutes les captures
//   PW_DIR=/chemin/temp node design/outils/capturer.mjs glyphes     -> seulement celles dont le nom contient « glyphes »
//
// Écrit les PNG dans design/captures/ et les mesures (JSON) dans design/tests/mesures.json.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.join(process.env.PW_DIR ?? '.', 'package.json'));
const { chromium } = require('playwright-core');

const ici = path.dirname(fileURLToPath(import.meta.url));
const design = path.resolve(ici, '..');
const sortie = path.join(design, 'captures');
const url = (f, q = '') => pathToFileURL(path.join(design, f)).href + (q ? '?' + q : '');

const BUREAU = { width: 1280, height: 800 };
// Mobile 360 px avec clavier virtuel ouvert : il ne reste qu'environ 400 px de haut visibles.
const MOBILE = { width: 360, height: 400 };

// [nom du PNG, fichier, paramètres, fenêtre]
const travaux = [
  ['test-glyphes', 'tests/glyphes.html', '', { width: 1100, height: 700 }],
];
const directions = [['a', 'direction-a-synoptique.html'], ['b', 'direction-b-plan.html']];
for (const [d, f] of directions) {
  travaux.push(
    [`${d}-bureau-jeu`, f, 't=12.4&saisie=Tric', BUREAU],
    [`${d}-bureau-erreur`, f, 't=9.6&etat=erreur', BUREAU],
    [`${d}-mobile-jeu`, f, 't=12.4&saisie=Tric', MOBILE],
    [`${d}-mobile-erreur`, f, 't=9.6&etat=erreur', MOBILE],
    [`${d}-bureau-bonne`, f, 't=9.6&etat=bonne', BUREAU],
  );
}
// Variantes typographiques et de palette (direction A)
for (const typo of ['plex', 'jetbrains', 'barlow']) {
  travaux.push([`a-typo-${typo}-mobile`, 'direction-a-synoptique.html', `t=12.4&saisie=Tric&typo=${typo}`, MOBILE]);
}
travaux.push(['a-palette-graphite-bureau', 'direction-a-synoptique.html', 't=12.4&saisie=Tric&palette=graphite', BUREAU]);
travaux.push(['a-perdu-bureau', 'direction-a-synoptique.html', 't=0&etat=perdu', BUREAU]);
travaux.push(['a-alerte-mobile', 'direction-a-synoptique.html', 't=3.2&saisie=Gol', MOBILE]);
// Métaphores de la barre de temps : chaque variante à 15, 10 et 5 s, puis avant/après une erreur.
for (const barre of ['lineaire', 'expo', 'grappes']) {
  for (const t of [15, 10, 5]) {
    travaux.push([`barre-${barre}-${t}s`, 'direction-a-synoptique.html', `t=${t}&barre=${barre}&saisie=Tric&mesure=1`, BUREAU]);
  }
  travaux.push([`barre-${barre}-avant-erreur`, 'direction-a-synoptique.html', `t=11.6&barre=${barre}&mesure=1`, BUREAU]);
  travaux.push([`barre-${barre}-apres-erreur`, 'direction-a-synoptique.html', `t=9.6&etat=erreur&barre=${barre}&mesure=1`, BUREAU]);
}
// Écran de fin
travaux.push(['fin-bureau', 'fin-compte-rendu.html', '', { width: 1280, height: 900 }]);
travaux.push(['fin-mobile', 'fin-compte-rendu.html', '', { width: 360, height: 740 }]);

const filtre = process.argv[2];
const navigateur = await chromium.launch({ channel: 'msedge', headless: true });
const mesuresPath = path.join(ici, '..', 'tests', 'mesures.json');
const mesures = fs.existsSync(mesuresPath) ? JSON.parse(fs.readFileSync(mesuresPath, 'utf8')) : {};
for (const [nom, fichier, q, vue] of travaux) {
  if (filtre && !nom.includes(filtre)) continue;
  if (!fs.existsSync(path.join(design, fichier))) continue;
  const page = await navigateur.newPage({ viewport: vue, deviceScaleFactor: 1 });
  await page.goto(url(fichier, q));
  await page.waitForFunction(() => document.body.dataset.pret === '1', null, { timeout: 10000 });
  await page.waitForTimeout(150);
  const capture = { path: path.join(sortie, `${nom}.png`) };
  // Les captures de barre de temps ne gardent que la zone de la barre (analyse au pixel ensuite).
  if (q.includes('mesure=1')) {
    const zone = await page.evaluate(() => window.zoneBarre?.());
    if (zone) capture.clip = zone;
  }
  await page.screenshot(capture);
  const m = await page.evaluate(() => window.mesures?.() ?? window.resultats ?? null);
  if (m) mesures[nom] = m;
  await page.close();
  console.log('capture', nom);
}
fs.writeFileSync(mesuresPath, JSON.stringify(mesures, null, 2));
await navigateur.close();
