/**
 * Projection de la carte et conversions écran ↔ latitude/longitude (d3-geo, chargé avec la carte seulement).
 * Testé dans tests/distance/ (aller-retour de projection).
 */
import { geoConicConformal, type GeoProjection } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import type { LatLon, Transformation } from './geo';

/**
 * Projection de la carte : conique conforme de Lambert (parallèles 44° et 49°, méridien 3° E, comme le
 * Lambert-93 de l'IGN), ajustée pour que `cadre` (la France) tienne dans `largeur` × `hauteur` avec `marge`.
 */
export function creerProjection(
  largeur: number,
  hauteur: number,
  cadre: Feature<Geometry> | Geometry,
  marge = 12,
): GeoProjection {
  return geoConicConformal()
    .parallels([44, 49])
    .rotate([-3, 0])
    .fitExtent(
      [
        [marge, marge],
        [Math.max(marge + 1, largeur - marge), Math.max(marge + 1, hauteur - marge)],
      ],
      cadre,
    );
}

/** Point géographique → pixel à l'écran (après zoom). */
export function versEcran(projection: GeoProjection, t: Transformation, p: LatLon): [number, number] {
  const [x, y] = projection([p.lon, p.lat]) ?? [Number.NaN, Number.NaN];
  return [x * t.k + t.x, y * t.k + t.y];
}

/** Pixel à l'écran (après zoom) → point géographique. */
export function depuisEcran(projection: GeoProjection, t: Transformation, x: number, y: number): LatLon {
  const [lon, lat] = projection.invert?.([(x - t.x) / t.k, (y - t.y) / t.k]) ?? [Number.NaN, Number.NaN];
  return { lat, lon };
}
