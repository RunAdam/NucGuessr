// Phase 6 — Fond de carte du mode Distance, construit à partir de Natural Earth (domaine public).
//
// Télécharge les sources officielles (Natural Earth 10m, version figée), garde la France métropolitaine
// (Corse comprise) et ses voisins proches, les fleuves voulus et quelques villes, simplifie avec mapshaper
// (version figée) et écrit un TopoJSON compact : src/modes/distance/geo/france.topo.json.
// Aucune géométrie n'est saisie à la main : tout vient des fichiers téléchargés.
//
// Lancer (Node ≥ 22, accès réseau) : node scripts/geo/construire-carte.mjs
// Options : --dossier <chemin>  dossier des téléchargements bruts (par défaut : <tmp>/nucguessr-geo, hors du dépôt)
//           --forcer            retélécharger même si les fichiers sont déjà là
// Documentation (sources, licences, attributions, choix des couches) : docs/CARTE.md

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// -----------------------------------------------------------------------------
// Réglages
// -----------------------------------------------------------------------------

/** Version de Natural Earth (dépôt GitHub nvkelso/natural-earth-vector, étiquette figée). */
const NATURAL_EARTH_VERSION = 'v5.1.2';
const NATURAL_EARTH_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_VERSION}/geojson`;

/** Version de mapshaper (figée pour que le fichier produit soit reproductible). */
const MAPSHAPER = 'mapshaper@0.7.101';

const SOURCES = {
  pays: 'ne_10m_admin_0_countries',
  fleuves: 'ne_10m_rivers_lake_centerlines',
  fleuvesEurope: 'ne_10m_rivers_europe',
  villes: 'ne_10m_populated_places_simple',
};

/** Cadre de la carte (lon min, lat min, lon max, lat max) : la métropole, la Corse et une marge de voisins. */
const CADRE = [-9.5, 40.4, 13.5, 52.4];

/** Pays dessinés (code ADM0_A3 de Natural Earth). FRA est découpé par le cadre : l'outre-mer disparaît. */
const PAYS = ['FRA', 'BEL', 'LUX', 'DEU', 'CHE', 'ITA', 'ESP', 'AND', 'MCO', 'GBR', 'NLD', 'JEY', 'GGY', 'LIE', 'AUT'];

/**
 * Fleuves gardés : nom dans Natural Earth → [nom affiché, niveau].
 * Niveau 1 : les grands fleuves (toujours affichés). Niveau 2 : les affluents, affichés à partir d'un zoom
 * (seuil réglable dans src/config.ts). « Sane » est l'orthographe de la Saône dans le fichier de 2022.
 */
const FLEUVES = {
  Loire: ['Loire', 1],
  'Rhône': ['Rhône', 1],
  Seine: ['Seine', 1],
  Garonne: ['Garonne', 1],
  Maas: ['Meuse', 1],
  Mosel: ['Moselle', 1],
  Vienne: ['Vienne', 1],
  Rhin: ['Rhin', 1],
  Rhine: ['Rhin', 1],
  Rhein: ['Rhin', 1],
  Dordogne: ['Dordogne', 2],
  'Saône': ['Saône', 2],
  Sane: ['Saône', 2],
  Marne: ['Marne', 2],
  Yonne: ['Yonne', 2],
  Durance: ['Durance', 2],
  Doubs: ['Doubs', 2],
  Tarn: ['Tarn', 2],
  Lot: ['Lot', 2],
  Allier: ['Allier', 2],
  Cher: ['Cher', 2],
  Creuse: ['Creuse', 2],
  Charente: ['Charente', 2],
  Somme: ['Somme', 2],
  Sarthe: ['Sarthe', 2],
  Mayenne: ['Mayenne', 2],
  Vilaine: ['Vilaine', 2],
  Adour: ['Adour', 2],
  Aude: ['Aude', 2],
  Aube: ['Aube', 2],
  Eure: ['Eure', 2],
  Sarre: ['Sarre', 2],
  'Ariège': ['Ariège', 2],
};

/** Villes repères : préfectures de région et grandes villes. Niveau 1 : toujours ; niveau 2 : en zoomant. */
const VILLES_NIVEAU_1 = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Toulouse', 'Bordeaux', 'Nantes', 'Strasbourg'];
const VILLES_NIVEAU_2 = [
  'Nice', 'Rouen', 'Metz', 'Grenoble', 'Montpellier', 'Rennes', 'Dijon', 'Orléans', 'Clermont-Ferrand',
  'Tours', 'Reims', 'Caen', 'Limoges', 'Brest', 'Poitier', 'Besançon', 'Amiens', 'Ajaccio', 'Le Havre', 'Perpignan',
];
/** Corrections d'orthographe des noms Natural Earth (noms seulement, jamais les positions). */
const NOMS_CORRIGES = { Poitier: 'Poitiers' };

/** Simplification (mapshaper, Visvalingam pondéré) : écart toléré en mètres. Voir docs/CARTE.md. */
const SIMPLIFICATION_M = 600;
/** Quantification du TopoJSON (nombre de pas par axe). */
const QUANTIFICATION = 1e5;

// -----------------------------------------------------------------------------

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sortie = path.join(racine, 'src/modes/distance/geo/france.topo.json');
const args = process.argv.slice(2);
const iDossier = args.indexOf('--dossier');
const dossier = iDossier >= 0 ? path.resolve(args[iDossier + 1]) : path.join(os.tmpdir(), 'nucguessr-geo');
const forcer = args.includes('--forcer');

if (dossier.startsWith(racine + path.sep)) {
  console.error(`Le dossier des téléchargements doit être hors du dépôt : ${dossier}`);
  process.exit(1);
}
fs.mkdirSync(dossier, { recursive: true });

async function telecharger(nom) {
  const fichier = path.join(dossier, `${nom}.geojson`);
  if (!forcer && fs.existsSync(fichier) && fs.statSync(fichier).size > 0) return fichier;
  const url = `${NATURAL_EARTH_URL}/${nom}.geojson`;
  console.log(`Téléchargement ${url}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Échec du téléchargement (${r.status}) : ${url}`);
  fs.writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
  return fichier;
}

const lire = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const ecrire = (nom, collection) => {
  const f = path.join(dossier, nom);
  fs.writeFileSync(f, JSON.stringify(collection));
  return f;
};
const dansCadre = ([lon, lat]) => lon >= CADRE[0] && lon <= CADRE[2] && lat >= CADRE[1] && lat <= CADRE[3];

// 1. Téléchargements
const brut = {};
for (const [cle, nom] of Object.entries(SOURCES)) brut[cle] = await telecharger(nom);

// 2. Pays : seulement les propriétés utiles (code du pays)
const pays = lire(brut.pays);
const fPays = ecrire('pays.json', {
  type: 'FeatureCollection',
  features: pays.features
    .filter((f) => PAYS.includes(f.properties.ADM0_A3))
    .map((f) => ({ type: 'Feature', properties: { id: f.properties.ADM0_A3 }, geometry: f.geometry })),
});

// 3. Fleuves : les deux fichiers Natural Earth (le second complète le premier en Europe), sans les lignes
//    traversant les lacs (« Lake Centerline »).
const fleuves = [];
for (const f of [...lire(brut.fleuves).features, ...lire(brut.fleuvesEurope).features]) {
  const def = FLEUVES[f.properties.name];
  if (!def || !f.geometry || f.properties.featurecla !== 'River') continue;
  const lignes = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  if (!lignes.some((l) => l.some(dansCadre))) continue;
  fleuves.push({ type: 'Feature', properties: { nom: def[0], niveau: def[1] }, geometry: f.geometry });
}
const fFleuves = ecrire('fleuves.json', { type: 'FeatureCollection', features: fleuves });

// 4. Villes repères (France métropolitaine seulement)
const villes = lire(brut.villes)
  .features.filter((f) => f.properties.adm0_a3 === 'FRA' && dansCadre(f.geometry.coordinates))
  .flatMap((f) => {
    const n = f.properties.name;
    const niveau = VILLES_NIVEAU_1.includes(n) ? 1 : VILLES_NIVEAU_2.includes(n) ? 2 : 0;
    if (!niveau) return [];
    return [{ type: 'Feature', properties: { nom: NOMS_CORRIGES[n] ?? n, niveau }, geometry: f.geometry }];
  });
const manquantes = [...VILLES_NIVEAU_1, ...VILLES_NIVEAU_2].filter(
  (n) => !villes.some((v) => v.properties.nom === (NOMS_CORRIGES[n] ?? n)),
);
if (manquantes.length) console.warn(`Villes absentes de Natural Earth : ${manquantes.join(', ')}`);
const fVilles = ecrire('villes.json', { type: 'FeatureCollection', features: villes });

// 5. mapshaper : découpe au cadre, simplification, TopoJSON quantifié
fs.mkdirSync(path.dirname(sortie), { recursive: true });
const commande = [
  '--yes', MAPSHAPER,
  '-i', fPays, fFleuves, fVilles, 'combine-files',
  '-clip', `bbox=${CADRE.join(',')}`, 'target=pays,fleuves',
  '-simplify', `interval=${SIMPLIFICATION_M}`, 'keep-shapes', 'target=pays,fleuves',
  '-filter-slivers', 'min-area=4km2', 'target=pays',
  '-o', sortie, 'format=topojson', `quantization=${QUANTIFICATION}`, 'target=*',
];
console.log(`npx ${commande.slice(1).join(' ')}`);
// Une seule ligne de commande passée au shell (npx est un script sous Windows) : arguments entre guillemets.
const ligne = ['npx', ...commande].map((a) => (/[\s"]/.test(a) ? `"${a}"` : a)).join(' ');
execSync(ligne, { stdio: 'inherit' });

// 6. Bilan
const topo = lire(sortie);
const nbPoints = topo.arcs.reduce((s, a) => s + a.length, 0);
console.log(
  `Écrit ${path.relative(racine, sortie)} : ${(fs.statSync(sortie).size / 1024).toFixed(1)} Ko, ` +
    `${topo.arcs.length} arcs, ${nbPoints} points, couches : ${Object.keys(topo.objects).join(', ')}`,
);
