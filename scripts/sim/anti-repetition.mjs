// Phase 0 — Anti-répétition des photos d'une partie à l'autre.
// Simule des séries de 30 parties consécutives avec chaque option de tirage et mesure :
//   - la part des photos montrées qui avaient déjà été vues dans la partie précédente, ou dans les 3 précédentes ;
//   - l'équité entre sites (un site ne doit pas sortir plus souvent qu'un autre) ;
//   - les blocages (impossible de remplir la partie avec des sites distincts).
// Contrainte commune : jamais deux fois le même site dans une partie.
// Lancer : node scripts/sim/anti-repetition.mjs

import { creerAlea, melanger, afficherTable, titre } from './commun.mjs';

const NB_SITES = 18;
const NB_PARTIES = 30;
const NB_SERIES = 2000;

/** Banque de photos : `parSite[i]` = nombre de photos du site i. */
function creerBanque(parSite) {
  const photos = [];
  parSite.forEach((n, site) => {
    for (let k = 0; k < n; k++) photos.push({ id: photos.length, site });
  });
  return photos;
}

// Chaque option reçoit : banque, historique (Map id → numéro de la dernière partie où la photo a été vue),
// numéro de partie courant, nombre de rounds, alea. Elle renvoie la liste des photos, ou null si blocage.

/** (A) Exclusion des N dernières photos vues, puis tirage uniforme : site parmi ceux qui ont une photo disponible. */
function exclusionN(N) {
  return (banque, histo, partie, rounds, alea, ordreVu) => {
    const exclues = new Set(ordreVu.slice(-N));
    let dispo = banque.filter((p) => !exclues.has(p.id));
    const sitesDispo = new Set(dispo.map((p) => p.site));
    let degrade = false;
    if (sitesDispo.size < rounds) {
      dispo = banque; // repli : on ignore l'exclusion
      degrade = true;
    }
    const sites = melanger([...new Set(dispo.map((p) => p.site))], alea).slice(0, rounds);
    const choix = sites.map((s) => {
      const c = dispo.filter((p) => p.site === s);
      return c[Math.floor(alea() * c.length)];
    });
    return { choix, degrade };
  };
}

/** (B) Tirage pondéré global : poids = 1 − exp(−âge/τ) (âge en parties, jamais vue → 1), sites distincts. */
function pondere(tau) {
  return (banque, histo, partie, rounds, alea) => {
    const poids = (p) => (histo.has(p.id) ? 1 - Math.exp(-(partie - histo.get(p.id)) / tau) : 1);
    const choix = [];
    const pris = new Set();
    for (let r = 0; r < rounds; r++) {
      const cand = banque.filter((p) => !pris.has(p.site));
      const total = cand.reduce((s, p) => s + poids(p), 0);
      let x = alea() * total;
      let elu = cand[cand.length - 1];
      for (const p of cand) {
        x -= poids(p);
        if (x <= 0) {
          elu = p;
          break;
        }
      }
      choix.push(elu);
      pris.add(elu.site);
    }
    return { choix, degrade: false };
  };
}

/** (C) Rotation par site : sites tirés uniformément (distincts), puis la photo du site vue il y a le plus longtemps
 *  (jamais vue en priorité, égalités départagées au hasard). */
function rotationParSite() {
  return (banque, histo, partie, rounds, alea) => {
    const sites = melanger([...new Set(banque.map((p) => p.site))], alea).slice(0, rounds);
    const choix = sites.map((s) => {
      const photos = banque.filter((p) => p.site === s);
      const anciennete = (p) => (histo.has(p.id) ? histo.get(p.id) : -Infinity);
      const plusAncienne = Math.min(...photos.map(anciennete));
      const cand = photos.filter((p) => anciennete(p) === plusAncienne);
      return cand[Math.floor(alea() * cand.length)];
    });
    return { choix, degrade: false };
  };
}

