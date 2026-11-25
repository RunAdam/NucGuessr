/** Mode Rapidité : définition du mode, colonnes du relevé et mesures du compte rendu. */
import { describe, expect, it } from 'vitest';
import {
  RAPIDITE_DELAI_APRES_BONNE_MS,
  RAPIDITE_DELAI_APRES_PERDU_MS,
  RAPIDITE_ROUNDS,
  RAPIDITE_SCORE_MAX,
} from '../../src/config';
import type { ResultatRound } from '../../src/lib/moteur';
import mode from '../../src/modes/rapidite';
import {
  COLONNES_RAPIDITE,
  mesuresRapidite,
  reponseAffichee,
  type DetailRapidite,
} from '../../src/modes/rapidite/mesures';

const NB = ' ';

function resultat(detail: Partial<DetailRapidite>, points = 0): ResultatRound<DetailRapidite> {
  const d: DetailRapidite = { trouve: false, tempsMs: 20_000, restantMs: 0, erreurs: 0, essais: [], ...detail };
  return { points, statut: d.trouve ? 'juste' : 'faux', reponse: reponseAffichee(d, 'Tricastin'), detail: d };
}

const juste = (tempsMs: number, erreurs = 0) =>
  resultat({ trouve: true, tempsMs, erreurs, restantMs: 20_000 - tempsMs - 2_000 * erreurs }, 500);

describe('réponse affichée', () => {
  it('le site trouvé, sinon les essais, sinon « Temps écoulé »', () => {
    expect(juste(5_000).reponse).toBe('Tricastin');
    expect(resultat({ essais: ['Cruas', 'Bugey'], erreurs: 2 }).reponse).toBe('Cruas, Bugey');
    expect(resultat({}).reponse).toBe('Temps écoulé');
  });
});

describe('colonnes du relevé', () => {
  const [temps, err] = COLONNES_RAPIDITE;

  it('temps mis (rounds trouvés seulement) et erreurs', () => {
    expect(temps?.titre).toBe('Temps');
    expect(temps?.valeur(juste(6_400, 1))).toBe(`6,4${NB}s`);
    expect(temps?.valeur(resultat({ erreurs: 3 }))).toBe('—');
    expect(err?.titre).toBe('Err.');
    expect(err?.valeur(juste(6_400, 1))).toBe('1');
    expect(err?.valeur(resultat({ erreurs: 3 }))).toBe('3');
  });
});

describe('mesures du compte rendu', () => {
  it('temps moyen sur les rounds trouvés, total des erreurs, rounds perdus', () => {
    const resultats = [juste(4_000), juste(6_000, 2), resultat({ erreurs: 1, essais: ['Cruas'] }), juste(8_000)];
    expect(mesuresRapidite(resultats)).toEqual([
      { libelle: 'Temps moyen', valeur: `6,0${NB}s` },
      { libelle: 'Erreurs', valeur: '3' },
      { libelle: 'Perdus', valeur: '1/4' },
    ]);
  });

  it('aucun round trouvé : pas de temps moyen', () => {
    expect(mesuresRapidite([resultat({}), resultat({})])[0]).toEqual({ libelle: 'Temps moyen', valeur: '—' });
  });
});

describe('définition du mode', () => {
  it('règles de la phase 0, mode terminé', () => {
    expect(mode.id).toBe('rapidite');
    expect(mode.nbRounds).toBe(RAPIDITE_ROUNDS);
    expect(mode.scoreMaxRound).toBe(RAPIDITE_SCORE_MAX);
    expect(mode.enConstruction).toBeFalsy();
    expect(mode.delaiReponseMs(juste(3_000))).toBe(RAPIDITE_DELAI_APRES_BONNE_MS);
    expect(mode.delaiReponseMs(resultat({}))).toBe(RAPIDITE_DELAI_APRES_PERDU_MS);
  });
});
