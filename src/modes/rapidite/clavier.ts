/**
 * Mode Rapidité : clavier virtuel des mobiles et retour haptique (navigateur uniquement).
 */

/**
 * Pendant un round, demande au navigateur de **réduire la page** quand le clavier virtuel s'ouvre
 * (`interactive-widget=resizes-content`, Chrome Android ≥ 108, Firefox Android) au lieu de le poser
 * par-dessus : la page de jeu (100dvh) tient alors dans la partie visible, photo, barre de temps et
 * champ compris (mise en page vérifiée à 360 × 400). Renvoie la fonction qui rétablit la valeur
 * d'origine.
 *
 * Provisoire : ce réglage a sa place dans la balise `<meta name="viewport">` d'index.html (socle) ;
 * on l'ajoute ici le temps du round pour ne pas modifier le socle pendant la phase 5. Safari iOS
 * l'ignore (il fait défiler la page jusqu'au champ).
 */
export function reduireAvecClavier(): () => void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta || meta.content.includes('interactive-widget')) return () => {};
  const origine = meta.content;
  meta.content = `${origine}, interactive-widget=resizes-content`;
  return () => {
    meta.content = origine;
  };
}

/** Vibration courte (mauvaise réponse) si l'appareil le permet et si l'utilisateur n'a pas demandé moins d'animations. */
export function vibrer(motif: number | readonly number[]): void {
  if (motif === 0 || typeof navigator.vibrate !== 'function') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(typeof motif === 'number' ? motif : [...motif]);
  } catch {
    // Certains navigateurs refusent sans geste récent de l'utilisateur : sans importance.
  }
}