/** (0) Référence : tirage purement aléatoire (sites distincts), sans mémoire. */
function sansMemoire() {
  return (banque, histo, partie, rounds, alea) => {
    const sites = melanger([...new Set(banque.map((p) => p.site))], alea).slice(0, rounds);
    return {
      choix: sites.map((s) => {
        const c = banque.filter((p) => p.site === s);
        return c[Math.floor(alea() * c.length)];
      }),
      degrade: false,
    };
  };
}

function simuler(option, banque, roundsParPartie) {
  const alea = creerAlea(1234);
  let montrees = 0, revuesPrec1 = 0, revuesPrec3 = 0, degradees = 0, parties = 0, erreurs = 0;
  const freqSites = new Array(NB_SITES).fill(0);
  for (let serie = 0; serie < NB_SERIES; serie++) {
    const histo = new Map();
    const ordreVu = [];
    for (let partie = 0; partie < NB_PARTIES; partie++) {
      const rounds = typeof roundsParPartie === 'function' ? roundsParPartie(partie) : roundsParPartie;
      const { choix, degrade } = option(banque, histo, partie, rounds, alea, ordreVu);
      parties++;
      if (degrade) degradees++;
      if (choix.length !== rounds || new Set(choix.map((p) => p.site)).size !== rounds) erreurs++;
      for (const p of choix) {
        freqSites[p.site]++;
        if (partie >= 3) {
          montrees++;
          const vue = histo.get(p.id);
          if (vue !== undefined && partie - vue === 1) revuesPrec1++;
          if (vue !== undefined && partie - vue <= 3) revuesPrec3++;
        }
      }
      for (const p of choix) {
        histo.set(p.id, partie);
        ordreVu.push(p.id);
      }
    }
  }
  const presents = freqSites.filter((f, i) => banque.some((p) => p.site === i));
  return {
    prec1: (100 * revuesPrec1) / montrees,
    prec3: (100 * revuesPrec3) / montrees,
    equite: Math.max(...presents) / Math.min(...presents),
    degradees: (100 * degradees) / parties,
    erreurs,
  };
}

const OPTIONS = {
  '0  aucune mémoire (référence)': sansMemoire(),
  'A  exclure les 8 dernières': exclusionN(8),
  'A  exclure les 16 dernières': exclusionN(16),
  'A  exclure les 24 dernières': exclusionN(24),
  'A  exclure les 40 dernières': exclusionN(40),
  'B  pondéré, τ = 1 partie': pondere(1),
  'B  pondéré, τ = 3 parties': pondere(3),
  'C  rotation par site': rotationParSite(),
};

const BANQUES = {
  '54 photos (3 par site, départ)': new Array(NB_SITES).fill(3),
  '90 photos (5 par site, cible haute)': new Array(NB_SITES).fill(5),
  '72 photos inégales (3 à 5 par site, cas réaliste)': [3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5],
  '54 photos très inégales (1 à 6 par site, cas extrême)': [1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 6, 6],
};

const MODES = {
  'Rapidité (8 rounds)': 8,
  'Distance (5 rounds)': 5,
};

for (const [nomBanque, parSite] of Object.entries(BANQUES)) {
  const banque = creerBanque(parSite);
  for (const [nomMode, rounds] of Object.entries(MODES)) {
    titre(`${nomBanque} — ${nomMode} — ${NB_SERIES} séries de ${NB_PARTIES} parties`);
    const lignes = [['option', 'déjà vue partie préc.', 'déjà vue 3 parties préc.', 'site le + fréquent / le − fréquent', 'parties en repli', 'blocages']];
    for (const [nom, opt] of Object.entries(OPTIONS)) {
      const r = simuler(opt, banque, rounds);
      lignes.push([nom, `${r.prec1.toFixed(1)} %`, `${r.prec3.toFixed(1)} %`, `×${r.equite.toFixed(2)}`, `${r.degradees.toFixed(1)} %`, r.erreurs]);
    }
    afficherTable(lignes);
  }
}
console.log('\n« parties en repli » : l\'exclusion empêchait de trouver assez de sites distincts, la règle a dû être ignorée.');
console.log('« site le + fréquent / le − fréquent » : ×1,00 = tous les sites sortent aussi souvent.');
