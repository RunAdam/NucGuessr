/**
 * Mode Distance (phase 6) : point d'entrée, déjà branché dans le registre et la navigation (`#/distance`).
 *
 * État actuel : écran provisoire « en construction » (RoundDistance.svelte). Pour construire le mode,
 * ne modifier que ce dossier (et tests/distance/, et sa section de src/config.ts) : remplacer
 * RoundDistance.svelte, définir le type du détail d'un round, remplir `colonnesRecap` et `mesures`,
 * ajouter si besoin un composant `Recap` (carte récapitulative), puis retirer `enConstruction`.
 * Interface : src/modes/types.ts ; exemple complet : src/modes/factice/ ; vue d'ensemble : docs/ARCHITECTURE.md.
 */
import { DISTANCE_ROUNDS, DISTANCE_SCORE_MAX, RAPIDITE_DELAI_ANTIREBOND_MS } from '../../config';
import { definirMode } from '../types';
import RoundDistance from './RoundDistance.svelte';

export default definirMode<null>({
  id: 'distance',
  nom: 'Distance',
  resume: `${DISTANCE_ROUNDS} rounds, placer le site sur la carte de France`,
  nbRounds: DISTANCE_ROUNDS,
  scoreMaxRound: DISTANCE_SCORE_MAX,
  filtrePhotos: 'distance',
  // Pas de délai : le joueur regarde la carte de la réponse aussi longtemps qu'il veut.
  delaiReponseMs: () => null,
  // Anti-rebond de l'`Entrée` qui valide la proposition (même valeur que le mode Rapidité, à régler en phase 6).
  antiRebondMs: RAPIDITE_DELAI_ANTIREBOND_MS,
  // En phase réponse, le joueur peut encore déplacer ou zoomer la carte : un clic ne doit pas passer.
  passerAuTap: false,
  Round: RoundDistance,
  colonnesRecap: [],
  mesures: () => [],
  enConstruction: true,
});
