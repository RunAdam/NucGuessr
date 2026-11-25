/** Mode Rapidité : chronomètre d'un round (horloge injectée : de simples nombres de millisecondes). */
import { describe, expect, it } from 'vitest';
import { RAPIDITE_DUREE_MS, RAPIDITE_PENALITE_MS, scoreRapidite } from '../../src/config';
import {
  arreter,
  creerChrono,
  demarrer,
  ecouleMs,
  estEcoule,
  instantFin,
  masquer,
  penaliser,
  reprendre,
  restantMs,
  tourne,
} from '../../src/modes/rapidite/chrono';

const T0 = 1_000; // instant d'affichage de la photo (horloge arbitraire)
const lance = () => demarrer(creerChrono(RAPIDITE_DUREE_MS), T0);

describe('chronomètre de base', () => {
  it('avant la photo : rien ne s’écoule, le temps entier reste', () => {
    const c = creerChrono(RAPIDITE_DUREE_MS);
    expect(restantMs(c, 50_000)).toBe(20_000);
    expect(ecouleMs(c, 50_000)).toBe(0);
    expect(estEcoule(c, 50_000)).toBe(false);
    expect(tourne(c, 50_000)).toBe(false);
  });

  it('décompte à partir de l’affichage de la photo', () => {
    const c = lance();
    expect(restantMs(c, T0)).toBe(20_000);
    expect(restantMs(c, T0 + 6_400)).toBe(13_600);
    expect(tourne(c, T0 + 6_400)).toBe(true);
  });

  it('un second départ ne remet pas le chronomètre à zéro', () => {
    const c = demarrer(lance(), T0 + 5_000);
    expect(restantMs(c, T0 + 5_000)).toBe(15_000);
  });

  it('temps écoulé : 0 restant, jamais négatif', () => {
    const c = lance();
    expect(estEcoule(c, T0 + 19_999)).toBe(false);
    expect(estEcoule(c, T0 + 20_000)).toBe(true);
    expect(restantMs(c, T0 + 25_000)).toBe(0);
    expect(tourne(c, T0 + 20_000)).toBe(false);
  });

  it('juste même si les images sont rares : seul l’instant compte', () => {
    // Une image toutes les 16 ms ou une seule au bout de 7 s : même temps restant.
    const c = lance();
    expect(restantMs(c, T0 + 7_000)).toBe(13_000);
  });
});

describe('pénalités', () => {
  it('chaque mauvaise réponse retire 2 s', () => {
    let c = lance();
    c = penaliser(c, T0 + 3_000, RAPIDITE_PENALITE_MS);
    expect(restantMs(c, T0 + 3_000)).toBe(15_000);
    c = penaliser(c, T0 + 4_000, RAPIDITE_PENALITE_MS);
    expect(restantMs(c, T0 + 4_000)).toBe(12_000);
    expect(c.erreurs).toBe(2);
    // Le temps réellement écoulé ne compte pas les pénalités.
    expect(ecouleMs(c, T0 + 4_000)).toBe(4_000);
  });

  it('exemple du README : Cruas (−2 s) puis Tricastin à 6 s → 640 points', () => {
    let c = penaliser(lance(), T0 + 3_000, RAPIDITE_PENALITE_MS);
    c = arreter(c, T0 + 6_000);
    expect(restantMs(c, T0 + 6_000)).toBe(12_000);
    expect(scoreRapidite(restantMs(c, T0 + 60_000))).toBe(640);
  });

  it('une erreur dans les 2 dernières secondes fait perdre le round', () => {
    const c = penaliser(lance(), T0 + 18_500, RAPIDITE_PENALITE_MS);
    expect(estEcoule(c, T0 + 18_500)).toBe(true);
    expect(restantMs(c, T0 + 18_500)).toBe(0);
  });

  it('sans effet avant le départ, après l’arrêt ou après la fin', () => {
    const avant = creerChrono(RAPIDITE_DUREE_MS);
    expect(penaliser(avant, 0, RAPIDITE_PENALITE_MS)).toBe(avant);
    const arrete = arreter(lance(), T0 + 5_000);
    expect(penaliser(arrete, T0 + 6_000, RAPIDITE_PENALITE_MS)).toBe(arrete);
    const fini = lance();
    expect(penaliser(fini, T0 + 21_000, RAPIDITE_PENALITE_MS)).toBe(fini);
  });

  it('instantFin tient compte des pénalités', () => {
    const c = penaliser(lance(), T0 + 1_000, RAPIDITE_PENALITE_MS);
    expect(instantFin(c)).toBe(T0 + 18_000);
    expect(instantFin(creerChrono(RAPIDITE_DUREE_MS))).toBeNull();
  });
});

