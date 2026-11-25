/**
 * Logique pure du mode Distance (sans DOM ni d3, testée dans tests/distance/) : distance du grand cercle,
 * recadrage, mise en forme des distances. Ce module est dans le bundle principal ; la projection (d3-geo)
 * est dans projection.ts, chargé avec la carte.
 */
import { DISTANCE_PRES_DE_KM, DISTANCE_RAYON_TERRE_KM } from '../../config';
import { formaterDecimal, formaterEntier, INSECABLE } from '../../lib/format';

/** Un point géographique, en degrés décimaux (WGS 84). */
export interface LatLon {
  lat: number;
  lon: number;
}

/** Transformation de zoom (même forme que `ZoomTransform` de d3-zoom) : écran = k × projeté + (x, y). */
export interface Transformation {
  k: number;
  x: number;
  y: number;
}

/** Une proposition du joueur et la vraie position, reliées par un trait sur la carte. */
export interface Paire {
  proposition: LatLon;
  reponse: LatLon;
  distanceKm: number;
  /** Numéro affiché à côté de la réponse (carte récapitulative). */
  numero?: number;
}

export const IDENTITE: Transformation = { k: 1, x: 0, y: 0 };

const RAD = Math.PI / 180;

/** Distance du grand cercle entre deux points, en km (formule de haversine, sphère de rayon `DISTANCE_RAYON_TERRE_KM`). */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * DISTANCE_RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Transformation qui cadre des points (déjà projetés, sans zoom) dans `largeur` × `hauteur` avec `marge`,
 * au zoom `kMax` au plus (et `kMin` au moins).
 */
export function cadrer(
  points: readonly (readonly [number, number])[],
  largeur: number,
  hauteur: number,
  marge: number,
  kMin: number,
  kMax: number,
): Transformation {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const utileL = Math.max(1, largeur - 2 * marge);
  const utileH = Math.max(1, hauteur - 2 * marge);
  const k = Math.min(
    kMax,
    Math.max(kMin, Math.min(utileL / Math.max(x1 - x0, 1e-9), utileH / Math.max(y1 - y0, 1e-9))),
  );
  return { k, x: largeur / 2 - k * ((x0 + x1) / 2), y: hauteur / 2 - k * ((y0 + y1) / 2) };
}

/** « 4,2 km » sous 10 km, « 34 km » au-delà, « 1 024 km ». */
export function formaterDistance(km: number): string {
  return km < 10 ? `${formaterDecimal(km)}${INSECABLE}km` : `${formaterEntier(km)}${INSECABLE}km`;
}

/** Réponse du joueur en clair pour le compte rendu : « Près de Cruas » (centrale la plus proche du repère), sinon « Loin des centrales ». */
export function decrireRepere(repere: LatLon, sites: readonly (LatLon & { nom_court: string })[]): string {
  let meilleur: { nom: string; d: number } | null = null;
  for (const s of sites) {
    const d = distanceKm(repere, s);
    if (!meilleur || d < meilleur.d) meilleur = { nom: s.nom_court, d };
  }
  return meilleur && meilleur.d <= DISTANCE_PRES_DE_KM ? `Près de ${meilleur.nom}` : 'Loin des centrales';
}
