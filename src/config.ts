/**
 * NucGuessr — configuration unique des règles du jeu.
 *
 * Toutes les valeurs réglables du jeu sont ici, regroupées par thème.
 * Ce fichier ne dépend de rien : uniquement des constantes et des fonctions pures.
 * Les choix et les simulations qui les justifient sont décrits dans docs/DECISIONS.md
 * (simulations : `node scripts/sim/tout.mjs`).
 *
 * Convention : durées en millisecondes (suffixe _MS), distances en kilomètres (suffixe _KM).
 */

// =============================================================================
// Commun aux deux modes
// =============================================================================

/**
 * Tirage des photos (décidé en phase 0, aucun paramètre à régler) :
 * 1. on tire au hasard des sites tous différents (aucun site deux fois dans une partie) ;
 * 2. pour chaque site, on prend la photo vue il y a le plus longtemps
 *    (une photo jamais vue passe en priorité, égalités départagées au hasard).
 * L'historique local retient, pour chaque photo, le numéro de la dernière partie où elle a été vue,
 * tous modes confondus.
 */

/** Nombre de sites de la v1 : les 18 centrales en exploitation (Flamanville 3 rattachée à Flamanville). */
export const NB_SITES_V1 = 18;

// =============================================================================
// Mode Rapidité
// =============================================================================

/** Nombre de rounds d'une partie. */
export const RAPIDITE_ROUNDS = 8;

/** Temps imparti par round. Le chronomètre démarre quand la photo est affichée. */
export const RAPIDITE_DUREE_MS = 20_000;

/** Temps retiré à chaque mauvaise réponse (réponses fausses illimitées). */
export const RAPIDITE_PENALITE_MS = 2_000;

/** Score d'une bonne réponse donnée au dernier moment (plancher). */
export const RAPIDITE_SCORE_PLANCHER = 100;

/** Score d'une bonne réponse instantanée (maximum théorique d'un round). */
export const RAPIDITE_SCORE_MAX = 1_000;

/** Affichage de la réponse après une bonne réponse, avant le round suivant. */
export const RAPIDITE_DELAI_APRES_BONNE_MS = 1_500;

/** Affichage de la réponse après un round perdu (temps écoulé) : plus long, pour la lire et la retenir. */
export const RAPIDITE_DELAI_APRES_PERDU_MS = 3_000;

/**
 * Le délai peut être passé avec `Entrée` (ou un tap), mais seulement après ce court instant,
 * pour qu'un `Entrée` validant la réponse ne fasse pas sauter l'affichage par accident.
 */
export const RAPIDITE_DELAI_ANTIREBOND_MS = 400;

/**
 * Score d'un round de Rapidité : 100 points pour une bonne réponse, plus 45 points par seconde restante
 * (900 points répartis sur les 20 s). Chaque erreur coûte 2 s, soit 90 points.
 * @param restantMs temps restant au moment de la bonne réponse (pénalités déjà retirées)
 * @returns 0 si le temps est écoulé, sinon un entier entre 100 et 1000
 */
export function scoreRapidite(restantMs: number): number {
  if (restantMs <= 0) return 0;
  const t = Math.min(restantMs, RAPIDITE_DUREE_MS) / RAPIDITE_DUREE_MS;
  return Math.round(RAPIDITE_SCORE_PLANCHER + (RAPIDITE_SCORE_MAX - RAPIDITE_SCORE_PLANCHER) * t);
}

// =============================================================================
// Mode Distance
// =============================================================================

/** Nombre de rounds d'une partie. */
export const DISTANCE_ROUNDS = 5;

/** Limite de temps par round. `null` = pas de limite (choix v1). */
export const DISTANCE_LIMITE_MS: number | null = null;

/** Score maximal d'un round (25 000 sur une partie). */
export const DISTANCE_SCORE_MAX = 5_000;

/**
 * Distance caractéristique de la décroissance du score : à d = k au-delà du rayon parfait,
 * le score vaut 37 % du maximum. 75 km : confondre deux centrales voisines d'un même fleuve
 * (35 à 90 km) coûte un tiers à deux tiers des points, un clic au hasard ne rapporte presque rien.
 */
export const DISTANCE_K_KM = 75;

/**
 * Rayon « dans le mille » : à moins de cette distance, score maximal.
 * Absorbe l'imprécision du clic (doigt sur mobile) ; le score reste continu au-delà.
 */
export const DISTANCE_RAYON_PARFAIT_KM = 5;

/**
 * Score d'un round de Distance : 5000 si d ≤ 5 km, puis 5000 × exp(−(d − 5) / 75).
 * @param distanceKm distance entre le clic et la position réelle du site
 * @returns un entier entre 0 et 5000
 */
export function scoreDistance(distanceKm: number): number {
  const exces = Math.max(0, distanceKm - DISTANCE_RAYON_PARFAIT_KM);
  return Math.round(DISTANCE_SCORE_MAX * Math.exp(-exces / DISTANCE_K_KM));
}

// =============================================================================
// Photos
// =============================================================================

/**
 * Banque de photos : data/photos.json (format : data/schema/photos.schema.json), fichiers dans public/photos/.
 * Les réglages du traitement des images (largeur max 1600 px, WebP qualité 80, 300 Ko au plus) sont des
 * constantes en tête de scripts/process_photos.py. Décisions : docs/decisions-phase2.md.
 */

/** Dossier des photos, relatif à la racine du site publié. Chaque fichier s'appelle `<id>.webp`. */
export const PHOTOS_DOSSIER = 'photos/';

/** Difficulté d'une photo, saisie à la main : 1 facile (vue d'ensemble), 2 moyenne, 3 difficile (détail, angle inhabituel). */
export type DifficultePhoto = 1 | 2 | 3;

/** Point de vue d'une photo. */
export type TypePhoto = 'sol' | 'aerienne' | 'satellite' | 'detail';

/**
 * Difficulté maximale des photos tirées en mode Rapidité (20 s pour répondre).
 * 2 : les photos difficiles (détails, angles inhabituels) sont réservées au mode Distance, sans limite de temps.
 * Mettre 3 pour ne rien filtrer. Le mode Distance utilise toutes les photos.
 */
export const RAPIDITE_DIFFICULTE_MAX: DifficultePhoto = 2;

/**
 * Photos d'un site pouvant être tirées dans un mode, AVANT la rotation par site (photo vue il y a le plus longtemps).
 * Si aucune photo du site ne passe le filtre de difficulté, on les garde toutes : le site reste jouable,
 * le tirage ne bloque jamais et tous les sites sortent aussi souvent.
 */
export function photosTirables<P extends { difficulte: number }>(photosDuSite: readonly P[], mode: 'rapidite' | 'distance'): P[] {
  if (mode === 'distance') return [...photosDuSite];
  const faciles = photosDuSite.filter((p) => p.difficulte <= RAPIDITE_DIFFICULTE_MAX);
  return faciles.length > 0 ? faciles : [...photosDuSite];
}

/**
 * Nombre de photos téléchargées à l'avance (dans l'ordre des rounds), en plus de celle affichée.
 * Les premières photos de la partie se chargent dès l'écran d'accueil. 2 rounds d'avance : en 3G lente,
 * l'attente d'un joueur rapide passe de 8 à 5 s par partie ; en 4G, aucune attente dans tous les cas.
 * Pas d'aperçu flou (basse résolution) pendant le chargement : le chronomètre ne démarre qu'une fois
 * la vraie photo affichée, et un aperçu donnerait du temps de réflexion gratuit avant le chrono.
 */
export const PHOTOS_PRECHARGEMENT_AVANCE = 2;
