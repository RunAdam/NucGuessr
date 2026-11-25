/** Mode Rapidité : normalisation des noms et autocomplétion, sur les vraies données (data/sites.json). */
import { describe, expect, it } from 'vitest';
import { SITES } from '../../src/lib/donnees';
import {
  creerIndex,
  decouper,
  distanceDebut,
  normaliser,
  suggerer,
  suiteFantome,
  trouverSite,
} from '../../src/modes/rapidite/recherche';

const index = creerIndex(SITES);
/** Noms courts des suggestions. */
const noms = (saisie: string, max = 5, exclus: string[] = []) =>
  suggerer(index, saisie, max, { exclus: new Set(exclus) }).map((s) => s.site.nom_court);
const premier = (saisie: string) => noms(saisie, 5)[0];

describe('normaliser', () => {
  it.each([
    ['Saint-Laurent', 'saint laurent'],
    ['saint laurent', 'saint laurent'],
    ['St Laurent', 'saint laurent'],
    ['st-laurent', 'saint laurent'],
    ['ST.  LAURENT ', 'saint laurent'],
    ['Ste-Marie', 'sainte marie'],
    ['Saint-Paul-Trois-Châteaux', 'saint paul trois chateaux'],
    ["Saint-Maurice-l'Exil", 'saint maurice l exil'],
    ['Saint-Maurice-l’Exil', 'saint maurice l exil'],
    ['  Nogent   sur  Seine  ', 'nogent sur seine'],
    ['CENTRALE NUCLÉAIRE DU BUGEY', 'centrale nucleaire du bugey'],
    ['Cœur', 'coeur'],
    ['', ''],
    ['  -- ', ''],
  ])('%j → %j', (entree, sortie) => {
    expect(normaliser(entree)).toBe(sortie);
  });

  it('ne développe « st » que comme mot entier', () => {
    expect(normaliser('Stade')).toBe('stade');
    expect(normaliser('Ouest')).toBe('ouest');
  });
});

describe('exemples de la feuille de route', () => {
  it.each(['st laurent', 'saint-laurent', 'Saint Laurent', 'ST-LAURENT', 'saint laurent des eaux', 'St-Laurent-Nouan'])(
    '%j → Saint-Laurent en premier',
    (saisie) => {
      expect(premier(saisie)).toBe('Saint-Laurent');
    },
  );

  it('« seine » trouve Nogent-sur-Seine (préfixe d’un mot intérieur)', () => {
    expect(noms('seine')).toEqual(['Nogent-sur-Seine']);
  });

  it('« Nogen » propose Nogent-sur-Seine, et le texte fantôme complète le nom', () => {
    const [s] = suggerer(index, 'Nogen', 5);
    expect(s?.site.nom_court).toBe('Nogent-sur-Seine');
    expect(suiteFantome('Nogen', 'Nogent-sur-Seine')).toBe('t-sur-Seine');
  });
});

