/**
 * Mode Distance : distance du grand cercle (haversine), projection de la carte (aller-retour écran ↔ lat/lon),
 * recadrage, mise en forme, et cohérence avec le barème.
 */
import { describe, expect, it } from 'vitest';
import { DISTANCE_RAYON_TERRE_KM, DISTANCE_ZOOM_MAX, scoreDistance } from '../../src/config';
import { SITES, siteParId } from '../../src/lib/donnees';
import { FRANCE } from '../../src/modes/distance/fond';
import {
  cadrer,
  decrireRepere,
  distanceKm,
  formaterDistance,
  IDENTITE,
  type LatLon,
} from '../../src/modes/distance/geo';
import { creerProjection, depuisEcran, versEcran } from '../../src/modes/distance/projection';

const PARIS: LatLon = { lat: 48.8566, lon: 2.3522 };
const LYON: LatLon = { lat: 45.764, lon: 4.8357 };
const LONDRES: LatLon = { lat: 51.5074, lon: -0.1278 };

/** Loi des cosinus sphérique : formule indépendante, pour recouper la haversine. */
function loiDesCosinus(a: LatLon, b: LatLon): number {
  const r = Math.PI / 180;
  const c =
    Math.sin(a.lat * r) * Math.sin(b.lat * r) +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return DISTANCE_RAYON_TERRE_KM * Math.acos(Math.min(1, Math.max(-1, c)));
}

describe('distanceKm (haversine)', () => {
  it('vaut zéro pour un même point', () => {
    expect(distanceKm(PARIS, PARIS)).toBe(0);
  });

  it('est symétrique', () => {
    for (const a of SITES) for (const b of SITES) expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
  });

  it('donne les distances connues (à 0,5 % près de la valeur géodésique)', () => {
    expect(distanceKm(PARIS, LYON)).toBeGreaterThan(391.5 * 0.995);
    expect(distanceKm(PARIS, LYON)).toBeLessThan(391.5 * 1.005);
    expect(distanceKm(PARIS, LONDRES)).toBeGreaterThan(343.5 * 0.995);
    expect(distanceKm(PARIS, LONDRES)).toBeLessThan(343.5 * 1.005);
  });

  it('gère les grandes distances : quart de méridien et antipodes', () => {
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 90, lon: 0 })).toBeCloseTo((Math.PI / 2) * DISTANCE_RAYON_TERRE_KM, 6);
    expect(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(Math.PI * DISTANCE_RAYON_TERRE_KM, 6);
    expect(distanceKm({ lat: 45, lon: 10 }, { lat: -45, lon: -170 })).toBeCloseTo(Math.PI * DISTANCE_RAYON_TERRE_KM, 6);
  });

  it('un degré de latitude vaut environ 111,2 km', () => {
    expect(distanceKm({ lat: 46, lon: 2 }, { lat: 47, lon: 2 })).toBeCloseTo(111.195, 2);
  });

  it('recoupe la loi des cosinus entre toutes les paires de centrales (écart < 1 m)', () => {
    for (const a of SITES)
      for (const b of SITES) if (a !== b) expect(Math.abs(distanceKm(a, b) - loiDesCosinus(a, b))).toBeLessThan(0.001);
  });

  it('Cruas – Tricastin : environ 34 km, comme dans les règles (README)', () => {
    const d = distanceKm(siteParId('cruas'), siteParId('tricastin'));
    expect(d).toBeGreaterThan(33.5);
    expect(d).toBeLessThan(34.2);
    expect(scoreDistance(d)).toBeGreaterThan(3350);
    expect(scoreDistance(d)).toBeLessThan(3450);
  });

  it('reste précise à quelques mètres pour des distances courtes', () => {
    const a = siteParId('belleville');
    const b = { lat: a.lat + 0.001, lon: a.lon }; // ≈ 111 m
    expect(distanceKm(a, b)).toBeCloseTo(0.1112, 3);
  });
});

describe('projection de la carte', () => {
  for (const [l, h] of [
    [360, 420],
    [760, 640],
  ] as const) {
    const proj = creerProjection(l, h, FRANCE);

    it(`${l}×${h} : toutes les centrales sont dans la vue de départ`, () => {
      for (const s of SITES) {
        const [x, y] = versEcran(proj, IDENTITE, s);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(l);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(h);
      }
    });

    it(`${l}×${h} : aller-retour écran → lat/lon → écran, à tous les zooms`, () => {
      for (const t of [IDENTITE, { k: 3.7, x: -420, y: -150 }, { k: DISTANCE_ZOOM_MAX, x: -5000, y: -3000 }]) {
        for (const s of SITES) {
          const [x, y] = versEcran(proj, t, s);
          const p = depuisEcran(proj, t, x, y);
          expect(p.lat).toBeCloseTo(s.lat, 7);
          expect(p.lon).toBeCloseTo(s.lon, 7);
        }
        for (const [x, y] of [
          [0, 0],
          [l / 2, h / 2],
          [l, h],
        ] as const) {
          const [x2, y2] = versEcran(proj, t, depuisEcran(proj, t, x, y));
          expect(x2).toBeCloseTo(x, 6);
          expect(y2).toBeCloseTo(y, 6);
        }
      }
    });
  }

  it('au zoom maximal sur 360 px de large, un pixel fait moins de 200 m (on vise à 1-2 km près)', () => {
    const proj = creerProjection(360, 420, FRANCE);
    const t = { k: DISTANCE_ZOOM_MAX, x: 0, y: 0 };
    const a = depuisEcran(proj, t, 100, 100);
    const b = depuisEcran(proj, t, 140, 100); // largeur d'un doigt : 40 px
    expect(distanceKm(a, b)).toBeLessThan(8);
    expect(distanceKm(a, b) / 40).toBeLessThan(0.2);
  });
});

describe('cadrer', () => {
  it('centre les deux points et respecte le zoom maximal', () => {
    const t = cadrer(
      [
        [100, 100],
        [102, 101],
      ],
      400,
      300,
      40,
      1,
      8,
    );
    expect(t.k).toBe(8);
    expect(t.x + t.k * 101).toBeCloseTo(200);
    expect(t.y + t.k * 100.5).toBeCloseTo(150);
  });

  it('fait tenir des points éloignés avec la marge', () => {
    const t = cadrer(
      [
        [0, 0],
        [600, 100],
      ],
      400,
      300,
      40,
      0.1,
      8,
    );
    expect(t.k).toBeCloseTo(320 / 600);
    expect(t.x).toBeCloseTo(40);
  });
});

describe('mise en forme', () => {
  it('formaterDistance', () => {
    expect(formaterDistance(4.23)).toBe('4,2 km');
    expect(formaterDistance(34.4)).toBe('34 km');
    expect(formaterDistance(1024)).toBe('1 024 km');
  });

  it('decrireRepere : centrale la plus proche, ou loin de tout', () => {
    expect(decrireRepere({ lat: 44.6, lon: 4.76 }, SITES)).toBe('Près de Cruas');
    expect(decrireRepere({ lat: 43.3, lon: 5.4 }, SITES)).toBe('Loin des centrales');
  });
});
