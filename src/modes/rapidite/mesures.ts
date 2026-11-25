/**
 * Mode Rapidité : détail d'un round, colonnes du relevé et mesures du compte rendu
 * (logique pure, testée dans tests/rapidite/mesures.test.ts).
 */
import { formaterEntier, formaterSecondes } from '../../lib/format';
import type { ResultatRound } from '../../lib/moteur';
import type { ColonneRecap, Mesure } from '../types';

/** Détail d'un round de Rapidité. */
export interface DetailRapidite {
  /** Le site a été trouvé avant la fin du temps. */
  trouve: boolean;
  /**
   * Temps réellement mis, de l'affichage de la photo à la bonne réponse (pénalités non comprises) ;
   * pour un round perdu, temps passé jusqu'à la fin.
   */
  tempsMs: number;
  /** Temps restant au moment de la bonne réponse, pénalités déduites (0 si perdu) : il fait le score. */
  restantMs: number;
  /** Nombre de mauvaises réponses (−2 s chacune). */
  erreurs: number;
  /** Noms des sites proposés à tort, dans l'ordre. */
  essais: string[];
}

/** Texte de la colonne « Votre réponse » : le site trouvé, sinon les essais, sinon « Temps écoulé ». */
export function reponseAffichee(detail: DetailRapidite, nomTrouve: string): string {
  if (detail.trouve) return nomTrouve;
  return detail.essais.length > 0 ? detail.essais.join(', ') : 'Temps écoulé';
}

/** Colonnes ajoutées au relevé : temps mis (rounds trouvés) et nombre d'erreurs. */
export const COLONNES_RAPIDITE: readonly ColonneRecap<DetailRapidite>[] = [
  {
    titre: 'Temps',
    valeur: (r) => (r.detail.trouve ? formaterSecondes(r.detail.tempsMs) : '—'),
    numerique: true,
  },
  { titre: 'Err.', valeur: (r) => formaterEntier(r.detail.erreurs), numerique: true },
];

/**
 * Mesures du compte rendu : temps moyen (sur les rounds trouvés seulement : un round perdu n'a pas de
 * temps de réponse), total des erreurs, rounds perdus.
 */
export function mesuresRapidite(resultats: readonly ResultatRound<DetailRapidite>[]): Mesure[] {
  const trouves = resultats.filter((r) => r.detail.trouve);
  const moyenne = trouves.length > 0 ? trouves.reduce((s, r) => s + r.detail.tempsMs, 0) / trouves.length : null;
  const erreurs = resultats.reduce((s, r) => s + r.detail.erreurs, 0);
  return [
    { libelle: 'Temps moyen', valeur: moyenne === null ? '—' : formaterSecondes(moyenne) },
    { libelle: 'Erreurs', valeur: formaterEntier(erreurs) },
    { libelle: 'Perdus', valeur: `${resultats.length - trouves.length}/${resultats.length}` },
  ];
}
