/** Moteur de partie générique : enchaînement des rounds, scores, états, protections. */
import { describe, expect, it } from 'vitest';
import {
  creerPartie,
  enregistrerResultat,
  passerAuRoundSuivant,
  resultatCourant,
  roundCourant,
  scoreTotal,
  type ResultatRound,
} from '../../src/lib/moteur';

const res = (points: number, statut: ResultatRound['statut'] = 'juste'): ResultatRound<null> => ({
  points,
  statut,
  reponse: 'x',
  detail: null,
});

describe('moteur de partie', () => {
  it('commence au premier round, en cours, score nul', () => {
    const p = creerPartie<string, null>(['a', 'b', 'c']);
    expect(p.etat).toBe('en_cours');
    expect(p.index).toBe(0);
    expect(roundCourant(p)).toBe('a');
    expect(scoreTotal(p)).toBe(0);
    expect(resultatCourant(p)).toBeNull();
  });

  it('refuse une partie sans round', () => {
    expect(() => creerPartie([])).toThrow();
  });

  it('enchaîne les rounds : en cours → réponse → round suivant … → terminée', () => {
    let p = creerPartie<string, null>(['a', 'b', 'c']);
    const points = [820, 0, 455];
    for (let i = 0; i < 3; i++) {
      expect(p.etat).toBe('en_cours');
      expect(roundCourant(p)).toBe(['a', 'b', 'c'][i]);
      p = enregistrerResultat(p, res(points[i]!, points[i] ? 'juste' : 'faux'));
      expect(p.etat).toBe('reponse');
      expect(resultatCourant(p)?.points).toBe(points[i]);
      p = passerAuRoundSuivant(p);
    }
    expect(p.etat).toBe('terminee');
    expect(p.index).toBe(2);
    expect(p.resultats.map((r) => r.points)).toEqual(points);
    expect(scoreTotal(p)).toBe(1275);
  });

  it('ignore les transitions sans objet (double Entrée, délai et tap simultanés)', () => {
    const p0 = creerPartie<string, null>(['a', 'b']);
    expect(passerAuRoundSuivant(p0)).toBe(p0); // pas de réponse à passer pendant le jeu
    const p1 = enregistrerResultat(p0, res(100));
    expect(enregistrerResultat(p1, res(900))).toBe(p1); // un seul résultat par round
    const p2 = passerAuRoundSuivant(p1);
    expect(p2.index).toBe(1);
    const fin = passerAuRoundSuivant(enregistrerResultat(p2, res(50)));
    expect(fin.etat).toBe('terminee');
    expect(passerAuRoundSuivant(fin)).toBe(fin);
    expect(enregistrerResultat(fin, res(10))).toBe(fin);
    expect(scoreTotal(fin)).toBe(150);
  });

  it('refuse des points invalides (négatifs, non entiers)', () => {
    const p = creerPartie<string, null>(['a']);
    expect(() => enregistrerResultat(p, res(-1))).toThrow();
    expect(() => enregistrerResultat(p, res(12.5))).toThrow();
    expect(() => enregistrerResultat(p, res(Number.NaN))).toThrow();
  });

  it("ne modifie jamais la partie d'origine (objets immuables)", () => {
    const rounds = ['a', 'b'];
    const p = creerPartie<string, null>(rounds);
    const q = enregistrerResultat(p, res(10));
    expect(p.resultats).toHaveLength(0);
    expect(p.etat).toBe('en_cours');
    expect(q).not.toBe(p);
    rounds.push('c');
    expect(p.rounds).toHaveLength(2);
  });
});
