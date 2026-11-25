/**
 * Mise en forme des nombres à la française (design/TOKENS.md, règle 4) :
 * séparateur de milliers = espace insécable U+00A0 (« 1 640 »), virgule décimale (« 12,4 »),
 * unité séparée par U+00A0. U+202F et U+2007 sont absents de la police : ne pas les utiliser.
 */

export const INSECABLE = '\u00a0';

/** Entier avec séparateur de milliers : 8000 → « 8 000 ». */
export function formaterEntier(n: number): string {
  const signe = n < 0 ? '−' : '';
  const chiffres = String(Math.abs(Math.round(n)));
  return signe + chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, INSECABLE);
}

/** Nombre décimal à virgule : 12.43 → « 12,4 ». */
export function formaterDecimal(n: number, decimales = 1): string {
  const [entier, fraction] = Math.abs(n).toFixed(decimales).split('.');
  const signe = n < 0 && Number(Math.abs(n).toFixed(decimales)) !== 0 ? '−' : '';
  return signe + formaterEntier(Number(entier)) + (fraction ? `,${fraction}` : '');
}

/** Durée en secondes, avec unité : 6400 ms → « 6,4 s ». */
export function formaterSecondes(ms: number, decimales = 1): string {
  return `${formaterDecimal(ms / 1000, decimales)}${INSECABLE}s`;
}

/** Numéro sur deux chiffres : 3 → « 03 ». */
export function deuxChiffres(n: number): string {
  return String(n).padStart(2, '0');
}

/** Accord simple : (2, 'erreur') → « 2 erreurs ». */
export function pluriel(n: number, mot: string, motPluriel = `${mot}s`): string {
  return `${formaterEntier(n)}${INSECABLE}${Math.abs(n) >= 2 ? motPluriel : mot}`;
}
