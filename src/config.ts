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
// Mode Rapidité : saisie, retours et barre de temps (phase 5)
// =============================================================================

/** Nombre de suggestions de la liste d'autocomplétion, sur ordinateur. */
export const RAPIDITE_NB_SUGGESTIONS = 5;

/** Nombre de suggestions sur mobile (< 720 px) : une rangée de boutons au-dessus du champ, à toucher. */
export const RAPIDITE_NB_SUGGESTIONS_MOBILE = 3;

/**
 * `Tab` complète seulement (false) ou valide directement (true).
 * Décidé : complète seulement. Avec 1 ou 2 lettres, la première suggestion est fausse 1 fois sur 2 ou
 * sur 9 : un `Tab` qui valide coûterait 2 s bien plus souvent qu'il ne fait gagner un appui.
 * `Entrée` valide déjà directement la suggestion en surbrillance (« Tric » + `Entrée`).
 */
export const RAPIDITE_TAB_VALIDE = false;

/**
 * Saisie qui ne commence aucun nom connu : proposer les sites à une ou deux fautes de frappe près
 * (« tricastn » → Tricastin) au lieu d'une liste vide. Une saisie qui ne correspond à rien n'est
 * jamais comptée comme une erreur : elle est ignorée, avec un message.
 */
export const RAPIDITE_SUGGERER_APPROCHANTS = true;

/** Après une mauvaise réponse, le champ est vidé (`vider`) ou son texte sélectionné (`selectionner`). */
export const RAPIDITE_APRES_ERREUR: 'vider' | 'selectionner' = 'vider';

/**
 * Sous ce temps restant, la barre et le chrono passent au rouge et le chrono marque chaque seconde
 * (tension des dernières secondes). Même valeur que le token `--seuil-alerte-s` des maquettes.
 * Mettre 0 pour supprimer l'alerte (à valider avec la promo).
 */
export const RAPIDITE_SEUIL_ALERTE_MS = 5_000;

/**
 * Vibration de l'appareil après une mauvaise réponse (`navigator.vibrate`, mobile Android surtout),
 * en ms ou motif [vibre, pause, vibre…]. Jamais si « réduire les animations » est demandé. `0` : aucune.
 */
export const RAPIDITE_VIBRATION: number | readonly number[] = 80;

/**
 * Comportement quand l'onglet passe en arrière-plan pendant un round :
 * `continue` (le temps continue de s'écouler), `pause` (le temps s'arrête) ou `perdu` (round perdu).
 * Décidé : `continue`. Une pause permettrait de chercher la photo dans un autre onglet sans limite ;
 * perdre le round sanctionnerait un simple Alt-Tab. Le chronomètre se fie à `performance.now()`, qui
 * continue en arrière-plan : au retour, le temps affiché est exact.
 */
export type ComportementArrierePlan = 'continue' | 'pause' | 'perdu';
export const RAPIDITE_ARRIERE_PLAN: ComportementArrierePlan = 'continue';

// Son : aucun en v1 (décision de la phase 5 : on joue en cours ou en pause, les repères visuels suffisent).

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

// =============================================================================
// Socle (phase 4) : persistance locale, navigation, mode factice
// =============================================================================

/**
 * Clé unique sous laquelle le jeu range ses données dans le `localStorage` du navigateur
 * (meilleurs scores, nombre de parties, photos vues, préférences). Format : src/lib/stockage.ts.
 */
export const STOCKAGE_CLE = 'nucguessr';

/**
 * Version du format des données locales. À incrémenter à chaque changement de format, en ajoutant
 * la migration correspondante dans src/lib/stockage.ts (sinon les données d'une version inconnue
 * sont remises à zéro proprement, sans planter).
 */
export const STOCKAGE_VERSION = 1;

/** Mode présélectionné sur l'écran d'accueil (décision de la phase 0 : Rapidité). */
export const MODE_PAR_DEFAUT = 'rapidite';

/**
 * Mode factice (démonstration du socle : choisir le bon site parmi quelques boutons).
 * Toujours listé en développement (`npm run dev`) ; en production il reste joignable par le lien
 * `#/factice` mais n'est pas proposé sur l'accueil, sauf si cette constante vaut `true`.
 */
export const FACTICE_VISIBLE_EN_PRODUCTION = false;

/** Nombre de rounds d'une partie du mode factice. */
export const FACTICE_ROUNDS = 5;

/** Nombre de sites proposés à chaque round du mode factice (dont le bon). */
export const FACTICE_NB_CHOIX = 4;