describe('arrêt', () => {
  it('bonne réponse : le temps restant est figé', () => {
    const c = arreter(lance(), T0 + 4_200);
    expect(restantMs(c, T0 + 4_200)).toBe(15_800);
    expect(restantMs(c, T0 + 60_000)).toBe(15_800);
    expect(ecouleMs(c, T0 + 60_000)).toBe(4_200);
    expect(tourne(c, T0 + 5_000)).toBe(false);
  });

  it('un second arrêt ne change rien', () => {
    const c = arreter(lance(), T0 + 4_000);
    expect(arreter(c, T0 + 9_000)).toBe(c);
  });

  it('arrêt constaté en retard : placé à l’instant exact de la fin du temps', () => {
    // La boucle d'affichage ne voit la fin qu'à 20,3 s (image tardive, onglet revenu…).
    const c = arreter(penaliser(lance(), T0 + 1_000, RAPIDITE_PENALITE_MS), T0 + 20_300);
    expect(c.arret).toBe(T0 + 18_000);
    expect(ecouleMs(c, T0 + 30_000)).toBe(18_000);
    expect(restantMs(c, T0 + 30_000)).toBe(0);
  });
});

describe('onglet en arrière-plan', () => {
  it('« continue » (choix retenu) : le temps passé ailleurs compte', () => {
    let c = lance();
    c = masquer(c, T0 + 3_000, 'continue');
    // requestAnimationFrame est suspendu, mais performance.now() avance : au retour, 8 s se sont écoulées.
    c = reprendre(c, T0 + 11_000);
    expect(restantMs(c, T0 + 11_000)).toBe(9_000);
  });

  it('« continue » : un retour après la fin trouve le round perdu', () => {
    let c = masquer(lance(), T0 + 3_000, 'continue');
    c = reprendre(c, T0 + 40_000);
    expect(estEcoule(c, T0 + 40_000)).toBe(true);
    expect(arreter(c, T0 + 40_000).arret).toBe(T0 + 20_000);
  });

  it('« pause » : le temps s’arrête jusqu’au retour', () => {
    let c = masquer(lance(), T0 + 3_000, 'pause');
    expect(restantMs(c, T0 + 10_000)).toBe(17_000);
    expect(tourne(c, T0 + 10_000)).toBe(false);
    c = reprendre(c, T0 + 10_000);
    expect(restantMs(c, T0 + 10_000)).toBe(17_000);
    expect(restantMs(c, T0 + 12_000)).toBe(15_000);
    expect(instantFin(c)).toBe(T0 + 27_000);
  });

  it('« pause » : un arrêt pendant la pause clôt la pause', () => {
    const c = arreter(masquer(lance(), T0 + 3_000, 'pause'), T0 + 9_000);
    expect(restantMs(c, T0 + 50_000)).toBe(17_000);
  });

  it('« perdu » : le round est perdu tout de suite', () => {
    const c = masquer(lance(), T0 + 3_000, 'perdu');
    expect(c.perduArrierePlan).toBe(true);
    expect(restantMs(c, T0 + 3_000)).toBe(0);
    expect(estEcoule(c, T0 + 3_000)).toBe(true);
  });

  it('sans effet si le chronomètre ne tourne pas', () => {
    const avant = creerChrono(RAPIDITE_DUREE_MS);
    expect(masquer(avant, 0, 'perdu')).toBe(avant);
    const arrete = arreter(lance(), T0 + 2_000);
    expect(masquer(arrete, T0 + 3_000, 'pause')).toBe(arrete);
    expect(reprendre(arrete, T0 + 4_000)).toBe(arrete);
  });
});
