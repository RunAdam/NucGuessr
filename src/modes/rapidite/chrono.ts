/**
 * Mode Rapidité : chronomètre d'un round (logique pure, testée dans tests/rapidite/chrono.test.ts).
 *
 * Le chronomètre ne compte rien lui-même : il retient des instants (en ms, ceux de `performance.now()`
 * dans le jeu, n'importe quelle horloge dans les tests) et en déduit le temps restant. Ainsi le temps
 * reste juste même si l'affichage saute des images ou si l'onglet est mis en arrière-plan
 * (`requestAnimationFrame` s'y arrête, `performance.now()` continue). Jamais de décompte par `setInterval`.
 *
 * Les objets sont immuables : chaque fonction renvoie un nouveau chronomètre.
 */

import type { ComportementArrierePlan } from '../../config';

/*
 * Onglet en arrière-plan pendant un round (`RAPIDITE_ARRIERE_PLAN`, src/config.ts) :
 * - `continue` : rien, le temps continue de s'écouler (choix retenu, voir docs/DECISIONS.md) ;
 * - `pause` : le temps s'arrête jusqu'au retour ;
 * - `perdu` : le round est perdu tout de suite.
 */

export interface Chrono {
  readonly dureeMs: number;
  /** Instant du départ (photo affichée), `null` avant. */
  readonly debut: number | null;
  /** Total des pénalités (−2 s par mauvaise réponse). */
  readonly penalitesMs: number;
  /** Nombre de pénalités reçues. */
  readonly erreurs: number;
  /** Instant où le chronomètre a été arrêté (bonne réponse, temps écoulé), `null` s'il tourne. */
  readonly arret: number | null;
  /** Début de la pause en cours (onglet masqué, comportement `pause`), sinon `null`. */
  readonly pauseDepuis: number | null;
  /** Total des pauses terminées. */
  readonly pausesMs: number;
  /** Le round a été perdu parce que l'onglet est passé en arrière-plan (comportement `perdu`). */
  readonly perduArrierePlan: boolean;
}

/** Nouveau chronomètre, pas encore démarré. */
export function creerChrono(dureeMs: number): Chrono {
  return {
    dureeMs,
    debut: null,
    penalitesMs: 0,
    erreurs: 0,
    arret: null,
    pauseDepuis: null,
    pausesMs: 0,
    perduArrierePlan: false,
  };
}

/** Départ (la photo est affichée). Sans effet s'il est déjà démarré. */
export function demarrer(c: Chrono, maintenant: number): Chrono {
  return c.debut === null ? { ...c, debut: maintenant } : c;
}

export function estDemarre(c: Chrono): boolean {
  return c.debut !== null;
}

/** Le chronomètre tourne : démarré, ni arrêté ni en pause, et pas encore à zéro. */
export function tourne(c: Chrono, maintenant: number): boolean {
  return c.debut !== null && c.arret === null && c.pauseDepuis === null && restantMs(c, maintenant) > 0;
}

/** Temps réellement écoulé depuis le départ (hors pauses), pénalités NON comprises. */
export function ecouleMs(c: Chrono, maintenant: number): number {
  if (c.debut === null) return 0;
  const fin = Math.min(maintenant, c.arret ?? Infinity, c.pauseDepuis ?? Infinity);
  return Math.max(0, fin - c.debut - c.pausesMs);
}

/** Temps restant (pénalités déduites), jamais négatif. Avant le départ : la durée entière. */
export function restantMs(c: Chrono, maintenant: number): number {
  if (c.perduArrierePlan) return 0;
  return Math.max(0, c.dureeMs - ecouleMs(c, maintenant) - c.penalitesMs);
}

/**
 * Instant (sur la même horloge) où le temps restant atteint zéro, si rien ne change :
 * sert à arrêter le chronomètre à l'instant exact de la fin, même si l'image suivante arrive tard.
 */
export function instantFin(c: Chrono): number | null {
  if (c.debut === null) return null;
  return c.debut + c.pausesMs + c.dureeMs - c.penalitesMs;
}

/** Le temps est écoulé (pénalités comprises). */
export function estEcoule(c: Chrono, maintenant: number): boolean {
  return c.debut !== null && restantMs(c, maintenant) <= 0;
}

/** Mauvaise réponse : retire `penaliteMs` du temps restant. Sans effet si le chronomètre ne tourne pas. */
export function penaliser(c: Chrono, maintenant: number, penaliteMs: number): Chrono {
  if (!tourne(c, maintenant)) return c;
  return { ...c, penalitesMs: c.penalitesMs + penaliteMs, erreurs: c.erreurs + 1 };
}

/**
 * Arrêt (bonne réponse ou fin du temps) : le temps restant est figé. Si le temps était déjà écoulé,
 * l'arrêt est placé à l'instant exact où il l'a été (pas plus tard).
 */
export function arreter(c: Chrono, maintenant: number): Chrono {
  if (c.debut === null || c.arret !== null) return c;
  const sansPause = c.pauseDepuis === null ? c : reprendre(c, maintenant);
  const fin = instantFin(sansPause) ?? maintenant;
  return { ...sansPause, arret: Math.min(maintenant, fin) };
}

/** L'onglet passe en arrière-plan. */
export function masquer(c: Chrono, maintenant: number, comportement: ComportementArrierePlan): Chrono {
  if (!tourne(c, maintenant)) return c;
  if (comportement === 'pause') return { ...c, pauseDepuis: maintenant };
  if (comportement === 'perdu') return { ...c, arret: maintenant, perduArrierePlan: true };
  return c;
}

/** L'onglet revient au premier plan. */
export function reprendre(c: Chrono, maintenant: number): Chrono {
  if (c.pauseDepuis === null) return c;
  return { ...c, pausesMs: c.pausesMs + Math.max(0, maintenant - c.pauseDepuis), pauseDepuis: null };
}
