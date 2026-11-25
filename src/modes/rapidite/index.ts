/**
 * Mode Rapidité (phase 5) : point d'entrée, déjà branché dans le registre et la navigation (`#/rapidite`).
 *
 * État actuel : écran provisoire « en construction » (RoundRapidite.svelte). Pour construire le mode,
 * ne modifier que ce dossier (et tests/rapidite/, et sa section de src/config.ts) : remplacer
 * RoundRapidite.svelte, définir le type du détail d'un round, remplir `colonnesRecap` et `mesures`,
 * régler `delaiReponseMs`, puis retirer `enConstruction`. Interface : src/modes/types.ts ;
 * exemple complet : src/modes/factice/ ; vue d'ensemble : docs/ARCHITECTURE.md.
 */
import { RAPIDITE_DELAI_ANTIREBOND_MS, RAPIDITE_DUREE_MS, RAPIDITE_ROUNDS, RAPIDITE_SCORE_MAX } from '../../config';
import { definirMode } from '../types';
import RoundRapidite from './RoundRapidite.svelte';

export default definirMode<null>({
  id: 'rapidite',
  nom: 'Rapidité',
  resume: `${RAPIDITE_ROUNDS} rounds, ${RAPIDITE_DUREE_MS / 1000} s pour taper le nom du site`,
  nbRounds: RAPIDITE_ROUNDS,
  scoreMaxRound: RAPIDITE_SCORE_MAX,
  filtrePhotos: 'rapidite',
  // Phase 5 : RAPIDITE_DELAI_APRES_BONNE_MS / RAPIDITE_DELAI_APRES_PERDU_MS selon le résultat.
  delaiReponseMs: () => null,
  antiRebondMs: RAPIDITE_DELAI_ANTIREBOND_MS,
  passerAuTap: true,
  Round: RoundRapidite,
  colonnesRecap: [],
  mesures: () => [],
  enConstruction: true,
});
