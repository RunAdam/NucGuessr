// Phase 0 — Barème du mode Distance : valeur de k et bonus de précision.
//   1. score = 5000 × exp(−d/k) pour des erreurs types et pour les cas « bon fleuve, mauvais site »
//      calculés sur les vraies distances (approchées) entre centrales ;
//   2. bonus de précision : score obtenu par un joueur qui connaît le site, selon la précision du clic.
// Lancer : node scripts/sim/bareme-distance.mjs

import { CENTRALES as C, distanceKm, creerAlea, gauss, quantile, moyenne, afficherTable, titre } from './commun.mjs';
import * as config from '../../src/config.ts';

const MAX = 5000;
const K_CANDIDATS = [50, 75, 100, 125, 150];
const score = (d, k) => Math.round(MAX * Math.exp(-d / k));

// ---------------------------------------------------------------------------
titre('1a. Erreurs types');
const typiques = [
  [2, 'clic à côté du site'],
  [5, 'clic imprécis (mobile)'],
  [10, 'bonne commune voisine'],
  [30, 'bon département'],
  [100, 'bonne région'],
  [300, 'mauvaise région'],
  [500, 'clic au hasard (moyenne ≈ 400-500 km)'],
];
afficherTable([
  ['d (km)', 'situation', ...K_CANDIDATS.map((k) => `k=${k}`)],
  ...typiques.map(([d, s]) => [d, s, ...K_CANDIDATS.map((k) => score(d, k))]),
]);

// ---------------------------------------------------------------------------
titre('1b. « Bon fleuve (ou bonne côte), mauvais site » : distances réelles entre voisins');
const paires = [
  ['Loire', 'belleville', 'dampierre'],
  ['Loire', 'dampierre', 'saintlaurent'],
  ['Loire', 'saintlaurent', 'chinon'],
  ['Loire', 'belleville', 'chinon'],
  ['Rhône', 'cruas', 'tricastin'],
  ['Rhône', 'saintalban', 'cruas'],
  ['Rhône', 'bugey', 'saintalban'],
  ['Rhône', 'bugey', 'tricastin'],
  ['Garonne/Gironde', 'golfech', 'blayais'],
  ['Meuse/Moselle', 'chooz', 'cattenom'],
  ['Seine/Loire', 'nogent', 'dampierre'],
  ['Vienne/Loire', 'civaux', 'chinon'],
  ['Manche', 'paluel', 'penly'],
  ['Manche', 'penly', 'gravelines'],
  ['Manche', 'flamanville', 'paluel'],
];
const lignes = [['source froide', 'confusion', 'd (km)', ...K_CANDIDATS.map((k) => `k=${k}`)]];
for (const [fleuve, a, b] of paires) {
  const d = distanceKm(C[a], C[b]);
  lignes.push([fleuve, `${C[a].nom} ↔ ${C[b].nom}`, d.toFixed(0), ...K_CANDIDATS.map((k) => score(d, k))]);
}
afficherTable(lignes);

// Écart moyen au plus proche voisin, et clic au hasard
const ids = Object.keys(C);
const plusProche = ids.map((i) => Math.min(...ids.filter((j) => j !== i).map((j) => distanceKm(C[i], C[j]))));
console.log(`\nDistance au plus proche voisin : min ${Math.min(...plusProche).toFixed(0)} km, médiane ${quantile(plusProche, 0.5).toFixed(0)} km, max ${Math.max(...plusProche).toFixed(0)} km`);
// clic au hasard dans un rectangle couvrant la métropole, pondéré grossièrement
const alea = creerAlea(7);
const hasard = [];
for (let i = 0; i < 20000; i++) {
  const p = { lat: 43 + alea() * 7.5, lon: -1.5 + alea() * 8.5 };
  const site = C[ids[Math.floor(alea() * ids.length)]];
  hasard.push(distanceKm(p, site));
}
console.log(`Clic au hasard : distance médiane ${quantile(hasard, 0.5).toFixed(0)} km ; score moyen ${K_CANDIDATS.map((k) => `k=${k} → ${Math.round(moyenne(hasard.map((d) => score(d, k))))}`).join(', ')}`);
// stratégie dégénérée : toujours cliquer au milieu de la France, sans regarder la photo
const centre = { lat: 46.8, lon: 2.6 };
const dCentre = ids.map((i) => distanceKm(centre, C[i]));
console.log(`Toujours cliquer au centre (${centre.lat}, ${centre.lon}) : distance médiane ${quantile(dCentre, 0.5).toFixed(0)} km ; score moyen ${K_CANDIDATS.map((k) => `k=${k} → ${Math.round(moyenne(dCentre.map((d) => score(d, k))))}`).join(', ')}`);

// ---------------------------------------------------------------------------
titre('2. Bonus de précision : un joueur qui a reconnu le site, selon la précision de son clic');
console.log(
  'Erreur de clic tirée selon une loi de Rayleigh d\'écart-type σ. k = 75 (valeur retenue en 1).\n' +
    'Options : (a) aucun bonus ; (b) +500 si d < 5 km ; (c) rayon de tolérance R : 5000 si d ≤ R, puis 5000·exp(−(d−R)/k), continu.\n' +
    '« partie parfaite » = 5 rounds au score maximal de 5000.\n',
);
const K = 75;
const OPTIONS = {
  '(a) aucun': (d) => score(d, K),
  '(b) +500 si d<5': (d) => score(d, K) + (d < 5 ? 500 : 0),
  '(c) R = 2 km': (d) => (d <= 2 ? MAX : score(d - 2, K)),
  '(c) R = 3 km': (d) => (d <= 3 ? MAX : score(d - 3, K)),
  '(c) R = 5 km': (d) => (d <= 5 ? MAX : score(d - 5, K)),
};
const SIGMAS = [
  [1, 'ordinateur, zoomé'],
  [2, 'mobile, zoomé'],
  [5, 'zoom faible'],
];
const lignes2 = [['option', 'σ', 'précision', 'score moyen/round', 'P(5000)', 'P(partie parfaite)']];
for (const [nom, f] of Object.entries(OPTIONS)) {
  for (const [sigma, desc] of SIGMAS) {
    const al = creerAlea(11);
    const scores = [];
    for (let i = 0; i < 20000; i++) {
      const d = sigma * Math.hypot(gauss(al), gauss(al));
      scores.push(f(d));
    }
    const pMax = scores.filter((s) => s >= MAX).length / scores.length;
    lignes2.push([nom, sigma, desc, Math.round(moyenne(scores)), `${(100 * pMax).toFixed(0)} %`, `${(100 * pMax ** 5).toFixed(1)} %`]);
  }
}
afficherTable(lignes2);

// ---------------------------------------------------------------------------
titre('Valeurs retenues dans src/config.ts');
console.log(`DISTANCE_K_KM = ${config.DISTANCE_K_KM}, DISTANCE_RAYON_PARFAIT_KM = ${config.DISTANCE_RAYON_PARFAIT_KM}`);
for (const d of [0, 2, 3, 5, 10, 30, 35, 70, 100, 300]) console.log(`  ${d} km → ${config.scoreDistance(d)} points`);
