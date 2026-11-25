/**
 * Mode Distance (phase 6) : 5 rounds, placer la centrale sur une carte de France zoomable.
 * Score : `scoreDistance` (src/config.ts). Carte : Carte.svelte (chargée à la demande), fond Natural Earth
 * (docs/CARTE.md). Décisions : docs/DECISIONS.md, phase 6.
 */
import {
  DISTANCE_RAYON_PARFAIT_KM,
  DISTANCE_ROUNDS,
  DISTANCE_SCORE_MAX,
  RAPIDITE_DELAI_ANTIREBOND_MS,
} from '../../config';
import { definirMode } from '../types';
import CarteRecap from './CarteRecap.svelte';
import { formaterDistance, type LatLon } from './geo';
import RoundDistance from './RoundDistance.svelte';

/** Détail d'un round du mode Distance. */
export interface DetailDistance {
  /** Repère validé par le joueur. */
  repere: LatLon;
  /** Distance du grand cercle entre le repère et la centrale. */
  distanceKm: number;
}

export default definirMode<DetailDistance>({
  id: 'distance',
  nom: 'Distance',
  resume: `${DISTANCE_ROUNDS} rounds, placer le site sur la carte de France`,
  nbRounds: DISTANCE_ROUNDS,
  scoreMaxRound: DISTANCE_SCORE_MAX,
  filtrePhotos: 'distance',
  // Pas de délai : le joueur regarde la carte de la réponse aussi longtemps qu'il veut.
  delaiReponseMs: () => null,
  // Anti-rebond de l'`Entrée` qui valide la proposition.
  antiRebondMs: RAPIDITE_DELAI_ANTIREBOND_MS,
  // En phase réponse, le joueur peut encore déplacer ou zoomer la carte : un clic ne doit pas passer.
  passerAuTap: false,
  Round: RoundDistance,
  colonnesRecap: [{ titre: 'Distance', valeur: (r) => formaterDistance(r.detail.distanceKm), numerique: true }],
  mesures(resultats) {
    const n = Math.max(1, resultats.length);
    const moyenne = resultats.reduce((s, r) => s + r.detail.distanceKm, 0) / n;
    const meilleure = Math.min(...resultats.map((r) => r.detail.distanceKm));
    const mille = resultats.filter((r) => r.detail.distanceKm <= DISTANCE_RAYON_PARFAIT_KM).length;
    return [
      { libelle: 'Distance moyenne', valeur: formaterDistance(moyenne) },
      { libelle: 'Meilleur repère', valeur: resultats.length ? formaterDistance(meilleure) : '—' },
      { libelle: 'Dans le mille', valeur: `${mille}/${resultats.length}` },
    ];
  },
  Recap: CarteRecap,
});
