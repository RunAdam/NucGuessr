/** Persistance locale : version, données corrompues, stockage absent ou défaillant, migrations. */
import { describe, expect, it } from 'vitest';
import { STOCKAGE_CLE, STOCKAGE_VERSION } from '../../src/config';
import {
  assainir,
  changerPreference,
  commencerPartie,
  donneesVides,
  ecrireDonnees,
  enregistrerPartieTerminee,
  lireDonnees,
  marquerVue,
  trouverLocalStorage,
  type Migration,
  type SupportStockage,
} from '../../src/lib/stockage';

/** Faux `localStorage` en mémoire. */
function memoire(initial: Record<string, string> = {}): SupportStockage & { contenu: Record<string, string> } {
  const contenu = { ...initial };
  return {
    contenu,
    getItem: (c) => (c in contenu ? (contenu[c] as string) : null),
    setItem: (c, v) => {
      contenu[c] = v;
    },
    removeItem: (c) => {
      delete contenu[c];
    },
  };
}

/** Stockage qui lève une exception à chaque appel (navigation privée de certains navigateurs, quota plein). */
const defaillant: SupportStockage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('lecture et écriture', () => {
  it('donne des données vides à un nouveau joueur', () => {
    expect(lireDonnees(memoire())).toEqual(donneesVides());
    expect(donneesVides().version).toBe(STOCKAGE_VERSION);
  });

  it('relit exactement ce qui a été écrit', () => {
    const s = memoire();
    let d = commencerPartie(donneesVides()).donnees;
    d = marquerVue(d, 'abc', 1);
    d = enregistrerPartieTerminee(d, 'rapidite', 5025).donnees;
    d = changerPreference(d, 'rapidite.son', false);
    expect(ecrireDonnees(s, d)).toBe(true);
    expect(Object.keys(s.contenu)).toEqual([STOCKAGE_CLE]);
    expect(lireDonnees(s)).toEqual(d);
  });

  it('fonctionne sans localStorage (absent ou qui lève des exceptions), sans planter', () => {
    expect(lireDonnees(null)).toEqual(donneesVides());
    expect(ecrireDonnees(null, donneesVides())).toBe(false);
    expect(lireDonnees(defaillant)).toEqual(donneesVides());
    expect(ecrireDonnees(defaillant, donneesVides())).toBe(false);
  });

  it("trouverLocalStorage renvoie null quand il n'y a pas de localStorage utilisable", () => {
    const avant = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(trouverLocalStorage()).toBeNull();
    } finally {
      if (avant) Object.defineProperty(globalThis, 'localStorage', avant);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

describe('données corrompues ou version inconnue', () => {
  it.each([
    ['JSON illisible', '{pas du json'],
    ['pas un objet', '[1, 2, 3]'],
    ['sans version', '{"partiesLancees": 3}'],
    ['version future', JSON.stringify({ ...donneesVides(), version: STOCKAGE_VERSION + 1 })],
    ['version trop ancienne sans migration', JSON.stringify({ ...donneesVides(), version: 0 })],
  ])("%s : repart de zéro et met l'ancien contenu de côté", (_, brut) => {
    const s = memoire({ [STOCKAGE_CLE]: brut });
    expect(lireDonnees(s)).toEqual(donneesVides());
    expect(s.contenu[`${STOCKAGE_CLE}.ancien`]).toBe(brut);
  });

  it('garde les champs valides et remplace seulement les champs invalides', () => {
    const brut = {
      version: STOCKAGE_VERSION,
      partiesLancees: -4,
      modes: { rapidite: { meilleurScore: 6010, parties: 12 }, distance: { meilleurScore: 'beaucoup', parties: 1 } },
      photosVues: { a: 3, b: 'hier', c: 2.5 },
      preferences: { 'rapidite.son': true, objet: { x: 1 } },
    };
    const d = assainir(brut);
    expect(d.partiesLancees).toBe(0);
    expect(d.modes).toEqual({ rapidite: { meilleurScore: 6010, parties: 12 } });
    expect(d.photosVues).toEqual({ a: 3 });
    expect(d.preferences).toEqual({ 'rapidite.son': true });
  });
});

describe('migrations', () => {
  it("applique les migrations une par une jusqu'à la version courante", () => {
    // Format fictif v1 → v2 → v3 : le meilleur score s'appelait « record », puis « best », puis « meilleurScore ».
    const migrations: Record<number, Migration> = {
      1: (d) => ({ ...d, version: 2, modes: { rapidite: { best: d.record as number, parties: 1 } } }),
      2: (d) => {
        const r = (d.modes as Record<string, { best: number; parties: number }>).rapidite!;
        return { ...d, version: 3, modes: { rapidite: { meilleurScore: r.best, parties: r.parties } } };
      },
    };
    const s = memoire({ [STOCKAGE_CLE]: JSON.stringify({ version: 1, record: 4200, photosVues: { a: 1 } }) });
    const d = lireDonnees(s, { version: 3, migrations });
    expect(d.version).toBe(3);
    expect(d.modes.rapidite).toEqual({ meilleurScore: 4200, parties: 1 });
    expect(d.photosVues).toEqual({ a: 1 });
  });

  it('repart de zéro si une migration échoue', () => {
    const migrations: Record<number, Migration> = {
      1: () => {
        throw new Error('format inattendu');
      },
    };
    const s = memoire({ [STOCKAGE_CLE]: JSON.stringify({ version: 1 }) });
    expect(lireDonnees(s, { version: 2, migrations })).toEqual(donneesVides(2));
  });
});

describe('mises à jour', () => {
  it('numérote les parties', () => {
    const a = commencerPartie(donneesVides());
    const b = commencerPartie(a.donnees);
    expect([a.numeroPartie, b.numeroPartie]).toEqual([1, 2]);
  });

  it('tient le meilleur score et le nombre de parties par mode', () => {
    let d = donneesVides();
    const r1 = enregistrerPartieTerminee(d, 'rapidite', 4000);
    expect(r1.nouveauRecord).toBe(true);
    d = r1.donnees;
    const r2 = enregistrerPartieTerminee(d, 'rapidite', 3500);
    expect(r2.nouveauRecord).toBe(false);
    expect(r2.ancienRecord).toBe(4000);
    d = enregistrerPartieTerminee(r2.donnees, 'distance', 12000).donnees;
    expect(d.modes).toEqual({
      rapidite: { meilleurScore: 4000, parties: 2 },
      distance: { meilleurScore: 12000, parties: 1 },
    });
  });

  it('un score nul ne bat pas un record absent', () => {
    expect(enregistrerPartieTerminee(donneesVides(), 'rapidite', 0).nouveauRecord).toBe(false);
  });
});
