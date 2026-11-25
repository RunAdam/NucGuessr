/**
 * Persistance locale versionnée (`localStorage`) : meilleurs scores et nombre de parties par mode,
 * historique des photos vues (pour le tirage), préférences.
 *
 * Principes :
 * - tout est rangé sous une seule clé (`STOCKAGE_CLE`), en JSON, avec un numéro de `version` ;
 * - lecture tolérante : un champ invalide est remplacé par sa valeur par défaut, sans perdre le reste ;
 *   un JSON illisible ou une version inconnue repartent de zéro (l'ancien contenu est mis de côté
 *   sous `<clé>.ancien`, pour pouvoir le récupérer à la main) ;
 * - une ancienne version est mise à jour par les fonctions de `MIGRATIONS`, l'une après l'autre ;
 * - jamais d'exception : sans `localStorage` (navigation privée, stockage plein ou bloqué), le jeu
 *   fonctionne, il ne retient simplement rien d'une visite à l'autre.
 *
 * Les fonctions de ce fichier sont pures (le support de stockage est passé en paramètre), sauf
 * `trouverLocalStorage`. L'état réactif utilisé par l'interface est dans src/etat/profil.svelte.ts.
 */
import { STOCKAGE_CLE, STOCKAGE_VERSION } from '../config';
import type { HistoriquePhotos } from './tirage';

/** Statistiques d'un mode. */
export interface StatsMode {
  meilleurScore: number;
  /** Parties terminées. */
  parties: number;
}

/** Format des données locales, version 1. */
export interface DonneesLocales {
  version: number;
  /** Nombre de parties lancées (tous modes) : sert de numéro de partie à l'historique des photos. */
  partiesLancees: number;
  /** Statistiques par identifiant de mode. */
  modes: Record<string, StatsMode>;
  /** Photo → numéro de la dernière partie où elle a été vue. */
  photosVues: HistoriquePhotos;
  /**
   * Préférences du joueur (ex. son activé, phase 5) : valeurs simples uniquement. Chaque mode préfixe ses
   * clés par son identifiant (`rapidite.son`) pour éviter les collisions.
   */
  preferences: Record<string, string | number | boolean>;
}

