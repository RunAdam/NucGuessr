/**
 * Moteur de partie générique, commun à tous les modes (logique pure, sans DOM ni chronomètre).
 *
 * Une partie est une liste de rounds joués dans l'ordre. Chaque round passe par deux états :
 *
 *   en_cours ──enregistrerResultat──▶ reponse ──passerAuRoundSuivant──▶ en_cours (round suivant)
 *                                                                    └──▶ terminee (après le dernier)
 *
 * - `en_cours` : le joueur cherche ;
 * - `reponse`  : le round est fini, la réponse est affichée (écran « réponse » entre deux rounds,
 *               qu'on passe avec `Entrée` ou un tap, ou au bout d'un délai fixé par le mode) ;
 * - `terminee` : tous les rounds sont joués, on affiche le compte rendu.
 *
 * Le moteur ne connaît aucune règle de mode : c'est le mode qui calcule les points d'un round et
 * les lui donne dans un `ResultatRound`. Les objets sont immuables : chaque fonction renvoie une
 * nouvelle partie (ou la même, inchangée, si la transition n'a pas de sens dans l'état actuel, ce qui
 * protège contre les doubles déclenchements : `Entrée` + fin du délai au même moment, double tap…).
 */

export type EtatPartie = 'en_cours' | 'reponse' | 'terminee';

/**
 * Issue d'un round, pour les voyants du bandeau et le compte rendu :
 * `juste` (✓), `faux` (✕) ou `neutre` (pas de notion de juste ou faux, ex. une distance).
 */
export type StatutRound = 'juste' | 'faux' | 'neutre';

/** Résultat d'un round, fourni par le mode. `D` : détail propre au mode (temps, erreurs, distance…). */
export interface ResultatRound<D = unknown> {
  /** Points gagnés : entier ≥ 0, calculé par le mode (ex. `scoreRapidite`, `scoreDistance`). */
  points: number;
  statut: StatutRound;
  /** Ce que le joueur a répondu, en clair (« Cruas », « Temps écoulé », « 34 km »). */
  reponse: string;
  detail: D;
}

export interface Partie<R, D = unknown> {
  readonly rounds: readonly R[];
  /** Index (à partir de 0) du round courant, ou du dernier round une fois la partie terminée. */
  readonly index: number;
  readonly etat: EtatPartie;
  /** Un résultat par round joué, dans l'ordre. */
  readonly resultats: readonly ResultatRound<D>[];
}

/** Nouvelle partie, au premier round. */
export function creerPartie<R, D = unknown>(rounds: readonly R[]): Partie<R, D> {
  if (rounds.length === 0) throw new Error('Une partie doit avoir au moins un round');
  return { rounds: [...rounds], index: 0, etat: 'en_cours', resultats: [] };
}

/** Le round courant. */
export function roundCourant<R, D>(partie: Partie<R, D>): R {
  return partie.rounds[partie.index] as R;
}

/** Le round courant est fini : on enregistre son résultat et on passe à l'affichage de la réponse. */
export function enregistrerResultat<R, D>(partie: Partie<R, D>, resultat: ResultatRound<D>): Partie<R, D> {
  if (partie.etat !== 'en_cours') return partie;
  if (!Number.isInteger(resultat.points) || resultat.points < 0) {
    throw new Error(`Points invalides : ${resultat.points} (entier positif ou nul attendu)`);
  }
  return { ...partie, etat: 'reponse', resultats: [...partie.resultats, resultat] };
}

/** Fin de l'affichage de la réponse : round suivant, ou fin de partie après le dernier round. */
export function passerAuRoundSuivant<R, D>(partie: Partie<R, D>): Partie<R, D> {
  if (partie.etat !== 'reponse') return partie;
  if (partie.index + 1 >= partie.rounds.length) return { ...partie, etat: 'terminee' };
  return { ...partie, index: partie.index + 1, etat: 'en_cours' };
}

/** Somme des points des rounds joués. */
export function scoreTotal<R, D>(partie: Partie<R, D>): number {
  return partie.resultats.reduce((total, r) => total + r.points, 0);
}

/** Résultat du round courant (en phase `reponse`), sinon `null`. */
export function resultatCourant<R, D>(partie: Partie<R, D>): ResultatRound<D> | null {
  return partie.etat === 'en_cours' ? null : (partie.resultats[partie.index] ?? null);
}
