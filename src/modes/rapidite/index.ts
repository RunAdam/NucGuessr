/**
 * Mode Rapidité (phase 5, mode par défaut) : 8 rounds, 20 s pour taper le nom du site.
 *
 * - RoundRapidite.svelte : écran d'un round (photo, chrono et barre de temps, saisie avec
 *   autocomplétion, essais barrés, réponse) ;
 * - recherche.ts : normalisation des noms et autocomplétion (logique pure) ;
 * - chrono.ts : temps restant, pénalités, arrière-plan (logique pure, horloge injectée) ;
 * - mesures.ts : colonnes et mesures du compte rendu.
 * Réglages : section « Mode Rapidité » de src/config.ts ; choix et tests : docs/DECISIONS.md (phase 5).
 */
import {
  RAPIDITE_DELAI_ANTIREBOND_MS,
  RAPIDITE_DELAI_APRES_BONNE_MS,
  RAPIDITE_DELAI_APRES_PERDU_MS,
  RAPIDITE_DUREE_MS,
  RAPIDITE_ROUNDS,
  RAPIDITE_SCORE_MAX,
} from '../../config';
import { definirMode } from '../types';
import { COLONNES_RAPIDITE, mesuresRapidite, type DetailRapidite } from './mesures';
import RoundRapidite from './RoundRapidite.svelte';

export type { DetailRapidite } from './mesures';

export default definirMode<DetailRapidite>({
  id: 'rapidite',
  nom: 'Rapidité',
  resume: `${RAPIDITE_ROUNDS} rounds, ${RAPIDITE_DUREE_MS / 1000} s pour taper le nom du site`,
  nbRounds: RAPIDITE_ROUNDS,
  scoreMaxRound: RAPIDITE_SCORE_MAX,
  filtrePhotos: 'rapidite',
  delaiReponseMs: (r) => (r.statut === 'juste' ? RAPIDITE_DELAI_APRES_BONNE_MS : RAPIDITE_DELAI_APRES_PERDU_MS),
  antiRebondMs: RAPIDITE_DELAI_ANTIREBOND_MS,
  passerAuTap: true,
  Round: RoundRapidite,
  colonnesRecap: COLONNES_RAPIDITE,
  mesures: mesuresRapidite,
});
