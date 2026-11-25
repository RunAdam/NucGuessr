// Outils communs aux simulations de la phase 0 (aucune dépendance).

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function creerAlea(graine = 42) {
  let a = graine >>> 0;
  return function alea() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tirage gaussien (Box-Muller). */
export function gauss(alea) {
  const u = 1 - alea();
  const v = alea();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Loi log-normale de médiane donnée (dispersion sigma en log). */
export function logNormale(alea, mediane, sigma = 0.45) {
  return mediane * Math.exp(sigma * gauss(alea));
}

/** Mélange de Fisher-Yates (copie). */
export function melanger(tab, alea) {
  const t = tab.slice();
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/**
 * Coordonnées approchées des 18 centrales en exploitation (précision : la commune).
 * Suffisant pour calibrer le barème ; les coordonnées précises viendront de data/sites.json (phase 1).
 */
export const CENTRALES = {
  belleville: { nom: 'Belleville', lat: 47.51, lon: 2.875 },
  blayais: { nom: 'Blayais', lat: 45.256, lon: -0.693 },
  bugey: { nom: 'Bugey', lat: 45.798, lon: 5.271 },
  cattenom: { nom: 'Cattenom', lat: 49.416, lon: 6.218 },
  chinon: { nom: 'Chinon', lat: 47.23, lon: 0.17 },
  chooz: { nom: 'Chooz', lat: 50.09, lon: 4.789 },
  civaux: { nom: 'Civaux', lat: 46.457, lon: 0.653 },
  cruas: { nom: 'Cruas', lat: 44.633, lon: 4.757 },
  dampierre: { nom: 'Dampierre', lat: 47.733, lon: 2.517 },
  flamanville: { nom: 'Flamanville', lat: 49.536, lon: -1.882 },
  golfech: { nom: 'Golfech', lat: 44.107, lon: 0.845 },
  gravelines: { nom: 'Gravelines', lat: 51.015, lon: 2.136 },
  nogent: { nom: 'Nogent', lat: 48.515, lon: 3.518 },
  paluel: { nom: 'Paluel', lat: 49.858, lon: 0.636 },
  penly: { nom: 'Penly', lat: 49.977, lon: 1.212 },
  saintalban: { nom: 'Saint-Alban', lat: 45.404, lon: 4.755 },
  saintlaurent: { nom: 'Saint-Laurent', lat: 47.72, lon: 1.578 },
  tricastin: { nom: 'Tricastin', lat: 44.33, lon: 4.732 },
};

/** Distance orthodromique en km (formule de haversine). */
export function distanceKm(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Quantile d'un tableau de nombres. */
export function quantile(valeurs, q) {
  const t = valeurs.slice().sort((x, y) => x - y);
  const pos = (t.length - 1) * q;
  const i = Math.floor(pos);
  return i + 1 < t.length ? t[i] + (t[i + 1] - t[i]) * (pos - i) : t[i];
}

export const moyenne = (t) => t.reduce((s, x) => s + x, 0) / t.length;

/** Affiche un tableau aligné (première ligne = en-têtes). */
export function afficherTable(lignes) {
  const largeurs = lignes[0].map((_, j) => Math.max(...lignes.map((l) => String(l[j]).length)));
  const fmt = (l) => l.map((c, j) => (j === 0 ? String(c).padEnd(largeurs[j]) : String(c).padStart(largeurs[j]))).join('  ');
  console.log(fmt(lignes[0]));
  console.log(largeurs.map((w) => '-'.repeat(w)).join('  '));
  for (const l of lignes.slice(1)) console.log(fmt(l));
}

export function titre(texte) {
  console.log('\n' + '='.repeat(texte.length));
  console.log(texte);
  console.log('='.repeat(texte.length));
}
