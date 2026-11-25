/**
 * Validation des données du jeu (phase 1) : `npm run validate:data`.
 *
 * - data/sites.json contre data/schema/sites.schema.json, plus les règles que le schéma ne peut pas exprimer
 *   (liste des identifiants, unicité des alias normalisés, cohérence des réacteurs, distances entre sites) ;
 * - data/photos.json contre data/schema/photos.schema.json, si ces fichiers existent (phase 2).
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const racine = fileURLToPath(new URL('../../', import.meta.url));
const chemin = (p: string) => racine + p;
const lireJson = (p: string) => JSON.parse(readFileSync(chemin(p), 'utf-8'));

/** Identifiants imposés, partagés avec data/photos.json (ne pas changer). */
const IDS_ATTENDUS = [
  'belleville', 'blayais', 'bugey', 'cattenom', 'chinon', 'chooz', 'civaux', 'cruas', 'dampierre',
  'flamanville', 'golfech', 'gravelines', 'nogent', 'paluel', 'penly', 'saint-alban', 'saint-laurent', 'tricastin',
];

/** Distance minimale plausible entre deux centrales (la plus courte réelle est ≈ 34 km, Cruas–Tricastin). */
const DISTANCE_MIN_KM = 20;

interface Tranche { nom: string; palier: string; puissance_mwe: number; couplage: number }
interface Site {
  id: string; nom_complet: string; nom_court: string; alias: string[];
  lat: number; lon: number; mise_en_service: number;
  reacteurs: { nombre: number; tranches: Tranche[] };
  verification: { statut: 'A_VERIFIER' | 'VERIFIE'; champs: string[]; notes: string; sources: string[] };
}

/** Même normalisation que l'autocomplétion (phase 5) : minuscules, sans accents, tirets/apostrophes → espaces. */
function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’‐–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** `strict` : mode strict d'Ajv (activé pour nos schémas, relâché pour ceux maintenus par d'autres phases). */
function validateur(schema: { $schema?: string }, strict = true) {
  const options = { allErrors: true, strict };
  const ajv = schema.$schema?.includes('2020-12') ? new Ajv2020(options) : new Ajv(options);
  addFormats(ajv);
  return ajv.compile(schema);
}

function erreurs(valider: ReturnType<typeof validateur>): string {
  return (valider.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`).join('\n');
}

const sites: Site[] = lireJson('data/sites.json');

describe('data/sites.json', () => {
  it('est conforme au schéma', () => {
    const valider = validateur(lireJson('data/schema/sites.schema.json'));
    const ok = valider(sites);
    expect(ok, erreurs(valider)).toBe(true);
  });

  it('contient exactement les 18 centrales attendues, ids uniques', () => {
    const ids = sites.map((s) => s.id);
    expect(ids).toHaveLength(18);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...IDS_ATTENDUS].sort());
  });

  it('aucun nom ni alias (normalisé) ne désigne deux sites', () => {
    const proprietaire = new Map<string, string>();
    const conflits: string[] = [];
    for (const s of sites) {
      const noms = new Set([s.nom_court, s.nom_complet, ...s.alias].map(normaliser));
      for (const n of noms) {
        const autre = proprietaire.get(n);
        if (autre && autre !== s.id) conflits.push(`« ${n} » : ${autre} et ${s.id}`);
        proprietaire.set(n, s.id);
      }
    }
    expect(conflits).toEqual([]);
  });

  it("aucun alias ne répète le nom court ou le nom complet de son propre site", () => {
    const doublons = sites.flatMap((s) =>
      s.alias
        .filter((a) => [s.nom_court, s.nom_complet].map(normaliser).includes(normaliser(a)))
        .map((a) => `${s.id} : ${a}`),
    );
    expect(doublons).toEqual([]);
  });

  it('les réacteurs et la date de mise en service sont cohérents', () => {
    for (const s of sites) {
      const { nombre, tranches } = s.reacteurs;
      expect(tranches, s.id).toHaveLength(nombre);
      expect(new Set(tranches.map((t) => t.nom)).size, s.id).toBe(nombre);
      expect(s.mise_en_service, `${s.id} : mise_en_service = premier couplage`).toBe(
        Math.min(...tranches.map((t) => t.couplage)),
      );
    }
  });

  it('compte 57 réacteurs en exploitation (56 + Flamanville 3)', () => {
    expect(sites.reduce((n, s) => n + s.reacteurs.nombre, 0)).toBe(57);
  });

  it('la vérification est cohérente (date de couplage à vérifier ⇒ mise en service aussi)', () => {
    for (const s of sites) {
      const c = s.verification.champs;
      if (c.includes('reacteurs.tranches.couplage')) expect(c, s.id).toContain('mise_en_service');
    }
  });

  it(`aucune paire de sites à moins de ${DISTANCE_MIN_KM} km (erreur grossière de coordonnées)`, () => {
    const tropProches: string[] = [];
    for (let i = 0; i < sites.length; i++) {
      for (let j = i + 1; j < sites.length; j++) {
        const d = distanceKm(sites[i], sites[j]);
        if (d < DISTANCE_MIN_KM) tropProches.push(`${sites[i].id}–${sites[j].id} : ${d.toFixed(1)} km`);
      }
    }
    expect(tropProches).toEqual([]);
  });
});

const photosPresentes = existsSync(chemin('data/photos.json')) && existsSync(chemin('data/schema/photos.schema.json'));

describe('data/photos.json', () => {
  const lirePhotos = (): { site_id: string }[] => {
    const brut = lireJson('data/photos.json');
    return Array.isArray(brut) ? brut : (brut.photos ?? []);
  };

  it.skipIf(!photosPresentes)('est conforme au schéma', () => {
    const valider = validateur(lireJson('data/schema/photos.schema.json'), false);
    const ok = valider(lireJson('data/photos.json'));
    expect(ok, erreurs(valider)).toBe(true);
  });

  it.skipIf(!photosPresentes)('chaque site_id existe dans data/sites.json', () => {
    const ids = new Set(sites.map((s) => s.id));
    const inconnus = lirePhotos().map((p) => p.site_id).filter((id) => !ids.has(id));
    expect(inconnus).toEqual([]);
  });
});
