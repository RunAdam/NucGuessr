/**
 * Routage par hash (décision 4.3) : `#/` accueil, `#/<mode>` partie du mode (`#/rapidite`, `#/distance`).
 *
 * Le hash n'est jamais envoyé au serveur : GitHub Pages sert toujours le même index.html, donc un lien
 * partagé ou un rechargement ne tombent jamais sur une page 404, et le bouton Précédent du navigateur
 * ramène à l'accueil au lieu de quitter le jeu.
 */

export type Route = { ecran: 'accueil' } | { ecran: 'partie'; mode: string };

/** Route décrite par un hash (`location.hash`). Hash inconnu ou mode inconnu : accueil. */
export function lireRoute(hash: string, modesConnus: readonly string[]): Route {
  const chemin = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (chemin !== '' && modesConnus.includes(chemin)) return { ecran: 'partie', mode: chemin };
  return { ecran: 'accueil' };
}

/** Hash correspondant à une route. */
export function ecrireRoute(route: Route): string {
  return route.ecran === 'partie' ? `#/${route.mode}` : '#/';
}
