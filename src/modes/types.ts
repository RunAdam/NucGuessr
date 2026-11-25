/**
 * Interface d'un mode de jeu : ce qu'un mode fournit au socle (moteur, navigation, compte rendu).
 *
 * Le socle s'occupe de tout ce qui est commun : tirage des rounds, préchargement des photos, bandeau
 * (round, voyants, score), écran « réponse » entre deux rounds (délai, `Entrée`, tap, anti-rebond),
 * persistance (meilleur score, parties, photos vues), compte rendu de fin et « Rejouer ».
 * Le mode s'occupe du reste : l'écran d'un round (saisie, chronomètre, carte…), le calcul des points,
 * l'affichage de la réponse, et ce qu'il veut montrer dans le compte rendu.
 *
 * Voir docs/ARCHITECTURE.md, et src/modes/factice/ pour un exemple complet et minimal.
 */
import type { Component } from 'svelte';
import type { Aleatoire } from '../lib/hasard';
import type { ResultatRound } from '../lib/moteur';
import type { RoundTire } from '../lib/tirage';
import type { FiltrePhotos, Photo, Site } from '../lib/types';

/** Identifiants des modes (chacun a son dossier src/modes/<id>/ et sa route `#/<id>`). */
export type IdMode = 'rapidite' | 'distance' | 'factice';

/** Un round de partie : le site à faire deviner et la photo tirée. */
export type RoundPartie = RoundTire<Site, Photo>;

/** Phase d'un round vue par le composant du mode. */
export type PhaseRound = 'jeu' | 'reponse';

/** Propriétés passées par le socle au composant `Round` du mode. */
export interface PropsRound<D> {
  /** Site à deviner et photo à montrer (l'`alt` de la photo est neutre ; ne pas afficher le nom du site pendant le jeu). */
  round: RoundPartie;
  /** Numéro du round, à partir de 1. */
  numero: number;
  /** Nombre de rounds de la partie. */
  total: number;
  /**
   * `jeu` : le joueur cherche. `reponse` : le round est fini, le mode affiche la réponse (le composant
   * reste monté entre les deux phases, il garde donc son état : saisie, carte, essais…).
   */
  phase: PhaseRound;
  /** Résultat du round (en phase `reponse`), sinon `null`. */
  resultat: ResultatRound<D> | null;
  /** Tous les sites jouables (autocomplétion, carte…). */
  sites: readonly Site[];
  /** Hasard à utiliser (jamais `Math.random` directement : les tests injectent un générateur à graine). */
  aleatoire: Aleatoire;
  /**
   * Fin du round : le mode donne les points (entier ≥ 0, calculé avec src/config.ts), le statut et la
   * réponse du joueur. À appeler une seule fois par round ; les appels suivants sont ignorés.
   */
  terminer: (resultat: ResultatRound<D>) => void;
  /** Phase `reponse` : passer au round suivant tout de suite (même effet que `Entrée`). */
  passer: () => void;
}

/** Une colonne propre au mode dans le tableau « relevé round par round » du compte rendu. */
export interface ColonneRecap<D> {
  /** En-tête (court, affiché en capitales : « Temps », « Err. », « Distance »). */
  titre: string;
  /** Contenu de la cellule (texte déjà mis en forme, voir src/lib/format.ts). */
  valeur(resultat: ResultatRound<D>): string;
  /** Nombre : police à chasse fixe, aligné à droite. */
  numerique?: boolean;
  /** Masquée sur mobile (< 720 px) pour garder le tableau lisible. */
  secondaire?: boolean;
}

/** Une mesure de synthèse du compte rendu (« Temps moyen : 5,4 s »). Trois au plus. */
export interface Mesure {
  libelle: string;
  valeur: string;
}

/** Propriétés d'un composant facultatif affiché dans le compte rendu (ex. carte récapitulative du mode Distance). */
export interface PropsRecap<D> {
  rounds: readonly RoundPartie[];
  resultats: readonly ResultatRound<D>[];
}

/** Ce qu'un mode fournit au socle. `D` : détail d'un round propre au mode (temps, erreurs, distance…). */
export interface DefinitionMode<D = unknown> {
  id: IdMode;
  /** Nom affiché (« Rapidité »). */
  nom: string;
  /** Une phrase de règle pour l'accueil (« 8 rounds, 20 s pour taper le nom du site »). */
  resume: string;
  /** Nombre de rounds (constante de src/config.ts). */
  nbRounds: number;
  /** Score maximal d'un round (pour « / 8 000 »). */
  scoreMaxRound: number;
  /** Filtre de difficulté des photos appliqué au tirage (`photosTirables`). */
  filtrePhotos: FiltrePhotos;
  /**
   * Délai d'affichage de la réponse avant de passer seul au round suivant, en ms ;
   * `null` : on attend le joueur (`Entrée`, bouton ou tap).
   */
  delaiReponseMs(resultat: ResultatRound<D>): number | null;
  /** Pendant ce délai après la fin du round, `Entrée` et le tap ne passent pas la réponse (évite le double appui). */
  antiRebondMs: number;
  /** Un tap (ou clic) n'importe où dans la zone du round passe la réponse. `false` si le mode a besoin du clic en phase réponse (carte). */
  passerAuTap: boolean;
  /** Composant de l'écran d'un round (photo comprise : utiliser src/composants/PhotoRound.svelte). */
  // `any` : le registre range des modes aux détails `D` différents ; chaque mode est typé dans son dossier.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Round: Component<PropsRound<any>>;
  /** Colonnes ajoutées au relevé du compte rendu, entre « Votre réponse » et « Points ». */
  colonnesRecap: readonly ColonneRecap<D>[];
  /** Trois mesures de synthèse au plus pour le compte rendu. */
  mesures(resultats: readonly ResultatRound<D>[]): readonly Mesure[];
  /** Composant facultatif affiché dans le compte rendu, sous la synthèse (carte récapitulative…). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Recap?: Component<PropsRecap<any>>;
  /** Mode pas encore construit : signalé sur l'accueil, ses parties ne sont pas enregistrées. */
  enConstruction?: boolean;
  /** Mode de démonstration du socle : listé seulement en développement (voir `FACTICE_VISIBLE_EN_PRODUCTION`). */
  demonstration?: boolean;
}

/**
 * Aide au typage : `definirMode<MonDetail>({ … })` vérifie que les fonctions du mode utilisent bien
 * le même type de détail, puis le range avec les autres modes.
 */
export function definirMode<D>(mode: DefinitionMode<D>): DefinitionMode<unknown> {
  return mode as DefinitionMode<unknown>;
}
