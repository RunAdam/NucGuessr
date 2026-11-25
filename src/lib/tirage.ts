/**
 * Tirage des rounds d'une partie (décision 0.1 « rotation par site », filtre de difficulté 2.1).
 *
 * 1. On tire au hasard `nbRounds` sites tous différents, uniformément parmi les sites qui ont au moins
 *    une photo (aucun site deux fois dans une partie).
 * 2. Pour chaque site, on ne garde que les photos acceptées par le mode (`photosTirables`, avec repli
 *    sur toutes les photos du site), puis on prend celle vue il y a le plus longtemps : une photo jamais
 *    vue passe en priorité, les égalités sont départagées au hasard.
 *
 * Logique pure : le hasard et l'historique sont passés en paramètres.
 */
import { photosTirables } from '../config';
import { entierAuHasard, melanger, type Aleatoire } from './hasard';
import type { FiltrePhotos } from './types';

/**
 * Historique local des photos vues : identifiant de photo → numéro de la dernière partie où elle a été
 * vue (tous modes confondus). Une photo absente n'a jamais été vue.
 */
export type HistoriquePhotos = Readonly<Record<string, number>>;

/** Ce dont le tirage a besoin d'un site et d'une photo (les vrais types en ont davantage). */
export interface SiteTirable {
  id: string;
}
export interface PhotoTirable {
  id: string;
  site_id: string;
  difficulte: number;
}

/** Un round tiré : le site à deviner et la photo qui le montre. */
export interface RoundTire<S extends SiteTirable = SiteTirable, P extends PhotoTirable = PhotoTirable> {
  site: S;
  photo: P;
}

export interface OptionsTirage<S extends SiteTirable, P extends PhotoTirable> {
  sites: readonly S[];
  photos: readonly P[];
  /** Nombre de rounds voulu ; réduit au nombre de sites disponibles s'il n'y en a pas assez. */
  nbRounds: number;
  /** Filtre de difficulté du mode (voir `photosTirables` dans src/config.ts). */
  filtre: FiltrePhotos;
  historique: HistoriquePhotos;
  aleatoire: Aleatoire;
}

/** Tire les rounds d'une partie. Ne bloque jamais : au pire, la partie a moins de rounds que demandé. */
export function tirerRounds<S extends SiteTirable, P extends PhotoTirable>(o: OptionsTirage<S, P>): RoundTire<S, P>[] {
  const photosParSite = new Map<string, P[]>();
  for (const photo of o.photos) {
    const liste = photosParSite.get(photo.site_id);
    if (liste) liste.push(photo);
    else photosParSite.set(photo.site_id, [photo]);
  }
  const sitesJouables = o.sites.filter((s) => photosParSite.has(s.id));
  const sitesTires = melanger(sitesJouables, o.aleatoire).slice(0, Math.max(0, o.nbRounds));
  return sitesTires.map((site) => {
    const candidates = photosTirables(photosParSite.get(site.id) ?? [], o.filtre);
    return { site, photo: choisirPhoto(candidates, o.historique, o.aleatoire) };
  });
}

/**
 * La photo vue il y a le plus longtemps parmi `candidates` (jamais vue en priorité, égalités au hasard).
 * `candidates` ne doit pas être vide.
 */
export function choisirPhoto<P extends PhotoTirable>(
  candidates: readonly P[],
  historique: HistoriquePhotos,
  aleatoire: Aleatoire,
): P {
  if (candidates.length === 0) throw new Error('Aucune photo candidate pour ce site');
  const vue = (p: P) => historique[p.id] ?? Number.NEGATIVE_INFINITY;
  const plusAncienne = Math.min(...candidates.map(vue));
  const exAequo = candidates.filter((p) => vue(p) === plusAncienne);
  return exAequo[entierAuHasard(exAequo.length, aleatoire)] as P;
}

/** Historique mis à jour : la photo `photoId` a été vue pendant la partie `numeroPartie`. */
export function marquerPhotoVue(historique: HistoriquePhotos, photoId: string, numeroPartie: number): HistoriquePhotos {
  return { ...historique, [photoId]: numeroPartie };
}
