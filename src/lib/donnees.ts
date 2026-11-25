/**
 * Données du jeu, importées au build depuis data/ (aucune requête réseau supplémentaire).
 * Leur conformité aux schémas est vérifiée par `npm run validate:data`, d'où les conversions de type.
 */
import photosJson from '../../data/photos.json';
import sitesJson from '../../data/sites.json';
import type { Photo, Site } from './types';

export const SITES: readonly Site[] = sitesJson as unknown as Site[];

export const PHOTOS: readonly Photo[] = (photosJson as unknown as { photos: Photo[] }).photos;

const parId = new Map(SITES.map((s) => [s.id, s]));

/** Le site d'identifiant `id` (erreur si l'identifiant est inconnu : données incohérentes). */
export function siteParId(id: string): Site {
  const site = parId.get(id);
  if (!site) throw new Error(`Site inconnu : ${id}`);
  return site;
}
