// Phase 0 — Durée des parties : délai entre deux rounds (Rapidité) et limite de temps (Distance).
// Cible de la feuille de route : des parties de 2 à 5 minutes.
// Les temps de réflexion sont des hypothèses (lois log-normales), à confronter aux parties réelles en phase 8.
// Lancer : node scripts/sim/durees.mjs

import { creerAlea, logNormale, quantile, afficherTable, titre } from './commun.mjs';

const N = 20000;
const fmt = (s) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;

// ---------------------------------------------------------------------------
titre('1. Rapidité : durée d\'une partie de 8 rounds selon le délai entre rounds');
console.log('Temps de round : reconnaissance log-normale + 1,2 s de saisie, plafonné à 20 s (round perdu).');
console.log('Le délai s\'applique après chacun des 8 rounds (le dernier mène à l\'écran de fin).\n');
const PROFILS_R = {
  expert: { p: 0.9, med: 3 },
  moyen: { p: 0.6, med: 5.5 },
  debutant: { p: 0.25, med: 8 },
};
// options : [délai après bonne réponse, délai après round perdu] en secondes ; 'touche' = attente d'un appui (≈ 1,2 s de réaction)
const DELAIS = {
  'enchaîner (0 s)': [0, 0],
  '1,5 s fixe': [1.5, 1.5],
  '1,5 s / 3 s si perdu': [1.5, 3],
  'attendre un appui': ['touche', 'touche'],
};
const lignes = [['délai', 'profil', 'rounds perdus', 'durée médiane', 'P90', 'part du temps passée à attendre']];
for (const [nomD, [dBon, dPerdu]] of Object.entries(DELAIS)) {
  for (const [nomP, pr] of Object.entries(PROFILS_R)) {
    const alea = creerAlea(3);
    const durees = [];
    let perdus = 0, attente = 0, total = 0;
    for (let i = 0; i < N; i++) {
      let t = 0;
      for (let r = 0; r < 8; r++) {
        const connu = alea() < pr.p;
        const tr = connu ? logNormale(alea, pr.med) + 1.2 : logNormale(alea, pr.med * 1.3) + 1.2 + 3.2 * Math.floor(alea() * 5);
        const perdu = tr >= 20;
        if (perdu) perdus++;
        const d = perdu ? dPerdu : dBon;
        const delai = d === 'touche' ? logNormale(alea, 1.2, 0.3) : d;
        t += Math.min(tr, 20) + delai;
        attente += delai;
      }
      durees.push(t);
      total += t;
    }
    lignes.push([nomD, nomP, `${((100 * perdus) / (8 * N)).toFixed(0)} %`, fmt(quantile(durees, 0.5)), fmt(quantile(durees, 0.9)), `${((100 * attente) / total).toFixed(0)} %`]);
  }
}
afficherTable(lignes);
console.log('\nLire un nom complet (« Centrale nucléaire de Saint-Laurent-des-Eaux », 6 mots) prend ≈ 1,5 s ; découvrir une réponse inconnue et la relier à la photo, plutôt 2,5 à 3 s.');

// ---------------------------------------------------------------------------
titre('2. Distance : durée d\'une partie de 5 rounds selon la limite de temps par round');
console.log('Temps de round (regarder, zoomer, placer, valider) log-normal ; écran de résultat ≈ 6 s, passé par le joueur.\n');
const PROFILS_D = {
  rapide: 20,
  moyen: 35,
  'lent / mobile': 60,
};
const LIMITES = { aucune: Infinity, '3 min': 180, '2 min': 120, '1 min': 60 };
const lignes2 = [['limite', 'profil', 'rounds coupés', 'durée médiane', 'P90']];
for (const [nomL, lim] of Object.entries(LIMITES)) {
  for (const [nomP, med] of Object.entries(PROFILS_D)) {
    const alea = creerAlea(5);
    const durees = [];
    let coupes = 0;
    for (let i = 0; i < N; i++) {
      let t = 0;
      for (let r = 0; r < 5; r++) {
        const tr = logNormale(alea, med, 0.5);
        if (tr > lim) coupes++;
        t += Math.min(tr, lim) + logNormale(alea, 6, 0.3);
      }
      durees.push(t);
    }
    lignes2.push([nomL, nomP, `${((100 * coupes) / (5 * N)).toFixed(1)} %`, fmt(quantile(durees, 0.5)), fmt(quantile(durees, 0.9))]);
  }
}
afficherTable(lignes2);
