/**
 * Profil du joueur : données locales réactives (Svelte 5), enregistrées dans le `localStorage` à
 * chaque modification. Le format et les règles de lecture sont dans src/lib/stockage.ts.
 *
 * Chaque modification relit d'abord le stockage : si le jeu est ouvert dans deux onglets, l'un
 * n'efface pas ce que l'autre vient d'enregistrer.
 */
import {
  changerPreference,
  commencerPartie,
  ecrireDonnees,
  enregistrerPartieTerminee,
  lireDonnees,
  marquerVue,
  trouverLocalStorage,
  type DonneesLocales,
} from '../lib/stockage';

const support = trouverLocalStorage();
let donnees = $state.raw<DonneesLocales>(lireDonnees(support));

function modifier(f: (d: DonneesLocales) => DonneesLocales): void {
  const fraiches = support ? lireDonnees(support) : donnees;
  donnees = f(fraiches);
  ecrireDonnees(support, donnees);
}

export const profil = {
  /** Données courantes (lecture réactive dans les composants). */
  get donnees(): DonneesLocales {
    return donnees;
  },
  /** `false` si le navigateur ne permet pas d'enregistrer (navigation privée stricte…). */
  get persistant(): boolean {
    return support !== null;
  },
  /** Une partie commence : renvoie son numéro (pour l'historique des photos et le compte rendu). */
  commencerPartie(): number {
    let numero = 0;
    modifier((d) => {
      const r = commencerPartie(d);
      numero = r.numeroPartie;
      return r.donnees;
    });
    return numero;
  },
  marquerVue(photoId: string, numeroPartie: number): void {
    modifier((d) => marquerVue(d, photoId, numeroPartie));
  },
  /** Enregistre une partie terminée ; indique si c'est un nouveau record. */
  terminerPartie(modeId: string, score: number): { nouveauRecord: boolean; ancienRecord: number } {
    let resultat = { nouveauRecord: false, ancienRecord: 0 };
    modifier((d) => {
      const r = enregistrerPartieTerminee(d, modeId, score);
      resultat = { nouveauRecord: r.nouveauRecord, ancienRecord: r.ancienRecord };
      return r.donnees;
    });
    return resultat;
  },
  /** Enregistre une préférence (clé préfixée par l'identifiant du mode : `rapidite.son`). */
  changerPreference(cle: string, valeur: string | number | boolean): void {
    modifier((d) => changerPreference(d, cle, valeur));
  },
};
