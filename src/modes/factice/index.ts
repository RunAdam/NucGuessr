/**
 * Mode factice : démonstration du socle, jouable de bout en bout (tirage, préchargement, moteur,
 * écran réponse, compte rendu, persistance). Le joueur choisit le bon site parmi quelques boutons.
 * Sert d'exemple minimal pour écrire un mode (voir docs/ARCHITECTURE.md).
 */
import {
  FACTICE_NB_CHOIX,
  FACTICE_ROUNDS,
  RAPIDITE_DELAI_ANTIREBOND_MS,
  RAPIDITE_DELAI_APRES_BONNE_MS,
  RAPIDITE_DELAI_APRES_PERDU_MS,
  RAPIDITE_SCORE_MAX,
} from '../../config';
import { formaterSecondes } from '../../lib/format';
import { definirMode } from '../types';
import RoundFactice from './RoundFactice.svelte';

/** Détail d'un round du mode factice. */
export interface DetailFactice {
  /** Temps entre l'affichage de la photo et le choix. */
  tempsMs: number;
  /** Site choisi. */
  choixId: string;
}

export default definirMode<DetailFactice>({
  id: 'factice',
  nom: 'Démonstration',
  resume: `${FACTICE_ROUNDS} rounds, choisir le bon site parmi ${FACTICE_NB_CHOIX}`,
  nbRounds: FACTICE_ROUNDS,
  scoreMaxRound: RAPIDITE_SCORE_MAX,
  filtrePhotos: 'distance',
  delaiReponseMs: (r) => (r.statut === 'juste' ? RAPIDITE_DELAI_APRES_BONNE_MS : RAPIDITE_DELAI_APRES_PERDU_MS),
  antiRebondMs: RAPIDITE_DELAI_ANTIREBOND_MS,
  passerAuTap: true,
  Round: RoundFactice,
  colonnesRecap: [{ titre: 'Temps', valeur: (r) => formaterSecondes(r.detail.tempsMs), numerique: true }],
  mesures(resultats) {
    const justes = resultats.filter((r) => r.statut === 'juste').length;
    const moyenne = resultats.reduce((s, r) => s + r.detail.tempsMs, 0) / Math.max(1, resultats.length);
    return [
      { libelle: 'Temps moyen', valeur: formaterSecondes(moyenne) },
      { libelle: 'Justes', valeur: `${justes}/${resultats.length}` },
    ];
  },
  demonstration: true,
});