describe('suggestions', () => {
  it('un site au plus une fois, même si plusieurs libellés correspondent', () => {
    const ids = suggerer(index, 'saint', 5).map((s) => s.site.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Saint-Laurent a 5 libellés commençant par « saint » : une seule suggestion.
    expect(ids.filter((id) => id === 'saint-laurent')).toHaveLength(1);
  });

  it('au plus `max` suggestions', () => {
    expect(noms('c', 5)).toHaveLength(5);
    expect(noms('c', 3)).toHaveLength(3);
    expect(noms('c', 0)).toEqual([]);
  });

  it('classe le début du nom court avant les alias et les mots intérieurs', () => {
    // « s » : noms courts d'abord, puis alias (Saint-Vulbas, Saint-Paul…), puis mot intérieur (Seine).
    expect(noms('s')).toEqual(['Saint-Alban', 'Saint-Laurent', 'Bugey', 'Tricastin', 'Nogent-sur-Seine']);
    expect(noms('c')).toEqual(['Cattenom', 'Chinon', 'Chooz', 'Civaux', 'Cruas']);
  });

  it('est stable : même saisie, même ordre', () => {
    expect(noms('b')).toEqual(noms('b'));
    expect(noms('b').slice(0, 3)).toEqual(['Belleville', 'Blayais', 'Bugey']);
  });

  it('cherche dans les alias', () => {
    expect(premier('Pierrelatte')).toBe('Tricastin');
    expect(premier('blaye')).toBe('Blayais');
    expect(premier('avoine')).toBe('Chinon');
    expect(premier('FLA3')).toBe('Flamanville');
    expect(premier('epr')).toBe('Flamanville');
    expect(premier('petit caux')).toBe('Penly');
    expect(premier('exil')).toBe('Saint-Alban');
    expect(premier('trois chateaux')).toBe('Tricastin');
  });

  it('indique le libellé qui a correspondu', () => {
    const [s] = suggerer(index, 'pierre', 5);
    expect(s).toMatchObject({ libelle: 'Pierrelatte', source: 'alias', approchant: false });
  });

  it('ne fait pas commencer une correspondance par un petit mot (« de », « sur », une lettre)', () => {
    expect(noms('de')).toEqual([]);
    expect(noms('sur')).toEqual([]);
    expect(noms('b')).not.toContain('Chinon'); // « Chinon B »
    expect(noms('le')).toEqual(['Blayais', 'Bugey', 'Tricastin']); // mais « Le Blayais » au début, oui
  });

  it('le nom complet ne correspond qu’au-delà de « Centrale nucléaire de »', () => {
    expect(noms('centrale')).toEqual([]);
    expect(noms('centrale nucleaire de')).toEqual([]);
    expect(noms('Centrale nucléaire de Cr')).toEqual(['Cruas']);
    expect(noms('centrale nucleaire du bl')).toEqual(['Blayais']);
  });

  it('exclut les sites déjà tentés', () => {
    const restants = noms('c', 5, ['cattenom', 'chinon']);
    expect(restants.slice(0, 3)).toEqual(['Chooz', 'Civaux', 'Cruas']);
    expect(restants).not.toContain('Cattenom');
    expect(restants).not.toContain('Chinon');
  });

  it('saisie vide : aucune suggestion', () => {
    expect(noms('')).toEqual([]);
    expect(noms('   ')).toEqual([]);
  });

  it('propose chaque site en premier avec 3 lettres au plus, sauf les deux Saint (« Saint-L »)', () => {
    for (const site of SITES) {
      const lettres = site.nom_court.startsWith('Saint-') ? 7 : 3;
      expect(noms(site.nom_court.slice(0, lettres))[0], site.nom_court).toBe(site.nom_court);
    }
  });
});

describe('fautes de frappe et proposition inconnue', () => {
  it('propose le site le plus proche quand rien ne commence par la saisie', () => {
    const [s] = suggerer(index, 'tricastn', 5);
    expect(s).toMatchObject({ approchant: true });
    expect(s?.site.nom_court).toBe('Tricastin');
    expect(premier('gravlines')).toBe('Gravelines');
    expect(premier('catenom')).toBe('Cattenom');
    expect(premier('flamanvile')).toBe('Flamanville');
    expect(premier('dampeirre')).toBe('Dampierre'); // inversion de deux lettres
  });

  it('ne propose rien de proche pour une saisie courte ou sans rapport', () => {
    expect(noms('xyz')).toEqual([]);
    expect(noms('paris')).toEqual([]);
    expect(noms('fessenheim')).toEqual([]); // centrale arrêtée, absente des données
  });

  it('peut désactiver les approchants', () => {
    expect(suggerer(index, 'tricastn', 5, { approchants: false })).toEqual([]);
  });

  it('distanceDebut compare au meilleur début de la cible', () => {
    expect(distanceDebut('tric', 'tricastin')).toBe(0);
    expect(distanceDebut('tricastn', 'tricastin')).toBe(1);
    expect(distanceDebut('trciastin', 'tricastin')).toBe(1);
    expect(distanceDebut('abc', 'xyz')).toBe(3);
  });

  it('une saisie inconnue ne correspond à aucun site', () => {
    expect(trouverSite(index, 'Fessenheim')).toBeNull();
    expect(trouverSite(index, '')).toBeNull();
  });
});

describe('correspondance exacte (validation sans passer par la liste)', () => {
  it.each([
    ['Tricastin', 'tricastin'],
    ['tricastin', 'tricastin'],
    ['Centrale nucléaire du Tricastin', 'tricastin'],
    ['Pierrelatte', 'tricastin'],
    ['st laurent', 'saint-laurent'],
    ['Saint Laurent des Eaux', 'saint-laurent'],
    ['nogent', 'nogent'],
    ['NOGENT SUR SEINE', 'nogent'],
    ['St-Maurice-l’Exil', 'saint-alban'],
    ['Graveline', 'gravelines'],
  ])('%j → %s', (saisie, id) => {
    expect(trouverSite(index, saisie)?.id).toBe(id);
  });

  it('un début de nom n’est pas une correspondance exacte', () => {
    expect(trouverSite(index, 'Tric')).toBeNull();
    expect(trouverSite(index, 'Saint')).toBeNull();
  });
});

describe('texte fantôme', () => {
  it.each([
    ['Tric', 'Tricastin', 'astin'],
    ['tric', 'Tricastin', 'astin'],
    ['nogent sur', 'Nogent-sur-Seine', '-Seine'],
    ['saint l', 'Saint-Laurent', 'aurent'],
    ['st l', 'Saint-Laurent', ''], // abréviation : pas de complétion lettre à lettre (la liste suffit)
    ['seine', 'Nogent-sur-Seine', ''],
    ['Tricastin', 'Tricastin', ''],
    ['', 'Tricastin', ''],
  ])('%j + %j → %j', (saisie, nom, suite) => {
    expect(suiteFantome(saisie, nom)).toBe(suite);
  });
});

describe('mise en évidence dans la liste', () => {
  const marque = (libelle: string, saisie: string) =>
    decouper(libelle, saisie)
      .filter((m) => m.marque)
      .map((m) => m.texte)
      .join('|');

  it.each([
    ['Tricastin', 'tri', 'Tri'],
    ['Nogent-sur-Seine', 'seine', 'Seine'],
    ['Nogent-sur-Seine', 'nogent s', 'Nogent-s'],
    ['St-Laurent-des-Eaux', 'saint lau', 'St-Lau'],
    ['Saint-Paul-Trois-Châteaux', 'chat', 'Chât'],
    ['Tricastin', 'xyz', ''],
  ])('%j / %j → %j', (libelle, saisie, attendu) => {
    expect(marque(libelle, saisie)).toBe(attendu);
  });

  it('rend le libellé entier, morceaux recollés', () => {
    expect(
      decouper('Nogent-sur-Seine', 'seine')
        .map((m) => m.texte)
        .join(''),
    ).toBe('Nogent-sur-Seine');
  });
});
