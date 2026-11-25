/**
 * Chargement différé de la carte : d3 et le fond de carte (≈ 45 Ko gzip) ne sont téléchargés qu'au premier
 * round du mode Distance (ou pour la carte récapitulative), jamais pour le mode Rapidité ni l'accueil.
 */
import type Carte from './Carte.svelte';

let promesse: Promise<typeof Carte> | null = null;

export function chargerCarte(): Promise<typeof Carte> {
  promesse ??= import('./Carte.svelte').then((m) => m.default);
  // En cas d'échec (réseau), on pourra réessayer.
  promesse.catch(() => (promesse = null));
  return promesse;
}
