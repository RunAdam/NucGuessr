/**
 * Photos dans le navigateur : adresse, préchargement, et « afficher puis signaler qu'elle est visible ».
 *
 * Décision 2.2 : on précharge `PHOTOS_PRECHARGEMENT_AVANCE` rounds d'avance (2), dès l'écran d'accueil ;
 * pas d'aperçu flou. Le chronomètre d'un round ne démarre qu'une fois la photo réellement affichée :
 * voir `attendreDecodage` et `attendrePeinture`, utilisés par src/composants/PhotoRound.svelte.
 */
import { PHOTOS_DOSSIER, PHOTOS_PRECHARGEMENT_AVANCE } from '../config';
import type { Photo } from '../lib/types';

/** Adresse d'une photo, relative à la racine du site publié (fonctionne avec `base: './'`). */
export function urlPhoto(photo: Pick<Photo, 'fichier'>): string {
  return `${import.meta.env.BASE_URL}${PHOTOS_DOSSIER}${photo.fichier}`;
}

/**
 * Images en cours de préchargement ou préchargées, par adresse. On garde une référence pour que le
 * navigateur ne les abandonne pas ; `img.decode()` les décode aussi à l'avance (affichage instantané).
 */
const cache = new Map<string, HTMLImageElement>();

/** Lance le téléchargement et le décodage d'une photo, sans l'afficher. Sans effet si c'est déjà fait. */
export function prechargerPhoto(photo: Pick<Photo, 'fichier'>, prioritaire = false): void {
  const url = urlPhoto(photo);
  if (cache.has(url) || typeof Image === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  img.fetchPriority = prioritaire ? 'high' : 'low';
  img.src = url;
  img.decode().catch(() => {
    // Échec (réseau) : on oublie l'image, l'affichage réessaiera normalement.
    cache.delete(url);
  });
  cache.set(url, img);
}

/**
 * Précharge la photo du round `index` (prioritaire) et celles des `avance` rounds suivants.
 * À appeler au lancement de la partie (index 0, ou dès l'accueil) puis au début de chaque round.
 */
export function prechargerRounds(
  rounds: readonly { photo: Pick<Photo, 'fichier'> }[],
  index: number,
  avance: number = PHOTOS_PRECHARGEMENT_AVANCE,
): void {
  for (let i = index; i <= index + avance && i < rounds.length; i++) {
    const round = rounds[i];
    if (round) prechargerPhoto(round.photo, i === index);
  }
}

/** Oublie les préchargements (ex. au changement de mode sur l'accueil). Les fichiers restent dans le cache HTTP. */
export function viderPrechargements(): void {
  cache.clear();
}

/**
 * Attend que l'image soit téléchargée et décodée (prête à être peinte sans délai).
 * @returns `false` si l'image n'a pas pu être chargée.
 */
export async function attendreDecodage(img: HTMLImageElement): Promise<boolean> {
  try {
    await img.decode();
    return true;
  } catch {
    // `decode()` peut échouer sur une image pourtant chargée (navigateurs anciens) : on vérifie.
    if (img.complete && img.naturalWidth > 0) return true;
    return new Promise((resolve) => {
      img.addEventListener('load', () => resolve(img.naturalWidth > 0), { once: true });
      img.addEventListener('error', () => resolve(false), { once: true });
    });
  }
}

/**
 * Attend que le navigateur ait peint l'écran après une modification du DOM (deux images d'animation :
 * la première précède la peinture, la seconde la suit). Après `attendrePeinture()`, ce qui a été rendu
 * visible est à l'écran : c'est le moment de démarrer le chronomètre.
 */
export function attendrePeinture(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
