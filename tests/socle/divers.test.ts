/** Routage par hash, mise en forme des nombres, fiche d'un site, données chargées par le jeu. */
import { describe, expect, it } from 'vitest';
import { formaterReacteurs, formaterSourceFroide } from '../../src/lib/fiche';
import { deuxChiffres, formaterDecimal, formaterEntier, formaterSecondes, pluriel } from '../../src/lib/format';
import { PHOTOS, SITES, siteParId } from '../../src/lib/donnees';
import { ecrireRoute, lireRoute } from '../../src/lib/routage';

const NB = '\u00a0';

describe('routage', () => {
  const modes = ['rapidite', 'distance', 'factice'];
  it.each([
    ['', { ecran: 'accueil' }],
    ['#', { ecran: 'accueil' }],
    ['#/', { ecran: 'accueil' }],
    ['#/rapidite', { ecran: 'partie', mode: 'rapidite' }],
    ['#/distance/', { ecran: 'partie', mode: 'distance' }],
    ['#distance', { ecran: 'partie', mode: 'distance' }],
    ['#/inconnu', { ecran: 'accueil' }],
    ['#/rapidite/autre', { ecran: 'accueil' }],
  ])('lireRoute(%j)', (hash, route) => {
    expect(lireRoute(hash, modes)).toEqual(route);
  });

  it('écrit des routes relisibles', () => {
    expect(ecrireRoute({ ecran: 'accueil' })).toBe('#/');
    expect(lireRoute(ecrireRoute({ ecran: 'partie', mode: 'factice' }), modes)).toEqual({
      ecran: 'partie',
      mode: 'factice',
    });
  });
});

describe('mise en forme', () => {
  it('sépare les milliers par une espace insécable', () => {
    expect(formaterEntier(8000)).toBe(`8${NB}000`);
    expect(formaterEntier(25000)).toBe(`25${NB}000`);
    expect(formaterEntier(640)).toBe('640');
    expect(formaterEntier(1234567)).toBe(`1${NB}234${NB}567`);
  });

  it('utilise la virgule décimale et une unité insécable', () => {
    expect(formaterDecimal(12.43)).toBe('12,4');
    expect(formaterDecimal(0)).toBe('0,0');
    expect(formaterSecondes(6400)).toBe(`6,4${NB}s`);
    expect(deuxChiffres(3)).toBe('03');
    expect(pluriel(1, 'erreur')).toBe(`1${NB}erreur`);
    expect(pluriel(2, 'erreur')).toBe(`2${NB}erreurs`);
  });

  it("n'utilise jamais U+202F ni U+2007 (absents de la police)", () => {
    const textes = [formaterEntier(123456), formaterSecondes(12345), pluriel(1000, 'round')];
    for (const t of textes) expect(t).not.toMatch(/[\u202f\u2007]/);
  });
});

describe('fiche du site', () => {
  it('regroupe les réacteurs par palier et puissance, avec la plage des couplages', () => {
    const site = {
      reacteurs: {
        nombre: 3,
        tranches: [
          { nom: 'F1', palier: 'P4' as const, puissance_mwe: 1330, couplage: 1985 },
          { nom: 'F2', palier: 'P4' as const, puissance_mwe: 1330, couplage: 1986 },
          { nom: 'F3', palier: 'EPR' as const, puissance_mwe: 1600, couplage: 2024 },
        ],
      },
    };
    expect(formaterReacteurs(site)).toBe(
      `2${NB}×${NB}1${NB}330${NB}MWe (P4), 1985–1986 + 1${NB}×${NB}1${NB}600${NB}MWe (EPR), 2024`,
    );
  });

  it('donne une ligne de réacteurs et une source froide pour chacun des sites', () => {
    for (const s of SITES) {
      expect(formaterReacteurs(s)).toMatch(/MWe/);
      expect(formaterSourceFroide(s).length).toBeGreaterThan(2);
    }
    expect(formaterSourceFroide({ source_froide: { nom: 'Loire', type: 'fleuve' } })).toBe('Loire (fleuve)');
    expect(formaterSourceFroide({ source_froide: { nom: 'Estuaire de la Gironde', type: 'estuaire' } })).toBe(
      'Estuaire de la Gironde',
    );
  });
});

describe('données chargées par le jeu', () => {
  it('relie chaque photo à un site connu', () => {
    expect(SITES.length).toBe(18);
    for (const p of PHOTOS) expect(siteParId(p.site_id).id).toBe(p.site_id);
    expect(() => siteParId('inconnu')).toThrow();
  });

  it("n'expose aucun nom de site dans le texte alternatif des photos (affiché pendant le round)", () => {
    const noms = SITES.flatMap((s) => [s.nom_court, ...s.alias]).map((n) => n.toLowerCase());
    for (const p of PHOTOS) for (const n of noms) expect(p.alt.toLowerCase()).not.toContain(n);
  });
});
