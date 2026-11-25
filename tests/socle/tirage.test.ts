/**
 * Tirage des rounds (décisions 0.1 et 2.1) : sites distincts, rotation des photos par site, uniformité,
 * repli de `photosTirables`, aucun blocage. Graines fixes : résultats reproductibles.
 */
import { describe, expect, it } from 'vitest';
import { RAPIDITE_ROUNDS, DISTANCE_ROUNDS } from '../../src/config';
import { PHOTOS, SITES } from '../../src/lib/donnees';
import { aleatoireAvecGraine, melanger } from '../../src/lib/hasard';
import { choisirPhoto, marquerPhotoVue, tirerRounds, type HistoriquePhotos } from '../../src/lib/tirage';

interface P {
  id: string;
  site_id: string;
  difficulte: number;
}

/** Banque artificielle : `n` sites de `parSite` photos, difficultés 1, 2, 3, 1, 2, 3… */
function banque(n: number, parSite: number) {
  const sites = Array.from({ length: n }, (_, i) => ({ id: `s${i}` }));
  const photos: P[] = sites.flatMap((s) =>
    Array.from({ length: parSite }, (_, j) => ({ id: `${s.id}-p${j}`, site_id: s.id, difficulte: (j % 3) + 1 })),
  );
  return { sites, photos };
}

/** Joue `parties` parties consécutives en mettant l'historique à jour comme le jeu. */
function jouer(
  options: {
    sites: readonly { id: string }[];
    photos: readonly P[];
    nbRounds: number;
    filtre: 'rapidite' | 'distance';
  },
  parties: number,
  graine: number,
) {
  const aleatoire = aleatoireAvecGraine(graine);
  let historique: HistoriquePhotos = {};
  const tirages = [];
  for (let numero = 1; numero <= parties; numero++) {
    const rounds = tirerRounds({ ...options, historique, aleatoire });
    for (const r of rounds) historique = marquerPhotoVue(historique, r.photo.id, numero);
    tirages.push(rounds);
  }
  return tirages;
}

