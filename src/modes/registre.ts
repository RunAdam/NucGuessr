/**
 * Registre des modes de jeu : l'accueil les propose dans cet ordre, la route `#/<id>` lance le mode.
 * Chaque mode vit dans son dossier (src/modes/<id>/index.ts) : on ne modifie pas ce fichier pour
 * faire évoluer un mode existant.
 */
import { FACTICE_VISIBLE_EN_PRODUCTION, MODE_PAR_DEFAUT } from '../config';
import distance from './distance';
import factice from './factice';
import rapidite from './rapidite';
import type { DefinitionMode } from './types';

export const MODES: readonly DefinitionMode[] = [rapidite, distance, factice];

/** Identifiants de tous les modes joignables par une route. */
export const IDS_MODES: readonly string[] = MODES.map((m) => m.id);

/** Le mode d'identifiant `id`, ou `undefined`. */
export function modeParId(id: string | null | undefined): DefinitionMode | undefined {
  return MODES.find((m) => m.id === id);
}

/** Mode présélectionné quand rien d'autre n'est demandé. */
export const MODE_DEFAUT: DefinitionMode = modeParId(MODE_PAR_DEFAUT) ?? (MODES[0] as DefinitionMode);

/** Modes proposés sur l'accueil (le mode de démonstration seulement en développement, ou s'il est demandé). */
export function modesProposes(demande?: string | null): DefinitionMode[] {
  const voirDemonstration = import.meta.env.DEV || FACTICE_VISIBLE_EN_PRODUCTION;
  return MODES.filter((m) => !m.demonstration || voirDemonstration || m.id === demande);
}
