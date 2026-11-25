/**
 * Hasard injectable : toute la logique qui tire au sort reçoit un générateur en paramètre.
 * En jeu, `Math.random` ; dans les tests, un générateur à graine fixe (résultats reproductibles).
 */

/** Générateur de nombres pseudo-aléatoires dans [0, 1), comme `Math.random`. */
export type Aleatoire = () => number;

/** Générateur à graine fixe (mulberry32) : rapide, suffisant pour un jeu et pour des tests statistiques. */
export function aleatoireAvecGraine(graine: number): Aleatoire {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entier uniforme dans [0, n). */
export function entierAuHasard(n: number, aleatoire: Aleatoire): number {
  return Math.min(n - 1, Math.floor(aleatoire() * n));
}

/** Copie mélangée du tableau (Fisher-Yates : toutes les permutations sont équiprobables). */
export function melanger<T>(tableau: readonly T[], aleatoire: Aleatoire): T[] {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = entierAuHasard(i + 1, aleatoire);
    [copie[i], copie[j]] = [copie[j] as T, copie[i] as T];
  }
  return copie;
}
