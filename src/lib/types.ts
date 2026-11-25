/**
 * Types des données du jeu, tels que décrits par les schémas data/schema/*.json.
 * Les fichiers eux-mêmes sont validés par `npm run validate:data` (tests/data/sites.test.ts).
 */

export type Palier = 'CP0' | 'CP1' | 'CP2' | 'P4' | "P'4" | 'N4' | 'EPR';

export interface Tranche {
  nom: string;
  palier: Palier;
  /** Puissance électrique nette, en MWe. */
  puissance_mwe: number;
  /** Année du couplage au réseau (convention de la phase 1). */
  couplage: number;
}

export interface SourceFroide {
  nom: string;
  type: 'fleuve' | 'riviere' | 'mer' | 'estuaire' | string;
}

/** Un site nucléaire (data/sites.json). Seuls les champs utilisés par le jeu sont typés finement. */
export interface Site {
  id: string;
  nom_complet: string;
  nom_court: string;
  alias: string[];
  lat: number;
  lon: number;
  commune: string;
  departement: { code: string; nom: string };
  region: string;
  exploitant: string;
  type_site: string;
  reacteurs: { nombre: number; tranches: Tranche[] };
  source_froide: SourceFroide;
  mise_en_service: number;
  statut: string;
  anecdote: string;
}

/** Une photo (data/photos.json). */
export interface Photo {
  /** Identifiant opaque (hash), jamais le nom du site. */
  id: string;
  /** `<id>.webp`, dans public/photos/. */
  fichier: string;
  site_id: string;
  type: 'sol' | 'aerienne' | 'satellite' | 'detail';
  difficulte: 1 | 2 | 3;
  auteur: string;
  licence: string;
  /** Peut contenir le nom du site : à n'afficher qu'après le round (anti-triche). */
  url_source: string | null;
  /** Texte alternatif NEUTRE, sans nom de site : seul texte affiché pendant le round. */
  alt: string;
  largeur: number;
  hauteur: number;
  poids_octets: number;
  /** Image de test générée, à remplacer avant la mise en ligne. */
  substitut: boolean;
}

/** Filtre de photos appliqué au tirage : celui de `photosTirables` (src/config.ts). */
export type FiltrePhotos = 'rapidite' | 'distance';