/** Le strict nécessaire de l'API `Storage` (facile à simuler dans les tests). */
export interface SupportStockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/** Transforme les données de la version N en données de la version N + 1. */
export type Migration = (anciennes: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations, indexées par la version de départ : `MIGRATIONS[1]` transforme la version 1 en version 2.
 * Pour changer le format : incrémenter `STOCKAGE_VERSION` (src/config.ts), ajouter ici la migration
 * depuis la version précédente, adapter `assainir`, et ajouter un test dans tests/socle/stockage.test.ts.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export interface OptionsStockage {
  cle?: string;
  version?: number;
  migrations?: Readonly<Record<number, Migration>>;
}

/** Données d'un joueur qui n'a encore jamais joué. */
export function donneesVides(version: number = STOCKAGE_VERSION): DonneesLocales {
  return { version, partiesLancees: 0, modes: {}, photosVues: {}, preferences: {} };
}

/** Lit les données locales. Ne lève jamais d'exception. */
export function lireDonnees(support: SupportStockage | null, options: OptionsStockage = {}): DonneesLocales {
  const cle = options.cle ?? STOCKAGE_CLE;
  const version = options.version ?? STOCKAGE_VERSION;
  const migrations = options.migrations ?? MIGRATIONS;
  if (!support) return donneesVides(version);

  let brut: string | null;
  try {
    brut = support.getItem(cle);
  } catch {
    return donneesVides(version);
  }
  if (brut === null) return donneesVides(version);

  let objet: unknown;
  try {
    objet = JSON.parse(brut);
  } catch {
    return repartirDeZero(support, cle, brut, version);
  }
  if (!estObjet(objet) || !Number.isInteger(objet.version)) return repartirDeZero(support, cle, brut, version);

  let donnees: Record<string, unknown> = objet;
  let v = objet.version as number;
  if (v > version) return repartirDeZero(support, cle, brut, version);
  while (v < version) {
    const migrer = migrations[v];
    if (!migrer) return repartirDeZero(support, cle, brut, version);
    try {
      donnees = migrer(donnees);
    } catch {
      return repartirDeZero(support, cle, brut, version);
    }
    v += 1;
  }
  return assainir(donnees, version);
}

/** Écrit les données locales. Renvoie `false` si l'écriture a échoué (stockage absent, plein ou bloqué). */
export function ecrireDonnees(
  support: SupportStockage | null,
  donnees: DonneesLocales,
  cle: string = STOCKAGE_CLE,
): boolean {
  if (!support) return false;
  try {
    support.setItem(cle, JSON.stringify(donnees));
    return true;
  } catch {
    return false;
  }
}

/** Le `localStorage` du navigateur s'il est utilisable, sinon `null` (navigation privée stricte, cookies bloqués…). */
export function trouverLocalStorage(): SupportStockage | null {
  try {
    const stockage = globalThis.localStorage;
    if (!stockage) return null;
    const test = `${STOCKAGE_CLE}.test`;
    stockage.setItem(test, '1');
    stockage.removeItem(test);
    return stockage;
  } catch {
    return null;
  }
}

/** Garde ce qui est valide dans un objet de la version courante, remplace le reste par les valeurs par défaut. */
export function assainir(objet: Record<string, unknown>, version: number = STOCKAGE_VERSION): DonneesLocales {
  const d = donneesVides(version);
  if (estEntierPositif(objet.partiesLancees)) d.partiesLancees = objet.partiesLancees;
  if (estObjet(objet.modes)) {
    for (const [id, stats] of Object.entries(objet.modes)) {
      if (estObjet(stats) && estEntierPositif(stats.meilleurScore) && estEntierPositif(stats.parties)) {
        d.modes[id] = { meilleurScore: stats.meilleurScore, parties: stats.parties };
      }
    }
  }
  if (estObjet(objet.photosVues)) {
    const vues: Record<string, number> = {};
    for (const [id, numero] of Object.entries(objet.photosVues)) if (estEntierPositif(numero)) vues[id] = numero;
    d.photosVues = vues;
  }
  if (estObjet(objet.preferences)) {
    for (const [cle, valeur] of Object.entries(objet.preferences)) {
      if (['string', 'number', 'boolean'].includes(typeof valeur))
        d.preferences[cle] = valeur as string | number | boolean;
    }
  }
  return d;
}

// -----------------------------------------------------------------------------
// Mises à jour (pures : renvoient de nouvelles données)
// -----------------------------------------------------------------------------

/** Une partie commence : renvoie son numéro (sert à l'historique des photos). */
export function commencerPartie(d: DonneesLocales): { donnees: DonneesLocales; numeroPartie: number } {
  const numeroPartie = d.partiesLancees + 1;
  return { donnees: { ...d, partiesLancees: numeroPartie }, numeroPartie };
}

/** Une photo vient d'être montrée pendant la partie `numeroPartie`. */
export function marquerVue(d: DonneesLocales, photoId: string, numeroPartie: number): DonneesLocales {
  return { ...d, photosVues: { ...d.photosVues, [photoId]: numeroPartie } };
}

/** Une partie est terminée : met à jour le nombre de parties et le meilleur score du mode. */
export function enregistrerPartieTerminee(
  d: DonneesLocales,
  modeId: string,
  score: number,
): { donnees: DonneesLocales; nouveauRecord: boolean; ancienRecord: number } {
  const avant = d.modes[modeId] ?? { meilleurScore: 0, parties: 0 };
  const nouveauRecord = score > avant.meilleurScore;
  const stats: StatsMode = {
    meilleurScore: Math.max(avant.meilleurScore, score),
    parties: avant.parties + 1,
  };
  return {
    donnees: { ...d, modes: { ...d.modes, [modeId]: stats } },
    nouveauRecord,
    ancienRecord: avant.meilleurScore,
  };
}

/** Enregistre une préférence (valeur simple). */
export function changerPreference(d: DonneesLocales, cle: string, valeur: string | number | boolean): DonneesLocales {
  return { ...d, preferences: { ...d.preferences, [cle]: valeur } };
}

// -----------------------------------------------------------------------------

function repartirDeZero(support: SupportStockage, cle: string, brut: string, version: number): DonneesLocales {
  try {
    support.setItem(`${cle}.ancien`, brut);
  } catch {
    // Rien à faire : on repart de zéro quand même.
  }
  return donneesVides(version);
}

function estObjet(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function estEntierPositif(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0;
}
