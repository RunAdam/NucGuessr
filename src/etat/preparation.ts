/**
 * Préparation de la prochaine partie : tirage des rounds et préchargement des premières photos
 * AVANT que le joueur lance la partie (dès l'accueil, ou sur le compte rendu pour « Rejouer »).
 * Au lancement, la première photo est donc déjà dans le cache : le round 1 s'affiche sans attente.
 */
import { PHOTOS, SITES } from '../lib/donnees';
import { tirerRounds } from '../lib/tirage';
import type { DefinitionMode, RoundPartie } from '../modes/types';
import { prechargerRounds } from '../navigateur/photos';
import { profil } from './profil.svelte';

let prete: { modeId: string; rounds: RoundPartie[] } | null = null;

/** Tire une partie pour ce mode, précharge ses premières photos et la garde pour le prochain lancement. */
export function preparerPartie(mode: DefinitionMode): RoundPartie[] {
  const rounds = tirerRounds({
    sites: SITES,
    photos: PHOTOS,
    nbRounds: mode.nbRounds,
    filtre: mode.filtrePhotos,
    historique: profil.donnees.photosVues,
    aleatoire: Math.random,
  });
  prete = { modeId: mode.id, rounds };
  prechargerRounds(rounds, 0);
  return rounds;
}

/** Les rounds préparés pour ce mode (ou un nouveau tirage s'il n'y en a pas). Une préparation ne sert qu'une fois. */
export function prendrePartiePreparee(mode: DefinitionMode): RoundPartie[] {
  const rounds = prete?.modeId === mode.id ? prete.rounds : preparerPartie(mode);
  prete = null;
  return rounds;
}
