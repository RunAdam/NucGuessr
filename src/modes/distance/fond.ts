/**
 * Fond de carte du mode Distance : couches GeoJSON tirées du TopoJSON construit par
 * scripts/geo/construire-carte.mjs (Natural Earth, domaine public ; voir docs/CARTE.md).
 * Ce module (et le fichier de géométrie) n'est chargé qu'avec la carte, pas sur l'accueil.
 * Il ne contient AUCUNE position de centrale : la réponse n'est connue que par le round.
 */
import type { Feature, FeatureCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import donnees from './geo/france.topo.json';

type Pays = Feature<Polygon | MultiPolygon, { id: string }>;
type Fleuve = Feature<LineString | MultiLineString, { nom: string; niveau: number }>;
type Ville = Feature<Point, { nom: string; niveau: number }>;

const topo = donnees as unknown as Topology<{
  pays: GeometryCollection<{ id: string }>;
  fleuves: GeometryCollection<{ nom: string; niveau: number }>;
  villes: GeometryCollection<{ nom: string; niveau: number }>;
}>;

const pays = (feature(topo, topo.objects.pays) as FeatureCollection<Polygon | MultiPolygon, { id: string }>)
  .features as Pays[];

/** La France métropolitaine (Corse comprise). */
export const FRANCE = pays.find((p) => p.properties.id === 'FRA') as Pays;

/** Les pays voisins (aplat seul, sans contour : le cadre de la carte les coupe). */
export const VOISINS: Pays[] = pays.filter((p) => p.properties.id !== 'FRA');

const idPays = (g: { properties?: unknown }) => (g.properties as { id?: string } | undefined)?.id;

/** Frontières terrestres entre deux pays voisins (celles de la France sont tracées avec son contour). */
export const FRONTIERES_VOISINS = mesh(
  topo,
  topo.objects.pays,
  (a, b) => a !== b && idPays(a) !== 'FRA' && idPays(b) !== 'FRA',
);

export const FLEUVES = (feature(topo, topo.objects.fleuves) as FeatureCollection<LineString | MultiLineString>)
  .features as Fleuve[];

export const VILLES = (feature(topo, topo.objects.villes) as FeatureCollection<Point>).features as Ville[];
