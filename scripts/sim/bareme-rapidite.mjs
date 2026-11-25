// Phase 0 — Barème du mode Rapidité.
// Compare plusieurs formules de score sur :
//   1. une table temps de réponse × nombre d'erreurs ;
//   2. la rentabilité de la stratégie « essayer plein de noms » ;
//   3. l'étalement des scores sur des parties simulées (3 profils de joueurs).
// Lancer : node scripts/sim/bareme-rapidite.mjs

import { creerAlea, logNormale, quantile, moyenne, afficherTable, titre } from './commun.mjs';
import * as config from '../../src/config.ts';

const DUREE = 20; // s
const PENALITE = 2; // s par mauvaise réponse
const SAISIE = 1.2; // s pour taper 3-4 lettres + Tab + Entrée avec l'autocomplétion

// Formules candidates : t = temps restant (s) au moment de la bonne réponse, e = nombre d'erreurs.
const OPTIONS = {
  'A  max(100, 1000·t/20)': (t) => Math.round(Math.max(100, (1000 * t) / DUREE)),
  'B1 100 + 900·t/20': (t) => Math.round(100 + (900 * t) / DUREE),
  'B2 200 + 800·t/20': (t) => Math.round(200 + (800 * t) / DUREE),
  'C  B1 − 100/erreur': (t, e) => Math.round(Math.max(100, 100 + (900 * t) / DUREE - 100 * e)),
};

/** Score d'un round : temps écoulé `ecoule` (s, saisie comprise) et `e` erreurs. 0 si le temps est épuisé. */
function scoreRound(formule, ecoule, e) {
  const reste = DUREE - ecoule - PENALITE * e;
  return reste > 0 ? formule(reste, e) : 0;
}

// ---------------------------------------------------------------------------
titre('1. Score d\'un round selon le temps écoulé et le nombre d\'erreurs (−2 s chacune)');
console.log('« temps » = secondes écoulées à la validation de la bonne réponse, saisie comprise ; 0 = round perdu.\n');
for (const [nom, f] of Object.entries(OPTIONS)) {
  console.log(nom);
  const lignes = [['temps', '0 err', '1 err', '2 err', '3 err']];
  for (const ecoule of [2, 4, 6, 8, 10, 12, 14, 16, 18, 19.5]) {
    lignes.push([`${ecoule} s`, ...[0, 1, 2, 3].map((e) => scoreRound(f, ecoule, e))]);
  }
  afficherTable(lignes);
  console.log();
}

// ---------------------------------------------------------------------------
titre('2. « Essayer plein de noms » contre « réfléchir »');
console.log(
  `Le joueur a réduit à c candidats après 3 s, puis les essaie au hasard (${SAISIE} s de saisie par essai, −2 s par erreur).\n` +
    'Espérance du score du round, et temps de réponse « sans erreur » qui rapporte autant (équivalent réflexion).\n',
);
function esperanceSpam(f, c, depart = 3) {
  let total = 0;
  for (let k = 1; k <= c; k++) total += scoreRound(f, depart + SAISIE * k, k - 1) / c;
  return total;
}
function equivalentSansErreur(f, cible) {
  // plus grand temps écoulé (pas de 0,1 s) dont le score sans erreur est ≥ cible
  let meilleur = null;
  for (let ec = 0.5; ec < DUREE; ec += 0.1) if (scoreRound(f, ec, 0) >= cible) meilleur = ec;
  return meilleur === null ? '—' : `${meilleur.toFixed(1)} s`;
}
const lignes2 = [['option', 'c=2', 'c=3', 'c=5', 'c=18 (au hasard)', 'équiv. c=18', 'abandon']];
for (const [nom, f] of Object.entries(OPTIONS)) {
  const e18 = esperanceSpam(f, 18);
  lignes2.push([nom, ...[2, 3, 5].map((c) => Math.round(esperanceSpam(f, c))), Math.round(e18), equivalentSansErreur(f, e18), 0]);
}
afficherTable(lignes2);
console.log('\nLecture : « équiv. c=18 » = mitrailler les 18 noms rapporte en moyenne autant qu\'une bonne réponse trouvée en réfléchissant jusqu\'à ce temps-là.');

// ---------------------------------------------------------------------------
titre('3. Étalement des scores sur 8 rounds (5 000 parties simulées par profil)');
const PROFILS = {
  // p = part des sites reconnus, med = médiane du temps de reconnaissance (s),
  // c = nb de candidats quand le site n'est pas reconnu, conf = probabilité de confondre avec un voisin (1 erreur)
  expert: { p: 0.9, med: 3, c: 3, conf: 0.08 },
  moyen: { p: 0.6, med: 5.5, c: 4, conf: 0.15 },
  debutant: { p: 0.25, med: 8, c: 8, conf: 0.25 },
};
function jouerRound(alea, profil, f) {
  if (alea() < profil.p) {
    const ecoule = logNormale(alea, profil.med) + SAISIE;
    const err = alea() < profil.conf ? 1 : 0;
    return scoreRound(f, ecoule + err * SAISIE, err);
  }
  // non reconnu : réfléchit un peu, puis essaie ses c candidats au hasard
  const depart = logNormale(alea, profil.med * 1.3);
  const k = 1 + Math.floor(alea() * profil.c); // rang de la bonne réponse
  return scoreRound(f, depart + SAISIE * k, k - 1);
}
const graine = 2026;
const lignes3 = [['option', 'profil', 'P10', 'médiane', 'P90', 'moyenne']];
for (const [nom, f] of Object.entries(OPTIONS)) {
  for (const [nomProfil, profil] of Object.entries(PROFILS)) {
    const alea = creerAlea(graine);
    const totaux = [];
    for (let i = 0; i < 5000; i++) {
      let s = 0;
      for (let r = 0; r < 8; r++) s += jouerRound(alea, profil, f);
      totaux.push(s);
    }
    lignes3.push([nom, nomProfil, ...[0.1, 0.5, 0.9].map((q) => Math.round(quantile(totaux, q))), Math.round(moyenne(totaux))]);
  }
}
afficherTable(lignes3);

// ---------------------------------------------------------------------------
titre('Valeurs retenues dans src/config.ts');
console.log(
  `RAPIDITE_SCORE_PLANCHER = ${config.RAPIDITE_SCORE_PLANCHER}, RAPIDITE_SCORE_MAX = ${config.RAPIDITE_SCORE_MAX}`,
);
const ex = [
  [3000, 0],
  [8000, 1],
  [15000, 0],
  [19000, 0],
];
for (const [restantMs, e] of ex.map(([ecMs, e]) => [config.RAPIDITE_DUREE_MS - ecMs - e * config.RAPIDITE_PENALITE_MS, e])) {
  console.log(`  temps restant ${restantMs / 1000} s → ${config.scoreRapidite(restantMs)} points`);
}