describe('tirerRounds', () => {
  it('tire des sites tous différents dans une partie', () => {
    const tirages = jouer({ sites: SITES, photos: PHOTOS, nbRounds: RAPIDITE_ROUNDS, filtre: 'rapidite' }, 500, 1);
    for (const rounds of tirages) {
      expect(rounds).toHaveLength(RAPIDITE_ROUNDS);
      expect(new Set(rounds.map((r) => r.site.id)).size).toBe(RAPIDITE_ROUNDS);
      for (const r of rounds) expect(r.photo.site_id).toBe(r.site.id);
    }
  });

  it('ne bloque pas avec les 54 photos réelles, dans les deux modes et même en demandant tous les sites', () => {
    for (const filtre of ['rapidite', 'distance'] as const) {
      for (const nbRounds of [RAPIDITE_ROUNDS, DISTANCE_ROUNDS, SITES.length]) {
        const tirages = jouer({ sites: SITES, photos: PHOTOS, nbRounds, filtre }, 200, 7);
        for (const rounds of tirages) expect(rounds).toHaveLength(nbRounds);
      }
    }
  });

  it('réduit la partie au nombre de sites qui ont au moins une photo, sans planter', () => {
    const { sites, photos } = banque(5, 2);
    const sansPhoto = [...sites, { id: 'vide' }];
    const rounds = tirerRounds({
      sites: sansPhoto,
      photos,
      nbRounds: 8,
      filtre: 'distance',
      historique: {},
      aleatoire: aleatoireAvecGraine(3),
    });
    expect(rounds).toHaveLength(5);
    expect(rounds.some((r) => r.site.id === 'vide')).toBe(false);
    expect(
      tirerRounds({ sites: [], photos: [], nbRounds: 8, filtre: 'distance', historique: {}, aleatoire: Math.random }),
    ).toEqual([]);
  });

  it('fait sortir tous les sites aussi souvent (uniformité, graine fixe)', () => {
    const parties = 9000;
    const tirages = jouer({ sites: SITES, photos: PHOTOS, nbRounds: RAPIDITE_ROUNDS, filtre: 'rapidite' }, parties, 42);
    const compte = new Map<string, number>();
    for (const rounds of tirages) for (const r of rounds) compte.set(r.site.id, (compte.get(r.site.id) ?? 0) + 1);
    expect(compte.size).toBe(SITES.length);
    const attendu = (parties * RAPIDITE_ROUNDS) / SITES.length; // 4 000
    // Test du khi-deux à 17 degrés de liberté : seuil à 0,1 % ≈ 40,8.
    const khi2 = [...compte.values()].reduce((s, n) => s + (n - attendu) ** 2 / attendu, 0);
    expect(khi2).toBeLessThan(40.8);
    for (const n of compte.values()) expect(Math.abs(n - attendu) / attendu).toBeLessThan(0.05);
  });

  it("ne remontre jamais une photo d'un site avant d'avoir montré toutes les autres (rotation)", () => {
    // 54 photos, mode Distance (toutes les photos tirables) : 3 photos par site.
    const tirages = jouer({ sites: SITES, photos: PHOTOS, nbRounds: DISTANCE_ROUNDS, filtre: 'distance' }, 400, 11);
    const vues = new Map<string, string[]>(); // site → photos dans l'ordre où elles sont sorties
    for (const rounds of tirages)
      for (const r of rounds) vues.set(r.site.id, [...(vues.get(r.site.id) ?? []), r.photo.id]);
    for (const [siteId, suite] of vues) {
      const n = PHOTOS.filter((p) => p.site_id === siteId).length;
      // Chaque fenêtre de n apparitions consécutives d'un site montre n photos différentes.
      for (let i = 0; i + n <= suite.length; i += n) expect(new Set(suite.slice(i, i + n)).size).toBe(n);
    }
  });

  it('ne montre aucune photo déjà vue à la partie précédente (54 photos, Rapidité)', () => {
    const tirages = jouer({ sites: SITES, photos: PHOTOS, nbRounds: RAPIDITE_ROUNDS, filtre: 'rapidite' }, 300, 5);
    for (let i = 1; i < tirages.length; i++) {
      const avant = new Set(tirages[i - 1]!.map((r) => r.photo.id));
      for (const r of tirages[i]!) expect(avant.has(r.photo.id)).toBe(false);
    }
  });

  it('applique photosTirables : jamais de photo difficile en Rapidité, toutes en Distance', () => {
    const rapidite = jouer(
      { sites: SITES, photos: PHOTOS, nbRounds: RAPIDITE_ROUNDS, filtre: 'rapidite' },
      300,
      2,
    ).flat();
    expect(rapidite.every((r) => r.photo.difficulte <= 2)).toBe(true);
    const distance = jouer(
      { sites: SITES, photos: PHOTOS, nbRounds: DISTANCE_ROUNDS, filtre: 'distance' },
      300,
      2,
    ).flat();
    expect(distance.some((r) => r.photo.difficulte === 3)).toBe(true);
  });

  it("se replie sur toutes les photos d'un site si aucune ne passe le filtre de Rapidité", () => {
    const sites = [{ id: 'a' }, { id: 'b' }];
    const photos: P[] = [
      { id: 'a1', site_id: 'a', difficulte: 3 },
      { id: 'a2', site_id: 'a', difficulte: 3 },
      { id: 'b1', site_id: 'b', difficulte: 1 },
      { id: 'b2', site_id: 'b', difficulte: 3 },
    ];
    const tirages = jouer({ sites, photos, nbRounds: 2, filtre: 'rapidite' }, 50, 9);
    const sortiesA = new Set(
      tirages
        .flat()
        .filter((r) => r.site.id === 'a')
        .map((r) => r.photo.id),
    );
    expect(sortiesA).toEqual(new Set(['a1', 'a2']));
    const sortiesB = new Set(
      tirages
        .flat()
        .filter((r) => r.site.id === 'b')
        .map((r) => r.photo.id),
    );
    expect(sortiesB).toEqual(new Set(['b1']));
  });

  it('est reproductible avec la même graine', () => {
    const o = { sites: SITES, photos: PHOTOS, nbRounds: 8, filtre: 'rapidite' as const, historique: {} };
    const a = tirerRounds({ ...o, aleatoire: aleatoireAvecGraine(123) }).map((r) => r.photo.id);
    const b = tirerRounds({ ...o, aleatoire: aleatoireAvecGraine(123) }).map((r) => r.photo.id);
    expect(a).toEqual(b);
  });
});

describe('choisirPhoto', () => {
  const photos: P[] = [
    { id: 'x', site_id: 's', difficulte: 1 },
    { id: 'y', site_id: 's', difficulte: 1 },
    { id: 'z', site_id: 's', difficulte: 1 },
  ];

  it('préfère une photo jamais vue', () => {
    const p = choisirPhoto(photos, { x: 4, y: 2 }, aleatoireAvecGraine(1));
    expect(p.id).toBe('z');
  });

  it('sinon, prend celle vue il y a le plus longtemps', () => {
    expect(choisirPhoto(photos, { x: 4, y: 2, z: 3 }, aleatoireAvecGraine(1)).id).toBe('y');
  });

  it('départage les égalités au hasard (les deux sortent)', () => {
    const aleatoire = aleatoireAvecGraine(8);
    const sorties = new Set(Array.from({ length: 50 }, () => choisirPhoto(photos, { z: 1 }, aleatoire).id));
    expect(sorties).toEqual(new Set(['x', 'y']));
  });

  it('refuse une liste vide', () => {
    expect(() => choisirPhoto([], {}, Math.random)).toThrow();
  });
});

describe('hasard', () => {
  it('melanger garde les mêmes éléments et ne modifie pas le tableau', () => {
    const t = [1, 2, 3, 4, 5];
    const m = melanger(t, aleatoireAvecGraine(1));
    expect([...m].sort()).toEqual(t);
    expect(t).toEqual([1, 2, 3, 4, 5]);
  });

  it('le générateur à graine reste dans [0, 1)', () => {
    const a = aleatoireAvecGraine(99);
    for (let i = 0; i < 10_000; i++) {
      const x = a();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
